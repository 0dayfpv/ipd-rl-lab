import React from 'react';
import { Brain, Cpu, Grid3X3, Info } from 'lucide-react';
import {
  BRAIN_LABELS,
  STATE_DESCRIPTIONS,
  TWO_ROUND_STATES,
  type AgentId,
  type BrainType,
  type QTableSnapshot,
  type QValuePair,
} from '../../engine/types';

export interface QTableHeatmapProps {
  alphaBrain: BrainType;
  betaBrain: BrainType;
  alphaQTable: QTableSnapshot;
  betaQTable: QTableSnapshot;
  alphaState: string;
  betaState: string;
}

interface AgentQTablePanelProps {
  agentId: AgentId;
  agentName: string;
  brain: BrainType;
  qTable: QTableSnapshot;
  activeState: string;
}

const DEFAULT_Q_PAIR: QValuePair = { COOPERATE: 0, DEFECT: 0, visits: 0 };

function computeTableBounds(qTable: QTableSnapshot): { minVal: number; maxVal: number } {
  let minVal = 0;
  let maxVal = 15;

  for (const state of TWO_ROUND_STATES) {
    const entry = qTable[state];
    if (!entry) continue;
    if (entry.COOPERATE < minVal) minVal = entry.COOPERATE;
    if (entry.DEFECT < minVal) minVal = entry.DEFECT;
    if (entry.COOPERATE > maxVal) maxVal = entry.COOPERATE;
    if (entry.DEFECT > maxVal) maxVal = entry.DEFECT;
  }

  return { minVal, maxVal };
}

function getCooperateCellStyle(value: number, minVal: number, maxVal: number): React.CSSProperties {
  if (value < 0) {
    const negSpan = Math.max(1, Math.abs(minVal));
    const intensity = Math.min(1, Math.abs(value) / negSpan);
    const alpha = 0.14 + intensity * 0.42;
    return {
      backgroundColor: `rgba(190, 18, 60, ${alpha.toFixed(3)})`,
    };
  }

  const posSpan = Math.max(15, maxVal);
  const intensity = Math.min(1, value / posSpan);
  if (intensity < 0.02) {
    return { backgroundColor: 'rgba(15, 23, 42, 0.55)' };
  }

  const alpha = 0.1 + intensity * 0.52;
  return {
    backgroundColor: `rgba(16, 185, 129, ${alpha.toFixed(3)})`,
  };
}

