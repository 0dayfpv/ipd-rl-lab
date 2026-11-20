import React from 'react';
import {
  Activity,
  Crosshair,
  HelpCircle,
  Radar,
  ShieldCheck,
  Skull,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { StrategyAnalysis, StrategyEquilibriumId } from '../../engine/types';

export interface StrategyDetectorProps {
  analysis: StrategyAnalysis;
  round: number;
}

interface SeverityStyle {
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeGlow: string;
  dot: string;
  panelAccent: string;
}

const SEVERITY_STYLES: Record<StrategyAnalysis['severity'], SeverityStyle> = {
  emerald: {
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-400/50',
    badgeText: 'text-emerald-300',
    badgeGlow: 'shadow-[0_0_24px_rgba(16,185,129,0.28)]',
    dot: 'bg-emerald-400',
    panelAccent: 'border-emerald-500/25',
  },
  red: {
    badgeBg: 'bg-rose-500/15',
    badgeBorder: 'border-rose-400/50',
    badgeText: 'text-rose-300',
    badgeGlow: 'shadow-[0_0_24px_rgba(244,63,94,0.28)]',
    dot: 'bg-rose-400',
    panelAccent: 'border-rose-500/25',
  },
  amber: {
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-400/50',
    badgeText: 'text-amber-300',
    badgeGlow: 'shadow-[0_0_24px_rgba(245,158,11,0.26)]',
    dot: 'bg-amber-400',
    panelAccent: 'border-amber-500/25',
  },
  purple: {
    badgeBg: 'bg-violet-500/15',
    badgeBorder: 'border-violet-400/50',
    badgeText: 'text-violet-300',
    badgeGlow: 'shadow-[0_0_24px_rgba(139,92,246,0.28)]',
    dot: 'bg-violet-400',
    panelAccent: 'border-violet-500/25',
  },
  cyan: {
    badgeBg: 'bg-cyan-500/15',
    badgeBorder: 'border-cyan-400/50',
    badgeText: 'text-cyan-300',
    badgeGlow: 'shadow-[0_0_24px_rgba(6,182,212,0.26)]',
    dot: 'bg-cyan-400',
    panelAccent: 'border-cyan-500/25',
  },
  slate: {
    badgeBg: 'bg-slate-700/30',
    badgeBorder: 'border-slate-500/40',
    badgeText: 'text-slate-300',
    badgeGlow: 'shadow-[0_0_16px_rgba(148,163,184,0.12)]',
    dot: 'bg-slate-400',
    panelAccent: 'border-slate-700/60',
  },
};

function renderEquilibriumIcon(id: StrategyEquilibriumId, className: string): React.ReactNode {
  switch (id) {
    case 'mutual-cooperation':
      return <ShieldCheck className={className} />;
    case 'nash-defection':
      return <Skull className={className} />;
    case 'alpha-exploiting':
    case 'beta-exploiting':
      return <Zap className={className} />;
    case 'alternating-retaliation':
      return <Activity className={className} />;
    case 'exploring-unstable':
      return <Sparkles className={className} />;
    case 'insufficient-data':
    default:
      return <HelpCircle className={className} />;
  }
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export const StrategyDetector: React.FC<StrategyDetectorProps> = ({ analysis, round }) => {
  const style = SEVERITY_STYLES[analysis.severity];

  const mutualCoop = clampPct(analysis.mutualCoopPct);
  const mutualDefect = clampPct(analysis.mutualDefectPct);
  const alphaExploit = clampPct(analysis.alphaExploitPct);
  const betaExploit = clampPct(analysis.betaExploitPct);
  const totalPct = mutualCoop + mutualDefect + alphaExploit + betaExploit;

  const segments = [
    {
      key: 'mutual-coop',
      label: 'Karşılıklı İş Birliği',
      shortCode: 'C-C',
      pct: mutualCoop,
      barClass: 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.45)]',
      dotClass: 'bg-emerald-400',
      textClass: 'text-emerald-300',
    },
    {
      key: 'mutual-defect',
      label: 'Karşılıklı İhanet',
      shortCode: 'D-D',
      pct: mutualDefect,
      barClass: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.45)]',
      dotClass: 'bg-rose-500',
      textClass: 'text-rose-300',
    },
    {
      key: 'alpha-exploit',
      label: 'Alpha Sömürüsü',
      shortCode: 'D-C',
      pct: alphaExploit,
      barClass: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]',
      dotClass: 'bg-amber-400',
      textClass: 'text-amber-300',
    },
    {
      key: 'beta-exploit',
      label: 'Beta Sömürüsü',
      shortCode: 'C-D',
      pct: betaExploit,
      barClass: 'bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.45)]',
      dotClass: 'bg-violet-400',
      textClass: 'text-violet-300',
    },
  ];

  return (
    <section
      className={`rounded-2xl border ${style.panelAccent} bg-slate-900/75 backdrop-blur-md p-4 sm:p-5 transition-colors duration-300`}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/90 border border-slate-700/80 text-cyan-400">
            <Radar className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
              Strateji Dedektörü{' '}
              <span className="text-slate-400 font-normal normal-case">(Son 50 Tur)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Oyun teorisi denge ve etkileşim rejimi analizi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950/70 px-2.5 py-1 text-slate-300">
            <Crosshair className="h-3.5 w-3.5 text-slate-400" />
            Tur #{round.toLocaleString('tr-TR')}
          </span>
          <span className="rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-slate-400">
            Pencere: {analysis.windowSize} tur
          </span>
        </div>
      </div>

      {/* Prominent Glowing Status Badge + Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-slate-950/65 p-3.5 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-semibold tracking-wide ${style.badgeBg} ${style.badgeBorder} ${style.badgeText} ${style.badgeGlow}`}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${style.dot}`}
              />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${style.dot}`} />
            </span>
            {renderEquilibriumIcon(analysis.id, 'h-4 w-4 shrink-0')}
            <span>{analysis.label}</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed md:text-right max-w-2xl">
          {analysis.description}
        </p>
      </div>

      {/* Stacked Horizontal Equilibrium Distribution Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
          <span>Denge Dağılımı</span>
          <span className="font-mono text-slate-500">
            {totalPct > 0 ? '100% Pencere Dağılımı' : 'Veri Bekleniyor'}
          </span>
        </div>

        <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-950/90 border border-slate-800 p-0.5 flex gap-0.5">
          {totalPct > 0 ? (
            segments.map((seg) =>
              seg.pct > 0 ? (
                <div
                  key={seg.key}
                  style={{ width: `${seg.pct}%` }}
                  title={`${seg.label}: %${seg.pct.toFixed(1)}`}
                  className={`h-full first:rounded-l-full last:rounded-r-full transition-all duration-300 ${seg.barClass}`}
                />
              ) : null,
            )
          ) : (
            <div className="h-full w-full rounded-full bg-slate-800/60" />
          )}
        </div>

        {/* Percentage Legend */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {segments.map((seg) => (
            <div
              key={seg.key}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${seg.dotClass}`} />
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-slate-200">{seg.label}</div>
                  <div className="font-mono text-[10px] text-slate-500">{seg.shortCode}</div>
                </div>
              </div>
              <span className={`font-mono text-sm font-semibold tabular-nums ${seg.textClass}`}>
                %{seg.pct.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
