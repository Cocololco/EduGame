"use client";

import type { CountryId, DifficultyLevel, ProductDefinition, ProductLineState } from "@/types/game";
import type { ProductDecisionInput } from "@/lib/game/createGame";
import type { FieldOption } from "@/lib/game/decisionOptions";
import { PRODUCT_FIELDS_BY_DIFFICULTY } from "@/lib/game/difficulty";
import {
  capacityInvestmentOptions,
  factoryRelocationOptions,
  fireOptions,
  hireOptions,
  priceOptions,
  productionOptions,
  qualityInvestmentOptions,
  trainingOptions,
  wageAdjustmentOptions,
} from "@/lib/game/decisionOptions";
import { formatCurrency, formatNumber } from "@/lib/format";
import { computeAttractiveness } from "@/lib/simulation/simulateYear";
import { ProductIcon } from "./ProductIcon";

interface Props {
  def: ProductDefinition;
  state: ProductLineState;
  companyBrandAwareness: number;
  companyInnovation: number;
  openedFactoryCountries: CountryId[];
  value: ProductDecisionInput;
  onChange: (next: ProductDecisionInput) => void;
  difficulty: DifficultyLevel;
}

export function ProductDecisionPanel({
  def,
  state,
  companyBrandAwareness,
  companyInnovation,
  openedFactoryCountries,
  value,
  onChange,
  difficulty,
}: Props) {
  function set<K extends keyof ProductDecisionInput>(key: K, v: number) {
    onChange({ ...value, [key]: v });
  }

  const attractiveness = computeAttractiveness(state, companyBrandAwareness, companyInnovation, value.price, def.referencePrice);
  const potentialDemand = Math.round(def.baseDemandUnits * attractiveness);
  const unitsAvailable = state.inventoryUnits + value.productionVolume;
  const projectedUnitsSold = Math.round(Math.max(0, Math.min(potentialDemand, unitsAvailable)));
  const projectedRevenue = projectedUnitsSold * value.price;
  const projectedGrossProfit = projectedUnitsSold * (value.price - def.baseUnitCost);

  const allFields: { key: keyof ProductDecisionInput; label: string; options: FieldOption[] }[] = [
    { key: "price", label: "Price ($/unit)", options: priceOptions(def) },
    { key: "productionVolume", label: "Production volume", options: productionOptions(state) },
    { key: "capacityInvestment", label: "Capacity investment ($)", options: capacityInvestmentOptions(companyInnovation) },
    { key: "qualityInvestment", label: "Quality investment ($)", options: qualityInvestmentOptions() },
    { key: "trainingSpend", label: "Training spend ($)", options: trainingOptions() },
    { key: "hires", label: "Hires", options: hireOptions(state) },
    { key: "fires", label: "Fires", options: fireOptions(state) },
    { key: "wageAdjustmentPct", label: "Wage adjustment", options: wageAdjustmentOptions(state) },
  ];
  const visible = new Set(PRODUCT_FIELDS_BY_DIFFICULTY[difficulty]);
  const fields = allFields.filter((f) => visible.has(f.key));
  const showFactoryRelocation = visible.has("relocateFactoryTo");

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-center gap-3">
        <ProductIcon productId={def.id} className="h-14 w-7 shrink-0 text-zinc-400 dark:text-zinc-600" />
        <div>
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{def.name}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{def.description}</p>
        </div>
      </div>

      <div className="mb-4 rounded-lg bg-zinc-100 p-3 text-xs leading-relaxed dark:bg-zinc-900">
        <p className="text-zinc-600 dark:text-zinc-400">
          ~{formatNumber(potentialDemand)} units of demand at this price → est. {formatNumber(projectedUnitsSold)} sold,{" "}
          {formatCurrency(projectedRevenue)} revenue, {formatCurrency(projectedGrossProfit)} gross profit.
        </p>
        {value.productionVolume > potentialDemand && (
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            Producing more than you&apos;ll likely sell — the rest becomes inventory.
          </p>
        )}
        {value.price < def.baseUnitCost && (
          <p className="mt-1 text-red-700 dark:text-red-400">
            Selling below cost (${def.baseUnitCost}/unit) — every unit sold loses money before overhead.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
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

        {showFactoryRelocation && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Factory location</span>
            <select
              value={value.relocateFactoryTo ?? ""}
              onChange={(e) => onChange({ ...value, relocateFactoryTo: (e.target.value || undefined) as ProductDecisionInput["relocateFactoryTo"] })}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {factoryRelocationOptions(state, openedFactoryCountries).map((opt) => (
                <option key={opt.value || "stay"} value={opt.value}>
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
