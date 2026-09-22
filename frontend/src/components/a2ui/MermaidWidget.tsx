import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { GitGraph, Copy, Check } from 'lucide-react';

interface MermaidWidgetProps {
  title?: string;
  definition?: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    darkMode: true,
    background: '#0f172a',
    primaryColor: '#6366f1',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#818cf8',
    lineColor: '#94a3b8',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
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
    <div className="my-3 rounded-xl border border-slate-700/60 bg-slate-900/80 p-3.5 shadow-lg">
      <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-200">
        <div className="flex items-center gap-2">
          <GitGraph className="w-3.5 h-3.5 text-indigo-400" />
          <span>{title || 'Workflow & Architecture Diagram'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {error ? (
        <div className="p-3 text-xs text-rose-300 bg-rose-950/30 border border-rose-800/40 rounded-lg">
          <p className="font-semibold mb-1">Diagram Render Error</p>
          <pre className="text-[11px] font-mono text-slate-400 overflow-x-auto">{definition}</pre>
        </div>
      ) : svg ? (
        <div
          ref={containerRef}
          className="overflow-x-auto flex justify-center p-2 bg-slate-950/40 rounded-lg"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="p-4 text-center text-xs text-slate-500">Generating diagram...</div>
      )}
    </div>
  );
};
