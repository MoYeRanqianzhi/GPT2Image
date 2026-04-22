import { getConfig } from './store.js';

let cachedSystemPrompt = null;

async function getSystemPrompt() {
  if (cachedSystemPrompt !== null) return cachedSystemPrompt;
  try {
    const resp = await fetch('assets/system-prompt.md');
    cachedSystemPrompt = resp.ok ? await resp.text() : '';
  } catch {
    cachedSystemPrompt = '';
  }
  return cachedSystemPrompt;
}

function parseResponseOutput(output) {
  let text = null;
  let imageBase64 = null;
  let thinking = null;

  for (const item of (output || [])) {
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

export async function generateImage({ prompt, size = '1024x1024', action = 'auto', images = [], thinking, onStream, history = [] }) {
  const config = getConfig();
  if (!config) throw new Error('Not configured');

  const input = [];

  for (const msg of history) {
    if (msg.role === 'user') {
      const content = [{ type: 'input_text', text: msg.text }];
      if (msg.imageDataUrl) {
        content.push({ type: 'input_image', image_url: msg.imageDataUrl });
      }
      input.push({ role: 'user', content });
    } else if (msg.role === 'assistant' && !msg.error) {
      const variant = msg.variants?.[msg.activeVariant || 0] || msg.variants?.[0];
      if (variant?.text) {
        input.push({ role: 'assistant', content: [{ type: 'output_text', text: variant.text }] });
      }
    }
  }

  const currentContent = [{ type: 'input_text', text: prompt }];
  for (const dataUrl of images) {
    currentContent.push({ type: 'input_image', image_url: dataUrl });
  }
  input.push({ role: 'user', content: currentContent });

  const tool = { type: 'image_generation', action };
  if (size && size !== 'auto') {
    tool.size = size;
  }

  const instructions = await getSystemPrompt();

  const payload = {
    model: config.model || 'gpt-5.4',
    input,
    tools: [tool],
    ...(instructions && { instructions }),
  };

  if (thinking && thinking !== 'none') {
    const reasoning = { effort: thinking };
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
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try { detail = JSON.parse(text).error?.message || text; } catch {}
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

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accText = null;
  let accThinking = null;
  let accImage = null;
  let finalData = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n\n');
    buffer = parts.pop();

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

      let parsed;
      try { parsed = JSON.parse(eventData); } catch { continue; }

      if (eventType === 'response.output_text.delta') {
        accText = (accText || '') + (parsed.delta || '');
        onStream({ text: accText, thinking: accThinking, imageBase64: accImage });
      } else if (eventType === 'response.reasoning_summary_text.delta') {
        accThinking = (accThinking || '') + (parsed.delta || '');
        onStream({ text: accText, thinking: accThinking, imageBase64: accImage });
      } else if (eventType === 'response.output_item.done') {
        if (parsed.item?.type === 'image_generation_call' && parsed.item?.result) {
          accImage = parsed.item.result;
          onStream({ text: accText, thinking: accThinking, imageBase64: accImage });
        }
      } else if (eventType === 'response.completed') {
        finalData = parsed;
        onStream({ text: accText, thinking: accThinking, imageBase64: accImage, done: true });
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
