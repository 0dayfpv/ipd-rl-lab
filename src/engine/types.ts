export type Action = 'COOPERATE' | 'DEFECT';

export type ShortAction = 'C' | 'D';

export type BrainType =
  | 'q-learning'
  | 'tit-for-tat'
  | 'grim-trigger'
  | 'always-defect'
  | 'always-cooperate'
  | 'human';

export type AgentId = 'alpha' | 'beta';

export type DecisionMode = 'EXPLORING' | 'EXPLOITING' | 'STRATEGY' | 'HUMAN';

export type SimulationSpeed = '1x' | '10x' | '100x' | 'TURBO';

/**
 * Payoff matrix values for Iterated Prisoner's Dilemma:
 * - R (Reward): Both Cooperate (default: +3 / +3)
 * - T (Temptation): Self Defects, Opponent Cooperates (default: +5)
 * - S (Sucker): Self Cooperates, Opponent Defects (default: 0)
 * - P (Punishment): Both Defect (default: +1 / +1)
 */
export interface PayoffMatrix {
  R: number;
  T: number;
  S: number;
  P: number;
}

export interface QLearningHyperparams {
  alpha: number;        // Learning rate (0.01 - 1.0)
  gamma: number;        // Discount factor (0.0 - 0.99)
  epsilon: number;      // Initial / manual exploration rate (0.0 - 1.0)
  epsilonDecay: number; // Multiplicative decay per round (e.g., 0.995)
  minEpsilon: number;   // Minimum exploration rate floor (e.g., 0.02)
}

export interface QValuePair {
  COOPERATE: number;
  DEFECT: number;
  visits: number;
}

export type QTableSnapshot = Record<string, QValuePair>;

export interface RoundOutcome {
  round: number;
  alphaIntended: Action;
  betaIntended: Action;
  alphaAction: Action;
  betaAction: Action;
  alphaNoisy: boolean;
  betaNoisy: boolean;
  alphaMode: DecisionMode;
  betaMode: DecisionMode;
  alphaReward: number;
  betaReward: number;
  alphaTotalScore: number;
  betaTotalScore: number;
  alphaState: string;
  betaState: string;
  alphaEpsilon: number;
  betaEpsilon: number;
}

export interface TelemetryPoint {
  round: number;
  alphaCoopRate: number;   // Rolling 100-round % (0-100)
  betaCoopRate: number;    // Rolling 100-round % (0-100)
  mutualCoopRate: number;  // Rolling 100-round % (0-100)
  alphaScore: number;      // Cumulative score
  betaScore: number;       // Cumulative score
}

export type StrategyEquilibriumId =
  | 'insufficient-data'
  | 'mutual-cooperation'
  | 'nash-defection'
  | 'alpha-exploiting'
  | 'beta-exploiting'
  | 'alternating-retaliation'
  | 'exploring-unstable';

export interface StrategyAnalysis {
  id: StrategyEquilibriumId;
  label: string;
  description: string;
  severity: 'emerald' | 'red' | 'amber' | 'purple' | 'cyan' | 'slate';
  windowSize: number;
  mutualCoopPct: number;
  mutualDefectPct: number;
  alphaExploitPct: number;
  betaExploitPct: number;
}

export interface SimulationSnapshot {
  round: number;
  alphaBrain: BrainType;
  betaBrain: BrainType;
  alphaScore: number;
  betaScore: number;
  alphaEpsilon: number;
  betaEpsilon: number;
  alphaState: string;
  betaState: string;
  alphaMode: DecisionMode;
  betaMode: DecisionMode;
  alphaQTable: QTableSnapshot;
  betaQTable: QTableSnapshot;
  lastRound: RoundOutcome | null;
  recentRounds: RoundOutcome[];       // Last 100 rounds for rolling stats & feed
  telemetry: TelemetryPoint[];        // Downsampled / rolling history for charts
  strategyAnalysis: StrategyAnalysis;
  payoffMatrix: PayoffMatrix;
  noise: number;                      // 0.0 to 0.20
  hyperparams: QLearningHyperparams;
}

