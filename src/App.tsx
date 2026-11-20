import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Cpu, FlaskConical, ShieldAlert, Sparkles } from 'lucide-react';
import {
  Action,
  AgentId,
  BrainType,
  ExportedBot,
  PayoffMatrix,
  QLearningHyperparams,
  SimulationEngine,
  SimulationSnapshot,
  SimulationSpeed,
  createExportedBot,
  loadSavedBots,
  saveBotsToStorage,
} from './engine';
import { ControlPanel, DuelStage } from './components/Arena';
import { LiveCharts, QTableHeatmap, StrategyDetector } from './components/Analytics';
import { TrainedBotArena } from './components/BotDuel';

type ActiveTab = 'lab' | 'bot-duel';

export function App() {
  const engineRef = useRef<SimulationEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new SimulationEngine();
  }

  const [activeTab, setActiveTab] = useState<ActiveTab>('lab');
  const [savedBots, setSavedBots] = useState<ExportedBot[]>(() => loadSavedBots());
  const [selectedBotId, setSelectedBotId] = useState<string | null>(() => {
    const initial = loadSavedBots();
    return initial[0]?.id ?? null;
  });

  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(() =>
    engineRef.current!.getSnapshot()
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speed, setSpeed] = useState<SimulationSpeed>('1x');
  const [roundsPerSec, setRoundsPerSec] = useState<number>(0);
  const [pendingHumanActions, setPendingHumanActions] = useState<{
    alpha?: Action;
    beta?: Action;
  }>({});

  const isHumanInvolved =
    snapshot.alphaBrain === 'human' || snapshot.betaBrain === 'human';

  // Throughput tracking refs
  const throughputRef = useRef<{ lastRound: number; lastTime: number }>({
    lastRound: 0,
    lastTime: performance.now(),
  });

  const syncSnapshot = useCallback(() => {
    const next = engineRef.current!.getSnapshot();
    setSnapshot(next);
  }, []);

  // Update roundsPerSec periodically while running
  useEffect(() => {
    if (!isRunning) {
      setRoundsPerSec(0);
      return;
    }

    throughputRef.current = {
      lastRound: engineRef.current!.getSnapshot().round,
      lastTime: performance.now(),
    };

    const interval = window.setInterval(() => {
      const now = performance.now();
      const currentRound = engineRef.current!.getSnapshot().round;
      const dtSec = (now - throughputRef.current.lastTime) / 1000;
      if (dtSec > 0) {
        const rate = Math.round(
          (currentRound - throughputRef.current.lastRound) / dtSec
        );
        setRoundsPerSec(Math.max(0, rate));
      }
      throughputRef.current = { lastRound: currentRound, lastTime: now };
    }, 400);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  // Main simulation loop
  useEffect(() => {
    if (!isRunning || isHumanInvolved) {
      return;
    }

    const engine = engineRef.current!;

    if (speed === 'TURBO') {
      let rafId = 0;
      const tick = () => {
        // Run ~60 rounds per frame (~3,600+ rounds/sec at 60fps) while keeping UI smooth
        const frameStart = performance.now();
        let executed = 0;
        while (executed < 80 && performance.now() - frameStart < 10) {
          engine.stepBatch(20);
          executed += 20;
        }
        setSnapshot(engine.getSnapshot());
        rafId = window.requestAnimationFrame(tick);
      };
      rafId = window.requestAnimationFrame(tick);
      return () => window.cancelAnimationFrame(rafId);
    }

    if (speed === '100x') {
      const id = window.setInterval(() => {
        engine.stepBatch(4);
        setSnapshot(engine.getSnapshot());
      }, 40); // ~100 rounds/sec
      return () => window.clearInterval(id);
    }

    const delayMs = speed === '10x' ? 100 : 800;
    const id = window.setInterval(() => {
      engine.step();
      setSnapshot(engine.getSnapshot());
    }, delayMs);

    return () => window.clearInterval(id);
  }, [isRunning, speed, isHumanInvolved]);

  const handleTogglePlay = useCallback(() => {
    if (isHumanInvolved) {
      setIsRunning(false);
      return;
    }
    setIsRunning((prev) => !prev);
  }, [isHumanInvolved]);

  const handleStep = useCallback(() => {
    if (isHumanInvolved) return;
    setIsRunning(false);
    engineRef.current!.step();
    syncSnapshot();
  }, [isHumanInvolved, syncSnapshot]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setPendingHumanActions({});
    setRoundsPerSec(0);
    engineRef.current!.resetBrains();
    syncSnapshot();
  }, [syncSnapshot]);

  const handleBrainChange = useCallback(
    (agent: AgentId, brain: BrainType) => {
      engineRef.current!.setBrain(agent, brain);
      setPendingHumanActions({});
      if (brain === 'human') {
        setIsRunning(false);
      }
      syncSnapshot();
    },
    [syncSnapshot]
  );

  const handlePayoffChange = useCallback(
    (matrix: PayoffMatrix) => {
      engineRef.current!.setPayoffMatrix(matrix);
      syncSnapshot();
    },
    [syncSnapshot]
  );

  const handleNoiseChange = useCallback(
    (noise: number) => {
      engineRef.current!.setNoise(noise);
      syncSnapshot();
    },
    [syncSnapshot]
  );

  const handleHyperparamsChange = useCallback(
    (params: QLearningHyperparams, syncEpsilon?: boolean) => {
      engineRef.current!.setHyperparams(params, syncEpsilon);
      syncSnapshot();
    },
    [syncSnapshot]
  );

  const handleHumanAction = useCallback(
    (agent: AgentId, action: Action) => {
      const engine = engineRef.current!;
      const snap = engine.getSnapshot();
      const alphaHuman = snap.alphaBrain === 'human';
      const betaHuman = snap.betaBrain === 'human';

      if (!alphaHuman && !betaHuman) return;

      if (alphaHuman && betaHuman) {
        setPendingHumanActions((prev) => {
          const next = { ...prev, [agent]: action };
          if (next.alpha && next.beta) {
            engine.step({ alpha: next.alpha, beta: next.beta });
            setSnapshot(engine.getSnapshot());
            return {};
          }
          return next;
        });
      } else if (alphaHuman && agent === 'alpha') {
        engine.step({ alpha: action });
        setSnapshot(engine.getSnapshot());
      } else if (betaHuman && agent === 'beta') {
        engine.step({ beta: action });
        setSnapshot(engine.getSnapshot());
      }
    },
    []
  );

  const handleExportFromLab = useCallback(
    (agent: AgentId, customName?: string) => {
      const currentSnap = engineRef.current!.getSnapshot();
      const exported = createExportedBot(currentSnap, agent, customName);
      setSavedBots((prev) => {
        const next = [exported, ...prev];
        saveBotsToStorage(next);
        return next;
      });
      setSelectedBotId(exported.id);
    },
    []
  );

  const handleImportBot = useCallback((bot: ExportedBot) => {
    setSavedBots((prev) => {
      const next = [bot, ...prev];
      saveBotsToStorage(next);
      return next;
    });
    setSelectedBotId(bot.id);
  }, []);

  const handleDeleteBot = useCallback((botId: string) => {
    setSavedBots((prev) => {
      const next = prev.filter((b) => b.id !== botId);
      saveBotsToStorage(next);
      setSelectedBotId((cur) => (cur === botId ? (next[0]?.id ?? null) : cur));
      return next;
    });
  }, []);

  // Keyboard shortcuts for Human Player & Spacebar for Play/Pause (Lab tab only)
  useEffect(() => {
    if (activeTab !== 'lab') return;

    const onKeyDown = (e: KeyboardEvent) => {
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
      const alphaHuman = snapshot.alphaBrain === 'human';
      const betaHuman = snapshot.betaBrain === 'human';

      if (alphaHuman || betaHuman) {
        if (alphaHuman && betaHuman) {
          if (key === 'c') handleHumanAction('alpha', 'COOPERATE');
          else if (key === 'd') handleHumanAction('alpha', 'DEFECT');
          else if (key === 'j') handleHumanAction('beta', 'COOPERATE');
          else if (key === 'k') handleHumanAction('beta', 'DEFECT');
        } else {
          const activeHuman: AgentId = alphaHuman ? 'alpha' : 'beta';
          if (key === 'c') handleHumanAction(activeHuman, 'COOPERATE');
          else if (key === 'd') handleHumanAction(activeHuman, 'DEFECT');
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, snapshot.alphaBrain, snapshot.betaBrain, handleHumanAction, handleTogglePlay]);

  return (
    <div className="min-h-screen text-slate-100">
      {/* Top Tactical Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060913]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_16px_rgba(16,185,129,0.2)]">
              <Cpu className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-sm font-bold tracking-wider text-slate-100 sm:text-base">
                  IPD // RL LAB
                </h1>
                <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-cyan-300">
                  Client-Side Q-Learning
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tekrarlı Mahkum İkilemi — 2 AI Ajan Düellosu &amp; Pekiştirmeli Öğrenme Laboratuvarı
              </p>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <nav className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('lab')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition ${
                activeTab === 'lab'
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.18)] ring-1 ring-emerald-500/40'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Laboratuvar &amp; Eğitim
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRunning(false);
                setActiveTab('bot-duel');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition ${
                activeTab === 'bot-duel'
                  ? 'bg-violet-500/20 text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.2)] ring-1 ring-violet-500/40'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              Eğitilmiş Botla Oyna (1v1)
              {savedBots.length > 0 && (
                <span className="rounded-full bg-violet-500/30 px-1.5 py-0.2 font-mono text-[10px] text-violet-200">
                  {savedBots.length}
                </span>
              )}
            </button>
          </nav>

          <div className="hidden items-center gap-2 text-xs xl:flex">
            <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 font-mono text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <span>2-Tur Bellek (16 Durum)</span>
            </div>
            {snapshot.noise > 0 && (
              <div className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 font-mono text-amber-300">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Gürültü: %{Math.round(snapshot.noise * 100)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-5 sm:px-6">
        {activeTab === 'lab' ? (
          <>
            {/* 1. Live Duel Arena */}
            <DuelStage
              snapshot={snapshot}
              speed={speed}
              isRunning={isRunning}
              onHumanAction={handleHumanAction}
              pendingHumanActions={pendingHumanActions}
            />

            {/* 2. Speed, Playback & Lab Configuration Panel */}
            <ControlPanel
              snapshot={snapshot}
              isRunning={isRunning}
              speed={speed}
              roundsPerSec={roundsPerSec}
              onTogglePlay={handleTogglePlay}
              onStep={handleStep}
              onReset={handleReset}
              onSpeedChange={setSpeed}
              onBrainChange={handleBrainChange}
              onPayoffChange={handlePayoffChange}
              onNoiseChange={handleNoiseChange}
              onHyperparamsChange={handleHyperparamsChange}
            />

            {/* 3. Strategy Equilibrium Detector */}
            <StrategyDetector
              analysis={snapshot.strategyAnalysis}
              round={snapshot.round}
            />

            {/* 4. Live Canvas Telemetry Charts */}
            <LiveCharts
              telemetry={snapshot.telemetry}
              alphaScore={snapshot.alphaScore}
              betaScore={snapshot.betaScore}
            />

            {/* 5. Live Q-Table Heatmaps */}
            <QTableHeatmap
              alphaBrain={snapshot.alphaBrain}
              betaBrain={snapshot.betaBrain}
              alphaQTable={snapshot.alphaQTable}
              betaQTable={snapshot.betaQTable}
              alphaState={snapshot.alphaState}
              betaState={snapshot.betaState}
            />
          </>
        ) : (
          <TrainedBotArena
            snapshot={snapshot}
            savedBots={savedBots}
            selectedBotId={selectedBotId}
            onExportFromLab={handleExportFromLab}
            onImportBot={handleImportBot}
            onDeleteBot={handleDeleteBot}
            onSelectBot={setSelectedBotId}
            isActiveTab={activeTab === 'bot-duel'}
          />
        )}
      </main>
    </div>
  );
}

export default App;
