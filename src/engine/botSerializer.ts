import {
  AgentId,
  DEFAULT_HYPERPARAMS,
  DEFAULT_PAYOFF_MATRIX,
  PayoffMatrix,
  QLearningHyperparams,
  QTableSnapshot,
  SimulationSnapshot,
  TWO_ROUND_STATES,
} from './types';

export interface ExportedBot {
  id: string;
  version: 1;
  name: string;
  sourceAgent: AgentId;
  trainedRounds: number;
  exportedAt: string;
  qTable: QTableSnapshot;
  payoffMatrix: PayoffMatrix;
  hyperparams: QLearningHyperparams;
  noise: number;
}

export interface BotPolicySummary {
  coopStates: number;
  defectStates: number;
  neutralStates: number;
  totalVisits: number;
  coopPreferencePct: number;
}

const STORAGE_KEY = 'ipd-rl-lab:exported-bots:v1';

function cloneQTable(table: QTableSnapshot): QTableSnapshot {
  const copy: QTableSnapshot = {};
  for (const [state, pair] of Object.entries(table)) {
    copy[state] = {
      COOPERATE: Number(pair.COOPERATE.toFixed(6)),
      DEFECT: Number(pair.DEFECT.toFixed(6)),
      visits: pair.visits,
    };
  }
  return copy;
}

export function createExportedBot(
  snapshot: SimulationSnapshot,
  agent: AgentId,
  customName?: string,
): ExportedBot {
  const sourceLabel = agent === 'alpha' ? 'Agent Alpha' : 'Agent Beta';
  const trimmedName = customName?.trim();
  const defaultName = `${sourceLabel} (${snapshot.round} Tur)`;
  const qTable =
    agent === 'alpha' ? snapshot.alphaQTable : snapshot.betaQTable;

  return {
    id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    version: 1,
    name: trimmedName && trimmedName.length > 0 ? trimmedName : defaultName,
    sourceAgent: agent,
    trainedRounds: snapshot.round,
    exportedAt: new Date().toISOString(),
    qTable: cloneQTable(qTable),
    payoffMatrix: { ...snapshot.payoffMatrix },
    hyperparams: { ...snapshot.hyperparams },
    noise: snapshot.noise,
  };
}

export function summarizeBotPolicy(qTable: QTableSnapshot): BotPolicySummary {
  let coopStates = 0;
  let defectStates = 0;
  let neutralStates = 0;
  let totalVisits = 0;

  for (const state of TWO_ROUND_STATES) {
    const entry = qTable[state];
    if (!entry) {
      neutralStates += 1;
      continue;
    }
    totalVisits += entry.visits;
    const diff = entry.COOPERATE - entry.DEFECT;
    if (entry.visits === 0 || Math.abs(diff) < 1e-6) {
      neutralStates += 1;
    } else if (diff > 0) {
      coopStates += 1;
    } else {
      defectStates += 1;
    }
  }

  const decided = coopStates + defectStates;
  const coopPreferencePct =
    decided > 0 ? Math.round((coopStates / decided) * 100) : 50;

  return {
    coopStates,
    defectStates,
    neutralStates,
    totalVisits,
    coopPreferencePct,
  };
}

