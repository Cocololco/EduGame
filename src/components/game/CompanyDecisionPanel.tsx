"use client";

import type { CompanyDecision, CompanyYearState, DifficultyLevel } from "@/types/game";
import type { FieldOption } from "@/lib/game/decisionOptions";
import {
  capexOptions,
  licenseCountryOptions,
  loanOptions,
  loanRepaymentOptions,
  marketingOptions,
  researchCountryOptions,
  rndOptions,
} from "@/lib/game/decisionOptions";
import { COMPANY_FIELDS_BY_DIFFICULTY } from "@/lib/game/difficulty";

interface Props {
  state: CompanyYearState;
  value: CompanyDecision;
  onChange: (next: CompanyDecision) => void;
  difficulty: DifficultyLevel;
}

export function CompanyDecisionPanel({ state, value, onChange, difficulty }: Props) {
  function set<K extends keyof CompanyDecision>(key: K, v: number) {
    onChange({ ...value, [key]: v });
  }

  const allFields: { key: keyof CompanyDecision; label: string; options: FieldOption[] }[] = [
    { key: "marketingSpend", label: "Marketing spend ($)", options: marketingOptions() },
    { key: "rndSpend", label: "R&D spend ($)", options: rndOptions() },
    { key: "loanAmountRequested", label: "New loan ($)", options: loanOptions() },
    { key: "loanRepayment", label: "Loan repayment ($)", options: loanRepaymentOptions(state) },
    { key: "capexSpend", label: "Other capex ($)", options: capexOptions() },
  ];
  const visible = new Set(COMPANY_FIELDS_BY_DIFFICULTY[difficulty]);
  const fields = allFields.filter((f) => visible.has(f.key));
  const showLicense = visible.has("licenseCountry");
  const showResearch = visible.has("researchCountry");

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="mb-1 text-base font-semibold text-zinc-950 dark:text-zinc-50">Company</h3>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        Shared across all three product lines — brand awareness, R&amp;D, and financing aren&apos;t per-product.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{f.label}</span>
            <select
              value={value[f.key]}
              onChange={(e) => set(f.key, Number(e.target.value))}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {f.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ))}

        {showLicense && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Buy a country license</span>
            <select
              value={value.licenseCountry ?? ""}
              onChange={(e) => onChange({ ...value, licenseCountry: (e.target.value || undefined) as CompanyDecision["licenseCountry"] })}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {licenseCountryOptions(state).map((opt) => (
                <option key={opt.value || "none"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {showResearch && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Buy market research</span>
            <select
              value={value.researchCountry ?? ""}
              onChange={(e) => onChange({ ...value, researchCountry: (e.target.value || undefined) as CompanyDecision["researchCountry"] })}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {researchCountryOptions(state).map((opt) => (
                <option key={opt.value || "none"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
