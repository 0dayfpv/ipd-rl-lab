import React from 'react';
import {
  Brain,
  Cpu,
  User,
  ShieldCheck,
  Swords,
  Zap,
  Sparkles,
  AlertTriangle,
  Activity,
  History,
} from 'lucide-react';
import {
  Action,
  AgentId,
  BRAIN_LABELS,
  BrainType,
  DecisionMode,
  SimulationSnapshot,
  SimulationSpeed,
  STATE_DESCRIPTIONS,
} from '../../engine/types';

export interface DuelStageProps {
  snapshot: SimulationSnapshot;
  speed: SimulationSpeed;
  isRunning: boolean;
  onHumanAction: (agent: AgentId, action: Action) => void;
  pendingHumanActions: { alpha?: Action; beta?: Action };
}

function getModeBadgeConfig(mode: DecisionMode): {
  label: string;
  className: string;
  icon: React.ReactNode;
} {
  switch (mode) {
    case 'EXPLORING':
      return {
        label: 'EXPLORING (Random Trial)',
        className:
          'bg-violet-500/15 text-violet-300 border-violet-400/50 shadow-[0_0_14px_rgba(167,139,250,0.35)]',
        icon: <Sparkles className="w-3.5 h-3.5 text-violet-300 animate-pulse" />,
      };
    case 'EXPLOITING':
      return {
        label: 'EXPLOITING (Q-Table Policy)',
        className:
          'bg-cyan-500/15 text-cyan-300 border-cyan-400/45 shadow-[0_0_12px_rgba(34,211,238,0.22)]',
        icon: <Cpu className="w-3.5 h-3.5 text-cyan-300" />,
      };
    case 'HUMAN':
      return {
        label: 'HUMAN CONTROL',
        className:
          'bg-sky-500/15 text-sky-300 border-sky-400/45 shadow-[0_0_12px_rgba(56,189,248,0.2)]',
        icon: <User className="w-3.5 h-3.5 text-sky-300" />,
      };
    case 'STRATEGY':
    default:
      return {
        label: 'FIXED STRATEGY',
        className: 'bg-amber-500/10 text-amber-300 border-amber-400/35',
        icon: <Brain className="w-3.5 h-3.5 text-amber-300" />,
      };
  }
}

function getActionMeta(action: Action): {
  label: string;
  short: 'C' | 'D';
  textClass: string;
  bgClass: string;
  borderClass: string;
  glowClass: string;
  beamClass: string;
} {
  if (action === 'COOPERATE') {
    return {
      label: 'COOPERATE',
      short: 'C',
      textClass: 'text-[#00ff9d]',
      bgClass: 'bg-emerald-500/15',
      borderClass: 'border-emerald-400/60',
      glowClass: 'shadow-[0_0_20px_rgba(0,255,157,0.3)]',
      beamClass: 'from-emerald-400/90 via-[#00ff9d] to-emerald-300/30',
    };
  }
  return {
    label: 'DEFECT',
    short: 'D',
    textClass: 'text-[#ff2a5f]',
    bgClass: 'bg-rose-500/15',
    borderClass: 'border-rose-500/60',
    glowClass: 'shadow-[0_0_20px_rgba(255,42,95,0.35)]',
    beamClass: 'from-rose-500/90 via-[#ff2a5f] to-rose-400/30',
  };
}

interface AgentPodProps {
  side: AgentId;
  name: string;
  brain: BrainType;
  score: number;
  mode: DecisionMode;
  epsilon: number;
  stateKey: string;
  lastAction?: Action;
  lastReward?: number;
  lastNoisy?: boolean;
  lastIntended?: Action;
  roundKey?: number;
  isTurbo: boolean;
}

