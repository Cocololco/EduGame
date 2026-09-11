import type { YearResult } from "@/types/game";
import { formatCurrency } from "@/lib/format";

const WIDTH = 640;
const HEIGHT = 180;
const PADDING = { top: 16, right: 16, bottom: 28, left: 16 };

/** A simple inline-SVG line chart of revenue and net profit across years — no charting library needed. */
export function ProfitTrendChart({ results }: { results: YearResult[] }) {
  const years = results.map((r) => r.year);
  const revenues = results.map((r) => r.incomeStatement.revenue);
  const profits = results.map((r) => r.incomeStatement.netProfit);

  const allValues = [...revenues, ...profits, 0];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue || 1;

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  function x(index: number): number {
    return PADDING.left + (years.length === 1 ? plotWidth / 2 : (index / (years.length - 1)) * plotWidth);
  }
  function y(value: number): number {
    return PADDING.top + plotHeight - ((value - minValue) / range) * plotHeight;
  }

  function pathFor(values: number[]): string {
    return values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  }

  const zeroY = y(0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Revenue &amp; net profit by year</h2>
        <div className="flex gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500" /> Revenue
          </span>
          <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Net profit
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Revenue and net profit trend by year">
        <line
          x1={PADDING.left}
          y1={zeroY}
          x2={WIDTH - PADDING.right}
          y2={zeroY}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeDasharray="4 4"
          className="text-zinc-900 dark:text-zinc-100"
        />
        <path d={pathFor(revenues)} fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400 dark:text-zinc-500" />
        <path d={pathFor(profits)} fill="none" stroke="#10b981" strokeWidth="2.5" />
        {years.map((yr, i) => (
          <g key={yr}>
            <circle cx={x(i)} cy={y(revenues[i])} r="3" className="fill-zinc-400 dark:fill-zinc-500" />
            <circle cx={x(i)} cy={y(profits[i])} r="3.5" fill="#10b981" />
            <text
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              fontSize="10"
              className="fill-zinc-500 dark:fill-zinc-400"
            >
              Y{yr}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Latest year: {formatCurrency(revenues[revenues.length - 1])} revenue, {formatCurrency(profits[profits.length - 1])} net profit.
      </p>
    </div>
  );
}
