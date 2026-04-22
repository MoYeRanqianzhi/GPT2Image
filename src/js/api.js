import { getConfig } from './store.js';

export async function generateImage({ prompt, size = '1024x1024', action = 'auto', images = [], thinking }) {
  const config = getConfig();
  if (!config) throw new Error('Not configured');

  const inputContent = [{ type: 'input_text', text: prompt }];

  for (const dataUrl of images) {
    inputContent.push({ type: 'input_image', image_url: dataUrl });
  }

  const tool = { type: 'image_generation', action };
  if (size && size !== 'auto') {
    tool.size = size;
  }

  const payload = {
    model: config.model || 'gpt-5.4',
    input: [{ role: 'user', content: inputContent }],
    tools: [tool]
  };

  if (thinking && thinking !== 'none') {
    payload.reasoning = { effort: thinking };
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

  const data = await response.json();

  let text = null;
  let imageBase64 = null;

  for (const item of (data.output || [])) {
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

  if (!text && !imageBase64) {
    throw new Error('No usable content in API response');
  }

  return { text, imageBase64, raw: data };
}
