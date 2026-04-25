function sanitize(text: string): string {
  return text
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
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
    return `gpt2image_${ts}_${slug}.png`;
  }
  return `gpt2image_${ts}.png`;
}