function getDefectCellStyle(value: number, minVal: number, maxVal: number): React.CSSProperties {
  if (value < 0) {
    const negSpan = Math.max(1, Math.abs(minVal));
    const intensity = Math.min(1, Math.abs(value) / negSpan);
    const alpha = 0.12 + intensity * 0.34;
    return {
      backgroundColor: `rgba(51, 65, 85, ${alpha.toFixed(3)})`,
    };
  }

  const posSpan = Math.max(15, maxVal);
  const intensity = Math.min(1, value / posSpan);
  if (intensity < 0.02) {
    return { backgroundColor: 'rgba(15, 23, 42, 0.55)' };
  }

  // Interpolate amber -> neon red as intensity increases
  const r = Math.round(245 + (239 - 245) * intensity);
  const g = Math.round(158 + (68 - 158) * intensity);
  const b = Math.round(11 + (68 - 11) * intensity);
  const alpha = 0.12 + intensity * 0.5;
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`,
  };
}

function renderColoredStateTokens(stateKey: string): React.ReactNode {
  return stateKey.split('').map((ch, idx) => {
    if (ch === 'C') {
      return (
        <span key={idx} className="text-emerald-400 font-semibold">
          C
        </span>
      );
    }
    if (ch === 'D') {
      return (
        <span key={idx} className="text-rose-400 font-semibold">
          D
        </span>
      );
    }
    return (
      <span key={idx} className="text-slate-500">
        {ch}
      </span>
    );
  });
}

const AgentQTablePanel: React.FC<AgentQTablePanelProps> = ({
  agentId,
  agentName,
  brain,
  qTable,
  activeState,
}) => {
  const isAlpha = agentId === 'alpha';
  const brainMeta = BRAIN_LABELS[brain];
  const isQLearning = brain === 'q-learning';

  const accentBorder = isAlpha ? 'border-sky-500/30' : 'border-fuchsia-500/30';
  const accentBadge = isAlpha
    ? 'bg-sky-500/15 text-sky-300 border-sky-400/40'
    : 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/40';
  const accentIconBg = isAlpha
    ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
    : 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400';
  const activeRowClasses = isAlpha
    ? 'ring-1 ring-inset ring-cyan-400/90 bg-cyan-500/10 shadow-[inset_0_0_16px_rgba(34,211,238,0.18)]'
    : 'ring-1 ring-inset ring-purple-400/90 bg-purple-500/10 shadow-[inset_0_0_16px_rgba(192,132,252,0.18)]';
  const activeDotClasses = isAlpha ? 'bg-cyan-400' : 'bg-purple-400';

  if (!isQLearning) {
    return (
      <section
        className={`rounded-2xl border ${accentBorder} bg-slate-900/75 backdrop-blur-md p-4 sm:p-5 flex flex-col`}
      >
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg border ${accentIconBg}`}
            >
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">{agentName} — Q-Tablosu</h3>
              <p className="text-[11px] text-slate-400">Hafıza Durumu & Politika Matrisi</p>
            </div>
          </div>
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${accentBadge}`}>
            {brainMeta.name}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-slate-800/90 bg-slate-950/60 p-6 text-center min-h-[260px]">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-900 text-slate-300">
            <Info className="h-5 w-5 text-slate-400" />
          </div>
          <div className="inline-flex items-center gap-2 mb-1.5">
            <span className="text-base font-semibold text-slate-100">{brainMeta.name}</span>
            <span className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] text-slate-300">
              {brainMeta.short}
            </span>
          </div>
          <p className="max-w-sm text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
            {brainMeta.description}
          </p>
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs text-slate-400">
            Canlı Q-Table öğrenme matrisi yalnızca{' '}
            <span className="font-semibold text-cyan-300">Q-Learning AI</span> modunda aktiftir.
          </div>
        </div>
      </section>
    );
  }

  const { minVal, maxVal } = computeTableBounds(qTable);
  let totalVisits = 0;
  let visitedStates = 0;
  for (const state of TWO_ROUND_STATES) {
    const visits = qTable[state]?.visits ?? 0;
    totalVisits += visits;
    if (visits > 0) visitedStates += 1;
  }

  return (
    <section
      className={`rounded-2xl border ${accentBorder} bg-slate-900/75 backdrop-blur-md p-4 sm:p-5 flex flex-col`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg border ${accentIconBg}`}
          >
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{agentName} — Q-Table Isı Haritası</h3>
            <p className="text-[11px] text-slate-400">
              16 İki-Turlu Durum • Ölçek [{minVal.toFixed(1)}, {maxVal.toFixed(1)}]
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="rounded-md border border-slate-800 bg-slate-950/70 px-2 py-0.5 text-slate-300">
            {visitedStates}/16 durum
          </span>
          <span className="rounded-md border border-slate-800 bg-slate-950/70 px-2 py-0.5 text-slate-400">
            Σn={totalVisits.toLocaleString('tr-TR')}
          </span>
        </div>
      </div>

      {/* Active Memory State Strip */}
      <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/65 px-3 py-1.5 text-xs">
        <span className="flex items-center gap-2 text-slate-400">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${activeDotClasses}`}
            />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${activeDotClasses}`} />
          </span>
          Aktif Hafıza Durumu:
        </span>
        <span className="font-mono text-xs text-slate-200">
          {activeState ? renderColoredStateTokens(activeState) : '—'}
        </span>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/90 bg-slate-950/60">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800/90 bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-400">
              <th className="py-2 pl-2.5 pr-2 font-medium">Durum (Son 2 Tur)</th>
              <th className="py-2 px-2 text-right font-medium text-emerald-400/90">
                Q(İş Birliği)
              </th>
              <th className="py-2 px-2 text-right font-medium text-rose-400/90">Q(İhanet)</th>
              <th className="py-2 px-2 text-center font-medium">Tercih</th>
              <th className="py-2 pl-1 pr-2.5 text-right font-medium">n</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {TWO_ROUND_STATES.map((stateKey) => {
              const entry = qTable[stateKey] ?? DEFAULT_Q_PAIR;
              const isActive = activeState === stateKey;
              const description = STATE_DESCRIPTIONS[stateKey] ?? '';
              const diff = entry.COOPERATE - entry.DEFECT;

              let prefLabel: 'C' | 'D' | '=' = '=';
              let prefClass = 'border-slate-700 bg-slate-800/80 text-slate-400';

              if (entry.visits > 0 && Math.abs(diff) > 1e-6) {
                if (diff > 0) {
                  prefLabel = 'C';
                  prefClass = 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300';
                } else {
                  prefLabel = 'D';
                  prefClass = 'border-rose-500/50 bg-rose-500/20 text-rose-300';
                }
              }

              return (
                <tr
                  key={stateKey}
                  title={description}
                  className={`transition-colors duration-150 ${
                    isActive ? activeRowClasses : 'hover:bg-slate-800/35'
                  }`}
                >
                  {/* State Badge + Tooltip Subtext */}
                  <td className="py-1.5 pl-2.5 pr-2 align-middle">
                    <div className="flex items-center gap-1.5">
                      {isActive && (
                        <span
                          className={`h-1.5 w-1.5 shrink-0 animate-pulse rounded-full ${activeDotClasses}`}
                        />
                      )}
                      <span className="inline-block rounded border border-slate-700/80 bg-slate-900/90 px-1.5 py-0.5 font-mono text-[11px] leading-none">
                        {renderColoredStateTokens(stateKey)}
                      </span>
                    </div>
                    {description && (
                      <div className="mt-0.5 max-w-[185px] truncate text-[10px] text-slate-500">
                        {description}
                      </div>
                    )}
                  </td>

                  {/* COOPERATE Q-value cell */}
                  <td className="py-1 px-1.5 align-middle">
                    <div
                      style={getCooperateCellStyle(entry.COOPERATE, minVal, maxVal)}
                      className="rounded-md border border-slate-800/50 px-2 py-1 text-right font-mono text-[11px] font-medium tabular-nums text-slate-100 transition-colors duration-200"
                    >
                      {entry.COOPERATE.toFixed(2)}
                    </div>
                  </td>

                  {/* DEFECT Q-value cell */}
                  <td className="py-1 px-1.5 align-middle">
                    <div
                      style={getDefectCellStyle(entry.DEFECT, minVal, maxVal)}
                      className="rounded-md border border-slate-800/50 px-2 py-1 text-right font-mono text-[11px] font-medium tabular-nums text-slate-100 transition-colors duration-200"
                    >
                      {entry.DEFECT.toFixed(2)}
                    </div>
                  </td>

                  {/* Preferred Action Pill */}
                  <td className="py-1 px-2 text-center align-middle">
                    <span
                      className={`inline-flex h-5 w-6 items-center justify-center rounded-md border font-mono text-[11px] font-bold ${prefClass}`}
                    >
                      {prefLabel}
                    </span>
                  </td>

                  {/* Visit Count */}
                  <td className="py-1 pl-1 pr-2.5 text-right font-mono text-[11px] tabular-nums text-slate-400 align-middle">
                    {entry.visits}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export const QTableHeatmap: React.FC<QTableHeatmapProps> = ({
  alphaBrain,
  betaBrain,
  alphaQTable,
  betaQTable,
  alphaState,
  betaState,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <Grid3X3 className="h-4 w-4 text-cyan-400" />
          <span>Canlı Q-Table Öğrenme Matrisleri</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/70" />
            Yüksek Q(C)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500/70" />
            Yüksek Q(D)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            Aktif Durum
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AgentQTablePanel
          agentId="alpha"
          agentName="Agent Alpha"
          brain={alphaBrain}
          qTable={alphaQTable}
          activeState={alphaState}
        />
        <AgentQTablePanel
          agentId="beta"
          agentName="Agent Beta"
          brain={betaBrain}
          qTable={betaQTable}
          activeState={betaState}
        />
      </div>
    </div>
  );
};
