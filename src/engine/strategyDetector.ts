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
      label: 'Veri Toplanıyor...',
      description:
        'Denge analizi için en az 10 tur tamamlanması bekleniyor.',
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
      label: 'Karşılıklı İş Birliği Kuruldu',
      description:
        'Her iki ajan da yüksek ortak kazanç sağlayan Pareto-optimal iş birliği dengesine ulaştı.',
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
      label: 'Nash Dengesi: İhanet Sarmalı',
      description:
        'Ajanlar karşılıklı güvensizlik nedeniyle düşük getirili Nash ihanet dengesine kilitlendi.',
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
      label: "Alpha, Beta'yı Sömürüyor",
      description:
        "Alpha tutarlı biçimde ihanet ederek Beta'nın iş birliği eğiliminden tek taraflı kazanç sağlıyor.",
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
      label: "Beta, Alpha'yı Sömürüyor",
      description:
        "Beta tutarlı biçimde ihanet ederek Alpha'nın iş birliği eğiliminden tek taraflı kazanç sağlıyor.",
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
      label: 'Karşılıklı Misilleme / Dalgalanma',
      description:
        'Ajanlar arasında asimetrik hamleler, karşılıklı misillemeler veya dönüşümlü strateji salınımları gözleniyor.',
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
    label: 'Keşif Aşaması / Kararsız Denge',
    description:
      'Ajanlar farklı stratejileri test ediyor; henüz baskın ve kalıcı bir oyun teorik denge oluşmadı.',
    severity: 'purple',
    windowSize,
    mutualCoopPct,
    mutualDefectPct,
    alphaExploitPct,
    betaExploitPct,
  };
}
