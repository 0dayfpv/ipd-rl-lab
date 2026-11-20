# IPD RL Lab — Iterated Prisoner's Dilemma & 2 AI Agent Duel

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-ipd.hamzafpv.com.tr-brightgreen)](https://ipd.hamzafpv.com.tr)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

A real-time, **100% client-side** **Reinforcement Learning (Tabular Q-Learning) Laboratory** and **2 AI Agent Duel Arena** built around the classic **Iterated Prisoner's Dilemma** from Game Theory.

Built with **Vite + React + TypeScript + Tailwind CSS v4** — zero backend required. All machine learning updates, game-theory simulations, and live telemetry charts run directly in the user's browser.

- **Live Demo:** [https://ipd.hamzafpv.com.tr](https://ipd.hamzafpv.com.tr)

---

## Key Features

### 1. Reinforcement Learning (Tabular Q-Learning) & Game Theory Engine
- **Independent Q-Learning Agents:** **Agent Alpha** and **Agent Beta** each maintain an independent Tabular Q-Learning model that learns strategies from scratch through repeated interaction.
- **State Space:** All combinations of both agents' actions over the last 2 rounds (`INIT`, 4 single-round states, and 16 two-round states such as `[C-C, C-D]`).
- **Actions & Bellman Update:** Supports `COOPERATE` and `DEFECT` with live-tunable hyperparameters:
  - Learning Rate (`α`)
  - Discount Factor (`γ`)
  - Exploration Rate (`ε`) with automatic **Epsilon Decay**
- **6 Selectable Agent Brains:** Independently configurable for both Agent Alpha and Agent Beta:
  1. `Q-Learning AI` — Tabular RL model learning from scratch
  2. `Tit-for-Tat` — Cooperates on round 1, then mirrors the opponent's previous move
  3. `Grim Trigger` — Cooperates until betrayed once, then defects forever
  4. `Always Defect` — Always chooses `DEFECT`
  5. `Always Cooperate` — Always chooses `COOPERATE`
  6. `Human Player` — Play manually against an AI using buttons or keyboard shortcuts
- **Dynamic Payoff Matrix:** Default payoffs (`R: +3/+3`, `T: +5`, `S: 0`, `P: +1/+1`) can be edited live during simulation or switched via built-in scenario presets.
- **Noise Parameter (`0% – 20%`):** Introduces configurable execution errors where an agent's chosen action is accidentally flipped, letting you test strategy resilience under uncertainty.

### 2. Visual Duel Arena & Speed Controls
- **Live Clash Stage:** Watch Agent Alpha and Agent Beta clash each round with animated energy beams, floating score popups (`+5`, `+3`, `+1`, `0`), and noise-flip indicators.
- **Mental State Indicator:** Real-time badge showing whether each RL agent is currently **`EXPLORING`** (random trial) or **`EXPLOITING`** (Q-Table decision).
- **4-Tier Speed Control:** `1x` (watch mode), `10x`, `100x`, and **`TURBO`** mode (disables animations to train at **1,000+ rounds/sec** while keeping charts and Q-Tables live).
- **Playback Controls:** `Play / Pause`, `Step (+1 Round)`, and `Reset Brain`.

### 3. Live Telemetry, Q-Table Heatmap & Strategy Detector
- **Smooth HTML5 Canvas Charts:**
  - Rolling 100-round **Cooperation Rate (%)** line chart
  - **Cumulative Score** comparison chart for both agents
- **Live Q-Table Heatmap:** Displays learned `COOPERATE` and `DEFECT` Q-values across all 16 two-round states for both RL agents, including preferred action, visit counts, and real-time highlighting of the active state.
- **Strategy Detector (Last 50 Rounds):** Automatically classifies the current equilibrium (e.g., *Mutual Cooperation*, *Nash Equilibrium: Defection Spiral*, *Alpha Exploiting Beta*).

### 4. Trained Bot 1v1 Arena & JSON Export/Import
- Save trained **Agent Alpha** or **Agent Beta** Q-Tables to browser storage (`localStorage`) or export/import them as **`.json`** files.
- Challenge your saved or imported Q-Table bots in a dedicated **1v1 Bot Arena** and inspect each bot's policy summary (cooperation vs. defection tendencies).

---

## Keyboard Shortcuts (Human Player Mode)

| Agent | Cooperate (`COOPERATE`) | Defect (`DEFECT`) |
| --- | :---: | :---: |
| **Agent Alpha (Left)** | `C` | `D` |
| **Agent Beta (Right)** | `J` | `K` |

---

## Project Architecture

```text
ipd-rl-lab/
├── index.html                          # Application entry point
├── vercel.json                         # Static Vercel deployment config
├── vite.config.ts                      # Vite + React + Tailwind v4 config
└── src/
    ├── App.tsx                         # Main orchestrator, simulation loop & tab navigation
    ├── engine/
    │   ├── types.ts                    # Shared TypeScript types & state definitions
    │   ├── qLearningAgent.ts           # Tabular Q-Learning agent & Bellman update logic
    │   ├── strategies.ts               # Fixed strategies, state encoder & payoff calculation
    │   ├── strategyDetector.ts         # 50-round equilibrium & strategy classifier
    │   ├── SimulationEngine.ts         # High-throughput simulation engine & telemetry buffer
    │   └── botSerializer.ts            # Q-Table JSON export/import & localStorage persistence
    └── components/
        ├── Arena/
        │   ├── DuelStage.tsx           # Live duel stage, energy beams & human controls
        │   └── ControlPanel.tsx        # Speed, brain selector, hyperparams, noise & payoff editor
        ├── Analytics/
        │   ├── LiveCharts.tsx          # Retina-ready HTML5 Canvas telemetry charts
        │   ├── QTableHeatmap.tsx       # 16-state live Q-Table heatmap
        │   └── StrategyDetector.tsx    # Live equilibrium badge & distribution bar
        └── BotDuel/
            └── TrainedBotArena.tsx     # Saved bot library & 1v1 human-vs-bot duel view
```

---

## Tech Stack

- **Frontend:** React 18, TypeScript (`strict: true`), Vite 6
- **Styling & Icons:** Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React
- **ML & Charts:** Zero external ML or charting libraries — pure TypeScript Tabular Q-Learning engine and HTML5 `<canvas>` 2D rendering

---

## Local Development

```bash
git clone https://github.com/0dayfpv/ipd-rl-lab.git
cd ipd-rl-lab
npm install
npm run dev
```

To create a production build:

```bash
npm run build
npm run preview
```

---

## License & Copyright

The source code is licensed under the [MIT License](LICENSE). All personal content, visuals, and branding remain All Rights Reserved.

© 2025–2026 [hamzafpv.com.tr](https://hamzafpv.com.tr) • All rights reserved.
