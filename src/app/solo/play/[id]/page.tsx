"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { CompanyYearState, Game, YearDecision, YearResult } from "@/types/game";
import { advanceSoloYear } from "@/lib/game/createGame";
import {
  BASE_DEMAND_UNITS_PER_PLAYER,
  BASE_UNIT_COST,
  CAPACITY_COST_PER_UNIT,
  INTEREST_RATE,
  MARKETING_COST_PER_BRAND_POINT,
  MORALE_TRAINING_FACTOR,
  PRICE_ELASTICITY,
  QUALITY_COST_PER_POINT,
  REFERENCE_PRICE,
  UNITS_PER_EMPLOYEE,
} from "@/lib/simulation/constants";
import { computeAttractiveness } from "@/lib/simulation/simulateYear";
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

type FieldOption = { value: number; label: string };

/** Picks whichever option's value is numerically closest to `target`. */
function nearestOption(options: FieldOption[], target: number): number {
  return options.reduce(
    (best, opt) => (Math.abs(opt.value - target) < Math.abs(best - target) ? opt.value : best),
    options[0].value,
  );
}

function priceMultiplier(price: number): number {
  return Math.pow(REFERENCE_PRICE / price, PRICE_ELASTICITY);
}

const PRICE_TIERS: { value: number; tier: string }[] = [
  { value: 20, tier: "Very low" },
  { value: 30, tier: "Low" },
  { value: 40, tier: "Somewhat low" },
  { value: 45, tier: "Slightly low" },
  { value: 50, tier: "Neutral" },
  { value: 55, tier: "Slightly high" },
  { value: 60, tier: "Somewhat high" },
  { value: 70, tier: "High" },
  { value: 85, tier: "Very high" },
  { value: 100, tier: "Extreme" },
];

function priceOptions(): FieldOption[] {
  return PRICE_TIERS.map(({ value, tier }) => ({
    value,
    label: `$${value} — ${tier} (demand ×${priceMultiplier(value).toFixed(2)}, margin $${value - BASE_UNIT_COST}/unit)`,
  }));
}

const MARKETING_TIERS = [0, 100, 250, 500, 750, 1000, 1500, 2500, 5000, 10000];
function marketingOptions(): FieldOption[] {
  return MARKETING_TIERS.map((v) => ({
    value: v,
    label:
      v === 0
        ? "$0 — None"
        : `$${v.toLocaleString()} (+${(v / MARKETING_COST_PER_BRAND_POINT).toFixed(1)} brand pts next yr)`,
  }));
}

/** The plant (productionCapacity) and the staff to run it (employees × UNITS_PER_EMPLOYEE) — whichever is lower. */
function effectiveCapacity(state: CompanyYearState): number {
  return Math.min(state.productionCapacity, state.employees * UNITS_PER_EMPLOYEE);
}

function productionOptions(state: CompanyYearState): FieldOption[] {
  const capacity = Math.round(effectiveCapacity(state));
  const staffLimited = state.employees * UNITS_PER_EMPLOYEE < state.productionCapacity;
  const fractions = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.85, 1];
  return fractions.map((f) => {
    const units = Math.round(capacity * f);
    const pctLabel = staffLimited ? "% of what your staff can run" : "% of capacity";
    return { value: units, label: `${units} units (${Math.round(f * 100)}${pctLabel})` };
  });
}

const CAPACITY_INVESTMENT_TIERS = [0, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 25000];
function capacityInvestmentOptions(): FieldOption[] {
  return CAPACITY_INVESTMENT_TIERS.map((v) => ({
    value: v,
    label: v === 0 ? "$0 — None" : `$${v.toLocaleString()} (+${Math.round(v / CAPACITY_COST_PER_UNIT)} units next yr)`,
  }));
}

const QUALITY_INVESTMENT_TIERS = [0, 200, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000];
function qualityInvestmentOptions(): FieldOption[] {
  return QUALITY_INVESTMENT_TIERS.map((v) => ({
    value: v,
    label:
      v === 0 ? "$0 — None" : `$${v.toLocaleString()} (+${(v / QUALITY_COST_PER_POINT).toFixed(1)} quality pts next yr)`,
  }));
}

