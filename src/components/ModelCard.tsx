import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Zap, Gauge, Clock } from 'lucide-react';
import type { Recommendation } from '../utils/advisor';
import CodeBlock from './CodeBlock';
import MemoryBar from './MemoryBar';

interface Props {
  rec: Recommendation;
  delay?: number;
}

type Tab = 'env' | 'modelfile';

const TAG_STYLES: Record<string, string> = {
  coding:    'text-violet-400 border-violet-900/50 bg-violet-950/30',
  general:   'text-sky-400    border-sky-900/50    bg-sky-950/30',
  reasoning: 'text-amber-400  border-amber-900/50  bg-amber-950/30',
  fast:      'text-green-400  border-green-900/50  bg-green-950/30',
  large:     'text-zinc-400   border-zinc-700      bg-zinc-900',
};

const SPEED_LABEL: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  fast:   { label: 'Fast',   color: 'text-green-400', icon: <Zap size={11} /> },
  medium: { label: 'Medium', color: 'text-yellow-400', icon: <Gauge size={11} /> },
  slow:   { label: 'Slow',   color: 'text-zinc-400',  icon: <Clock size={11} /> },
};

function ScoreDots({ score }: { score: number }) {
  const filled = Math.round(score);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`score-dot ${i < filled ? 'bg-accent' : 'bg-zinc-800'}`}
        />
      ))}
      <span className="ml-1.5 text-xs font-mono text-muted">{score.toFixed(1)}/10</span>
    </div>
  );
}

export default function ModelCard({ rec, delay = 0 }: Props) {
  const [tab, setTab] = useState<Tab | null>(null);
  const { model, rank, fits, tight, memorySplit, recommendedCtx, warnings, tips, ollamaEnvVars, modelfileContent, pullCommand } = rec;
  const isBest = rank === 1;
  const speed = SPEED_LABEL[model.speed];

  const envVarsText = Object.entries(ollamaEnvVars)
    .map(([k, v]) => `export ${k}=${v}`)
    .join('\n');

  const launchctlText = [
    '# For macOS Ollama.app (menu-bar service):',
    ...Object.entries(ollamaEnvVars).map(([k, v]) => `launchctl setenv ${k} ${v}`),
    '# Then: quit and restart Ollama from the menu bar',
  ].join('\n');

  const totalEnvText = `# Shell (.zshrc / .bashrc)\n${envVarsText}\n\n${launchctlText}`;

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-0.5 animate-card-in ${
        isBest
          ? 'border-accent/35 card-best bg-surface'
          : 'border-border bg-surface hover:border-b2'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* ── Header strip ── */}
      <div className={`px-5 pt-4 pb-3 border-b ${isBest ? 'border-accent/20' : 'border-border'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isBest && (
                <span className="text-[10px] font-mono font-semibold tracking-widest uppercase text-accent bg-accent/10 border border-accent/25 px-2 py-0.5 rounded">
                  Best Match
                </span>
              )}
              {!isBest && (
                <span className="text-[10px] font-mono text-muted border border-border px-1.5 py-0.5 rounded">
                  #{rank}
                </span>
              )}
              {!fits && (
                <span className="text-[10px] font-mono text-yellow-500 border border-yellow-900/50 bg-yellow-950/20 px-1.5 py-0.5 rounded">
                  Tight fit
                </span>
              )}
            </div>

            <h3 className="text-lg font-semibold text-white leading-tight truncate">
              {model.displayName}
            </h3>

            <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
              <span className="font-mono">{model.vendor}</span>
              <span className="text-dim">·</span>
              <span className="font-mono">{model.quant}</span>
              <span className="text-dim">·</span>
              <span className="font-mono">{model.sizeGB} GB</span>
              <span className="text-dim">·</span>
              <span className={`flex items-center gap-1 ${speed.color}`}>
                {speed.icon}
                {speed.label}
              </span>
            </div>
          </div>

          <a
            href={model.ollamaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 text-xs text-muted hover:text-accent border border-border hover:border-accent/40 rounded-lg px-2.5 py-1.5 transition-all duration-150"
          >
            Ollama
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-5 space-y-5">

        {/* Quality score */}
        <div>
          <div className="text-[10px] text-muted uppercase tracking-wider mb-2">Quality</div>
          <ScoreDots score={model.qualityScore} />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {model.tags.map((tag) => (
            <span
              key={tag}
              className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                TAG_STYLES[tag] ?? 'text-zinc-400 border-zinc-700'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-400 leading-relaxed">{model.description}</p>

        {/* Strengths */}
        <div>
          <div className="text-[10px] text-muted uppercase tracking-wider mb-2">Strengths</div>
          <div className="space-y-1">
            {model.strengths.map((s) => (
              <div key={s} className="flex items-start gap-2 text-xs text-zinc-400">
                <span className="text-accent mt-0.5 shrink-0">›</span>
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Memory layout */}
        <div>
          <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
            Memory layout
            <span className="ml-2 font-mono text-dim normal-case">ctx {recommendedCtx.toLocaleString()} tokens</span>
          </div>
          <MemoryBar total={rec.availableRAMGB + memorySplit.os + memorySplit.apps} split={memorySplit} />
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-1.5">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-950/20 border border-yellow-900/40 rounded-lg px-3 py-2">
                <span className="shrink-0 mt-0.5">⚠</span>
                {w}
              </div>
            ))}
          </div>
        )}

        {/* Tips */}
        {tips.length > 0 && (
          <div className="space-y-1.5">
            {tips.map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-sky-400 bg-sky-950/20 border border-sky-900/40 rounded-lg px-3 py-2">
                <span className="shrink-0 mt-0.5">ℹ</span>
                {t}
              </div>
            ))}
          </div>
        )}

        {/* Pull command */}
        <div>
          <div className="text-[10px] text-muted uppercase tracking-wider mb-2">Pull command</div>
          <CodeBlock code={pullCommand} />
        </div>

        {/* Config tabs */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="flex border-b border-border">
            {(['env', 'modelfile'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(tab === t ? null : t)}
                className={`flex-1 relative flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors duration-150 ${
                  tab === t
                    ? 'text-accent bg-accent/5 tab-active'
                    : 'text-muted hover:text-zinc-300 hover:bg-white/3'
                }`}
              >
                {t === 'env' ? 'ENV VARS' : 'MODELFILE'}
                {tab === t ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            ))}
          </div>

          {tab === 'env' && (
            <div className="p-3 space-y-2 animate-fade-in">
              <p className="text-xs text-muted px-1">
                Set these before starting Ollama. On macOS with the app, use <code className="font-mono text-zinc-300">launchctl setenv</code>.
              </p>
              <CodeBlock code={totalEnvText} language="bash" />
            </div>
          )}

          {tab === 'modelfile' && (
            <div className="p-3 space-y-2 animate-fade-in">
              <p className="text-xs text-muted px-1">
                Save to <code className="font-mono text-zinc-300">Modelfile</code>, then run{' '}
                <code className="font-mono text-zinc-300">ollama create my-model -f Modelfile</code>
              </p>
              <CodeBlock code={modelfileContent} language="dockerfile" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
