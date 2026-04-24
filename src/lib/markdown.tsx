import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
}

function preprocess(text: string): string {
  if (!text) return '';
  let out = text;
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, math: string) => `$$${math}$$`);
  out = out.replace(/\\\((.+?)\\\)/g, (_m, math: string) => `$${math}$`);
  return out;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const processed = preprocess(content);
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
