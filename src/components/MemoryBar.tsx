import { useEffect, useState } from 'react';
import type { MemorySplit } from '../utils/advisor';

interface Props {
  total: number;
  split: MemorySplit;
  animate?: boolean;
}

interface Segment {
  key: keyof MemorySplit;
  label: string;
  color: string;
  textColor: string;
}

const SEGMENTS: Segment[] = [
  { key: 'os',      label: 'OS',    color: 'bg-zinc-700',     textColor: 'text-zinc-400' },
  { key: 'apps',    label: 'Apps',  color: 'bg-orange-950',   textColor: 'text-orange-700' },
  { key: 'model',   label: 'Model', color: 'bg-indigo-950',   textColor: 'text-indigo-400' },
  { key: 'kvCache', label: 'KV',    color: 'bg-sky-950',      textColor: 'text-sky-500' },
  { key: 'free',    label: 'Free',  color: 'bg-green-950',    textColor: 'text-green-500' },
];

export default function MemoryBar({ total, split, animate }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const pct = (val: number) =>
    mounted ? Math.max(0, Math.min(100, (val / total) * 100)) : 0;

  const freeIsLow = split.free < 2;

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="relative h-7 rounded-md overflow-hidden flex bg-zinc-900 border border-border">
        {SEGMENTS.map(({ key, label, color }) => {
          const width = pct(split[key]);
          const isFree = key === 'free';
          const barColor = isFree && freeIsLow ? 'bg-red-900' : color;
          return (
            <div
              key={key}
              title={`${label}: ${split[key].toFixed(1)} GB`}
              className={`h-full ${barColor} seg-transition relative overflow-hidden group/seg`}
              style={{ width: `${width}%` }}
            >
              {width > 6 && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white/50 font-medium select-none">
                  {label}
                </span>
              )}
              {/* Hover tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-800 border border-border text-white whitespace-nowrap pointer-events-none opacity-0 group-hover/seg:opacity-100 transition-opacity z-10">
                {split[key].toFixed(2)} GB
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {SEGMENTS.map(({ key, label, textColor }) => {
          const isFree = key === 'free';
          const colorClass = isFree && freeIsLow ? 'text-red-400' : textColor;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-sm ${
                  isFree && freeIsLow ? 'bg-red-700' : key === 'os' ? 'bg-zinc-600' : key === 'apps' ? 'bg-orange-900' : key === 'model' ? 'bg-indigo-800' : key === 'kvCache' ? 'bg-sky-900' : 'bg-green-900'
                }`}
              />
              <span className={`text-xs font-mono ${colorClass}`}>
                {label}
                <span className="text-zinc-500 ml-1">{split[key].toFixed(1)}G</span>
              </span>
            </div>
          );
        })}
        <div className="ml-auto">
          <span className="text-xs font-mono text-zinc-500">{total} GB total</span>
        </div>
      </div>

      {/* Warning strip */}
      {freeIsLow && (
        <div className="flex items-center gap-2 px-3 py-2 rounded border border-red-900/50 bg-red-950/30 text-xs text-red-400">
          <span className="text-red-500">⚠</span>
          Free buffer is low ({split.free.toFixed(1)} GB). Close background apps or use a smaller model.
        </div>
      )}
    </div>
  );
}
