import React, { useMemo } from 'react';

// Tell TypeScript that 'marked' might be on the global window object
declare global {
  interface Window {
    marked?: {
      parse: (markdown: string) => string;
    };
  }
}

interface MarkdownRendererProps {
  markdown: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdown }) => {
  const processedHtml = useMemo(() => {
    if (window.marked) {
      return window.marked.parse(markdown);
    }
    // Simple fallback if marked isn't loaded
    return markdown
      .split('\n')
      .map(line => `<p>${line}</p>`)
      .join('');
  }, [markdown]);

  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
};

export default MarkdownRenderer;
