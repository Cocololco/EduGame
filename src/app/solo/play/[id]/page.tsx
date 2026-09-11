"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { CompanyYearState, Game, YearDecision, YearResult } from "@/types/game";
import { advanceSoloYear } from "@/lib/game/createGame";
import { loadGame, saveGame } from "@/lib/game/storage";

function formatCurrency(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

type DecisionFormState = {
  price: number;
  marketingSpend: number;
  productionVolume: number;
  capacityInvestment: number;
  qualityInvestment: number;
  hires: number;
  fires: number;
  wageAdjustmentPct: number;
  trainingSpend: number;
  loanAmountRequested: number;
  loanRepayment: number;
  rndSpend: number;
  capexSpend: number;
};

function defaultDecisionForm(state: CompanyYearState): DecisionFormState {
  return {
    price: Math.round(state.currentPrice),
    marketingSpend: 1000,
    productionVolume: Math.round(state.productionCapacity),
    capacityInvestment: 0,
    qualityInvestment: 0,
    hires: 0,
    fires: 0,
    wageAdjustmentPct: 0,
    trainingSpend: 0,
    loanAmountRequested: 0,
    loanRepayment: 0,
    rndSpend: 0,
    capexSpend: 0,
  };
}

function toDecisionInput(form: DecisionFormState, playerId: string): Omit<YearDecision, "year" | "submittedAt"> {
  return {
    playerId,
    pricingSales: { price: form.price, marketingSpend: form.marketingSpend },
    productionOperations: {
      productionVolume: form.productionVolume,
      capacityInvestment: form.capacityInvestment,
      qualityInvestment: form.qualityInvestment,
    },
    hrStaffing: {
      hires: form.hires,
      fires: form.fires,
      wageAdjustmentPct: form.wageAdjustmentPct,
      trainingSpend: form.trainingSpend,
    },
    financeInvestment: {
      loanAmountRequested: form.loanAmountRequested,
      loanRepayment: form.loanRepayment,
      rndSpend: form.rndSpend,
      capexSpend: form.capexSpend,
    },
  };
}

const NUMBER_FIELDS: { key: keyof DecisionFormState; label: string; hint?: string; min?: number }[] = [
  { key: "price", label: "Price ($/unit)", min: 1 },
  { key: "marketingSpend", label: "Marketing spend ($)", hint: "Raises brand awareness", min: 0 },
  { key: "productionVolume", label: "Production volume (units)", hint: "Capped at production capacity", min: 0 },
  { key: "capacityInvestment", label: "Capacity investment ($)", hint: "Raises production capacity", min: 0 },
  { key: "qualityInvestment", label: "Quality investment ($)", hint: "Raises quality index", min: 0 },
  { key: "hires", label: "Hires", min: 0 },
  { key: "fires", label: "Fires", hint: "Hurts morale", min: 0 },
  { key: "wageAdjustmentPct", label: "Wage adjustment (%)", hint: "e.g. 5 for +5%, -5 for a cut" },
  { key: "trainingSpend", label: "Training spend ($)", hint: "Raises morale", min: 0 },
  { key: "loanAmountRequested", label: "New loan ($)", min: 0 },
  { key: "loanRepayment", label: "Loan repayment ($)", min: 0 },
  { key: "rndSpend", label: "R&D spend ($)", min: 0 },
  { key: "capexSpend", label: "Other capex ($)", min: 0 },
];

function CompanyStatusCard({ state, year, totalYears }: { state: CompanyYearState; year: number; totalYears: number }) {
  const stats: { label: string; value: string }[] = [
    { label: "Cash", value: formatCurrency(state.cash) },
    { label: "Equity", value: formatCurrency(state.equity) },
    { label: "Debt", value: formatCurrency(state.debt) },
    { label: "Employees", value: String(state.employees) },
    { label: "Capacity", value: `${Math.round(state.productionCapacity)} units` },
    { label: "Quality", value: `${Math.round(state.quality)}/100` },
    { label: "Brand", value: `${Math.round(state.brandAwareness)}/100` },
    { label: "Morale", value: `${Math.round(state.morale)}/100` },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Company status</h2>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Year {year} / {totalYears}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">{s.label}</dt>
            <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function YearResultCard({ result, onContinue, isLastYear }: { result: YearResult; onContinue: () => void; isLastYear: boolean }) {
  const { incomeStatement: is, marketMetrics: mm, ratios } = result;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">Year {result.year} results</h2>

      {result.eventsApplied.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {result.eventsApplied.map((e) => (
            <div
              key={e.id}
              className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
            >
              ⚡ {e.description}
            </div>
          ))}
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">Units sold</dt>
          <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {Math.round(mm.unitsSold)} / {Math.round(mm.unitsProduced)} produced
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">Revenue</dt>
          <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatCurrency(is.revenue)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">Net profit</dt>
          <dd
            className={`text-sm font-medium ${is.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
          >
            {formatCurrency(is.netProfit)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">Net margin</dt>
          <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatPct(ratios.netMarginPct)}</dd>
        </div>
      </dl>

      <button
        onClick={onContinue}
        className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 sm:w-auto"
      >
        {isLastYear ? "See final results" : `Continue to year ${result.year + 1}`}
      </button>
    </div>
  );
}

function DecisionForm({
  year,
  state,
  onSubmit,
}: {
  year: number;
  state: CompanyYearState;
  onSubmit: (form: DecisionFormState) => void;
}) {
  // Remounted each year via `key={game.currentYear}` on the caller, so
  // initializing from `state` here is correct even though useState only
  // runs the initializer once.
  const [form, setForm] = useState<DecisionFormState>(() => defaultDecisionForm(state));

  function handleChange(key: keyof DecisionFormState, value: number) {
    setForm({ ...form, [key]: value });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">Year {year} decisions</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {NUMBER_FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{f.label}</span>
            {f.hint && <span className="text-xs text-zinc-500 dark:text-zinc-400">{f.hint}</span>}
            <input
              type="number"
              min={f.min}
              value={form[f.key]}
              onChange={(e) => handleChange(f.key, Number(e.target.value) || 0)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
        ))}
      </div>

      <button
        type="submit"
        className="mt-6 flex h-11 w-full items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 sm:w-auto"
      >
        Submit year {year}
      </button>
    </form>
  );
}

function FinalResultsCard({ game }: { game: Game }) {
  const player = game.players[0];
  const score = player.finalScore;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">Final results — {game.config.totalYears} years</h2>

      {score && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Cumulative net profit</dt>
            <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {formatCurrency(score.cumulativeNetProfit)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Final valuation</dt>
            <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {formatCurrency(score.finalValuation)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Composite score</dt>
            <dd className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {score.compositeScore.toFixed(0)}
            </dd>
          </div>
        </dl>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="py-2 pr-4 font-medium">Year</th>
              <th className="py-2 pr-4 font-medium">Revenue</th>
              <th className="py-2 pr-4 font-medium">Net profit</th>
              <th className="py-2 pr-4 font-medium">Equity</th>
            </tr>
          </thead>
          <tbody>
            {player.results.map((r) => (
              <tr key={r.year} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-300">{r.year}</td>
                <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-300">{formatCurrency(r.incomeStatement.revenue)}</td>
                <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-300">{formatCurrency(r.incomeStatement.netProfit)}</td>
                <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-300">{formatCurrency(r.closingState.equity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link
        href="/solo/new"
        className="mt-6 flex h-11 w-full items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 sm:w-auto"
      >
        Play again
      </Link>
    </div>
  );
}

export default function SoloPlayPage() {
  const params = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const [dismissedResultForYear, setDismissedResultForYear] = useState(0);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so `game` starts undefined
    // (matching the server-rendered "Loading…" output) and is populated
    // here after mount — loading it eagerly would cause a hydration
    // mismatch instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGame(loadGame(params.id));
  }, [params.id]);

  if (game === undefined) {
    return <CenteredMessage>Loading…</CenteredMessage>;
  }

  if (game === null) {
    return (
      <CenteredMessage>
        Couldn&apos;t find that game in this browser.{" "}
        <Link href="/solo/new" className="underline">
          Start a new one
        </Link>
        .
      </CenteredMessage>
    );
  }

  const player = game.players[0];
  const latestState = player.companyStates[player.companyStates.length - 1];
  const resultsCount = player.results.length;
  const pendingResult = resultsCount > dismissedResultForYear ? player.results[resultsCount - 1] : null;
  const showDecisionForm = !pendingResult && game.status === "in_progress";
  const showFinal = !pendingResult && game.status === "completed";

  function handleDecisionSubmit(form: DecisionFormState) {
    if (!game) return;
    const updated = advanceSoloYear(game, toDecisionInput(form, player.id));
    saveGame(updated);
    setGame(updated);
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <CompanyStatusCard state={latestState} year={game.currentYear} totalYears={game.config.totalYears} />

        {pendingResult && (
          <YearResultCard
            result={pendingResult}
            isLastYear={game.status === "completed"}
            onContinue={() => setDismissedResultForYear(resultsCount)}
          />
        )}

        {showDecisionForm && (
          <DecisionForm
            key={game.currentYear}
            year={game.currentYear + 1}
            state={latestState}
            onSubmit={handleDecisionSubmit}
          />
        )}

        {showFinal && <FinalResultsCard game={game} />}
      </div>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-24 text-center text-zinc-600 dark:bg-black dark:text-zinc-400">
      <p>{children}</p>
    </div>
  );
}
