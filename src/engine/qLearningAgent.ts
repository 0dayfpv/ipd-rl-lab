import {
  Action,
  DEFAULT_HYPERPARAMS,
  DecisionMode,
  QLearningHyperparams,
  QTableSnapshot,
  QValuePair,
  TWO_ROUND_STATES,
} from './types';

const SINGLE_ROUND_STATES: readonly string[] = [
  '[C-C]',
  '[C-D]',
  '[D-C]',
  '[D-D]',
] as const;

const PREINITIALIZED_STATES: readonly string[] = [
  'INIT',
  ...SINGLE_ROUND_STATES,
  ...TWO_ROUND_STATES,
];

function createEmptyEntry(): QValuePair {
  return {
    COOPERATE: 0,
    DEFECT: 0,
    visits: 0,
  };
}

export class QLearningAgent {
  private qTable: Map<string, QValuePair>;
  private params: QLearningHyperparams;
  private currentEpsilon: number;

  constructor(params: QLearningHyperparams = DEFAULT_HYPERPARAMS) {
    this.params = { ...params };
    this.currentEpsilon = this.params.epsilon;
    this.qTable = new Map<string, QValuePair>();
    this.initTable();
  }

  private initTable(): void {
    this.qTable.clear();
    for (const state of PREINITIALIZED_STATES) {
      this.qTable.set(state, createEmptyEntry());
    }
  }

  private ensureState(state: string): QValuePair {
    let entry = this.qTable.get(state);
    if (!entry) {
      entry = createEmptyEntry();
      this.qTable.set(state, entry);
    }
    return entry;
  }

  public selectAction(state: string): { action: Action; mode: DecisionMode } {
    if (Math.random() < this.currentEpsilon) {
      const action: Action = Math.random() < 0.5 ? 'COOPERATE' : 'DEFECT';
      return { action, mode: 'EXPLORING' };
    }

    const entry = this.ensureState(state);
    let action: Action;
    if (entry.COOPERATE > entry.DEFECT) {
      action = 'COOPERATE';
    } else if (entry.DEFECT > entry.COOPERATE) {
      action = 'DEFECT';
    } else {
      action = Math.random() < 0.5 ? 'COOPERATE' : 'DEFECT';
    }

    return { action, mode: 'EXPLOITING' };
  }

  public update(
    state: string,
    action: Action,
    reward: number,
    nextState: string,
  ): void {
    const current = this.ensureState(state);
    const next = this.ensureState(nextState);

    const maxNextQ = Math.max(next.COOPERATE, next.DEFECT);
    const currentQ = current[action];
    current[action] =
      currentQ + this.params.alpha * (reward + this.params.gamma * maxNextQ - currentQ);
    current.visits += 1;

    this.currentEpsilon = Math.max(
      this.params.minEpsilon,
      this.currentEpsilon * this.params.epsilonDecay,
    );
  }

  public setHyperparams(
    params: QLearningHyperparams,
    syncEpsilon = false,
  ): void {
    this.params = { ...params };
    if (syncEpsilon) {
      this.currentEpsilon = params.epsilon;
    } else if (this.currentEpsilon < params.minEpsilon) {
      this.currentEpsilon = params.minEpsilon;
    }
  }

  public getEpsilon(): number {
    return this.currentEpsilon;
  }

  public getQTableSnapshot(): QTableSnapshot {
    const snapshot: QTableSnapshot = {};
    for (const [state, values] of this.qTable.entries()) {
      snapshot[state] = {
        COOPERATE: values.COOPERATE,
        DEFECT: values.DEFECT,
        visits: values.visits,
      };
    }
    return snapshot;
  }

  public reset(): void {
    this.initTable();
    this.currentEpsilon = this.params.epsilon;
  }
}
