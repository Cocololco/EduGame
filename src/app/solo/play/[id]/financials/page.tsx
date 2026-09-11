"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Game } from "@/types/game";
import { loadGame } from "@/lib/game/storage";
import { formatCurrency, formatNumber, formatPct } from "@/lib/format";
import { PRODUCT_DEFINITIONS } from "@/lib/simulation/products";
import { ProductIcon } from "@/components/game/ProductIcon";
import { ProfitTrendChart } from "@/components/game/ProfitTrendChart";

function StatementRow({
  label,
  value,
  bold,
  indent,
}: {
  label: string;
  value: number;
  bold?: boolean;
  indent?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between border-b border-zinc-100 py-1.5 text-sm last:border-b-0 dark:border-zinc-900 ${indent ? "pl-4" : ""}`}
    >
      <span className={bold ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"}>
        {label}
      </span>
      <span
        className={
          bold
            ? "font-semibold text-zinc-900 dark:text-zinc-100"
            : value < 0
              ? "text-red-600 dark:text-red-400"
              : "text-zinc-800 dark:text-zinc-200"
        }
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

export default function FinancialsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGame(loadGame(params.id));
  }, [params.id]);

  useEffect(() => {
    if (!game || selectedYear !== null) return;
    const fromQuery = Number(searchParams.get("year"));
    const results = game.players[0].results;
    const initial = fromQuery > 0 && fromQuery <= results.length ? fromQuery : results.length;
    if (initial > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedYear(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

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
  const results = player.results;

  if (results.length === 0) {
    return (
      <CenteredMessage>
        No years simulated yet.{" "}
        <Link href={`/solo/play/${game.config.id}`} className="underline">
          Go make your first decision
        </Link>
        .
      </CenteredMessage>
    );
  }

  const year = selectedYear ?? results.length;
  const result = results.find((r) => r.year === year) ?? results[results.length - 1];
  const { incomeStatement: is, balanceSheet: bs, ratios } = result;

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="flex w-full max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href={`/solo/play/${game.config.id}`} className="text-sm text-zinc-600 underline dark:text-zinc-400">
            ← Back to decisions
          </Link>
          <Link href="/leaderboard" className="text-sm text-zinc-600 underline dark:text-zinc-400">
            Leaderboard →
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            {player.companyName || player.displayName} — Financials
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {results.map((r) => (
              <button
                key={r.year}
                onClick={() => setSelectedYear(r.year)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  r.year === year
                    ? "border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }`}
              >
                Year {r.year}
              </button>
            ))}
          </div>
        </div>

        {results.length > 1 && <ProfitTrendChart results={results} />}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-3 text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Income statement — Year {year}
            </h2>
            <StatementRow label="Revenue" value={is.revenue} />
            <StatementRow label="Cost of goods sold" value={-is.cogs} />
            <StatementRow label="Gross profit" value={is.grossProfit} bold />
            <div className="h-2" />
            <StatementRow label="Marketing expense" value={-is.marketingExpense} indent />
            <StatementRow label="Wages expense" value={-is.wagesExpense} indent />
            <StatementRow label="Training expense" value={-is.trainingExpense} indent />
            <StatementRow label="R&D expense" value={-is.rndExpense} indent />
            <StatementRow label="Overhead + depreciation" value={-is.otherOperatingExpense} indent />
            <StatementRow label="Operating profit" value={is.operatingProfit} bold />
            <StatementRow label="Interest expense" value={-is.interestExpense} indent />
            <StatementRow label="Net profit" value={is.netProfit} bold />
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-3 text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Balance sheet — end of Year {year}
            </h2>
            <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Assets</p>
            <StatementRow label="Cash" value={bs.cash} indent />
            <StatementRow label="Inventory" value={bs.inventory} indent />
            <StatementRow label="Fixed assets" value={bs.fixedAssets} indent />
            <StatementRow label="Total assets" value={bs.totalAssets} bold />
            <div className="h-2" />
            <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Liabilities</p>
            <StatementRow label="Debt" value={bs.debt} indent />
            <StatementRow label="Total liabilities" value={bs.totalLiabilities} bold />
            <div className="h-2" />
            <StatementRow label="Equity (assets − liabilities)" value={bs.equity} bold />

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 text-xs dark:border-zinc-900 sm:grid-cols-4">
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Gross margin</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{formatPct(ratios.grossMarginPct)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Net margin</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{formatPct(ratios.netMarginPct)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">ROI (assets)</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{formatPct(ratios.roiPct)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Debt/equity</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{ratios.debtToEquity.toFixed(2)}</dd>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-base font-semibold text-zinc-950 dark:text-zinc-50">By product — Year {year}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="py-1.5 pr-4 font-medium">Product</th>
                  <th className="py-1.5 pr-4 font-medium">Produced</th>
                  <th className="py-1.5 pr-4 font-medium">Sold</th>
                  <th className="py-1.5 pr-4 font-medium">Unsold (inventory)</th>
                  <th className="py-1.5 pr-4 font-medium">Revenue</th>
                  <th className="py-1.5 pr-4 font-medium">COGS</th>
                  <th className="py-1.5 pr-4 font-medium">Gross profit</th>
                  <th className="py-1.5 pr-4 font-medium">Wages</th>
                  <th className="py-1.5 pr-4 font-medium">Demand index</th>
                </tr>
              </thead>
              <tbody>
                {is.byProduct.map((p) => (
                  <tr key={p.productId} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-1.5 pr-4">
                      <span className="inline-flex items-center gap-2">
                        <ProductIcon productId={p.productId} className="h-6 w-3 text-zinc-400 dark:text-zinc-600" />
                        {PRODUCT_DEFINITIONS[p.productId].name}
                      </span>
                    </td>
                    <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">{formatNumber(p.unitsProduced)}</td>
                    <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">{formatNumber(p.unitsSold)}</td>
                    <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">{formatNumber(p.unsoldInventory)}</td>
                    <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">{formatCurrency(p.revenue)}</td>
                    <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">{formatCurrency(p.cogs)}</td>
                    <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">{formatCurrency(p.grossProfit)}</td>
                    <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">{formatCurrency(p.wagesExpense)}</td>
                    <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">{Math.round(p.demandIndex)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {result.eventsApplied.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-3 text-base font-semibold text-zinc-950 dark:text-zinc-50">Events this year</h2>
            <div className="flex flex-col gap-2">
              {result.eventsApplied.map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  ⚡ {e.description}
                </div>
              ))}
            </div>
          </div>
        )}
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
