import { Action, BrainType, PayoffMatrix, ShortAction } from './types';

export function actionToShort(a: Action): ShortAction {
  return a === 'COOPERATE' ? 'C' : 'D';
}

export function flipAction(a: Action): Action {
  return a === 'COOPERATE' ? 'DEFECT' : 'COOPERATE';
}

export function computePayoff(
  alphaAction: Action,
  betaAction: Action,
  matrix: PayoffMatrix,
): [number, number] {
  if (alphaAction === 'COOPERATE' && betaAction === 'COOPERATE') {
    return [matrix.R, matrix.R];
  }
  if (alphaAction === 'DEFECT' && betaAction === 'COOPERATE') {
    return [matrix.T, matrix.S];
  }
  if (alphaAction === 'COOPERATE' && betaAction === 'DEFECT') {
    return [matrix.S, matrix.T];
  }
  return [matrix.P, matrix.P];
}

export function encodeState(
  history: ReadonlyArray<{ self: Action; opp: Action }>,
): string {
  const len = history.length;
  if (len === 0) {
    return 'INIT';
  }
  if (len === 1) {
    const only = history[0];
    return `[${actionToShort(only.self)}-${actionToShort(only.opp)}]`;
  }
  const older = history[len - 2];
  const newest = history[len - 1];
  return `[${actionToShort(older.self)}-${actionToShort(older.opp)}, ${actionToShort(newest.self)}-${actionToShort(newest.opp)}]`;
}

export function selectFixedStrategyAction(
  brain: Exclude<BrainType, 'q-learning' | 'human'>,
  oppHistory: ReadonlyArray<Action>,
): Action {
  switch (brain) {
    case 'tit-for-tat':
      return oppHistory.length === 0
        ? 'COOPERATE'
        : oppHistory[oppHistory.length - 1];
    case 'grim-trigger':
      return oppHistory.includes('DEFECT') ? 'DEFECT' : 'COOPERATE';
    case 'always-defect':
      return 'DEFECT';
    case 'always-cooperate':
      return 'COOPERATE';
  }
}