const AgentPod: React.FC<AgentPodProps> = ({
  side,
  name,
  brain,
  score,
  mode,
  epsilon,
  stateKey,
  lastAction,
  lastReward,
  lastNoisy,
  lastIntended,
  roundKey,
  isTurbo,
}) => {
  const modeBadge = getModeBadgeConfig(mode);
  const brainInfo = BRAIN_LABELS[brain];
  const isAlpha = side === 'alpha';
  const accentBorder =
    mode === 'EXPLORING'
      ? 'border-violet-500/50 shadow-[0_0_24px_rgba(139,92,246,0.18)]'
      : lastAction === 'COOPERATE'
        ? 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
        : lastAction === 'DEFECT'
          ? 'border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.12)]'
          : 'border-slate-700/70';

  const stateDesc = STATE_DESCRIPTIONS[stateKey] ?? 'Initial state';

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border bg-slate-900/75 backdrop-blur-md p-4 transition-colors duration-200 ${accentBorder}`}
    >
      {/* Floating Score Popup */}
      {!isTurbo && roundKey !== undefined && lastReward !== undefined && (
        <div
          key={`${side}-score-${roundKey}`}
          className={`pointer-events-none absolute -top-3 ${
            isAlpha ? 'right-4' : 'left-4'
          } z-20 animate-float-score font-mono text-lg font-extrabold px-2.5 py-0.5 rounded-full border ${
            lastReward >= 4
              ? 'bg-rose-500/25 text-[#ff2a5f] border-rose-400/60 shadow-[0_0_14px_rgba(255,42,95,0.45)]'
              : lastReward >= 3
                ? 'bg-emerald-500/25 text-[#00ff9d] border-emerald-400/60 shadow-[0_0_14px_rgba(0,255,157,0.4)]'
                : lastReward > 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                  : 'bg-slate-800/90 text-slate-400 border-slate-600'
          }`}
        >
          {lastReward > 0 ? `+${lastReward}` : '0'}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                isAlpha
                  ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                  : 'bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.8)]'
              }`}
            />
            <h3 className="text-sm font-bold tracking-wider uppercase text-slate-100 truncate">
              {name}
            </h3>
          </div>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-slate-800/90 border border-slate-700/80 px-2 py-0.5 text-[11px] font-medium text-slate-300">
            <Brain className="w-3 h-3 text-slate-400" />
            <span>{brainInfo.name}</span>
          </div>
        </div>

        {/* Total Score */}
        <div className="text-right shrink-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
            TOTAL SCORE
          </div>
          <div className="font-mono text-2xl font-extrabold tracking-tight text-white tabular-nums">
            {score.toLocaleString('en-US')}
          </div>
        </div>
      </div>

      {/* Mental State Pill */}
      <div className="mt-3">
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${modeBadge.className}`}
        >
          {modeBadge.icon}
          <span>{modeBadge.label}</span>
        </div>
      </div>

      {/* Noise Glitch Indicator */}
      {!isTurbo && lastNoisy && lastIntended && lastAction && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-amber-400/60 bg-amber-500/15 px-2.5 py-1 text-[11px] font-mono font-semibold text-amber-300 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>
            NOISE GLITCH:{' '}
            {lastIntended === 'COOPERATE' ? 'C' : 'D'} →{' '}
            {lastAction === 'COOPERATE' ? 'C' : 'D'}
          </span>
        </div>
      )}

      {/* Telemetry: Epsilon & State Key */}
      <div className="mt-3.5 space-y-2.5 border-t border-slate-800/90 pt-3">
        {brain === 'q-learning' && (
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400">Exploration Rate (ε)</span>
              <span
                className={
                  mode === 'EXPLORING' ? 'text-violet-300 font-bold' : 'text-cyan-300 font-semibold'
                }
              >
                {(epsilon * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  mode === 'EXPLORING'
                    ? 'bg-gradient-to-r from-violet-500 to-fuchsia-400 shadow-[0_0_10px_rgba(167,139,250,0.7)]'
                    : 'bg-gradient-to-r from-cyan-500 to-violet-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, epsilon * 100))}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-400 shrink-0">State:</span>
          <span
            title={stateDesc}
            className="font-mono text-xs font-semibold text-slate-200 bg-slate-950/80 border border-slate-800 rounded px-2 py-0.5 truncate"
          >
            {stateKey}
          </span>
        </div>
        <div className="text-[10px] text-slate-400/90 truncate" title={stateDesc}>
          {stateDesc}
        </div>
      </div>
    </div>
  );
};

export const DuelStage: React.FC<DuelStageProps> = ({
  snapshot,
  speed,
  isRunning,
  onHumanAction,
  pendingHumanActions,
}) => {
  const { lastRound, recentRounds, alphaBrain, betaBrain } = snapshot;
  const isTurbo = speed === 'TURBO';
  const alphaHuman = alphaBrain === 'human';
  const betaHuman = betaBrain === 'human';
  const hasHuman = alphaHuman || betaHuman;
  const bothHuman = alphaHuman && betaHuman;

  const last12 = recentRounds.slice(-12);

  const alphaMeta = lastRound ? getActionMeta(lastRound.alphaAction) : null;
  const betaMeta = lastRound ? getActionMeta(lastRound.betaAction) : null;

  return (
    <section className="rounded-2xl border border-slate-800/90 bg-slate-950/70 backdrop-blur-md p-4 sm:p-5 shadow-2xl">
      {/* Arena Header Strip */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Activity
            className={`w-4 h-4 ${
              isRunning ? 'text-[#00ff9d] animate-pulse' : 'text-slate-500'
            }`}
          />
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
            LIVE DUEL ARENA
          </h2>
          <span
            className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold uppercase border ${
              isTurbo && isRunning
                ? 'bg-violet-500/20 text-violet-300 border-violet-400/50'
                : isRunning
                  ? 'bg-emerald-500/15 text-[#00ff9d] border-emerald-500/40'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700'
            }`}
          >
            {isTurbo && isRunning ? 'TURBO' : isRunning ? 'ACTIVE' : 'PAUSED'}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
          <span>
            ROUND:{' '}
            <strong className="text-slate-100 tabular-nums">
              #{snapshot.round.toLocaleString('en-US')}
            </strong>
          </span>
          {snapshot.noise > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[11px] text-amber-300">
              <AlertTriangle className="w-3 h-3" />
              Noise {(snapshot.noise * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Main 3-Column Duel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Agent Alpha */}
        <div className="lg:col-span-4">
          <AgentPod
            side="alpha"
            name="Agent Alpha"
            brain={snapshot.alphaBrain}
            score={snapshot.alphaScore}
            mode={snapshot.alphaMode}
            epsilon={snapshot.alphaEpsilon}
            stateKey={snapshot.alphaState}
            lastAction={lastRound?.alphaAction}
            lastReward={lastRound?.alphaReward}
            lastNoisy={lastRound?.alphaNoisy}
            lastIntended={lastRound?.alphaIntended}
            roundKey={lastRound?.round}
            isTurbo={isTurbo}
          />
        </div>

        {/* Center: Live Clash Arena */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 relative overflow-hidden min-h-[210px]">
          {/* Subtle radial arena glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.06),transparent_65%)]" />

          {isTurbo ? (
            /* TURBO MODE TELEMETRY */
            <div className="relative z-10 flex flex-col items-center text-center w-full space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/60 bg-violet-500/20 px-3.5 py-1.5 text-xs font-mono font-bold text-violet-200 shadow-[0_0_24px_rgba(139,92,246,0.4)]">
                <Zap className="w-4 h-4 text-violet-300" />
                <span>TURBO TRAINING MODE ACTIVE (1000+ rounds/sec)</span>
              </div>

              <div className="font-mono text-3xl font-black text-white tabular-nums tracking-tight">
                {snapshot.round.toLocaleString('en-US')}
                <span className="ml-1.5 text-xs font-normal uppercase tracking-widest text-slate-400">
                  ROUNDS
                </span>
              </div>

              {lastRound && alphaMeta && betaMeta ? (
                <div className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 flex items-center justify-between text-xs font-mono">
                  <span className={`font-bold ${alphaMeta.textClass}`}>
                    α: {alphaMeta.short} (+{lastRound.alphaReward})
                  </span>
                  <span className="text-slate-500">vs</span>
                  <span className={`font-bold ${betaMeta.textClass}`}>
                    β: {betaMeta.short} (+{lastRound.betaReward})
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Press Start for high-speed training.
                </p>
              )}
            </div>
          ) : lastRound && alphaMeta && betaMeta ? (
            /* ANIMATED LIVE CLASH */
            <div className="relative z-10 w-full flex flex-col items-center justify-center space-y-4">
              {/* Energy Beams + Clash Badge Row */}
              <div className="w-full flex items-center justify-between gap-2">
                {/* Alpha Beam */}
                <div className="flex-1 h-2 rounded-full bg-slate-800/80 overflow-hidden">
                  <div
                    key={`beam-l-${lastRound.round}`}
                    className={`h-full w-full bg-gradient-to-r ${alphaMeta.beamClass} animate-beam-left`}
                  />
                </div>

                {/* Central Clash Badge */}
                <div
                  key={`clash-${lastRound.round}`}
                  className="animate-clash-pulse shrink-0 rounded-full border border-slate-700 bg-slate-950/95 px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest text-slate-200 shadow-lg"
                >
                  #{lastRound.round}
                </div>

                {/* Beta Beam */}
                <div className="flex-1 h-2 rounded-full bg-slate-800/80 overflow-hidden">
                  <div
                    key={`beam-r-${lastRound.round}`}
                    className={`h-full w-full bg-gradient-to-l ${betaMeta.beamClass} animate-beam-right`}
                  />
                </div>
              </div>

              {/* Action Cards Side-by-Side */}
              <div
                key={`cards-${lastRound.round}`}
                className="w-full grid grid-cols-2 gap-2.5 animate-clash-pulse"
              >
                {/* Alpha Action Card */}
                <div
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center ${alphaMeta.bgClass} ${alphaMeta.borderClass} ${alphaMeta.glowClass}`}
                >
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300">
                    ALPHA
                  </span>
                  <div className={`mt-1 flex items-center gap-1.5 font-bold text-xs sm:text-sm ${alphaMeta.textClass}`}>
                    {lastRound.alphaAction === 'COOPERATE' ? (
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                    ) : (
                      <Swords className="w-4 h-4 shrink-0" />
                    )}
                    <span>{alphaMeta.label}</span>
                  </div>
                  <span className="mt-1 font-mono text-xs font-semibold text-slate-200">
                    +{lastRound.alphaReward} pts
                  </span>
                </div>

                {/* Beta Action Card */}
                <div
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center ${betaMeta.bgClass} ${betaMeta.borderClass} ${betaMeta.glowClass}`}
                >
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300">
                    BETA
                  </span>
                  <div className={`mt-1 flex items-center gap-1.5 font-bold text-xs sm:text-sm ${betaMeta.textClass}`}>
                    {lastRound.betaAction === 'COOPERATE' ? (
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                    ) : (
                      <Swords className="w-4 h-4 shrink-0" />
                    )}
                    <span>{betaMeta.label}</span>
                  </div>
                  <span className="mt-1 font-mono text-xs font-semibold text-slate-200">
                    +{lastRound.betaReward} pts
                  </span>
                </div>
              </div>

              {/* Outcome Tag */}
              <div className="text-[11px] font-mono text-slate-400">
                {lastRound.alphaAction === 'COOPERATE' && lastRound.betaAction === 'COOPERATE'
                  ? 'Mutual Cooperation (R / R)'
                  : lastRound.alphaAction === 'DEFECT' && lastRound.betaAction === 'DEFECT'
                    ? 'Mutual Defection — Punishment (P / P)'
                    : lastRound.alphaAction === 'DEFECT'
                      ? 'Alpha Exploited via Defection (T / S)'
                      : 'Beta Exploited via Defection (S / T)'}
              </div>
            </div>
          ) : (
            /* STANDBY STATE */
            <div className="relative z-10 flex flex-col items-center text-center space-y-2">
              <div className="rounded-full border border-slate-700/80 bg-slate-800/60 p-3">
                <Swords className="w-6 h-6 text-slate-400" />
              </div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-slate-300">
                ARENA READY
              </div>
              <p className="text-xs text-slate-400 max-w-[220px]">
                {hasHuman
                  ? 'Use the action buttons below or your keyboard to start the first round.'
                  : 'Click Start or Step 1 Round to begin the duel.'}
              </p>
            </div>
          )}
        </div>

        {/* Right: Agent Beta */}
        <div className="lg:col-span-4">
          <AgentPod
            side="beta"
            name="Agent Beta"
            brain={snapshot.betaBrain}
            score={snapshot.betaScore}
            mode={snapshot.betaMode}
            epsilon={snapshot.betaEpsilon}
            stateKey={snapshot.betaState}
            lastAction={lastRound?.betaAction}
            lastReward={lastRound?.betaReward}
            lastNoisy={lastRound?.betaNoisy}
            lastIntended={lastRound?.betaIntended}
            roundKey={lastRound?.round}
            isTurbo={isTurbo}
          />
        </div>
      </div>

      {/* Human Player Tactical Action Controls */}
      {hasHuman && (
        <div className="mt-4 rounded-xl border border-sky-500/35 bg-sky-950/20 p-3.5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-300">
              <User className="w-4 h-4" />
              <span>HUMAN PLAYER CONTROL</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {bothHuman
                ? 'Keyboard: Alpha [C/D] · Beta [J/K]'
                : 'Keyboard Shortcuts: [C] Cooperate · [D] Defect'}
            </span>
          </div>

          <div
            className={`grid gap-3 ${
              bothHuman ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {alphaHuman && (
              <div className="space-y-1.5">
                {bothHuman && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
                    <span>AGENT ALPHA MOVE</span>
                    {pendingHumanActions.alpha && (
                      <span className="text-emerald-300">Selected ✓</span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onHumanAction('alpha', 'COOPERATE')}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold tracking-wide transition-all cursor-pointer ${
                      pendingHumanActions.alpha === 'COOPERATE'
                        ? 'bg-emerald-500/30 border-[#00ff9d] text-[#00ff9d] shadow-[0_0_20px_rgba(0,255,157,0.4)] scale-[0.99]'
                        : 'bg-emerald-500/15 border-emerald-400/50 text-[#00ff9d] hover:bg-emerald-500/25 hover:shadow-[0_0_18px_rgba(0,255,157,0.3)]'
                    }`}
                  >
                    <kbd className="rounded bg-slate-950/80 border border-emerald-400/40 px-1.5 py-0.5 font-mono text-xs">
                      C
                    </kbd>
                    <ShieldCheck className="w-4 h-4" />
                    <span>COOPERATE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onHumanAction('alpha', 'DEFECT')}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold tracking-wide transition-all cursor-pointer ${
                      pendingHumanActions.alpha === 'DEFECT'
                        ? 'bg-rose-500/30 border-[#ff2a5f] text-[#ff2a5f] shadow-[0_0_20px_rgba(255,42,95,0.45)] scale-[0.99]'
                        : 'bg-rose-500/15 border-rose-500/50 text-[#ff2a5f] hover:bg-rose-500/25 hover:shadow-[0_0_18px_rgba(255,42,95,0.35)]'
                    }`}
                  >
                    <kbd className="rounded bg-slate-950/80 border border-rose-500/40 px-1.5 py-0.5 font-mono text-xs">
                      D
                    </kbd>
                    <Swords className="w-4 h-4" />
                    <span>DEFECT</span>
                  </button>
                </div>
              </div>
            )}

            {betaHuman && (
              <div className="space-y-1.5">
                {bothHuman && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-fuchsia-300">
                    <span>AGENT BETA MOVE</span>
                    {pendingHumanActions.beta && (
                      <span className="text-emerald-300">Selected ✓</span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onHumanAction('beta', 'COOPERATE')}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold tracking-wide transition-all cursor-pointer ${
                      pendingHumanActions.beta === 'COOPERATE'
                        ? 'bg-emerald-500/30 border-[#00ff9d] text-[#00ff9d] shadow-[0_0_20px_rgba(0,255,157,0.4)] scale-[0.99]'
                        : 'bg-emerald-500/15 border-emerald-400/50 text-[#00ff9d] hover:bg-emerald-500/25 hover:shadow-[0_0_18px_rgba(0,255,157,0.3)]'
                    }`}
                  >
                    <kbd className="rounded bg-slate-950/80 border border-emerald-400/40 px-1.5 py-0.5 font-mono text-xs">
                      {bothHuman ? 'J' : 'C'}
                    </kbd>
                    <ShieldCheck className="w-4 h-4" />
                    <span>COOPERATE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onHumanAction('beta', 'DEFECT')}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold tracking-wide transition-all cursor-pointer ${
                      pendingHumanActions.beta === 'DEFECT'
                        ? 'bg-rose-500/30 border-[#ff2a5f] text-[#ff2a5f] shadow-[0_0_20px_rgba(255,42,95,0.45)] scale-[0.99]'
                        : 'bg-rose-500/15 border-rose-500/50 text-[#ff2a5f] hover:bg-rose-500/25 hover:shadow-[0_0_18px_rgba(255,42,95,0.35)]'
                    }`}
                  >
                    <kbd className="rounded bg-slate-950/80 border border-rose-500/40 px-1.5 py-0.5 font-mono text-xs">
                      {bothHuman ? 'K' : 'D'}
                    </kbd>
                    <Swords className="w-4 h-4" />
                    <span>DEFECT</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact Recent 12-Round Visual History Strip */}
      <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-900/50 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-400">
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>LAST 12 ROUNDS HISTORY</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#00ff9d]" /> C = Cooperate
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#ff2a5f]" /> D = Defect
            </span>
          </div>
        </div>

        {last12.length === 0 ? (
          <div className="text-center py-1.5 text-xs font-mono text-slate-500">
            No rounds played yet.
          </div>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {/* Row labels */}
            <div className="flex flex-col gap-1 pr-1.5 text-[10px] font-mono text-slate-400 shrink-0">
              <span className="h-5 flex items-center text-cyan-300 font-semibold">α</span>
              <span className="h-5 flex items-center text-fuchsia-300 font-semibold">β</span>
            </div>

            {last12.map((r) => {
              const aC = r.alphaAction === 'COOPERATE';
              const bC = r.betaAction === 'COOPERATE';
              return (
                <div
                  key={r.round}
                  title={`Round #${r.round}: Alpha ${aC ? 'C' : 'D'} (+${r.alphaReward}) vs Beta ${bC ? 'C' : 'D'} (+${r.betaReward})`}
                  className="flex flex-col items-center gap-1 shrink-0 min-w-[28px]"
                >
                  <span
                    className={`w-7 h-5 flex items-center justify-center rounded text-[11px] font-mono font-bold border ${
                      aC
                        ? 'bg-emerald-500/20 text-[#00ff9d] border-emerald-500/45'
                        : 'bg-rose-500/20 text-[#ff2a5f] border-rose-500/45'
                    } ${r.alphaNoisy ? 'ring-1 ring-amber-400' : ''}`}
                  >
                    {aC ? 'C' : 'D'}
                  </span>
                  <span
                    className={`w-7 h-5 flex items-center justify-center rounded text-[11px] font-mono font-bold border ${
                      bC
                        ? 'bg-emerald-500/20 text-[#00ff9d] border-emerald-500/45'
                        : 'bg-rose-500/20 text-[#ff2a5f] border-rose-500/45'
                    } ${r.betaNoisy ? 'ring-1 ring-amber-400' : ''}`}
                  >
                    {bC ? 'C' : 'D'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
