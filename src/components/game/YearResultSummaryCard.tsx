import Link from "next/link";
import type { YearResult } from "@/types/game";
import { formatCurrency, formatNumber, formatPct } from "@/lib/format";
import { PRODUCT_DEFINITIONS } from "@/lib/simulation/products";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProductIcon } from "./ProductIcon";

export function YearResultSummaryCard({
  result,
  gameId,
  financialsHref,
  onContinue,
  isLastYear,
}: {
  result: YearResult;
  gameId: string;
  /** Overrides the default solo-mode financials link; pass null to hide the link entirely (multiplayer has no per-year financials page yet). */
  financialsHref?: string | null;
  onContinue: () => void;
  isLastYear: boolean;
}) {
  const { incomeStatement: is, ratios } = result;
  return (
    <Card>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Year {result.year} results</h2>
        {financialsHref !== null && (
          <Link
            href={financialsHref ?? `/solo/play/${gameId}/financials?year=${result.year}`}
            className="text-sm font-medium text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-800 dark:text-teal-400 dark:decoration-teal-800 dark:hover:text-teal-300"
          >
            Full financials →
          </Link>
        )}
      </div>

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

      <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
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
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">Closing equity</dt>
          <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatCurrency(result.closingState.equity)}</dd>
        </div>
      </dl>

      <div className="mb-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="py-1.5 pr-4 font-medium">Product</th>
              <th className="py-1.5 pr-4 font-medium">Sold</th>
              <th className="py-1.5 pr-4 font-medium">Revenue</th>
              <th className="py-1.5 pr-4 font-medium">Gross profit</th>
            </tr>
          </thead>
          <tbody>
            {is.byProduct.map((p) => (
              <tr key={p.productId} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-1.5 pr-4">
                  <span className="inline-flex items-center gap-2">
                    <ProductIcon productId={p.productId} className="h-6 w-3 text-teal-600/70 dark:text-teal-400/60" />
                    {PRODUCT_DEFINITIONS[p.productId].name}
                  </span>
                </td>
                <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">
                  {formatNumber(p.unitsSold)} / {formatNumber(p.unitsProduced)}
                </td>
                <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">{formatCurrency(p.revenue)}</td>
                <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">{formatCurrency(p.grossProfit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={onContinue} className="w-full sm:w-auto">
        {isLastYear ? "See final results" : `Continue to year ${result.year + 1}`}
      </Button>
    </Card>
  );
}
