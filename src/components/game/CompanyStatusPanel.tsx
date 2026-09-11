import type { CompanyYearState } from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PRODUCT_DEFINITIONS } from "@/lib/simulation/products";
import { effectiveCapacity } from "@/lib/game/decisionOptions";
import { ProductIcon } from "./ProductIcon";

export function CompanyStatusPanel({
  state,
  year,
  totalYears,
  companyName,
}: {
  state: CompanyYearState;
  year: number;
  totalYears: number;
  companyName?: string;
}) {
  const stats: { label: string; value: string }[] = [
    { label: "Cash", value: formatCurrency(state.cash) },
    { label: "Equity", value: formatCurrency(state.equity) },
    { label: "Debt", value: formatCurrency(state.debt) },
    { label: "Brand", value: `${Math.round(state.brandAwareness)}/100` },
    { label: "Innovation", value: `${Math.round(state.innovation)}/100` },
    { label: "Morale", value: `${Math.round(state.morale)}/100` },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{companyName || "Company status"}</h2>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Year {year} / {totalYears}
        </span>
      </div>
      <dl className="mb-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">{s.label}</dt>
            <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="py-1.5 pr-4 font-medium">Product</th>
              <th className="py-1.5 pr-4 font-medium">Price</th>
              <th className="py-1.5 pr-4 font-medium">Staffed / Capacity</th>
              <th className="py-1.5 pr-4 font-medium">Employees</th>
              <th className="py-1.5 pr-4 font-medium">Quality</th>
              <th className="py-1.5 pr-4 font-medium">Productivity</th>
              <th className="py-1.5 pr-4 font-medium">Inventory</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCT_IDS.map((id) => {
              const p = state.products[id];
              const def = PRODUCT_DEFINITIONS[id];
              const eff = Math.round(effectiveCapacity(p));
              return (
                <tr key={id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-1.5 pr-4">
                    <span className="inline-flex items-center gap-2">
                      <ProductIcon productId={id} className="h-6 w-3 text-zinc-400 dark:text-zinc-600" />
                      {def.name}
                    </span>
                  </td>
                  <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">{formatCurrency(p.currentPrice)}</td>
                  <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">
                    {eff < p.productionCapacity ? (
                      <span className="text-amber-700 dark:text-amber-400">
                        {formatNumber(eff)} / {formatNumber(p.productionCapacity)}
                      </span>
                    ) : (
                      formatNumber(p.productionCapacity)
                    )}
                  </td>
                  <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">{p.employees}</td>
                  <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">{Math.round(p.quality)}/100</td>
                  <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">{Math.round(p.productivity)}/100</td>
                  <td className="py-1.5 pr-4 text-zinc-700 dark:text-zinc-300">{formatNumber(p.inventoryUnits)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
