import { RoundOutcome, StrategyAnalysis } from './types';

const ANALYSIS_WINDOW = 50;
const MIN_ROUNDS_FOR_ANALYSIS = 10;

function roundPct(count: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((count / total) * 1000) / 10;
}

export function analyzeStrategy(
  recentRounds: ReadonlyArray<RoundOutcome>,
): StrategyAnalysis {
  const window =
    recentRounds.length > ANALYSIS_WINDOW
      ? recentRounds.slice(recentRounds.length - ANALYSIS_WINDOW)
      : recentRounds;
  const windowSize = window.length;

  let mutualCoop = 0;
  let mutualDefect = 0;
  let alphaExploit = 0;
  let betaExploit = 0;

  for (let i = 0; i < windowSize; i++) {
    const r = window[i];
    if (r.alphaAction === 'COOPERATE' && r.betaAction === 'COOPERATE') {
      mutualCoop += 1;
    } else if (r.alphaAction === 'DEFECT' && r.betaAction === 'DEFECT') {
      mutualDefect += 1;
    } else if (r.alphaAction === 'DEFECT' && r.betaAction === 'COOPERATE') {
      alphaExploit += 1;
    } else {
      betaExploit += 1;
    }
  }

  const mutualCoopPct = roundPct(mutualCoop, windowSize);
  const mutualDefectPct = roundPct(mutualDefect, windowSize);
  const alphaExploitPct = roundPct(alphaExploit, windowSize);
  const betaExploitPct = roundPct(betaExploit, windowSize);

  if (windowSize < MIN_ROUNDS_FOR_ANALYSIS) {
    return {
      id: 'insufficient-data',
      label: 'Collecting Data...',
      description:
        'Waiting for at least 10 completed rounds to evaluate equilibrium.',
      severity: 'slate',
      windowSize,
      mutualCoopPct,
      mutualDefectPct,
      alphaExploitPct,
      betaExploitPct,
    };
  }

  if (mutualCoopPct >= 70) {
    return {
      id: 'mutual-cooperation',
      label: 'Mutual Cooperation Established',
      description:
        'Both agents converged to the Pareto-optimal mutual cooperation equilibrium with high joint payoff.',
      severity: 'emerald',
      windowSize,
      mutualCoopPct,
      mutualDefectPct,
      alphaExploitPct,
      betaExploitPct,
    };
  }

  if (mutualDefectPct >= 70) {
    return {
      id: 'nash-defection',
      label: 'Nash Equilibrium: Defection Spiral',
      description:
        'Mutual distrust locked both agents into the low-payoff Nash defection equilibrium.',
      severity: 'red',
      windowSize,
      mutualCoopPct,
      mutualDefectPct,
      alphaExploitPct,
      betaExploitPct,
    };
  }

  if (alphaExploitPct >= 50) {
    return {
      id: 'alpha-exploiting',
      label: 'Alpha Exploiting Beta',
      description:
        "Alpha consistently defects to extract unilateral payoff from Beta's cooperation.",
      severity: 'amber',
      windowSize,
      mutualCoopPct,
      mutualDefectPct,
      alphaExploitPct,
      betaExploitPct,
    };
  }

  if (betaExploitPct >= 50) {
    return {
      id: 'beta-exploiting',
      label: 'Beta Exploiting Alpha',
      description:
        "Beta consistently defects to extract unilateral payoff from Alpha's cooperation.",
      severity: 'amber',
      windowSize,
      mutualCoopPct,
      mutualDefectPct,
      alphaExploitPct,
      betaExploitPct,
    };
  }

  if (alphaExploitPct + betaExploitPct >= 45) {
    return {
      id: 'alternating-retaliation',
      label: 'Mutual Retaliation / Oscillation',
      description:
        'Asymmetric moves, tit-for-tat retaliations, or alternating strategy cycles are occurring.',
      severity: 'cyan',
      windowSize,
      mutualCoopPct,
      mutualDefectPct,
      alphaExploitPct,
      betaExploitPct,
    };
  }

  return {
    id: 'exploring-unstable',
    label: 'Exploration Phase / Unstable Equilibrium',
    description:
      'Agents are still testing different strategies; no dominant long-term equilibrium has formed yet.',
    severity: 'purple',
    windowSize,
    mutualCoopPct,
    mutualDefectPct,
    alphaExploitPct,
    betaExploitPct,
  };
}
