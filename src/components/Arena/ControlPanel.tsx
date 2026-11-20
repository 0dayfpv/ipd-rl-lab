import React, { useState } from 'react';
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  Zap,
  Brain,
  Sliders,
  Grid2x2,
  ChevronDown,
  ChevronUp,
  Gauge,
  RefreshCw,
} from 'lucide-react';
import {
  AgentId,
  BRAIN_LABELS,
  BrainType,
  PayoffMatrix,
  QLearningHyperparams,
  SimulationSnapshot,
  SimulationSpeed,
} from '../../engine/types';

export interface ControlPanelProps {
  snapshot: SimulationSnapshot;
  isRunning: boolean;
  speed: SimulationSpeed;
  roundsPerSec: number;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (speed: SimulationSpeed) => void;
  onBrainChange: (agent: AgentId, brain: BrainType) => void;
  onPayoffChange: (matrix: PayoffMatrix) => void;
  onNoiseChange: (noise: number) => void;
  onHyperparamsChange: (params: QLearningHyperparams, syncEpsilon?: boolean) => void;
}

const BRAIN_OPTIONS: BrainType[] = [
  'q-learning',
  'tit-for-tat',
  'grim-trigger',
  'always-defect',
  'always-cooperate',
  'human',
];

const SPEED_OPTIONS: { value: SimulationSpeed; label: string; title: string }[] = [
  { value: '1x', label: '1x', title: 'Slow / Visual Analysis (~1.5 rounds/sec)' },
  { value: '10x', label: '10x', title: 'Fast Observation (~10 rounds/sec)' },
  { value: '100x', label: '100x', title: 'Accelerated (~100 rounds/sec)' },
  { value: 'TURBO', label: 'TURBO', title: 'High-Speed Training (1000+ rounds/sec)' },
];

