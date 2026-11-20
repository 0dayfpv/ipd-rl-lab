import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Brain,
  CheckCircle2,
  Download,
  FileUp,
  Handshake,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Swords,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import {
  Action,
  AgentId,
  ExportedBot,
  QTableSnapshot,
  STATE_DESCRIPTIONS,
  SimulationSnapshot,
  computePayoff,
  createExportedBot,
  downloadBotJson,
  encodeState,
  flipAction,
  parseImportedBotJson,
  summarizeBotPolicy,
} from '../../engine';

export interface TrainedBotArenaProps {
  snapshot: SimulationSnapshot;
  savedBots: ExportedBot[];
  selectedBotId: string | null;
  onExportFromLab: (agent: AgentId, customName?: string) => void;
  onImportBot: (bot: ExportedBot) => void;
  onDeleteBot: (botId: string) => void;
  onSelectBot: (botId: string) => void;
  isActiveTab: boolean;
}

interface DuelRoundRecord {
  round: number;
  humanAction: Action;
  botIntended: Action;
  botAction: Action;
  humanNoisy: boolean;
  botNoisy: boolean;
  humanReward: number;
  botReward: number;
  botStateSeen: string;
  botQCoop: number;
  botQDefect: number;
}

function cloneQTable(table: QTableSnapshot): QTableSnapshot {
  const next: QTableSnapshot = {};
  for (const [k, v] of Object.entries(table)) {
    next[k] = { ...v };
  }
  return next;
}

