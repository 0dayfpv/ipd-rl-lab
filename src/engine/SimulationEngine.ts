import { QLearningAgent } from './qLearningAgent';
import {
  computePayoff,
  encodeState,
  flipAction,
  selectFixedStrategyAction,
} from './strategies';
import { analyzeStrategy } from './strategyDetector';
import {
  Action,
  AgentId,
  BrainType,
  DEFAULT_HYPERPARAMS,
  DEFAULT_PAYOFF_MATRIX,
  DecisionMode,
  PayoffMatrix,
  QLearningHyperparams,
  RoundOutcome,
  SimulationSnapshot,
  TelemetryPoint,
} from './types';

const ROLLING_WINDOW_SIZE = 100;
const MAX_TELEMETRY_POINTS = 400;

interface PairEntry {
  alpha: Action;
  beta: Action;
}

export class SimulationEngine {
  private alphaAgent: QLearningAgent;
  private betaAgent: QLearningAgent;
  private alphaBrain: BrainType = 'q-learning';
  private betaBrain: BrainType = 'q-learning';

  private payoffMatrix: PayoffMatrix;
  private hyperparams: QLearningHyperparams;
  private noise = 0;

  private round = 0;
  private alphaScore = 0;
  private betaScore = 0;

  private currentAlphaState = 'INIT';
  private currentBetaState = 'INIT';
  private lastAlphaMode: DecisionMode = 'EXPLORING';
  private lastBetaMode: DecisionMode = 'EXPLORING';
  private lastRound: RoundOutcome | null = null;

  // Minimal 2-round actual history for O(1) state encoding
  private recentPairs: PairEntry[] = [];
  // O(1) tracking for grim-trigger & tit-for-tat without unbounded arrays
  private alphaOppEverDefected = false;
  private betaOppEverDefected = false;
  private lastAlphaActual: Action | null = null;
  private lastBetaActual: Action | null = null;

  // Circular buffer of last 100 rounds for O(1) moving averages
  private rollingBuffer: Array<RoundOutcome | undefined> = new Array(
    ROLLING_WINDOW_SIZE,
  );
  private rollingHead = 0;
  private rollingCount = 0;
  private rollingAlphaCoop = 0;
  private rollingBetaCoop = 0;
  private rollingMutualCoop = 0;

  // Bounded / adaptively downsampled telemetry history
  private telemetry: TelemetryPoint[] = [];
  private telemetryStride = 1;

  constructor(
    payoffMatrix: PayoffMatrix = DEFAULT_PAYOFF_MATRIX,
    hyperparams: QLearningHyperparams = DEFAULT_HYPERPARAMS,
  ) {
    this.payoffMatrix = { ...payoffMatrix };
    this.hyperparams = { ...hyperparams };
    this.alphaAgent = new QLearningAgent(this.hyperparams);
    this.betaAgent = new QLearningAgent(this.hyperparams);
  }

  private getAgentDecision(
    agent: AgentId,
    state: string,
    humanAction?: Action,
  ): { action: Action; mode: DecisionMode } {
    const brain = agent === 'alpha' ? this.alphaBrain : this.betaBrain;

    if (brain === 'q-learning') {
      const qAgent = agent === 'alpha' ? this.alphaAgent : this.betaAgent;
      return qAgent.selectAction(state);
    }

    if (brain === 'human') {
      return {
        action: humanAction ?? 'COOPERATE',
        mode: 'HUMAN',
      };
    }

    const oppEverDefected =
      agent === 'alpha' ? this.alphaOppEverDefected : this.betaOppEverDefected;
    const lastOppAction =
      agent === 'alpha' ? this.lastBetaActual : this.lastAlphaActual;

    let oppHistoryProxy: Action[];
    if (brain === 'grim-trigger') {
      oppHistoryProxy = oppEverDefected
        ? ['DEFECT']
        : this.round > 0
          ? ['COOPERATE']
          : [];
    } else if (brain === 'tit-for-tat') {
      oppHistoryProxy = lastOppAction ? [lastOppAction] : [];
    } else {
      oppHistoryProxy = [];
    }

    return {
      action: selectFixedStrategyAction(brain, oppHistoryProxy),
      mode: 'STRATEGY',
    };
  }

  private encodeStatesFromPairs(): { alphaState: string; betaState: string } {
    if (this.recentPairs.length === 0) {
      return { alphaState: 'INIT', betaState: 'INIT' };
    }

    const alphaHistory = this.recentPairs.map((p) => ({
      self: p.alpha,
      opp: p.beta,
    }));
    const betaHistory = this.recentPairs.map((p) => ({
      self: p.beta,
      opp: p.alpha,
    }));

    return {
      alphaState: encodeState(alphaHistory),
      betaState: encodeState(betaHistory),
    };
  }

