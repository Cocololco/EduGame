"use client";

import type { CountryId, DifficultyLevel, ProductDefinition, ProductLineState } from "@/types/game";
import type { ProductDecisionInput } from "@/lib/game/createGame";
import type { FieldOption } from "@/lib/game/decisionOptions";
import { PRODUCT_FIELDS_BY_DIFFICULTY } from "@/lib/game/difficulty";
import {
  capacityInvestmentOptions,
  effectiveCapacity,
  factoryOpenOptions,
  fireOptions,
  hireOptions,
  priceByCountryOptions,
  priceOptions,
  productionOptions,
  qualityInvestmentOptions,
  trainingOptions,
  wageAdjustmentOptions,
} from "@/lib/game/decisionOptions";
import { formatCurrency, formatNumber } from "@/lib/format";
import { getCountryDefinition } from "@/lib/simulation/countries";
import { computeAttractiveness } from "@/lib/simulation/simulateYear";
import { Card } from "@/components/ui/Card";
import { SELECT_CLASS } from "@/components/ui/field";
import { ProductIcon } from "./ProductIcon";

interface Props {
  def: ProductDefinition;
  state: ProductLineState;
  companyBrandAwareness: number;
  companyInnovation: number;
  licensedCountries: CountryId[];
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
  licensedCountries,
  openedFactoryCountries,
  value,
  onChange,
  difficulty,
}: Props) {
  function set<K extends keyof ProductDecisionInput>(key: K, v: number) {
    onChange({ ...value, [key]: v });
  }

  const totalProductionVolume = Object.values(value.productionVolumeByFactory).reduce((sum, v) => sum + (v ?? 0), 0);
  const hasCountryPriceOverrides = Object.keys(value.priceByCountry ?? {}).length > 0;

  const attractiveness = computeAttractiveness(state, companyBrandAwareness, companyInnovation, value.price, def.referencePrice);
  const potentialDemand = Math.round(def.baseDemandUnits * attractiveness);
  const unitsAvailable = state.inventoryUnits + totalProductionVolume;
  const projectedUnitsSold = Math.round(Math.max(0, Math.min(potentialDemand, unitsAvailable)));
  const projectedRevenue = projectedUnitsSold * value.price;
  const projectedGrossProfit = projectedUnitsSold * (value.price - def.baseUnitCost);

  const allFields: { key: keyof ProductDecisionInput; label: string; options: FieldOption[] }[] = [
    { key: "price", label: "Price ($/unit)", options: priceOptions(def) },
    { key: "capacityInvestment", label: "Capacity investment ($)", options: capacityInvestmentOptions(companyInnovation) },
    { key: "qualityInvestment", label: "Quality investment ($)", options: qualityInvestmentOptions() },
    { key: "trainingSpend", label: "Training spend ($)", options: trainingOptions() },
    { key: "hires", label: "Hires", options: hireOptions(state) },
    { key: "fires", label: "Fires", options: fireOptions(state) },
    { key: "wageAdjustmentPct", label: "Wage adjustment", options: wageAdjustmentOptions(state) },
  ];
  const visible = new Set(PRODUCT_FIELDS_BY_DIFFICULTY[difficulty]);
  const fields = allFields.filter((f) => visible.has(f.key));
  const showProduction = visible.has("productionVolumeByFactory");
  const showFactoryOpen = visible.has("openFactoryIn");
  const otherLicensedCountries = licensedCountries.filter((c) => c !== "france");
  const showPriceByCountry = visible.has("priceByCountry") && otherLicensedCountries.length > 0;

  return (
    <Card>
      <div className="mb-3 flex items-center gap-3">
        <ProductIcon productId={def.id} className="h-14 w-7 shrink-0 text-teal-600/70 dark:text-teal-400/60" />
        <div>
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{def.name}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{def.description}</p>
        </div>
      </div>

      <div className="mb-4 rounded-lg bg-teal-50/70 p-3 text-xs leading-relaxed dark:bg-teal-950/20">
        <p className="text-zinc-600 dark:text-zinc-400">
          ~{formatNumber(potentialDemand)} units of demand at this price → est. {formatNumber(projectedUnitsSold)} sold,{" "}
          {formatCurrency(projectedRevenue)} revenue, {formatCurrency(projectedGrossProfit)} gross profit.
        </p>
        {totalProductionVolume > potentialDemand && (
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            Producing more than you&apos;ll likely sell — the rest becomes inventory.
          </p>
        )}
        {value.price < def.baseUnitCost && (
          <p className="mt-1 text-red-700 dark:text-red-400">
            Selling below cost (${def.baseUnitCost}/unit) — every unit sold loses money before overhead.
          </p>
        )}
        {hasCountryPriceOverrides && (
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            This estimate uses your default price only — the countries you&apos;ve set a different price for will see
            their own demand/revenue adjust separately.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{f.label}</span>
            <select
              value={value[f.key] as number}
              onChange={(e) => set(f.key, Number(e.target.value))}
              className={SELECT_CLASS}
            >
              {f.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ))}

        {showProduction && (
          <div className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Production volume{state.factoryCountries.length > 1 ? " (per factory)" : ""}
            </span>
            {state.factoryCountries.map((countryId) => (
              <label key={countryId} className="flex flex-col gap-1">
                {state.factoryCountries.length > 1 && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{getCountryDefinition(countryId).name}</span>
                )}
                <select
                  value={value.productionVolumeByFactory[countryId] ?? 0}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      productionVolumeByFactory: { ...value.productionVolumeByFactory, [countryId]: Number(e.target.value) },
                    })
                  }
                  className={SELECT_CLASS}
                >
                  {productionOptions(state).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            {state.factoryCountries.length > 1 && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                All factories share one staff/capacity pool ({formatNumber(effectiveCapacity(state))} units max
                combined) — the mix between factories only changes each one&apos;s share of the wage bill&apos;s
                labor cost.
              </p>
            )}
          </div>
        )}

        {showPriceByCountry && (
          <div className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Price per country (overrides the default above)</span>
            {otherLicensedCountries.map((countryId) => (
              <label key={countryId} className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{getCountryDefinition(countryId).name}</span>
                <select
                  value={value.priceByCountry?.[countryId] ?? 0}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const next = { ...(value.priceByCountry ?? {}) };
                    if (v === 0) delete next[countryId];
                    else next[countryId] = v;
                    onChange({ ...value, priceByCountry: next });
                  }}
                  className={SELECT_CLASS}
                >
                  {priceByCountryOptions(def, value.price).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}

        {showFactoryOpen && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Open a new factory{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">
                (currently: {state.factoryCountries.map((c) => getCountryDefinition(c).name).join(", ")})
              </span>
            </span>
            <select
              value={value.openFactoryIn ?? ""}
              onChange={(e) => onChange({ ...value, openFactoryIn: (e.target.value || undefined) as ProductDecisionInput["openFactoryIn"] })}
              className={SELECT_CLASS}
            >
              {factoryOpenOptions(state, openedFactoryCountries).map((opt) => (
                <option key={opt.value || "none"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </Card>
  );
}
