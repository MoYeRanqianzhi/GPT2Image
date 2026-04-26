import { useConfigStore } from './store';
import type {
  Config,
  GenerateImageParams,
  GenerateImageResult,
  StreamDelta,
  Message,
} from '../types';

const REQUEST_TIMEOUT_MS = 120_000;

async function classifyFetchError(err: unknown, url?: string): Promise<Error> {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return err as Error;
  }
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return new Error('Request timed out — the server may be overloaded. Try again later.');
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('CORS') || msg.includes('blocked')) {
    return new Error(
      'CORS error: The API server does not allow browser requests. This API provider may only support server-side or desktop clients (e.g. Cherry Studio). Try a different API provider, or deploy GPT2IMAGE behind a reverse proxy.'
    );
  }
  if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('ERR_')) {
    if (url) {
      try {
        await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: AbortSignal.timeout(5000) });
        return new Error(
          'CORS error: The API server is reachable but blocks browser requests (CORS preflight failed). This API provider likely only supports server-side or desktop clients. Try a different provider, or deploy behind a reverse proxy.'
        );
      } catch {
        // server truly unreachable
      }
    }
    return new Error(
      'Cannot reach the API server. Check your network connection and verify the API Base URL in Settings.'
    );
  }
  return new Error(`Network error: ${msg}`);
}

function classifyHttpError(status: number, detail: string): Error {
  switch (status) {
    case 401:
      return new Error('Authentication failed — check your API Key in Settings.');
    case 403:
      return new Error('Access denied — your API key may lack the required permissions.');
    case 404:
      return new Error('API endpoint not found — verify your API Base URL in Settings.');
    case 429:
      return new Error('Rate limit exceeded — please wait a moment and try again.');
    case 500:
    case 502:
    case 503:
    case 504:
      return new Error(
        `API server error (${status}) — this is a temporary upstream issue, not a bug. Try again later.`
      );
    default:
      return new Error(`API error ${status}: ${detail}`);
  }
}

let cachedSystemPromptTemplate: string | null = null;

function injectPromptVariables(template: string): string {
  const vars: Record<string, string> = {
    CURRENT_DATE: new Date().toISOString().split('T')[0],
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

const MINIMAL_PROMPT = `You are GPT-2-IMAGE, an AI assistant with conversational and image generation capabilities.

The current date is {{CURRENT_DATE}}.

# Platform

 - Model ID: \`gpt-2-image\`
 - Platform: app.gpt2image.org
 - Developed by: MoYeRanQianZhi
 - Knowledge cutoff: 2025-08
 - Context window: 1M`;

async function getSystemPrompt(full: boolean): Promise<string> {
  if (!full) return injectPromptVariables(MINIMAL_PROMPT);
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

  const instructions = await getSystemPrompt(config.useSystemPrompt !== false);

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

  let response: Response;
  try {
    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;

    response = await fetch(`${config.baseURL.replace(/\/+$/, '')}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: combinedSignal,
    });
  } catch (err) {
    const apiUrl = `${config.baseURL.replace(/\/+$/, '')}/responses`;
    throw await classifyFetchError(err, apiUrl);
  }

  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try {
      detail = JSON.parse(text).error?.message || text;
    } catch {
      // keep raw text
    }
    throw classifyHttpError(response.status, detail);
  }

  if (!onStream) {
    const data = await response.json();
    const result = parseResponseOutput(data.output);
    if (!result.text && !result.imageBase64) {
      throw new Error('The API returned an empty response — the model may not support this request, or content was filtered.');
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

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(eventData);
      } catch {
        continue;
      }

      if (eventType === 'response.output_text.delta') {
        accText = (accText || '') + (String(parsed.delta ?? ''));
        emit();
      } else if (eventType === 'response.reasoning_summary_text.delta') {
        accThinking = (accThinking || '') + (String(parsed.delta ?? ''));
        emit();
      } else if (eventType === 'response.output_item.done') {
        const item = parsed.item as Record<string, unknown> | undefined;
        if (item?.type === 'image_generation_call' && typeof item.result === 'string') {
          accImage = item.result;
          emit();
        }
      } else if (eventType === 'response.completed') {
        finalData = parsed as { response?: { output?: ResponseOutputItem[] }; output?: ResponseOutputItem[] };
        emit({ done: true });
      } else if (eventType === 'response.failed') {
        const errObj = parsed.error as Record<string, unknown> | undefined;
        const failMsg = String(errObj?.message ?? 'Generation failed');
        if (failMsg.includes('rate') || failMsg.includes('limit')) {
          throw new Error('Rate limit exceeded — please wait a moment and try again.');
        }
        if (failMsg.includes('content_policy') || failMsg.includes('filter')) {
          throw new Error('Content was filtered by the API safety policy. Try rephrasing your prompt.');
        }
        throw new Error(`Generation failed: ${failMsg}`);
      }
    }
  }

  if (finalData) {
    const output = finalData.response?.output || finalData.output;
    const result = parseResponseOutput(output);
    return {
      text: result.text ?? accText,
      imageBase64: result.imageBase64 ?? accImage,
      thinking: result.thinking ?? accThinking,
      raw: finalData,
    };
  }

  if (!accText && !accImage) {
    throw new Error('The API stream ended without content — the model may not support this request, or content was filtered.');
  }

  return { text: accText, imageBase64: accImage, thinking: accThinking, raw: null };
}
