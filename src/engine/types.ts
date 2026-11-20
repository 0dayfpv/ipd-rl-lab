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
    description: 'Tabular Q-Learning reinforcement learning model trained from scratch.',
  },
  'tit-for-tat': {
    name: 'Tit-for-Tat',
    short: 'Reciprocal',
    description: 'Cooperates on round 1, then mirrors the opponent\'s previous move.',
  },
  'grim-trigger': {
    name: 'Grim Trigger',
    short: 'Unforgiving',
    description: 'Cooperates until betrayed once, then defects for the rest of the game.',
  },
  'always-defect': {
    name: 'Always Defect',
    short: 'All-D',
    description: 'Unconditionally chooses DEFECT on every round.',
  },
  'always-cooperate': {
    name: 'Always Cooperate',
    short: 'All-C',
    description: 'Unconditionally chooses COOPERATE on every round.',
  },
  human: {
    name: 'Human Player',
    short: 'Manual',
    description: 'Play manually against an AI agent using buttons or keyboard (C/D).',
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
  '[C-C, C-C]': 'Mutual cooperation for two consecutive rounds',
  '[C-C, C-D]': 'Opponent defected after cooperation',
  '[C-C, D-C]': 'We defected after cooperation',
  '[C-C, D-D]': 'Cooperation broke down into mutual defection',
  '[C-D, C-C]': 'Peace restored after opponent defected',
  '[C-D, C-D]': 'Opponent exploited us for two rounds',
  '[C-D, D-C]': 'Retaliated and caught the opponent cooperating',
  '[C-D, D-D]': 'Mutual conflict after opponent defected',
  '[D-C, C-C]': 'Returned to cooperation after our defection',
  '[D-C, C-D]': 'Opponent retaliated against our defection',
  '[D-C, D-C]': 'Exploited the opponent for two rounds',
  '[D-C, D-D]': 'Opponent switched to defense after our exploitation',
  '[D-D, C-C]': 'Mutual peace restored after conflict',
  '[D-D, C-D]': 'Our peace attempt was rejected after conflict',
  '[D-D, D-C]': 'Exploited opponent\'s peace attempt after conflict',
  '[D-D, D-D]': 'Mutual defection spiral for two rounds',
};
