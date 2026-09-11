import Link from "next/link";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{children}</div>
    </section>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      {children}
    </p>
  );
}

const PRICE_ROWS: [string, string, string][] = [
  ["$25", "×2.83", "very low, floods demand"],
  ["$30", "×2.15", "low"],
  ["$40", "×1.40", "somewhat low"],
  ["$50", "×1.00", "neutral (reference)"],
  ["$60", "×0.76", "somewhat high"],
  ["$70", "×0.60", "high"],
  ["$100", "×0.35", "very high"],
];

const EVENT_ROWS: [string, string, string][] = [
  ["Economic downturn", "market-wide", "demand ×0.8"],
  ["Positive demand shock", "market-wide", "demand ×1.2"],
  ["Negative demand shock", "market-wide", "demand ×0.85"],
  ["Cost inflation", "market-wide", "unit cost ×1.1"],
  ["Regulatory change", "market-wide", "unit cost ×1.05, −$2,000 cash"],
  ["Supply disruption", "you only", "unit cost ×1.15"],
  ["Competitor price war", "you only", "your price capped at ×0.95 of what you set"],
];

export default function RulesPage() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">How the simulation works</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            The numbers behind the game, in plain language, so you can reason about decisions instead of guessing.
            Not balanced/tuned yet — see the notes below on known gaps.{" "}
            <Link href="/solo/new" className="underline">
              Back to game setup
            </Link>
            .
          </p>
        </div>

        <Callout>
          The single most important rule: <strong>this year&apos;s marketing/quality spend pays off next year</strong>,
          not this one. Demand for the year you&apos;re deciding uses your quality and brand awareness as they stood
          at the <em>start</em> of the year — investment made this year lands in next year&apos;s numbers. Price is
          the exception: the price you set this year affects this year&apos;s demand immediately.
        </Callout>

        <Section title="Starting position (solo, default)">
          <p>
            $50,000 cash, $0 debt, 10 employees at $3,000/year each, production capacity 1,200 units/year, price $50,
            quality 50/100, brand awareness 30/100, morale 70/100.
          </p>
        </Section>

        <Section title="Pricing & demand">
          <p>
            Your unit cost is <strong>$20</strong>. The reference price is <strong>$50</strong> — pricing there is
            demand-neutral. Demand reacts sharply to price (elasticity 1.5):
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="py-1.5 pr-4 font-medium">Price</th>
                  <th className="py-1.5 pr-4 font-medium">Demand multiplier</th>
                  <th className="py-1.5 pr-4 font-medium">Read as</th>
                </tr>
              </thead>
              <tbody>
                {PRICE_ROWS.map(([price, mult, read]) => (
                  <tr key={price} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-1.5 pr-4">{price}</td>
                    <td className="py-1.5 pr-4">{mult}</td>
                    <td className="py-1.5 pr-4 text-zinc-500 dark:text-zinc-400">{read}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            That multiplier applies to a baseline of 1,000 units, further scaled by your quality and brand awareness
            (below), then capped by what you actually produce plus any carried-over inventory.
          </p>
          <Callout>
            Known balance issue: cutting price is currently almost always revenue-positive when you&apos;re not
            capacity-constrained — the model doesn&apos;t yet punish racing toward $0. Not fixed yet.
          </Callout>
        </Section>

        <Section title="Quality & brand awareness (both 0–100)">
          <p>
            Each contributes a demand factor of <code className="rounded bg-black/5 px-1 dark:bg-white/10">0.5 + 0.5 × (value/100)</code> —
            0 → 0.5×, 100 → 1.0×. At the default starting quality (50) and brand (30) that&apos;s 0.75× and 0.65×; combined
            with neutral price (1.00×) that&apos;s why a fresh game sells only ~488 units in year 1 even with 1,200
            capacity — demand, not capacity, is the early bottleneck.
          </p>
          <p>
            <strong>Quality investment:</strong> $200 → +1 quality point next year (max 100).
            <br />
            <strong>Marketing spend → brand awareness:</strong> $150 → +1 brand point next year, but brand also{" "}
            <strong>decays 15%/year</strong> unspent. Holding a brand score of B costs roughly $22.5 × B/year just to
            stand still.
          </p>
          <p>
            Rough calibration for marketing: $100 barely moves anything; $1,000 is a meaningful early investment;
            $10,000 is a huge single-year swing relative to a $50,000 starting cash pile.
          </p>
        </Section>

        <Section title="Production & capacity">
          <p>
            You can&apos;t produce more than your capacity. <strong>Capacity investment:</strong> $10 → +1 unit of
            yearly capacity next year — usually not your first bottleneck early on. Unsold production carries over as
            inventory and adds to what&apos;s available to sell next year.
          </p>
        </Section>

        <Section title="HR & wages">
          <p>
            Wages = employees × wage level. At default (10 × $3,000) that&apos;s <strong>$30,000/year</strong> —
            bigger than typical year-1 revenue, which is why a default first year usually posts a loss. Headcount
            needs to match your revenue scale.
          </p>
          <p>
            <strong>Firing</strong> costs 5 morale/employee immediately. <strong>Wage adjustment</strong>: a raise
            costs more wages going forward and adds morale (1 point per 1%); a cut does the reverse.{" "}
            <strong>Training:</strong> $50 → +1 morale.
          </p>
          <Callout>Morale is tracked but currently has no effect on anything else — it&apos;s a placeholder for a future mechanic.</Callout>
        </Section>

        <Section title="Finance">
          <p>
            <strong>Loans:</strong> requesting $X adds $X cash and $X debt immediately; interest (8%/year) is charged
            on your debt as it stood at the <em>start</em> of the year, so a new loan doesn&apos;t cost interest until
            next year.
          </p>
          <Callout>
            R&amp;D spend is currently a pure cost with no modeled effect — it reduces profit but doesn&apos;t raise
            quality or anything else (quality only comes from Production&apos;s quality investment).
          </Callout>
        </Section>

        <Section title="Overhead, depreciation, cash">
          <p>Fixed overhead: $5,000/year. Depreciation: 10%/year of fixed-assets book value.</p>
          <Callout>Cash can go negative with no bankruptcy consequence yet — it just means you&apos;re doing badly.</Callout>
        </Section>

        <Section title="Random events">
          <p>
            Each year: a separate, independent 25% chance of a market-wide event and a 25% chance of an event that
            hits only you — roughly a 44% chance something fires in any given year.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="py-1.5 pr-4 font-medium">Event</th>
                  <th className="py-1.5 pr-4 font-medium">Scope</th>
                  <th className="py-1.5 pr-4 font-medium">Effect</th>
                </tr>
              </thead>
              <tbody>
                {EVENT_ROWS.map(([name, scope, effect]) => (
                  <tr key={name} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-1.5 pr-4">{name}</td>
                    <td className="py-1.5 pr-4 text-zinc-500 dark:text-zinc-400">{scope}</td>
                    <td className="py-1.5 pr-4 text-zinc-500 dark:text-zinc-400">{effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Scoring (solo)">
          <p>
            <code className="rounded bg-black/5 px-1 dark:bg-white/10">score = cumulativeNetProfit × 0.001 + finalValuation × 0.001</code>{" "}
            — every $1,000 of total profit across the game is worth 1 point, same for final equity. Placeholder
            weights, not balanced yet.
          </p>
        </Section>
      </div>
    </div>
  );
}
