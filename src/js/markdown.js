const md = window.marked;

md.setOptions({
  breaks: true,
  gfm: true,
});

export function renderMarkdown(text) {
  if (!text) return '';
  return md.parse(text);
}
