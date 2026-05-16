import { MODELS, OllamaModel } from '../data/models';

export type GpuType = 'apple-silicon' | 'nvidia' | 'amd' | 'none';
export type OsType = 'macos' | 'linux' | 'windows';
export type UseCase = 'coding' | 'general' | 'reasoning' | 'balanced';

export interface HardwareProfile {
  totalRAMGB: number;
  gpuType: GpuType;
  gpuVRAMGB: number;
  cpuCores: number;
  os: OsType;
  activeAppsGB: number;
  useCase: UseCase;
  prioritySpeed: number; // 0 = pure quality, 1 = pure speed
}

export interface MemorySplit {
  os: number;
  apps: number;
  model: number;
  kvCache: number;
  free: number;
}

export interface Recommendation {
  model: OllamaModel;
  rank: number;
  score: number;
  fits: boolean;
  tight: boolean;
  availableRAMGB: number;
  recommendedCtx: number;
  memorySplit: MemorySplit;
  warnings: string[];
  tips: string[];
  ollamaEnvVars: Record<string, string>;
  modelfileContent: string;
  pullCommand: string;
}

const OS_OVERHEAD: Record<OsType, number> = {
  macos: 1.5,
  linux: 0.8,
  windows: 2.2,
};

function recommendedCtxForBudget(model: OllamaModel, remainingRAM: number): number {
  const ctxSteps = [4096, 8192, 16384, 32768];
  let best = 2048;
  for (const ctx of ctxSteps) {
    const kvCost = model.kvCacheGB8k * (ctx / 8192);
    if (kvCost <= remainingRAM * 0.55) best = ctx;
  }
  return Math.min(best, model.maxSafeCtx);
}

