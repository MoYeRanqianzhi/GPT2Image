const md = window.marked;
const katex = window.katex;

md.setOptions({ breaks: true, gfm: true });

export function renderMarkdown(text) {
  if (!text) return '';

  const mathBlocks = [];

  let processed = text;

  // Display math: $$...$$ and \[...\]
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    const id = `%%MATH${mathBlocks.length}%%`;
    mathBlocks.push({ id, math, display: true });
    return id;
  });
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    const id = `%%MATH${mathBlocks.length}%%`;
    mathBlocks.push({ id, math, display: true });
    return id;
  });

  // Inline math: \(...\) and $...$
  processed = processed.replace(/\\\((.+?)\\\)/g, (_, math) => {
    const id = `%%MATH${mathBlocks.length}%%`;
    mathBlocks.push({ id, math, display: false });
    return id;
  });
  processed = processed.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$/g, (_, math) => {
    const id = `%%MATH${mathBlocks.length}%%`;
    mathBlocks.push({ id, math, display: false });
    return id;
  });

  let html = md.parse(processed);

  for (const { id, math, display } of mathBlocks) {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: display,
        throwOnError: false,
      });
      html = html.replace(id, rendered);
    } catch {
      html = html.replace(id, math);
    }
  }

  return html;
}
