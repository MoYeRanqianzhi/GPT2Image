import { getConfig } from './store.js';

export async function generateImage({ prompt, size = '1024x1024', action = 'auto', images = [] }) {
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

  for (const item of (data.output || [])) {
    if (item.type === 'image_generation_call' && item.result) {
      return { imageBase64: item.result, raw: data };
    }
  }

  throw new Error('No image_generation_call result in API response');
}
