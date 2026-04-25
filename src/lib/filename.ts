function sanitize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}_${pad(d.getMonth() + 1)}_${pad(d.getDate())}_${pad(d.getHours())}_${pad(d.getMinutes())}_${pad(d.getSeconds())}`;
}

export function buildImageFilename(prompt?: string, timestamp?: number): string {
  const ts = formatTimestamp(timestamp || Date.now());
  const slug = prompt ? sanitize(prompt) : '';
  if (slug) {
    return `gpt2image_${slug}_${ts}.png`;
  }
  return `gpt2image_${ts}.png`;
}
