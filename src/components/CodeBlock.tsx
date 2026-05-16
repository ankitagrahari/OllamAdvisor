import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  code: string;
  language?: string;
  compact?: boolean;
}

export default function CodeBlock({ code, language, compact }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative group rounded-lg border border-border bg-bg overflow-hidden ${compact ? '' : ''}`}>
      {language && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface">
          <span className="text-xs font-mono text-muted uppercase tracking-wider">{language}</span>
          <button
            onClick={copy}
            className={`flex items-center gap-1.5 text-xs transition-colors duration-150 ${
              copied ? 'text-green-400' : 'text-muted hover:text-white'
            }`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}

      <div className="relative">
        <pre
          className={`font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed whitespace-pre ${
            compact ? 'p-3' : 'p-4'
          }`}
        >
          {code}
        </pre>

        {!language && (
          <button
            onClick={copy}
            className={`absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-all duration-150 ${
              copied
                ? 'text-green-400 border-green-900 bg-green-950/40'
                : 'text-muted border-border bg-surface hover:text-white hover:border-b2'
            }`}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}
