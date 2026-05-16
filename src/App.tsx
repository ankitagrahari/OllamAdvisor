import { useRef, useState } from 'react';
import { Github, Circle } from 'lucide-react';
import HardwareForm from './components/HardwareForm';
import ModelCard from './components/ModelCard';
import { getRecommendations, getDefaultProfile } from './utils/advisor';
import type { HardwareProfile, Recommendation, MemorySplit } from './utils/advisor';

function buildPreviewSplit(hw: HardwareProfile): MemorySplit {
  const os = hw.os === 'linux' ? 0.8 : hw.os === 'windows' ? 2.2 : 1.5;
  const apps = hw.activeAppsGB;
  const model = 0;
  const kvCache = 0;
  const free = Math.max(0, hw.totalRAMGB - os - apps);
  return { os, apps, model, kvCache, free };
}

export default function App() {
  const [profile, setProfile] = useState<HardwareProfile>(getDefaultProfile());
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setRecommendations(null);
    setTimeout(() => {
      const recs = getRecommendations(profile);
      setRecommendations(recs);
      setIsAnalyzing(false);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }, 900);
  };

  const previewSplit = buildPreviewSplit(profile);

  return (
    <div className="min-h-screen">

      {/* ── Header ── */}
      <header className="border-b border-border/60 bg-bg/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Circle size={20} className="text-accent fill-accent" />
            <span className="font-mono font-semibold text-sm tracking-tight text-white">
              ollama<span className="text-accent">·</span>advisor
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted">
            <a
              href="https://ollama.com/library"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Model library ↗
            </a>
            <a
              href="https://github.com/ollama/ollama"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Github size={13} />
              Ollama
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 pb-24">

        {/* ── Hero ── */}
        <div className="pt-16 pb-12 space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-muted border border-border rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Local inference · no cloud · no API keys
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
            Run the right model.<br />
            <span className="text-accent">Not the wrong one.</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl leading-relaxed">
            Enter your machine's specs. Get a ranked list of Ollama models that will actually
            run well — with generated configs and fine-tuning parameters.
          </p>
        </div>

        {/* ── Divider ── */}
        <div className="h-px bg-border mb-10" />

        {/* ── Form section ── */}
        <section className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <HardwareForm
            profile={profile}
            onChange={setProfile}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            previewSplit={previewSplit}
          />
        </section>

        {/* ── Results section ── */}
        <div ref={resultsRef}>
          {isAnalyzing && (
            <div className="mt-16 space-y-4">
              <div className="h-px bg-border" />
              <div className="pt-8 space-y-3">
                <div className="shimmer h-5 w-48 rounded" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="shimmer rounded-2xl h-64" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {recommendations && !isAnalyzing && (
            <section className="mt-16">
              <div className="h-px bg-border mb-10" />

              <div className="mb-8 space-y-2 animate-fade-in">
                <h2 className="text-2xl font-bold text-white">
                  Recommended for your setup
                </h2>
                <p className="text-zinc-400 text-sm">
                  {profile.totalRAMGB} GB {profile.gpuType === 'apple-silicon' ? '· Apple Silicon' : profile.gpuType === 'none' ? '· CPU only' : `· ${profile.gpuVRAMGB}GB ${profile.gpuType.toUpperCase()} GPU`}
                  {' · '}{profile.os}
                  {' · '}{profile.useCase} use case
                </p>
              </div>

              {/* Best pick — full width */}
              {recommendations[0] && (
                <div className="mb-5">
                  <ModelCard rec={recommendations[0]} delay={0} />
                </div>
              )}

              {/* Remaining picks — grid */}
              {recommendations.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {recommendations.slice(1).map((rec, i) => (
                    <ModelCard key={rec.model.id} rec={rec} delay={(i + 1) * 80} />
                  ))}
                </div>
              )}

              {/* Fine-tuning footer */}
              <div className="mt-12 rounded-2xl border border-border bg-surface p-6 space-y-4 animate-card-in" style={{ animationDelay: '400ms' }}>
                <h3 className="text-base font-semibold text-white">Fine-tuning reference</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  {[
                    { param: 'OLLAMA_MAX_LOADED_MODELS=1', desc: 'Prevents two models loading simultaneously — critical on ≤16 GB' },
                    { param: 'OLLAMA_FLASH_ATTENTION=1',    desc: 'Reduces KV cache memory by ~30% with no quality loss' },
                    { param: 'OLLAMA_KV_CACHE_TYPE=q8_0',  desc: 'Quantises KV cache to 8-bit, halving its RAM footprint' },
                    { param: 'OLLAMA_NUM_PARALLEL=1',       desc: 'Processes one request at a time, prevents memory spikes' },
                    { param: 'num_ctx 8192',                desc: 'Safe default context. 32k context can cost 4+ GB on 7B models' },
                    { param: 'num_thread N',                desc: 'Set to (CPU cores − 2) to leave headroom for OS and apps' },
                  ].map(({ param, desc }) => (
                    <div key={param} className="flex gap-3">
                      <code className="font-mono text-xs text-accent shrink-0 mt-0.5">{param}</code>
                      <span className="text-zinc-500 text-xs leading-relaxed">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer links */}
              <div className="mt-8 flex flex-wrap gap-4 text-xs text-muted">
                {[
                  { href: 'https://ollama.com/library',      label: 'Ollama model library' },
                  { href: 'https://github.com/ollama/ollama/blob/main/docs/modelfile.md', label: 'Modelfile reference' },
                  { href: 'https://github.com/ollama/ollama/blob/main/docs/api.md',      label: 'Ollama API docs' },
                  { href: 'https://github.com/ollama/ollama/blob/main/docs/gpu.md',      label: 'GPU setup guide' },
                ].map(({ href, label }) => (
                  <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                    className="hover:text-accent transition-colors"
                  >
                    {label} ↗
                  </a>
                ))}
              </div>

            </section>
          )}
        </div>
      </main>

    </div>
  );
}