export function TrainedBotArena({
  snapshot,
  savedBots,
  selectedBotId,
  onExportFromLab,
  onImportBot,
  onDeleteBot,
  onSelectBot,
  isActiveTab,
}: TrainedBotArenaProps) {
  const [customName, setCustomName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedBot = useMemo(
    () => savedBots.find((b) => b.id === selectedBotId) ?? savedBots[0] ?? null,
    [savedBots, selectedBotId],
  );

  // Isolated 1v1 match state
  const [matchRounds, setMatchRounds] = useState<DuelRoundRecord[]>([]);
  const [humanScore, setHumanScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [matchNoise, setMatchNoise] = useState(0);
  const [allowOnlineLearning, setAllowOnlineLearning] = useState(false);
  const [liveQTable, setLiveQTable] = useState<QTableSnapshot>({});
  const [showXRay, setShowXRay] = useState(true);

  // Reset match when selected bot changes
  useEffect(() => {
    setMatchRounds([]);
    setHumanScore(0);
    setBotScore(0);
    if (selectedBot) {
      setLiveQTable(cloneQTable(selectedBot.qTable));
      setMatchNoise(selectedBot.noise);
    } else {
      setLiveQTable({});
      setMatchNoise(0);
    }
  }, [selectedBot]);

  const resetMatch = useCallback(() => {
    setMatchRounds([]);
    setHumanScore(0);
    setBotScore(0);
    if (selectedBot) {
      setLiveQTable(cloneQTable(selectedBot.qTable));
    }
  }, [selectedBot]);

  // Compute bot's current 2-round state from its perspective (self = bot, opp = human)
  const botCurrentState = useMemo(() => {
    const history = matchRounds.map((r) => ({
      self: r.botAction,
      opp: r.humanAction,
    }));
    return encodeState(history);
  }, [matchRounds]);

  const currentBotQ = useMemo(() => {
    const entry = liveQTable[botCurrentState];
    return entry ?? { COOPERATE: 0, DEFECT: 0, visits: 0 };
  }, [liveQTable, botCurrentState]);

  const playHumanMove = useCallback(
    (intendedHumanAction: Action) => {
      if (!selectedBot) return;

      const activeQ = liveQTable[botCurrentState] ?? {
        COOPERATE: 0,
        DEFECT: 0,
        visits: 0,
      };

      // Bot picks best action from its trained Q-table (greedy exploitation)
      let botIntended: Action;
      if (Math.abs(activeQ.COOPERATE - activeQ.DEFECT) < 1e-9) {
        botIntended = Math.random() < 0.5 ? 'COOPERATE' : 'DEFECT';
      } else {
        botIntended =
          activeQ.COOPERATE > activeQ.DEFECT ? 'COOPERATE' : 'DEFECT';
      }

      const humanNoisy = matchNoise > 0 && Math.random() < matchNoise;
      const botNoisy = matchNoise > 0 && Math.random() < matchNoise;
      const humanAction = humanNoisy
        ? flipAction(intendedHumanAction)
        : intendedHumanAction;
      const botAction = botNoisy ? flipAction(botIntended) : botIntended;

      const [humanReward, botReward] = computePayoff(
        humanAction,
        botAction,
        selectedBot.payoffMatrix,
      );

      const nextRoundNumber = matchRounds.length + 1;
      const record: DuelRoundRecord = {
        round: nextRoundNumber,
        humanAction,
        botIntended,
        botAction,
        humanNoisy,
        botNoisy,
        humanReward,
        botReward,
        botStateSeen: botCurrentState,
        botQCoop: activeQ.COOPERATE,
        botQDefect: activeQ.DEFECT,
      };

      setMatchRounds((prev) => [...prev, record]);
      setHumanScore((prev) => prev + humanReward);
      setBotScore((prev) => prev + botReward);

      // Optional live Q-table adaptation during match
      if (allowOnlineLearning) {
        const nextHistory = [
          ...matchRounds.map((r) => ({ self: r.botAction, opp: r.humanAction })),
          { self: botAction, opp: humanAction },
        ];
        const nextState = encodeState(nextHistory);
        const { alpha, gamma } = selectedBot.hyperparams;

        setLiveQTable((prev) => {
          const updated = cloneQTable(prev);
          const cur = updated[botCurrentState] ?? {
            COOPERATE: 0,
            DEFECT: 0,
            visits: 0,
          };
          const nxt = updated[nextState] ?? {
            COOPERATE: 0,
            DEFECT: 0,
            visits: 0,
          };
          const maxNext = Math.max(nxt.COOPERATE, nxt.DEFECT);
          const oldQ = cur[botIntended];
          cur[botIntended] = oldQ + alpha * (botReward + gamma * maxNext - oldQ);
          cur.visits += 1;
          updated[botCurrentState] = cur;
          return updated;
        });
      }
    },
    [
      selectedBot,
      liveQTable,
      botCurrentState,
      matchNoise,
      matchRounds,
      allowOnlineLearning,
    ],
  );

  // Keyboard shortcuts C / D when on this tab
  useEffect(() => {
    if (!isActiveTab || !selectedBot) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA')
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'c') {
        playHumanMove('COOPERATE');
      } else if (key === 'd') {
        playHumanMove('DEFECT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActiveTab, selectedBot, playHumanMove]);

  const handleExportClick = (agent: AgentId) => {
    onExportFromLab(agent, customName);
    const label = agent === 'alpha' ? 'Agent Alpha' : 'Agent Beta';
    setExportNotice(
      `${label} (${snapshot.round} rounds trained) exported and ready for duel!`,
    );
    setCustomName('');
    window.setTimeout(() => setExportNotice(null), 3500);
  };

  const handleQuickDownloadFromLab = (agent: AgentId) => {
    const bot = createExportedBot(snapshot, agent, customName);
    downloadBotJson(bot);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const imported = parseImportedBotJson(text);
        onImportBot(imported);
        setExportNotice(`"${imported.name}" imported successfully!`);
        window.setTimeout(() => setExportNotice(null), 3500);
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : 'Error reading file.',
        );
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const lastRound =
    matchRounds.length > 0 ? matchRounds[matchRounds.length - 1] : null;
  const humanAvg =
    matchRounds.length > 0 ? (humanScore / matchRounds.length).toFixed(2) : '0.00';
  const botAvg =
    matchRounds.length > 0 ? (botScore / matchRounds.length).toFixed(2) : '0.00';

  const canExportAlpha = snapshot.alphaBrain === 'q-learning';
  const canExportBeta = snapshot.betaBrain === 'q-learning';

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Export & Bot Vault Panel */}
      <section className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-cyan-400" />
              <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">
                Bot Export &amp; Vault
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Instantly export Q-Learning agents trained in the lab, download/upload as JSON, and challenge them 1v1 below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Bot name (optional)..."
              className="w-48 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500/70 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleExportClick('alpha')}
              disabled={!canExportAlpha}
              title={
                canExportAlpha
                  ? 'Export Agent Alpha Q-Table brain'
                  : 'Agent Alpha is not currently in Q-Learning AI mode'
              }
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 font-mono text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Export Alpha ({snapshot.round} rounds)
            </button>
            <button
              type="button"
              onClick={() => handleExportClick('beta')}
              disabled={!canExportBeta}
              title={
                canExportBeta
                  ? 'Export Agent Beta Q-Table brain'
                  : 'Agent Beta is not currently in Q-Learning AI mode'
              }
              className="flex items-center gap-1.5 rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/15 px-3 py-1.5 font-mono text-xs font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Export Beta ({snapshot.round} rounds)
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              <FileUp className="h-3.5 w-3.5 text-emerald-400" />
              Upload JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {exportNotice && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {importError && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* Saved Bots List */}
        {savedBots.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-8 text-center">
            <Brain className="h-8 w-8 text-slate-600" />
            <p className="mt-2 text-sm font-medium text-slate-300">
              No exported bots yet
            </p>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              First train agents in the &quot;Lab &amp; Training&quot; tab (e.g., 1000+ rounds on TURBO), then click{' '}
              <span className="text-cyan-300">Export Alpha</span> or{' '}
              <span className="text-fuchsia-300">Export Beta</span> above, or upload a <code className="text-slate-300">.json</code> bot file.
            </p>
            {canExportAlpha && (
              <button
                type="button"
                onClick={() => handleQuickDownloadFromLab('alpha')}
                className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-[11px] text-slate-300 hover:border-slate-500"
              >
                <Download className="h-3.5 w-3.5" />
                Download Current Alpha Directly as JSON
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {savedBots.map((bot) => {
              const summary = summarizeBotPolicy(bot.qTable);
              const isSelected = selectedBot?.id === bot.id;
              return (
                <div
                  key={bot.id}
                  onClick={() => onSelectBot(bot.id)}
                  className={`group cursor-pointer rounded-xl border p-3.5 transition ${
                    isSelected
                      ? 'border-cyan-400/70 bg-cyan-950/25 shadow-[0_0_20px_rgba(34,211,238,0.12)]'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            bot.sourceAgent === 'alpha'
                              ? 'bg-cyan-400'
                              : 'bg-fuchsia-400'
                          }`}
                        />
                        <h3 className="truncate font-mono text-xs font-bold text-slate-100">
                          {bot.name}
                        </h3>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                        {bot.trainedRounds.toLocaleString('en-US')} rounds trained •{' '}
                        {summary.totalVisits.toLocaleString('en-US')} visits
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadBotJson(bot);
                        }}
                        title="Download as JSON"
                        className="rounded-md border border-slate-700/80 bg-slate-900 p-1.5 text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-300"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBot(bot.id);
                        }}
                        title="Delete bot"
                        className="rounded-md border border-slate-700/80 bg-slate-900 p-1.5 text-slate-400 transition hover:border-rose-500/50 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Policy Cooperation vs Defection bar */}
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between font-mono text-[10px]">
                      <span className="text-emerald-400">
                        Cooperate: {summary.coopStates}/16
                      </span>
                      <span className="text-rose-400">
                        Defect: {summary.defectStates}/16
                      </span>
                    </div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="bg-emerald-400 transition-all"
                        style={{ width: `${summary.coopPreferencePct}%` }}
                      />
                      <div
                        className="bg-rose-500 transition-all"
                        style={{ width: `${100 - summary.coopPreferencePct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. 1v1 Human vs Trained Bot Duel Stage */}
      {selectedBot && (
        <section className="rounded-2xl border border-slate-800/90 bg-slate-950/85 p-5 shadow-2xl backdrop-blur-md">
          {/* Header & Match Settings */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-500/40 bg-violet-500/10">
                <Swords className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">
                  1v1 Duel: YOU vs {selectedBot.name}
                </h2>
                <p className="font-mono text-[11px] text-slate-400">
                  Round #{matchRounds.length} • Payoff Matrix: R={selectedBot.payoffMatrix.R} / T=
                  {selectedBot.payoffMatrix.T} / S={selectedBot.payoffMatrix.S} / P=
                  {selectedBot.payoffMatrix.P}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAllowOnlineLearning((v) => !v)}
                className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition ${
                  allowOnlineLearning
                    ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                }`}
              >
                {allowOnlineLearning
                  ? 'Live Learning: ON'
                  : 'Frozen Brain (Static)'}
              </button>

              <button
                type="button"
                onClick={() => setShowXRay((v) => !v)}
                className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition ${
                  showXRay
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-700 bg-slate-900 text-slate-400'
                }`}
              >
                Q-Table X-Ray: {showXRay ? 'ON' : 'HIDDEN'}
              </button>

              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1">
                <span className="font-mono text-[11px] text-slate-400">
                  Noise: {Math.round(matchNoise * 100)}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={0.2}
                  step={0.01}
                  value={matchNoise}
                  onChange={(e) => setMatchNoise(Number(e.target.value))}
                  className="h-1.5 w-20 accent-amber-400"
                />
              </div>

              <button
                type="button"
                onClick={resetMatch}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Match
              </button>
            </div>
          </div>

          {/* 3-Column Duel Grid */}
          <div className="mt-5 grid grid-cols-1 items-center gap-4 lg:grid-cols-12">
            {/* Left: Human Player */}
            <div className="rounded-xl border border-sky-500/30 bg-slate-900/70 p-4 lg:col-span-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold uppercase text-sky-300">
                      YOU (HUMAN PLAYER)
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      Avg: {humanAvg} pts/round
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-slate-100">
                    {humanScore}
                  </div>
                  <div className="font-mono text-[10px] uppercase text-slate-500">
                    TOTAL SCORE
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => playHumanMove('COOPERATE')}
                  className="group flex flex-col items-center justify-center gap-1 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3 py-3.5 font-mono text-xs font-bold text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.12)] transition hover:bg-emerald-500/25 active:scale-[0.98]"
                >
                  <Handshake className="h-5 w-5 transition-transform group-hover:scale-110" />
                  <span>COOPERATE</span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-200">
                    Key: C
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => playHumanMove('DEFECT')}
                  className="group flex flex-col items-center justify-center gap-1 rounded-xl border border-rose-500/50 bg-rose-500/15 px-3 py-3.5 font-mono text-xs font-bold text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.12)] transition hover:bg-rose-500/25 active:scale-[0.98]"
                >
                  <Zap className="h-5 w-5 transition-transform group-hover:scale-110" />
                  <span>DEFECT</span>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-200">
                    Key: D
                  </span>
                </button>
              </div>
            </div>

            {/* Center: Clash Result */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800/90 bg-slate-950/90 p-4 lg:col-span-4">
              {lastRound ? (
                <div
                  key={lastRound.round}
                  className="animate-clash-pulse flex w-full flex-col items-center"
                >
                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    ROUND #{lastRound.round} RESULT
                  </span>

                  <div className="mt-3 flex w-full items-center justify-between gap-3">
                    {/* Human Card */}
                    <div
                      className={`flex flex-1 flex-col items-center rounded-lg border px-3 py-2.5 ${
                        lastRound.humanAction === 'COOPERATE'
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                          : 'border-rose-500/50 bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      <span className="font-mono text-[10px] uppercase text-slate-400">
                        YOU
                      </span>
                      <span className="mt-0.5 font-mono text-xs font-bold">
                        {lastRound.humanAction === 'COOPERATE'
                          ? 'COOPERATE'
                          : 'DEFECT'}
                      </span>
                      <span className="mt-1 font-mono text-lg font-extrabold">
                        +{lastRound.humanReward}
                      </span>
                      {lastRound.humanNoisy && (
                        <span className="mt-1 rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] text-amber-300">
                          NOISE!
                        </span>
                      )}
                    </div>

                    <Swords className="h-5 w-5 shrink-0 text-slate-500" />

                    {/* Bot Card */}
                    <div
                      className={`flex flex-1 flex-col items-center rounded-lg border px-3 py-2.5 ${
                        lastRound.botAction === 'COOPERATE'
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                          : 'border-rose-500/50 bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      <span className="font-mono text-[10px] uppercase text-slate-400">
                        BOT
                      </span>
                      <span className="mt-0.5 font-mono text-xs font-bold">
                        {lastRound.botAction === 'COOPERATE'
                          ? 'COOPERATE'
                          : 'DEFECT'}
                      </span>
                      <span className="mt-1 font-mono text-lg font-extrabold">
                        +{lastRound.botReward}
                      </span>
                      {lastRound.botNoisy && (
                        <span className="mt-1 rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] text-amber-300">
                          NOISE!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <Swords className="mx-auto h-7 w-7 text-slate-600" />
                  <p className="mt-2 font-mono text-xs text-slate-400">
                    Choose your move to start the duel
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-slate-500">
                    Keyboard: <kbd className="rounded bg-slate-800 px-1 text-emerald-300">C</kbd> Cooperate •{' '}
                    <kbd className="rounded bg-slate-800 px-1 text-rose-300">D</kbd> Defect
                  </p>
                </div>
              )}
            </div>

            {/* Right: Trained Bot */}
            <div className="rounded-xl border border-violet-500/30 bg-slate-900/70 p-4 lg:col-span-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs font-bold uppercase text-violet-300">
                      {selectedBot.name}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      Avg: {botAvg} pts/round
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-slate-100">
                    {botScore}
                  </div>
                  <div className="font-mono text-[10px] uppercase text-slate-500">
                    TOTAL SCORE
                  </div>
                </div>
              </div>

              {/* Bot X-Ray: Current state & Q-values */}
              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-slate-400">STATE SEEN BY BOT:</span>
                  <span className="rounded bg-violet-500/20 px-1.5 py-0.5 font-bold text-violet-300">
                    {botCurrentState}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {STATE_DESCRIPTIONS[botCurrentState] ??
                    (botCurrentState === 'INIT'
                      ? 'Initial state (first round)'
                      : 'First round history')}
                </p>

                {showXRay ? (
                  <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono text-xs">
                    <div
                      className={`rounded-md border px-2 py-1.5 ${
                        currentBotQ.COOPERATE >= currentBotQ.DEFECT
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400'
                      }`}
                    >
                      <div className="text-[10px] opacity-80">Q(Cooperate)</div>
                      <div className="font-bold">
                        {currentBotQ.COOPERATE.toFixed(2)}
                      </div>
                    </div>
                    <div
                      className={`rounded-md border px-2 py-1.5 ${
                        currentBotQ.DEFECT > currentBotQ.COOPERATE
                          ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400'
                      }`}
                    >
                      <div className="text-[10px] opacity-80">Q(Defect)</div>
                      <div className="font-bold">
                        {currentBotQ.DEFECT.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 rounded-md border border-slate-800 bg-slate-900/50 px-2.5 py-2 text-center font-mono text-[11px] text-slate-500">
                    Blind Duel Mode — Bot Q-values hidden
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Match History Strip */}
          {matchRounds.length > 0 && (
            <div className="mt-5 border-t border-slate-800/80 pt-4">
              <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-slate-400">
                <span>RECENT MOVES (NEWEST ON RIGHT)</span>
                <span>
                  Score Diff:{' '}
                  <strong
                    className={
                      humanScore > botScore
                        ? 'text-emerald-400'
                        : humanScore < botScore
                          ? 'text-rose-400'
                          : 'text-slate-200'
                    }
                  >
                    {humanScore - botScore >= 0
                      ? `+${humanScore - botScore}`
                      : humanScore - botScore}
                  </strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {matchRounds.slice(-20).map((r) => (
                  <div
                    key={r.round}
                    title={`Round #${r.round} | You: ${r.humanAction} (+${r.humanReward}) vs Bot: ${r.botAction} (+${r.botReward})`}
                    className="flex flex-col items-center rounded-md border border-slate-800 bg-slate-900/80 px-2 py-1 font-mono text-[10px]"
                  >
                    <span className="text-[9px] text-slate-500">#{r.round}</span>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span
                        className={`font-bold ${
                          r.humanAction === 'COOPERATE'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {r.humanAction === 'COOPERATE' ? 'C' : 'D'}
                      </span>
                      <span className="text-slate-600">/</span>
                      <span
                        className={`font-bold ${
                          r.botAction === 'COOPERATE'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {r.botAction === 'COOPERATE' ? 'C' : 'D'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