export function getRecommendations(hw: HardwareProfile): Recommendation[] {
  const osOverhead = OS_OVERHEAD[hw.os];

  // On Apple Silicon unified memory, full RAM pool is available to the GPU.
  // On discrete GPU, the bottleneck is VRAM unless the model+KV doesn't fit
  // and must run partially on CPU.
  const totalAvailable = hw.totalRAMGB - osOverhead - hw.activeAppsGB;
  const effectivePool =
    hw.gpuType === 'apple-silicon'
      ? totalAvailable
      : hw.gpuType === 'none'
      ? totalAvailable
      : Math.min(totalAvailable, hw.gpuVRAMGB);

  const results: Recommendation[] = [];

  for (const model of MODELS) {
    const remainingAfterModel = effectivePool - model.sizeGB;

    // Hard skip: can't even hold model weights
    if (remainingAfterModel < -1) continue;

    const fits = remainingAfterModel >= model.kvCacheGB8k;
    const tight = !fits || (model.sizeGB / effectivePool) > 0.72;

    const recommendedCtx = fits
      ? recommendedCtxForBudget(model, remainingAfterModel)
      : 4096;

    const kvCacheActual = model.kvCacheGB8k * (recommendedCtx / 8192);
    const freeBuffer = hw.totalRAMGB - osOverhead - hw.activeAppsGB - model.sizeGB - kvCacheActual;

    // ── Scoring ──────────────────────────────────────────────────────────
    let score = model.qualityScore * 10;

    // Memory fit
    if (!fits)  score -= 18;
    if (tight)  score -= 8;
    if (freeBuffer < 1) score -= 12;

    // Use case alignment
    if (hw.useCase === 'coding'    && model.tags.includes('coding'))    score += 18;
    if (hw.useCase === 'reasoning' && model.tags.includes('reasoning')) score += 18;
    if (hw.useCase === 'general'   && model.tags.includes('general'))   score += 12;
    if (hw.useCase === 'balanced')                                       score += 6;

    // Speed preference (0=quality, 1=speed)
    if (model.speed === 'fast'   && hw.prioritySpeed > 0.5) score += hw.prioritySpeed * 20;
    if (model.speed === 'slow'   && hw.prioritySpeed > 0.5) score -= hw.prioritySpeed * 16;
    if (model.speed === 'fast'   && hw.prioritySpeed < 0.3) score -= 4;

    // ── Warnings ─────────────────────────────────────────────────────────
    const warnings: string[] = [];
    const tips: string[] = [];

    if (!fits)    warnings.push('Model barely fits — GPU memory pressure may slow inference');
    if (tight)    warnings.push('Tight memory budget; close other apps before running');
    if (freeBuffer < 1.5) warnings.push('Low free buffer — avoid 32k context windows');
    if (recommendedCtx < model.defaultCtx)
      warnings.push(`Context capped to ${recommendedCtx.toLocaleString()} tokens to prevent OOM`);

    if (hw.gpuType === 'none')
      tips.push('CPU-only inference is 10–20× slower than GPU; expect 1–5 tok/s on 7B models');
    if (hw.gpuType === 'apple-silicon')
      tips.push('Apple Silicon Metal backend is auto-enabled — no extra config needed');
    if (model.speed === 'slow' && hw.gpuType === 'none')
      tips.push('Consider a smaller model for usable speed on CPU-only');
    if (tight && hw.activeAppsGB > 2)
      tips.push('Close IntelliJ / Chrome before loading this model');

    // ── Ollama env vars ───────────────────────────────────────────────────
    const ollamaEnvVars: Record<string, string> = {
      OLLAMA_MAX_LOADED_MODELS: '1',
      OLLAMA_NUM_PARALLEL: '1',
      OLLAMA_FLASH_ATTENTION: '1',
      OLLAMA_KV_CACHE_TYPE: 'q8_0',
    };
    if (hw.gpuType === 'none') ollamaEnvVars['OLLAMA_NUM_GPU'] = '0';
    if (hw.totalRAMGB <= 8)   ollamaEnvVars['OLLAMA_KV_CACHE_TYPE'] = 'q4_0';

    // ── Modelfile ─────────────────────────────────────────────────────────
    const cpuThreads = Math.max(2, Math.min(hw.cpuCores - 2, 8));
    const temperature = hw.useCase === 'coding' ? '0.1' : hw.useCase === 'reasoning' ? '0.3' : '0.7';

    const modelfileContent = [
      `FROM ${model.name}`,
      ``,
      `PARAMETER num_ctx      ${recommendedCtx}`,
      `PARAMETER num_predict  2048`,
      `PARAMETER temperature  ${temperature}`,
      `PARAMETER repeat_penalty 1.1`,
      `PARAMETER num_thread   ${cpuThreads}`,
      hw.gpuType === 'none' ? `PARAMETER num_gpu      0` : '',
    ]
      .filter((l) => l !== undefined)
      .join('\n');

    results.push({
      model,
      rank: 0,
      score,
      fits,
      tight,
      availableRAMGB: parseFloat(effectivePool.toFixed(1)),
      recommendedCtx,
      memorySplit: {
        os:      parseFloat(osOverhead.toFixed(1)),
        apps:    parseFloat(hw.activeAppsGB.toFixed(1)),
        model:   parseFloat(model.sizeGB.toFixed(1)),
        kvCache: parseFloat(kvCacheActual.toFixed(2)),
        free:    parseFloat(Math.max(0, freeBuffer).toFixed(1)),
      },
      warnings,
      tips,
      ollamaEnvVars,
      modelfileContent,
      pullCommand: `ollama pull ${model.name}`,
    });
  }

  const ranked = results.sort((a, b) => b.score - a.score).slice(0, 4);
  ranked.forEach((r, i) => (r.rank = i + 1));
  return ranked;
}

export function getDefaultProfile(): HardwareProfile {
  return {
    totalRAMGB: 16,
    gpuType: 'apple-silicon',
    gpuVRAMGB: 0,
    cpuCores: 10,
    os: 'macos',
    activeAppsGB: 1.5,
    useCase: 'coding',
    prioritySpeed: 0.3,
  };
}