  private pushRollingOutcome(outcome: RoundOutcome): void {
    if (this.rollingCount === ROLLING_WINDOW_SIZE) {
      const evicted = this.rollingBuffer[this.rollingHead];
      if (evicted) {
        if (evicted.alphaAction === 'COOPERATE') {
          this.rollingAlphaCoop -= 1;
        }
        if (evicted.betaAction === 'COOPERATE') {
          this.rollingBetaCoop -= 1;
        }
        if (
          evicted.alphaAction === 'COOPERATE' &&
          evicted.betaAction === 'COOPERATE'
        ) {
          this.rollingMutualCoop -= 1;
        }
      }
    } else {
      this.rollingCount += 1;
    }

    this.rollingBuffer[this.rollingHead] = outcome;
    this.rollingHead = (this.rollingHead + 1) % ROLLING_WINDOW_SIZE;

    if (outcome.alphaAction === 'COOPERATE') {
      this.rollingAlphaCoop += 1;
    }
    if (outcome.betaAction === 'COOPERATE') {
      this.rollingBetaCoop += 1;
    }
    if (
      outcome.alphaAction === 'COOPERATE' &&
      outcome.betaAction === 'COOPERATE'
    ) {
      this.rollingMutualCoop += 1;
    }
  }

  private createTelemetryPoint(): TelemetryPoint {
    const denom = this.rollingCount || 1;
    return {
      round: this.round,
      alphaCoopRate: Math.round((this.rollingAlphaCoop / denom) * 1000) / 10,
      betaCoopRate: Math.round((this.rollingBetaCoop / denom) * 1000) / 10,
      mutualCoopRate: Math.round((this.rollingMutualCoop / denom) * 1000) / 10,
      alphaScore: this.alphaScore,
      betaScore: this.betaScore,
    };
  }

  private maybeRecordTelemetry(): void {
    if (this.round !== 1 && this.round % this.telemetryStride !== 0) {
      return;
    }

    this.telemetry.push(this.createTelemetryPoint());

    if (this.telemetry.length > MAX_TELEMETRY_POINTS) {
      const compacted: TelemetryPoint[] = [];
      for (let i = 0; i < this.telemetry.length; i += 2) {
        compacted.push(this.telemetry[i]);
      }
      const last = this.telemetry[this.telemetry.length - 1];
      if (compacted[compacted.length - 1].round !== last.round) {
        compacted.push(last);
      }
      this.telemetry = compacted;
      this.telemetryStride *= 2;
    }
  }

  private getRecentRoundsOrdered(): RoundOutcome[] {
    if (this.rollingCount === 0) {
      return [];
    }

    const result: RoundOutcome[] = new Array(this.rollingCount);
    const start =
      this.rollingCount < ROLLING_WINDOW_SIZE ? 0 : this.rollingHead;

    for (let i = 0; i < this.rollingCount; i++) {
      const idx = (start + i) % ROLLING_WINDOW_SIZE;
      result[i] = this.rollingBuffer[idx] as RoundOutcome;
    }
    return result;
  }

  public step(humanActions?: { alpha?: Action; beta?: Action }): RoundOutcome {
    const alphaState = this.currentAlphaState;
    const betaState = this.currentBetaState;

    const alphaDecision = this.getAgentDecision(
      'alpha',
      alphaState,
      humanActions?.alpha,
    );
    const betaDecision = this.getAgentDecision(
      'beta',
      betaState,
      humanActions?.beta,
    );

    const alphaNoisy = this.noise > 0 && Math.random() < this.noise;
    const betaNoisy = this.noise > 0 && Math.random() < this.noise;

    const alphaAction = alphaNoisy
      ? flipAction(alphaDecision.action)
      : alphaDecision.action;
    const betaAction = betaNoisy
      ? flipAction(betaDecision.action)
      : betaDecision.action;

    const [alphaReward, betaReward] = computePayoff(
      alphaAction,
      betaAction,
      this.payoffMatrix,
    );

    this.round += 1;
    this.alphaScore += alphaReward;
    this.betaScore += betaReward;

    if (betaAction === 'DEFECT') {
      this.alphaOppEverDefected = true;
    }
    if (alphaAction === 'DEFECT') {
      this.betaOppEverDefected = true;
    }
    this.lastAlphaActual = alphaAction;
    this.lastBetaActual = betaAction;

    this.recentPairs.push({ alpha: alphaAction, beta: betaAction });
    if (this.recentPairs.length > 2) {
      this.recentPairs.shift();
    }

    const { alphaState: nextAlphaState, betaState: nextBetaState } =
      this.encodeStatesFromPairs();

    // Update Q-Learning agents using their intended action, received reward, and resulting state
    if (this.alphaBrain === 'q-learning') {
      this.alphaAgent.update(
        alphaState,
        alphaDecision.action,
        alphaReward,
        nextAlphaState,
      );
    }
    if (this.betaBrain === 'q-learning') {
      this.betaAgent.update(
        betaState,
        betaDecision.action,
        betaReward,
        nextBetaState,
      );
    }

    this.currentAlphaState = nextAlphaState;
    this.currentBetaState = nextBetaState;
    this.lastAlphaMode = alphaDecision.mode;
    this.lastBetaMode = betaDecision.mode;

    const outcome: RoundOutcome = {
      round: this.round,
      alphaIntended: alphaDecision.action,
      betaIntended: betaDecision.action,
      alphaAction,
      betaAction,
      alphaNoisy,
      betaNoisy,
      alphaMode: alphaDecision.mode,
      betaMode: betaDecision.mode,
      alphaReward,
      betaReward,
      alphaTotalScore: this.alphaScore,
      betaTotalScore: this.betaScore,
      alphaState,
      betaState,
      alphaEpsilon: this.alphaAgent.getEpsilon(),
      betaEpsilon: this.betaAgent.getEpsilon(),
    };

    this.lastRound = outcome;
    this.pushRollingOutcome(outcome);
    this.maybeRecordTelemetry();

    return outcome;
  }

