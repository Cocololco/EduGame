import type { Player } from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Builds a CSV of per-year company + per-product financials for a completed (or in-progress) player. */
export function buildFinancialsCsv(player: Player): string {
  const header = [
    "year",
    "revenue",
    "cogs",
    "grossProfit",
    "marketingExpense",
    "wagesExpense",
    "trainingExpense",
    "rndExpense",
    "otherOperatingExpense",
    "netProfit",
    "cash",
    "debt",
    "equity",
    ...PRODUCT_IDS.flatMap((id) => [`${id}_unitsSold`, `${id}_revenue`, `${id}_grossProfit`]),
  ];

  const rows = player.results.map((r) => {
    const byProduct = PRODUCT_IDS.flatMap((id) => {
      const p = r.incomeStatement.byProduct.find((b) => b.productId === id);
      return [p?.unitsSold ?? 0, p?.revenue ?? 0, p?.grossProfit ?? 0];
    });
    return [
      r.year,
      r.incomeStatement.revenue,
      r.incomeStatement.cogs,
      r.incomeStatement.grossProfit,
      r.incomeStatement.marketingExpense,
      r.incomeStatement.wagesExpense,
      r.incomeStatement.trainingExpense,
      r.incomeStatement.rndExpense,
      r.incomeStatement.otherOperatingExpense,
      r.incomeStatement.netProfit,
      r.closingState.cash,
      r.closingState.debt,
      r.closingState.equity,
      ...byProduct,
    ];
  });

  return [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

/** Triggers a browser download of the given text as a file. No-ops outside the browser. */
export function downloadTextFile(filename: string, content: string, mimeType = "text/csv"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

