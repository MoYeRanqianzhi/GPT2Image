import { useConfigStore } from './store';
import type {
  Config,
  GenerateImageParams,
  GenerateImageResult,
  StreamDelta,
  Message,
} from '../types';

let cachedSystemPromptTemplate: string | null = null;

function injectPromptVariables(template: string): string {
  const vars: Record<string, string> = {
    CURRENT_DATE: new Date().toISOString().split('T')[0],
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

async function getSystemPrompt(): Promise<string> {
  if (cachedSystemPromptTemplate === null) {
    try {
      const resp = await fetch('assets/system-prompt.md');
      cachedSystemPromptTemplate = resp.ok ? await resp.text() : '';
    } catch {
      cachedSystemPromptTemplate = '';
    }
  }
  return injectPromptVariables(cachedSystemPromptTemplate);
}

interface ResponseOutputItem {
  type: string;
  summary?: Array<{ type: string; text?: string }>;
  content?: Array<{ type: string; text?: string }>;
  result?: string;
}

interface ParsedOutput {
  text: string | null;
  imageBase64: string | null;
  thinking: string | null;
}

function parseResponseOutput(output: ResponseOutputItem[] | undefined): ParsedOutput {
  let text: string | null = null;
  let imageBase64: string | null = null;
  let thinking: string | null = null;

  for (const item of output || []) {
    if (item.type === 'reasoning' && item.summary) {
      for (const part of item.summary) {
        if (part.type === 'summary_text' && part.text) {
          thinking = thinking ? thinking + '\n' + part.text : part.text;
        }
      }
    }
    if (item.type === 'message' && item.content) {
      for (const part of item.content) {
        if (part.type === 'output_text' && part.text) {
          text = text ? text + '\n' + part.text : part.text;
        }
      }
    }
    if (item.type === 'image_generation_call' && item.result) {
      imageBase64 = item.result;
    }
  }

  return { text, imageBase64, thinking };
}

interface InputMessage {
  role: 'user' | 'assistant';
  content: Array<
    | { type: 'input_text'; text: string }
    | { type: 'input_image'; image_url: string }
    | { type: 'output_text'; text: string }
  >;
}

interface ToolConfig {
  type: 'image_generation';
  action: string;
  size?: string;
}

interface ReasoningConfig {
  effort: string;
  generate_summary?: string;
}

interface RequestPayload {
  model: string;
  input: InputMessage[];
  tools: ToolConfig[];
  instructions?: string;
  reasoning?: ReasoningConfig;
  stream?: boolean;
}

function getConfig(): Config | null {
  return useConfigStore.getState().config;
}

function buildInput(prompt: string, images: string[], history: Message[]): InputMessage[] {
  const input: InputMessage[] = [];

  for (const msg of history) {
    if (msg.role === 'user') {
      const content: InputMessage['content'] = [{ type: 'input_text', text: msg.text || '' }];
      if (msg.imageDataUrl) {
        content.push({ type: 'input_image', image_url: msg.imageDataUrl });
      }
      input.push({ role: 'user', content });
    } else if (msg.role === 'assistant' && !msg.error) {
      const variant = msg.variants?.[msg.activeVariant || 0] || msg.variants?.[0];
      if (variant?.text) {
        input.push({
          role: 'assistant',
          content: [{ type: 'output_text', text: variant.text }],
        });
      }
    }
  }

  const currentContent: InputMessage['content'] = [{ type: 'input_text', text: prompt }];
  for (const dataUrl of images) {
    currentContent.push({ type: 'input_image', image_url: dataUrl });
  }
  input.push({ role: 'user', content: currentContent });

  return input;
}

export async function generateImage({
  prompt,
  size = '1024x1024',
  action = 'auto',
  images = [],
  thinking,
  onStream,
  history = [],
  signal,
}: GenerateImageParams): Promise<GenerateImageResult> {
  const config = getConfig();
  if (!config) throw new Error('Not configured');

  const input = buildInput(prompt, images, history);

  const tool: ToolConfig = { type: 'image_generation', action };
  if (size && size !== 'auto') {
    tool.size = size;
  }

  const instructions = await getSystemPrompt();

  const payload: RequestPayload = {
    model: config.model || 'gpt-5.4',
    input,
    tools: [tool],
    ...(instructions && { instructions }),
  };

  if (thinking && thinking !== 'none') {
    const reasoning: ReasoningConfig = { effort: thinking };
    if (config.showThinking) {
      reasoning.generate_summary = 'concise';
    }
    payload.reasoning = reasoning;
  }

  if (onStream) {
    payload.stream = true;
  }

  const response = await fetch(`${config.baseURL.replace(/\/+$/, '')}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    ...(signal && { signal }),
  });

  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try {
      detail = JSON.parse(text).error?.message || text;
    } catch {
      // keep raw text
    }
    throw new Error(`API error ${response.status}: ${detail}`);
  }

  if (!onStream) {
    const data = await response.json();
    const result = parseResponseOutput(data.output);
    if (!result.text && !result.imageBase64) {
      throw new Error('No usable content in API response');
    }
    return { ...result, raw: data };
  }

  if (!response.body) {
    throw new Error('Streaming not supported: missing response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accText: string | null = null;
  let accThinking: string | null = null;
  let accImage: string | null = null;
  let finalData: { response?: { output?: ResponseOutputItem[] }; output?: ResponseOutputItem[] } | null = null;

  const emit = (extra?: Partial<StreamDelta>) => {
    onStream({ text: accText, thinking: accThinking, imageBase64: accImage, ...extra });
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      if (!part.trim()) continue;

      let eventType = '';
      let eventData = '';
      for (const line of part.split('\n')) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          eventData = line.slice(6);
        }
      }

      if (!eventData || eventData === '[DONE]') continue;

      let parsed: any;
      try {
        parsed = JSON.parse(eventData);
      } catch {
        continue;
      }

      if (eventType === 'response.output_text.delta') {
        accText = (accText || '') + (parsed.delta || '');
        emit();
      } else if (eventType === 'response.reasoning_summary_text.delta') {
        accThinking = (accThinking || '') + (parsed.delta || '');
        emit();
      } else if (eventType === 'response.output_item.done') {
        if (parsed.item?.type === 'image_generation_call' && parsed.item?.result) {
          accImage = parsed.item.result;
          emit();
        }
      } else if (eventType === 'response.completed') {
        finalData = parsed;
        emit({ done: true });
      } else if (eventType === 'response.failed') {
        throw new Error(parsed.error?.message || 'Generation failed');
      }
    }
  }

  if (finalData) {
    const output = finalData.response?.output || finalData.output;
    const result = parseResponseOutput(output);
    return { ...result, raw: finalData };
  }

  if (!accText && !accImage) {
    throw new Error('No usable content in stream');
  }

  return { text: accText, imageBase64: accImage, thinking: accThinking, raw: null };
}