export function downloadBotJson(bot: ExportedBot): void {
  const safeSlug = bot.name
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü\-_]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  const filename = `${safeSlug || 'trained-bot'}.ipd-bot.json`;
  const blob = new Blob([JSON.stringify(bot, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseImportedBotJson(rawText: string): ExportedBot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Geçersiz JSON dosyası. Lütfen geçerli bir bot dosyası seçin.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Bot dosyası beklenen formatta değil.');
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.qTable !== 'object' || obj.qTable === null) {
    throw new Error('Bot dosyasında geçerli bir Q-Table bulunamadı.');
  }

  const rawQTable = obj.qTable as Record<string, unknown>;
  const sanitizedQTable: QTableSnapshot = {};
  let validEntries = 0;

  for (const [key, val] of Object.entries(rawQTable)) {
    if (typeof val === 'object' && val !== null) {
      const pair = val as Record<string, unknown>;
      const cVal = Number(pair.COOPERATE);
      const dVal = Number(pair.DEFECT);
      const visits = Number(pair.visits ?? 0);
      if (Number.isFinite(cVal) && Number.isFinite(dVal)) {
        sanitizedQTable[key] = {
          COOPERATE: cVal,
          DEFECT: dVal,
          visits: Number.isFinite(visits) && visits >= 0 ? Math.floor(visits) : 0,
        };
        validEntries += 1;
      }
    }
  }

  if (validEntries === 0) {
    throw new Error('Bot Q-Table verisi boş veya bozuk.');
  }

  const rawMatrix =
    typeof obj.payoffMatrix === 'object' && obj.payoffMatrix !== null
      ? (obj.payoffMatrix as Record<string, unknown>)
      : null;

  const payoffMatrix: PayoffMatrix = {
    R: Number.isFinite(Number(rawMatrix?.R))
      ? Number(rawMatrix?.R)
      : DEFAULT_PAYOFF_MATRIX.R,
    T: Number.isFinite(Number(rawMatrix?.T))
      ? Number(rawMatrix?.T)
      : DEFAULT_PAYOFF_MATRIX.T,
    S: Number.isFinite(Number(rawMatrix?.S))
      ? Number(rawMatrix?.S)
      : DEFAULT_PAYOFF_MATRIX.S,
    P: Number.isFinite(Number(rawMatrix?.P))
      ? Number(rawMatrix?.P)
      : DEFAULT_PAYOFF_MATRIX.P,
  };

  const rawHyper =
    typeof obj.hyperparams === 'object' && obj.hyperparams !== null
      ? (obj.hyperparams as Record<string, unknown>)
      : null;

  const hyperparams: QLearningHyperparams = {
    alpha: Number.isFinite(Number(rawHyper?.alpha))
      ? Number(rawHyper?.alpha)
      : DEFAULT_HYPERPARAMS.alpha,
    gamma: Number.isFinite(Number(rawHyper?.gamma))
      ? Number(rawHyper?.gamma)
      : DEFAULT_HYPERPARAMS.gamma,
    epsilon: Number.isFinite(Number(rawHyper?.epsilon))
      ? Number(rawHyper?.epsilon)
      : DEFAULT_HYPERPARAMS.epsilon,
    epsilonDecay: Number.isFinite(Number(rawHyper?.epsilonDecay))
      ? Number(rawHyper?.epsilonDecay)
      : DEFAULT_HYPERPARAMS.epsilonDecay,
    minEpsilon: Number.isFinite(Number(rawHyper?.minEpsilon))
      ? Number(rawHyper?.minEpsilon)
      : DEFAULT_HYPERPARAMS.minEpsilon,
  };

  const sourceAgent: AgentId = obj.sourceAgent === 'beta' ? 'beta' : 'alpha';
  const trainedRounds = Number.isFinite(Number(obj.trainedRounds))
    ? Math.max(0, Math.floor(Number(obj.trainedRounds)))
    : 0;
  const noise = Number.isFinite(Number(obj.noise))
    ? Math.min(0.2, Math.max(0, Number(obj.noise)))
    : 0;

  return {
    id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    version: 1,
    name:
      typeof obj.name === 'string' && obj.name.trim().length > 0
        ? obj.name.trim()
        : `İçe Aktarılan Bot (${trainedRounds} Tur)`,
    sourceAgent,
    trainedRounds,
    exportedAt:
      typeof obj.exportedAt === 'string'
        ? obj.exportedAt
        : new Date().toISOString(),
    qTable: sanitizedQTable,
    payoffMatrix,
    hyperparams,
    noise,
  };
}

export function loadSavedBots(): ExportedBot[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ExportedBot =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.qTable === 'object' &&
        item.qTable !== null,
    );
  } catch {
    return [];
  }
}

export function saveBotsToStorage(bots: ExportedBot[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bots));
  } catch {
    // Ignore storage quota errors gracefully
  }
}