const PAYOFF_PRESETS: { label: string; matrix: PayoffMatrix }[] = [
  { label: 'Classic IPD (3/5/0/1)', matrix: { R: 3, T: 5, S: 0, P: 1 } },
  { label: 'Harsh Defection (3/6/0/1)', matrix: { R: 3, T: 6, S: 0, P: 1 } },
  { label: 'Peaceful (4/5/1/1)', matrix: { R: 4, T: 5, S: 1, P: 1 } },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  snapshot,
  isRunning,
  speed,
  roundsPerSec,
  onTogglePlay,
  onStep,
  onReset,
  onSpeedChange,
  onBrainChange,
  onPayoffChange,
  onNoiseChange,
  onHyperparamsChange,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const { hyperparams, payoffMatrix, noise, alphaBrain, betaBrain } = snapshot;
  const hasHuman = alphaBrain === 'human' || betaBrain === 'human';

  const handlePayoffField = (key: keyof PayoffMatrix, rawValue: string) => {
    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(-20, Math.min(50, parsed));
    onPayoffChange({ ...payoffMatrix, [key]: clamped });
  };

  return (
    <section className="rounded-2xl border border-slate-800/90 bg-slate-950/75 backdrop-blur-md shadow-xl overflow-hidden">
      {/* Top Primary Playback Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-b border-slate-800/80 bg-slate-900/60">
        {/* Left: Playback Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={hasHuman}
            title={
              hasHuman
                ? 'Make moves manually while a human player is active'
                : isRunning
                  ? 'Pause Simulation'
                  : 'Start Simulation'
            }
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold tracking-wide transition-all ${
              hasHuman
                ? 'bg-slate-800/60 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                : isRunning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60 hover:bg-amber-500/30 shadow-[0_0_16px_rgba(245,158,11,0.2)] cursor-pointer'
                  : 'bg-emerald-500/20 text-[#00ff9d] border border-emerald-400/60 hover:bg-emerald-500/30 shadow-[0_0_16px_rgba(0,255,157,0.25)] cursor-pointer'
            }`}
          >
            {isRunning && !hasHuman ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>{hasHuman ? 'Awaiting Human' : 'Start'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onStep}
            disabled={hasHuman}
            title="Step 1 Round"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
              hasHuman
                ? 'bg-slate-900/40 text-slate-600 border-slate-800 cursor-not-allowed'
                : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700/80 hover:text-white cursor-pointer'
            }`}
          >
            <StepForward className="w-4 h-4" />
            <span>Step 1 Round</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            title="Reset all scores and Q-Table memory"
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs sm:text-sm font-semibold text-rose-300 hover:bg-rose-500/20 hover:border-rose-400/60 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>

        {/* Center: Speed Segmented Control */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-950/80 p-1">
            {SPEED_OPTIONS.map((opt) => {
              const active = speed === opt.value;
              const isTurboOpt = opt.value === 'TURBO';
              return (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.title}
                  onClick={() => onSpeedChange(opt.value)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? isTurboOpt
                        ? 'bg-violet-500/30 text-violet-200 border border-violet-400/60 shadow-[0_0_14px_rgba(139,92,246,0.4)]'
                        : 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                      : 'text-slate-400 border border-transparent hover:text-slate-200'
                  }`}
                >
                  {isTurboOpt && <Zap className="w-3.5 h-3.5" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
          {speed === 'TURBO' && (
            <span className="hidden xl:inline-block font-mono text-[10px] text-violet-300/90">
              1000+ rounds/sec
            </span>
          )}
        </div>

        {/* Right: Telemetry & Collapse Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 font-mono text-xs">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Round:</span>
            <span className="font-bold text-white tabular-nums">
              {snapshot.round.toLocaleString('en-US')}
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-emerald-300 font-semibold tabular-nums">
              {roundsPerSec.toLocaleString('en-US')} rounds/sec
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-800/70 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700/80 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
            {settingsOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 3-Column Tactical Lab Settings Grid */}
      {settingsOpen && (
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
          {/* Column 1: Agent Brains */}
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Brain className="w-4 h-4 text-cyan-400" />
              <span>Agent Brains</span>
            </div>

            {/* Agent Alpha Selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="alpha-brain-select"
                className="flex items-center justify-between text-xs font-semibold text-cyan-300"
              >
                <span>Agent Alpha (Left)</span>
                <span className="font-mono text-[10px] text-slate-400">
                  {BRAIN_LABELS[alphaBrain].short}
                </span>
              </label>
              <select
                id="alpha-brain-select"
                value={alphaBrain}
                onChange={(e) => onBrainChange('alpha', e.target.value as BrainType)}
                className="w-full rounded-xl border border-slate-700/90 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 focus:border-cyan-400 focus:outline-none cursor-pointer"
              >
                {BRAIN_OPTIONS.map((b) => (
                  <option key={b} value={b} className="bg-slate-900 text-slate-100">
                    {BRAIN_LABELS[b].name} — {BRAIN_LABELS[b].short}
                  </option>
                ))}
              </select>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {BRAIN_LABELS[alphaBrain].description}
              </p>
            </div>

            {/* Agent Beta Selector */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/70">
              <label
                htmlFor="beta-brain-select"
                className="flex items-center justify-between text-xs font-semibold text-fuchsia-300"
              >
                <span>Agent Beta (Right)</span>
                <span className="font-mono text-[10px] text-slate-400">
                  {BRAIN_LABELS[betaBrain].short}
                </span>
              </label>
              <select
                id="beta-brain-select"
                value={betaBrain}
                onChange={(e) => onBrainChange('beta', e.target.value as BrainType)}
                className="w-full rounded-xl border border-slate-700/90 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 focus:border-fuchsia-400 focus:outline-none cursor-pointer"
              >
                {BRAIN_OPTIONS.map((b) => (
                  <option key={b} value={b} className="bg-slate-900 text-slate-100">
                    {BRAIN_LABELS[b].name} — {BRAIN_LABELS[b].short}
                  </option>
                ))}
              </select>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {BRAIN_LABELS[betaBrain].description}
              </p>
            </div>
          </div>

          {/* Column 2: RL Hyperparameters & Noise */}
          <div className="p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Sliders className="w-4 h-4 text-violet-400" />
              <span>RL Hyperparameters &amp; Noise</span>
            </div>

            {/* Learning Rate alpha */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Learning Rate (α)</span>
                <span className="font-mono font-bold text-cyan-300">
                  {hyperparams.alpha.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.01}
                max={1.0}
                step={0.01}
                value={hyperparams.alpha}
                onChange={(e) =>
                  onHyperparamsChange({ ...hyperparams, alpha: Number(e.target.value) })
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Discount Factor gamma */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Discount Factor (γ)</span>
                <span className="font-mono font-bold text-cyan-300">
                  {hyperparams.gamma.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.0}
                max={0.99}
                step={0.01}
                value={hyperparams.gamma}
                onChange={(e) =>
                  onHyperparamsChange({ ...hyperparams, gamma: Number(e.target.value) })
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Exploration Rate epsilon */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Exploration Rate (ε)</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-violet-300">
                    {(hyperparams.epsilon * 100).toFixed(0)}%
                  </span>
                  <button
                    type="button"
                    title="Apply this ε value to active agents"
                    onClick={() => onHyperparamsChange({ ...hyperparams }, true)}
                    className="inline-flex items-center gap-1 rounded border border-violet-500/40 bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-mono text-violet-200 hover:bg-violet-500/25 cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    Apply
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={0.0}
                max={1.0}
                step={0.01}
                value={hyperparams.epsilon}
                onChange={(e) =>
                  onHyperparamsChange(
                    { ...hyperparams, epsilon: Number(e.target.value) },
                    true,
                  )
                }
                className="w-full accent-violet-400 cursor-pointer"
              />
            </div>

            {/* Epsilon Decay */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Epsilon Decay</span>
                <span className="font-mono font-bold text-violet-300">
                  {hyperparams.epsilonDecay.toFixed(3)}
                </span>
              </div>
              <input
                type="range"
                min={0.98}
                max={1.0}
                step={0.001}
                value={hyperparams.epsilonDecay}
                onChange={(e) =>
                  onHyperparamsChange({
                    ...hyperparams,
                    epsilonDecay: Number(e.target.value),
                  })
                }
                className="w-full accent-violet-400 cursor-pointer"
              />
            </div>

            {/* Noise */}
            <div className="space-y-1 pt-2 border-t border-slate-800/70">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-300 font-medium">Communication Noise</span>
                <span className="font-mono font-bold text-amber-300">
                  {(noise * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={0.2}
                step={0.01}
                value={noise}
                onChange={(e) => onNoiseChange(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Column 3: Dynamic Payoff Matrix */}
          <div className="p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Grid2x2 className="w-4 h-4 text-[#00ff9d]" />
              <span>Dynamic Payoff Matrix</span>
            </div>

            {/* 2x2 Matrix Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* R: C/C */}
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-[#00ff9d]">R (C / C)</span>
                  <span className="text-slate-400">Reward</span>
                </div>
                <input
                  type="number"
                  value={payoffMatrix.R}
                  onChange={(e) => handlePayoffField('R', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-2.5 py-1.5 font-mono text-sm font-bold text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              {/* T: D/C */}
              <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-[#ff2a5f]">T (D / C)</span>
                  <span className="text-slate-400">Temptation</span>
                </div>
                <input
                  type="number"
                  value={payoffMatrix.T}
                  onChange={(e) => handlePayoffField('T', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-2.5 py-1.5 font-mono text-sm font-bold text-white focus:border-rose-400 focus:outline-none"
                />
              </div>

              {/* S: C/D */}
              <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 p-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-slate-300">S (C / D)</span>
                  <span className="text-slate-400">Sucker</span>
                </div>
                <input
                  type="number"
                  value={payoffMatrix.S}
                  onChange={(e) => handlePayoffField('S', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-2.5 py-1.5 font-mono text-sm font-bold text-white focus:border-slate-400 focus:outline-none"
                />
              </div>

              {/* P: D/D */}
              <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-amber-300">P (D / D)</span>
                  <span className="text-slate-400">Punishment</span>
                </div>
                <input
                  type="number"
                  value={payoffMatrix.P}
                  onChange={(e) => handlePayoffField('P', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-2.5 py-1.5 font-mono text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Quick Presets
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PAYOFF_PRESETS.map((preset) => {
                  const isActive =
                    payoffMatrix.R === preset.matrix.R &&
                    payoffMatrix.T === preset.matrix.T &&
                    payoffMatrix.S === preset.matrix.S &&
                    payoffMatrix.P === preset.matrix.P;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => onPayoffChange(preset.matrix)}
                      className={`rounded-lg border px-2 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
                        isActive
                          ? 'border-emerald-400/60 bg-emerald-500/20 text-[#00ff9d]'
                          : 'border-slate-700/80 bg-slate-900/80 text-slate-300 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