const HIRE_TIERS = [0, 1, 2, 3, 4, 5, 7, 10, 15, 20];
function hireOptions(state: CompanyYearState): FieldOption[] {
  return HIRE_TIERS.map((v) => ({
    value: v,
    label:
      v === 0
        ? "0 — None"
        : `${v} (+$${Math.round(v * state.wageLevel).toLocaleString()}/yr wages, +${v * UNITS_PER_EMPLOYEE} units you can staff)`,
  }));
}

const FIRE_TIERS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 15];
function fireOptions(state: CompanyYearState): FieldOption[] {
  return FIRE_TIERS.map((v) => ({
    value: v,
    label:
      v === 0
        ? "0 — None"
        : `${v} (-${v * 5} morale, -$${Math.round(v * state.wageLevel).toLocaleString()}/yr wages, -${v * UNITS_PER_EMPLOYEE} units you can staff)`,
  }));
}

const WAGE_ADJUSTMENT_TIERS = [-20, -10, -5, -2, 0, 2, 5, 10, 15, 25];
function wageAdjustmentOptions(): FieldOption[] {
  return WAGE_ADJUSTMENT_TIERS.map((v) => ({
    value: v,
    label: v === 0 ? "0% — No change" : `${v > 0 ? "+" : ""}${v}% (${v > 0 ? "+" : ""}${v} morale)`,
  }));
}

const TRAINING_TIERS = [0, 50, 100, 200, 350, 500, 750, 1000, 2000, 5000];
function trainingOptions(): FieldOption[] {
  return TRAINING_TIERS.map((v) => ({
    value: v,
    label: v === 0 ? "$0 — None" : `$${v.toLocaleString()} (+${(v * MORALE_TRAINING_FACTOR).toFixed(1)} morale)`,
  }));
}

const LOAN_TIERS = [0, 1000, 2500, 5000, 10000, 15000, 20000, 30000, 50000, 100000];
function loanOptions(): FieldOption[] {
  return LOAN_TIERS.map((v) => ({
    value: v,
    label:
      v === 0
        ? "$0 — None"
        : `$${v.toLocaleString()} (+$${Math.round(v * INTEREST_RATE).toLocaleString()}/yr interest, starting next yr)`,
  }));
}

function loanRepaymentOptions(state: CompanyYearState): FieldOption[] {
  const debt = Math.round(state.debt);
  if (debt <= 0) return [{ value: 0, label: "$0 — No debt to repay" }];
  const fractions = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.75, 0.9, 1];
  return fractions.map((f) => {
    const amt = Math.round(debt * f);
    return { value: amt, label: f === 0 ? "$0 — None" : `$${amt.toLocaleString()} (${Math.round(f * 100)}% of debt)` };
  });
}

const RND_TIERS = [0, 250, 500, 1000, 2000, 3000, 5000, 7500, 10000, 20000];
function rndOptions(): FieldOption[] {
  return RND_TIERS.map((v) => ({
    value: v,
    label: v === 0 ? "$0 — None" : `$${v.toLocaleString()} (pure cost — no effect yet)`,
  }));
}

const CAPEX_TIERS = [0, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 25000];
function capexOptions(): FieldOption[] {
  return CAPEX_TIERS.map((v) => ({
    value: v,
    label: v === 0 ? "$0 — None" : `$${v.toLocaleString()} (adds to fixed assets, 10%/yr depreciation)`,
  }));
}

interface FieldSpec {
  key: keyof DecisionFormState;
  label: string;
  options: (state: CompanyYearState) => FieldOption[];
}

const FIELD_SPECS: FieldSpec[] = [
  { key: "price", label: "Price ($/unit)", options: () => priceOptions() },
  { key: "marketingSpend", label: "Marketing spend ($)", options: () => marketingOptions() },
  { key: "productionVolume", label: "Production volume", options: productionOptions },
  { key: "capacityInvestment", label: "Capacity investment ($)", options: () => capacityInvestmentOptions() },
  { key: "qualityInvestment", label: "Quality investment ($)", options: () => qualityInvestmentOptions() },
  { key: "hires", label: "Hires", options: hireOptions },
  { key: "fires", label: "Fires", options: fireOptions },
  { key: "wageAdjustmentPct", label: "Wage adjustment", options: () => wageAdjustmentOptions() },
  { key: "trainingSpend", label: "Training spend ($)", options: () => trainingOptions() },
  { key: "loanAmountRequested", label: "New loan ($)", options: () => loanOptions() },
  { key: "loanRepayment", label: "Loan repayment ($)", options: loanRepaymentOptions },
  { key: "rndSpend", label: "R&D spend ($)", options: () => rndOptions() },
  { key: "capexSpend", label: "Other capex ($)", options: () => capexOptions() },
];