  public stepBatch(count: number): RoundOutcome | null {
    if (count <= 0) {
      return null;
    }
    let last: RoundOutcome | null = null;
    for (let i = 0; i < count; i++) {
      last = this.step();
    }
    return last;
  }

  public setBrain(agent: AgentId, brain: BrainType): void {
    if (agent === 'alpha') {
      this.alphaBrain = brain;
      this.lastAlphaMode =
        brain === 'human'
          ? 'HUMAN'
          : brain === 'q-learning'
            ? 'EXPLORING'
            : 'STRATEGY';
    } else {
      this.betaBrain = brain;
      this.lastBetaMode =
        brain === 'human'
          ? 'HUMAN'
          : brain === 'q-learning'
            ? 'EXPLORING'
            : 'STRATEGY';
    }
  }

  public setPayoffMatrix(matrix: PayoffMatrix): void {
    this.payoffMatrix = { ...matrix };
  }

  public setNoise(noise: number): void {
    this.noise = Math.min(0.2, Math.max(0, noise));
  }

  public setHyperparams(
    params: QLearningHyperparams,
    resetCurrentEpsilon = false,
  ): void {
    this.hyperparams = { ...params };
    this.alphaAgent.setHyperparams(this.hyperparams, resetCurrentEpsilon);
    this.betaAgent.setHyperparams(this.hyperparams, resetCurrentEpsilon);
  }

  public resetBrains(): void {
    this.alphaAgent.reset();
    this.betaAgent.reset();

    this.round = 0;
    this.alphaScore = 0;
    this.betaScore = 0;
    this.currentAlphaState = 'INIT';
    this.currentBetaState = 'INIT';
    this.lastAlphaMode =
      this.alphaBrain === 'human'
        ? 'HUMAN'
        : this.alphaBrain === 'q-learning'
          ? 'EXPLORING'
          : 'STRATEGY';
    this.lastBetaMode =
      this.betaBrain === 'human'
        ? 'HUMAN'
        : this.betaBrain === 'q-learning'
          ? 'EXPLORING'
          : 'STRATEGY';
    this.lastRound = null;

    this.recentPairs = [];
    this.alphaOppEverDefected = false;
    this.betaOppEverDefected = false;
    this.lastAlphaActual = null;
    this.lastBetaActual = null;

    this.rollingBuffer = new Array(ROLLING_WINDOW_SIZE);
    this.rollingHead = 0;
    this.rollingCount = 0;
    this.rollingAlphaCoop = 0;
    this.rollingBetaCoop = 0;
    this.rollingMutualCoop = 0;

    this.telemetry = [];
    this.telemetryStride = 1;
  }

  public getSnapshot(): SimulationSnapshot {
    const recentRounds = this.getRecentRoundsOrdered();
    const telemetryCopy = this.telemetry.slice();

    if (
      this.round > 0 &&
      (telemetryCopy.length === 0 ||
        telemetryCopy[telemetryCopy.length - 1].round !== this.round)
    ) {
      telemetryCopy.push(this.createTelemetryPoint());
    }

    return {
      round: this.round,
      alphaBrain: this.alphaBrain,
      betaBrain: this.betaBrain,
      alphaScore: this.alphaScore,
      betaScore: this.betaScore,
      alphaEpsilon: this.alphaAgent.getEpsilon(),
      betaEpsilon: this.betaAgent.getEpsilon(),
      alphaState: this.currentAlphaState,
      betaState: this.currentBetaState,
      alphaMode: this.lastAlphaMode,
      betaMode: this.lastBetaMode,
      alphaQTable: this.alphaAgent.getQTableSnapshot(),
      betaQTable: this.betaAgent.getQTableSnapshot(),
      lastRound: this.lastRound,
      recentRounds,
      telemetry: telemetryCopy,
      strategyAnalysis: analyzeStrategy(recentRounds),
      payoffMatrix: { ...this.payoffMatrix },
      noise: this.noise,
      hyperparams: { ...this.hyperparams },
    };
  }
}
