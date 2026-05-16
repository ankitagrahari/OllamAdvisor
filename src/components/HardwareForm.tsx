import { useEffect, useRef } from 'react';
import { Cpu, HardDrive, Monitor, Layers, Zap, Target } from 'lucide-react';
import type { HardwareProfile, GpuType, OsType, UseCase } from '../utils/advisor';
import MemoryBar from './MemoryBar';
import type { MemorySplit } from '../utils/advisor';

interface Props {
  profile: HardwareProfile;
  onChange: (p: HardwareProfile) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  previewSplit: MemorySplit;
}

const RAM_STEPS = [4, 6, 8, 10, 12, 16, 24, 32, 48, 64];
const CPU_STEPS = [2, 4, 6, 8, 10, 12, 16, 20, 24, 32];
const VRAM_STEPS = [2, 4, 6, 8, 10, 12, 16, 20, 24];
const APPS_STEPS = [0.3, 0.8, 1.5, 2.5, 3.5, 5.0, 7.0];
const APPS_LABELS = ['None', 'Browser', 'Light IDE', 'Heavy', 'IntelliJ+Chrome', 'Max load', 'Everything'];

function stepSlider(steps: number[], val: number) {
  return steps.indexOf(val) !== -1 ? steps.indexOf(val) : 0;
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
        <span className="text-accent">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function ButtonGroup<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string; sub?: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ value: v, label, sub }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-2 rounded-lg border text-sm transition-all duration-150 ${
            value === v
              ? 'border-accent bg-accent/10 text-accent font-medium'
              : 'border-border bg-surface text-muted hover:border-b2 hover:text-zinc-200'
          }`}
        >
          {label}
          {sub && <span className="block text-[10px] opacity-60 font-mono mt-0.5">{sub}</span>}
        </button>
      ))}
    </div>
  );
}

function SliderRow({
  label, value, steps, format, onChange,
}: { label: string; value: number; steps: number[]; format: (v: number) => string; onChange: (v: number) => void }) {
  const prevRef = useRef(value);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prevRef.current !== value && spanRef.current) {
      spanRef.current.classList.remove('value-changed');
      void spanRef.current.offsetWidth;
      spanRef.current.classList.add('value-changed');
      prevRef.current = value;
    }
  }, [value]);

  const idx = stepSlider(steps, value);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-muted">{label}</span>
        <span ref={spanRef} className="text-sm font-mono font-medium text-white tabular-nums">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={steps.length - 1}
        value={idx}
        onChange={(e) => onChange(steps[parseInt(e.target.value)])}
      />
      <div className="flex justify-between">
        <span className="text-[10px] text-dim font-mono">{format(steps[0])}</span>
        <span className="text-[10px] text-dim font-mono">{format(steps[steps.length - 1])}</span>
      </div>
    </div>
  );
}

export default function HardwareForm({ profile, onChange, onAnalyze, isAnalyzing, previewSplit }: Props) {
  const set = <K extends keyof HardwareProfile>(key: K, val: HardwareProfile[K]) =>
    onChange({ ...profile, [key]: val });

  const appsIdx = APPS_STEPS.indexOf(profile.activeAppsGB) !== -1
    ? APPS_STEPS.indexOf(profile.activeAppsGB) : 2;

  const useCaseOpts: { value: UseCase; label: string; sub?: string }[] = [
    { value: 'coding',    label: 'Coding',    sub: 'dev tools' },
    { value: 'general',   label: 'General',   sub: 'chat / Q&A' },
    { value: 'reasoning', label: 'Reasoning', sub: 'math / logic' },
    { value: 'balanced',  label: 'Balanced',  sub: 'mixed use' },
  ];

  const gpuOpts: { value: GpuType; label: string; sub?: string }[] = [
    { value: 'apple-silicon', label: 'Apple Silicon', sub: 'Metal GPU' },
    { value: 'nvidia',        label: 'NVIDIA',         sub: 'CUDA' },
    { value: 'amd',           label: 'AMD',            sub: 'ROCm' },
    { value: 'none',          label: 'CPU Only',       sub: 'no GPU' },
  ];

  const osOpts: { value: OsType; label: string }[] = [
    { value: 'macos',   label: 'macOS' },
    { value: 'linux',   label: 'Linux' },
    { value: 'windows', label: 'Windows' },
  ];

  const speedPct = Math.round(profile.prioritySpeed * 100);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* ── Left column: inputs ── */}
        <div className="space-y-8">

          <Section icon={<HardDrive size={15} />} title="Memory">
            <SliderRow
              label="Total system RAM"
              value={profile.totalRAMGB}
              steps={RAM_STEPS}
              format={(v) => `${v} GB`}
              onChange={(v) => set('totalRAMGB', v)}
            />
          </Section>

          <Section icon={<Monitor size={15} />} title="GPU / Compute">
            <ButtonGroup options={gpuOpts} value={profile.gpuType} onChange={(v) => set('gpuType', v)} />
            {(profile.gpuType === 'nvidia' || profile.gpuType === 'amd') && (
              <SliderRow
                label="GPU VRAM"
                value={profile.gpuVRAMGB || 8}
                steps={VRAM_STEPS}
                format={(v) => `${v} GB`}
                onChange={(v) => set('gpuVRAMGB', v)}
              />
            )}
          </Section>

          <Section icon={<Cpu size={15} />} title="Processor">
            <SliderRow
              label="CPU cores"
              value={profile.cpuCores}
              steps={CPU_STEPS}
              format={(v) => `${v} cores`}
              onChange={(v) => set('cpuCores', v)}
            />
          </Section>

          <Section icon={<Layers size={15} />} title="Operating System">
            <ButtonGroup options={osOpts} value={profile.os} onChange={(v) => set('os', v)} />
          </Section>

          <Section icon={<Zap size={15} />} title="Active App Load">
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted">Apps consuming RAM</span>
                <span className="text-sm font-mono font-medium text-white tabular-nums">
                  {profile.activeAppsGB.toFixed(1)} GB
                  <span className="text-xs text-muted ml-1.5 font-normal">({APPS_LABELS[appsIdx]})</span>
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={APPS_STEPS.length - 1}
                value={appsIdx}
                onChange={(e) => set('activeAppsGB', APPS_STEPS[parseInt(e.target.value)])}
              />
              <div className="flex justify-between">
                <span className="text-[10px] text-dim font-mono">None</span>
                <span className="text-[10px] text-dim font-mono">Everything</span>
              </div>
            </div>
          </Section>

          <Section icon={<Target size={15} />} title="Use Case">
            <ButtonGroup options={useCaseOpts} value={profile.useCase} onChange={(v) => set('useCase', v)} />
          </Section>

          {/* Speed / Quality slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted">Priority</span>
              <span className="text-xs font-mono text-muted">
                {speedPct < 30 ? 'Quality focused' : speedPct > 70 ? 'Speed focused' : 'Balanced'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={speedPct}
              onChange={(e) => set('prioritySpeed', parseInt(e.target.value) / 100)}
            />
            <div className="flex justify-between text-[10px] font-mono text-dim">
              <span>← Max quality</span>
              <span>Max speed →</span>
            </div>
          </div>

        </div>

        {/* ── Right column: live preview ── */}
        <div className="space-y-6 lg:pt-0">
          <div className="sticky top-8 space-y-6">

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Available for model', value: `${(profile.totalRAMGB - 1.5 - profile.activeAppsGB).toFixed(1)} GB`, highlight: true },
                { label: 'OS overhead', value: `${profile.os === 'linux' ? 0.8 : profile.os === 'windows' ? 2.2 : 1.5} GB`, highlight: false },
                { label: 'App load', value: `${profile.activeAppsGB.toFixed(1)} GB`, highlight: false },
                { label: 'CPU threads (Ollama)', value: `${Math.max(2, Math.min(profile.cpuCores - 2, 8))}`, highlight: false },
              ].map(({ label, value, highlight }) => (
                <div key={label} className={`rounded-lg border p-3 ${highlight ? 'border-accent/30 bg-accent/5' : 'border-border bg-surface'}`}>
                  <div className="text-[10px] text-muted mb-1">{label}</div>
                  <div className={`text-base font-mono font-semibold tabular-nums ${highlight ? 'text-accent' : 'text-white'}`}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Memory bar preview */}
            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Memory layout preview</div>
              <MemoryBar total={profile.totalRAMGB} split={previewSplit} animate />
            </div>

            {/* GPU note */}
            {profile.gpuType === 'apple-silicon' && (
              <div className="rounded-lg border border-sky-900/40 bg-sky-950/20 px-4 py-3 text-xs text-sky-400 leading-relaxed">
                <span className="font-semibold">Apple Silicon unified memory:</span> CPU and GPU share the same RAM pool.
                Ollama automatically uses Metal — no extra config needed.
              </div>
            )}
            {profile.gpuType === 'none' && (
              <div className="rounded-lg border border-yellow-900/40 bg-yellow-950/20 px-4 py-3 text-xs text-yellow-400 leading-relaxed">
                <span className="font-semibold">CPU-only mode:</span> Inference will be 10–20× slower.
                Use small quantised models (3B–7B) for usable response times.
              </div>
            )}

            {/* Analyze button */}
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 relative overflow-hidden ${
                isAnalyzing
                  ? 'bg-accent/20 border border-accent/30 text-accent/60 cursor-not-allowed'
                  : 'bg-accent hover:bg-accent-hi text-white border border-accent shadow-lg shadow-accent/20 hover:shadow-accent/30 active:scale-[0.98]'
              }`}
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-analyzing">●</span>
                  <span className="animate-analyzing" style={{ animationDelay: '0.2s' }}>●</span>
                  <span className="animate-analyzing" style={{ animationDelay: '0.4s' }}>●</span>
                  <span className="ml-1">Analysing your setup</span>
                </span>
              ) : (
                'Find models for this setup →'
              )}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