function defaultDecisionForm(state: CompanyYearState): DecisionFormState {
  const priceOpts = priceOptions();
  const defaultPrice = nearestOption(priceOpts, Math.round(state.currentPrice));

  // Aim production at roughly what you could actually sell this year (at
  // the default price, current quality/brand), not blindly at full
  // capacity — overproducing relative to demand is the #1 way a first
  // year loses money by default.
  const projectedDemand = Math.round(BASE_DEMAND_UNITS_PER_PLAYER * computeAttractiveness(state, defaultPrice));
  const defaultProduction = nearestOption(
    productionOptions(state),
    Math.min(projectedDemand, Math.round(state.productionCapacity)),
  );

  return {
    price: defaultPrice,
    marketingSpend: 1000,
    productionVolume: defaultProduction,
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

function CompanyStatusCard({ state, year, totalYears }: { state: CompanyYearState; year: number; totalYears: number }) {
  const stats: { label: string; value: string }[] = [
    { label: "Cash", value: formatCurrency(state.cash) },
    { label: "Equity", value: formatCurrency(state.equity) },
    { label: "Debt", value: formatCurrency(state.debt) },
    { label: "Employees", value: String(state.employees) },
    {
      label: "Capacity",
      value:
        effectiveCapacity(state) < state.productionCapacity
          ? `${Math.round(effectiveCapacity(state))} staffed / ${Math.round(state.productionCapacity)} units`
          : `${Math.round(state.productionCapacity)} units`,
    },
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

  // Projected outcome for THIS year, from the currently-selected price and
  // production volume against the company's state as it stands right now
  // (i.e. before this year's decisions apply — marketing/quality spend
  // picked below won't show up here; they affect next year's demand).
  const attractiveness = computeAttractiveness(state, form.price);
  const potentialDemand = Math.round(BASE_DEMAND_UNITS_PER_PLAYER * attractiveness);
  const unitsAvailable = state.inventoryUnits + form.productionVolume;
  // Rounded for display — state.inventoryUnits can carry tiny float error
  // (e.g. 497.9999999999999) from prior-year division, which otherwise
  // leaks into this preview.
  const projectedUnitsSold = Math.round(Math.max(0, Math.min(potentialDemand, unitsAvailable)));
  const projectedRevenue = projectedUnitsSold * form.price;
  const projectedGrossProfit = projectedUnitsSold * (form.price - BASE_UNIT_COST);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="mb-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">Year {year} decisions</h2>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Each option shows its effect. Not sure what a number means?{" "}
        <Link href="/rules" className="underline" target="_blank">
          See the rules
        </Link>
        .
      </p>

      <div className="mb-5 rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
        <p className="mb-2 font-medium text-zinc-800 dark:text-zinc-200">
          Projected this year (ignoring random events; based on price + production volume above)
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">
          ~{potentialDemand} units of demand at this price → est. {projectedUnitsSold} sold, {formatCurrency(projectedRevenue)}{" "}
          revenue, {formatCurrency(projectedGrossProfit)} gross profit (before wages/overhead/marketing).
        </p>
        {form.productionVolume > potentialDemand && (
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            You&apos;re planning to produce more than you&apos;re likely to sell — the rest becomes inventory.
          </p>
        )}
        {state.employees * UNITS_PER_EMPLOYEE < state.productionCapacity && (
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            Your {state.employees} employees can staff at most {state.employees * UNITS_PER_EMPLOYEE} units — that&apos;s
            below your {Math.round(state.productionCapacity)}-unit capacity, so staffing (not capacity) is currently
            your real ceiling. Hiring pays off next year, not this one.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELD_SPECS.map((spec) => {
          const options = spec.options(state);
          return (
            <label key={spec.key} className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{spec.label}</span>
              <select
                value={form[spec.key]}
                onChange={(e) => handleChange(spec.key, Number(e.target.value))}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              >
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
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