export const DEFAULT_PAYOFF_MATRIX: PayoffMatrix = {
  R: 3,
  T: 5,
  S: 0,
  P: 1,
};

export const DEFAULT_HYPERPARAMS: QLearningHyperparams = {
  alpha: 0.15,
  gamma: 0.9,
  epsilon: 0.4,
  epsilonDecay: 0.996,
  minEpsilon: 0.03,
};

export const BRAIN_LABELS: Record<BrainType, { name: string; short: string; description: string }> = {
  'q-learning': {
    name: 'Q-Learning AI',
    short: 'RL Q-Table',
    description: 'Sıfırdan öğrenen Tabular Q-Learning pekiştirmeli öğrenme modeli.',
  },
  'tit-for-tat': {
    name: 'Tit-for-Tat',
    short: 'Kısasa Kısas',
    description: 'İlk tur iş birliği yapar, sonra rakibin bir önceki hamlesini taklit eder.',
  },
  'grim-trigger': {
    name: 'Grim Trigger',
    short: 'Acımasız Tetik',
    description: 'Rakip bir kez bile ihanet ederse oyun sonuna kadar hep ihanet eder.',
  },
  'always-defect': {
    name: 'Always Defect',
    short: 'Hep İhanet',
    description: 'Her turda koşulsuz olarak İhanet (DEFECT) seçer.',
  },
  'always-cooperate': {
    name: 'Always Cooperate',
    short: 'Hep İş Birliği',
    description: 'Her turda koşulsuz olarak İş Birliği (COOPERATE) seçer.',
  },
  human: {
    name: 'Human Player',
    short: 'İnsan Oyuncu',
    description: 'Klavye (C/D) veya butonlarla AI ajanına karşı manuel oyna.',
  },
};

/**
 * Canonical 16 two-round state keys (from an agent's own perspective: "[Self-Opp, Self-Opp]")
 * Older round first, most recent round second.
 */
export const TWO_ROUND_STATES: readonly string[] = [
  '[C-C, C-C]',
  '[C-C, C-D]',
  '[C-C, D-C]',
  '[C-C, D-D]',
  '[C-D, C-C]',
  '[C-D, C-D]',
  '[C-D, D-C]',
  '[C-D, D-D]',
  '[D-C, C-C]',
  '[D-C, C-D]',
  '[D-C, D-C]',
  '[D-C, D-D]',
  '[D-D, C-C]',
  '[D-D, C-D]',
  '[D-D, D-C]',
  '[D-D, D-D]',
] as const;

export const STATE_DESCRIPTIONS: Record<string, string> = {
  '[C-C, C-C]': 'İki turdur karşılıklı iş birliği',
  '[C-C, C-D]': 'İş birliği sonrası rakip ihanet etti',
  '[C-C, D-C]': 'İş birliği sonrası biz ihanet ettik',
  '[C-C, D-D]': 'İş birliği bozuldu, ikisi de ihanet etti',
  '[C-D, C-C]': 'Rakip ihanetinden sonra barış sağlandı',
  '[C-D, C-D]': 'İki turdur rakip bizi sömürüyor',
  '[C-D, D-C]': 'İhanete karşılık verip rakibi yakaladık',
  '[C-D, D-D]': 'İhanet sonrası karşılıklı çatışma',
  '[D-C, C-C]': 'İhanetimiz sonrası iş birliğine dönüldü',
  '[D-C, C-D]': 'İhanetimize rakip misilleme yaptı',
  '[D-C, D-C]': 'İki turdur rakibi sömürüyoruz',
  '[D-C, D-D]': 'Sömürümüz sonrası rakip savunmaya geçti',
  '[D-D, C-C]': 'Çatışma sonrası karşılıklı barış',
  '[D-D, C-D]': 'Çatışma sonrası barış denememiz reddedildi',
  '[D-D, D-C]': 'Çatışma sonrası rakibin barışını sömürdük',
  '[D-D, D-D]': 'İki turdur karşılıklı ihanet sarmalı',
};
