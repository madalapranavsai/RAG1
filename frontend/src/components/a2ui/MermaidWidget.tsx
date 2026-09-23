import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { GitGraph, Copy, Check } from 'lucide-react';

interface MermaidWidgetProps {
  title?: string;
  definition?: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  themeVariables: {
    darkMode: false,
    background: '#faf9f5',
    primaryColor: '#f4f3ee',
    primaryTextColor: '#1c1917',
    primaryBorderColor: '#78716c',
    lineColor: '#57534e',
    secondaryColor: '#ffffff',
    tertiaryColor: '#faf9f5',
  },
});

export const MermaidWidget: React.FC<MermaidWidgetProps> = ({ title, definition = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      if (!definition.trim()) return;
      try {
        setError(null);
        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, definition.trim());
        if (isMounted) {
          setSvg(svg);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to render diagram syntax.');
        }
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [definition]);

  const handleCopy = () => {
    navigator.clipboard.writeText(definition);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg border border-[#e5e3dc] bg-white p-3.5">
      <div className="flex items-center justify-between mb-3 text-xs font-semibold text-[#1c1917]">
        <div className="flex items-center gap-2">
          <GitGraph className="w-3.5 h-3.5 text-[#78716c]" />
          <span>{title || 'Workflow & System Blueprint'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-[#eae8e1] border border-[#e5e3dc] text-[#57534e] hover:text-[#1c1917] text-[11px] transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-[#78716c]" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {error ? (
        <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
          <p className="font-semibold mb-1">Blueprint Syntax Error</p>
          <pre className="text-[11px] font-mono text-stone-600 overflow-x-auto">{definition}</pre>
        </div>
      ) : svg ? (
        <div
          ref={containerRef}
          className="overflow-x-auto flex justify-center p-3 bg-[#faf9f5] rounded-lg border border-[#e5e3dc]"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="p-4 text-center text-xs text-[#78716c]">Rendering blueprint...</div>
      )}
    </div>
  );
};
