import React, { useEffect, useRef } from 'react';
import { LineChart, TrendingUp } from 'lucide-react';
import type { TelemetryPoint } from '../../engine/types';

export interface LiveChartsProps {
  telemetry: TelemetryPoint[];
  alphaScore: number;
  betaScore: number;
}

interface ResponsiveCanvasProps {
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  hasData: boolean;
  emptyMessage?: string;
}

const COLORS = {
  alpha: '#38bdf8',
  beta: '#f472b6',
  mutual: '#10b981',
  grid: 'rgba(148, 163, 184, 0.12)',
  axisText: '#94a3b8',
};

const ResponsiveCanvas: React.FC<ResponsiveCanvasProps> = ({
  draw,
  hasData,
  emptyMessage = 'Start the simulation...',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const drawRef = useRef(draw);
  drawRef.current = draw;

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = sizeRef.current;
    if (width <= 0 || height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    drawRef.current(ctx, width, height);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = (w: number, h: number) => {
      sizeRef.current = { width: Math.floor(w), height: Math.floor(h) };
      renderCanvas();
    };

    const rect = container.getBoundingClientRect();
    updateSize(rect.width, rect.height);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        updateSize(entry.contentRect.width, entry.contentRect.height);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    renderCanvas();
  }, [draw]);

  return (
    <div ref={containerRef} className="relative h-56 w-full select-none">
      <canvas ref={canvasRef} className="block h-full w-full" />
      {!hasData && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-slate-950/40 text-slate-400">
          <span className="font-mono text-xs tracking-wide">{emptyMessage}</span>
          <span className="mt-1 text-[11px] text-slate-500">
            At least 2 rounds of data required to plot
          </span>
        </div>
      )}
    </div>
  );
};

function computeNiceMax(rawMax: number): number {
  if (rawMax <= 10) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const normalized = rawMax / magnitude;
  if (normalized <= 1.2) return 1.2 * magnitude;
  if (normalized <= 1.5) return 1.5 * magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 2.5) return 2.5 * magnitude;
  if (normalized <= 3) return 3 * magnitude;
  if (normalized <= 4) return 4 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  if (normalized <= 6) return 6 * magnitude;
  if (normalized <= 8) return 8 * magnitude;
  return 10 * magnitude;
}

function formatAxisNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(0)}k`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return Math.round(value).toString();
}

function drawPolyline(
  ctx: CanvasRenderingContext2D,
  points: ReadonlyArray<{ x: number; y: number }>,
  strokeColor: string,
  lineWidth: number,
  fillGradient?: CanvasGradient,
  baselineY?: number,
): void {
  if (points.length < 2) return;

  if (fillGradient && baselineY !== undefined) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, baselineY);
    for (let i = 0; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineTo(points[points.length - 1].x, baselineY);
    ctx.closePath();
    ctx.fillStyle = fillGradient;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Subtle glowing tip dot on the latest point
  const last = points[points.length - 1];
  ctx.save();
  ctx.beginPath();
  ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = strokeColor;
  ctx.shadowColor = strokeColor;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.restore();
}

function drawXAxisLabels(
  ctx: CanvasRenderingContext2D,
  telemetry: TelemetryPoint[],
  padLeft: number,
  plotW: number,
  height: number,
): void {
  if (telemetry.length < 2) return;
  const firstRound = telemetry[0].round;
  const midRound = telemetry[Math.floor((telemetry.length - 1) / 2)].round;
  const lastRound = telemetry[telemetry.length - 1].round;

  ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = COLORS.axisText;
  ctx.textBaseline = 'bottom';

  ctx.textAlign = 'left';
  ctx.fillText(`R${firstRound}`, padLeft, height - 4);

  if (midRound !== firstRound && midRound !== lastRound) {
    ctx.textAlign = 'center';
    ctx.fillText(`R${midRound}`, padLeft + plotW / 2, height - 4);
  }

  ctx.textAlign = 'right';
  ctx.fillText(`R${lastRound}`, padLeft + plotW, height - 4);
}

export const LiveCharts: React.FC<LiveChartsProps> = ({
  telemetry,
  alphaScore,
  betaScore,
}) => {
  const hasData = telemetry.length >= 2;
  const latest = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;
  const scoreDelta = alphaScore - betaScore;

  const drawCoopChart = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const padLeft = 40;
    const padRight = 14;
    const padTop = 12;
    const padBottom = 22;
    const plotW = Math.max(1, width - padLeft - padRight);
    const plotH = Math.max(1, height - padTop - padBottom);
    const baselineY = padTop + plotH;

    // Horizontal gridlines: 0%, 25%, 50%, 75%, 100%
    const ticks = [0, 25, 50, 75, 100];
    ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (const tick of ticks) {
      const y = padTop + plotH * (1 - tick / 100);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = COLORS.axisText;
      ctx.fillText(`${tick}%`, padLeft - 6, y);
    }

    if (!hasData) return;

    const count = telemetry.length;
    const toX = (idx: number) => padLeft + (idx / (count - 1)) * plotW;
    const toY = (pct: number) =>
      padTop + plotH * (1 - Math.max(0, Math.min(100, pct)) / 100);

    const mutualPoints = telemetry.map((pt, i) => ({ x: toX(i), y: toY(pt.mutualCoopRate) }));
    const alphaPoints = telemetry.map((pt, i) => ({ x: toX(i), y: toY(pt.alphaCoopRate) }));
    const betaPoints = telemetry.map((pt, i) => ({ x: toX(i), y: toY(pt.betaCoopRate) }));

    const mutualGrad = ctx.createLinearGradient(0, padTop, 0, baselineY);
    mutualGrad.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
    mutualGrad.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

    drawPolyline(ctx, mutualPoints, COLORS.mutual, 2, mutualGrad, baselineY);
    drawPolyline(ctx, alphaPoints, COLORS.alpha, 1.85);
    drawPolyline(ctx, betaPoints, COLORS.beta, 1.85);

    drawXAxisLabels(ctx, telemetry, padLeft, plotW, height);
  };

  const drawScoreChart = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const padLeft = 46;
    const padRight = 14;
    const padTop = 12;
    const padBottom = 22;
    const plotW = Math.max(1, width - padLeft - padRight);
    const plotH = Math.max(1, height - padTop - padBottom);
    const baselineY = padTop + plotH;

    let rawMax = Math.max(alphaScore, betaScore, 10);
    for (let i = 0; i < telemetry.length; i += 1) {
      if (telemetry[i].alphaScore > rawMax) rawMax = telemetry[i].alphaScore;
      if (telemetry[i].betaScore > rawMax) rawMax = telemetry[i].betaScore;
    }
    const maxY = computeNiceMax(rawMax);

    ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let step = 0; step <= 4; step += 1) {
      const ratio = step / 4;
      const value = maxY * ratio;
      const y = padTop + plotH * (1 - ratio);

      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = COLORS.axisText;
      ctx.fillText(formatAxisNumber(value), padLeft - 6, y);
    }

    if (!hasData) return;

    const count = telemetry.length;
    const toX = (idx: number) => padLeft + (idx / (count - 1)) * plotW;
    const toY = (score: number) =>
      padTop + plotH * (1 - Math.max(0, Math.min(maxY, score)) / maxY);

    const alphaPoints = telemetry.map((pt, i) => ({ x: toX(i), y: toY(pt.alphaScore) }));
    const betaPoints = telemetry.map((pt, i) => ({ x: toX(i), y: toY(pt.betaScore) }));

    const alphaGrad = ctx.createLinearGradient(0, padTop, 0, baselineY);
    alphaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
    alphaGrad.addColorStop(1, 'rgba(56, 189, 248, 0.01)');

    const betaGrad = ctx.createLinearGradient(0, padTop, 0, baselineY);
    betaGrad.addColorStop(0, 'rgba(244, 114, 182, 0.22)');
    betaGrad.addColorStop(1, 'rgba(244, 114, 182, 0.01)');

    drawPolyline(ctx, alphaPoints, COLORS.alpha, 2, alphaGrad, baselineY);
    drawPolyline(ctx, betaPoints, COLORS.beta, 2, betaGrad, baselineY);

    drawXAxisLabels(ctx, telemetry, padLeft, plotW, height);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Chart 1: Cooperation Rate */}
      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/75 backdrop-blur-md p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <LineChart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Cooperation Rate (%)</h3>
              <p className="text-[11px] text-slate-400">Rolling 100-Round Moving Average</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-950/70 border border-slate-800 px-2 py-0.5 text-sky-300">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              Alpha: {latest ? `${latest.alphaCoopRate.toFixed(1)}%` : '—'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-950/70 border border-slate-800 px-2 py-0.5 text-pink-300">
              <span className="h-2 w-2 rounded-full bg-pink-400" />
              Beta: {latest ? `${latest.betaCoopRate.toFixed(1)}%` : '—'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-950/70 border border-slate-800 px-2 py-0.5 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Mutual: {latest ? `${latest.mutualCoopRate.toFixed(1)}%` : '—'}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-2">
          <ResponsiveCanvas draw={drawCoopChart} hasData={hasData} />
        </div>
      </section>

      {/* Chart 2: Cumulative Score Comparison */}
      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/75 backdrop-blur-md p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Cumulative Score Comparison</h3>
              <p className="text-[11px] text-slate-400">Total payoff curve &amp; score delta</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-950/70 border border-slate-800 px-2 py-0.5 text-sky-300">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              Alpha: {alphaScore.toLocaleString('en-US')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-950/70 border border-slate-800 px-2 py-0.5 text-pink-300">
              <span className="h-2 w-2 rounded-full bg-pink-400" />
              Beta: {betaScore.toLocaleString('en-US')}
            </span>
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 ${
                scoreDelta > 0
                  ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                  : scoreDelta < 0
                    ? 'border-pink-500/30 bg-pink-500/10 text-pink-300'
                    : 'border-slate-700 bg-slate-800/60 text-slate-300'
              }`}
            >
              Δ{' '}
              {scoreDelta === 0
                ? '0'
                : `${scoreDelta > 0 ? '+' : ''}${scoreDelta.toLocaleString('en-US')}`}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-2">
          <ResponsiveCanvas draw={drawScoreChart} hasData={hasData} />
        </div>
      </section>
    </div>
  );
};
