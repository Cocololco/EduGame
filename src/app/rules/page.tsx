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

const WORKED_EXAMPLE_ROWS: [string, string, string, string][] = [
  ["$30", "1,200 (capacity-capped)", "$36,000", "−$500"],
  ["$40", "1,200 (capacity-capped)", "$48,000", "$11,500"],
  ["$50", "878 (demand-capped)", "$43,875", "$12,213"],
  ["$60", "668 (demand-capped)", "$40,052", "$11,539"],
  ["$70", "530 (demand-capped)", "$37,081", "$10,635"],
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
            Balanced by calculation (a reasonably-played year should turn a profit — see the worked example below),
            not yet by a full multi-year playthrough. See the notes below on known gaps.{" "}
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
            $50,000 cash, $0 debt, 6 employees at $2,500/year each, production capacity 1,200 units/year, price $50,
            quality 50/100, brand awareness 30/100, morale 70/100. Sized so a reasonably-played year is profitable —
            see the worked example below.
          </p>
        </Section>

        <Section title="Pricing & demand">
          <p>
            Your unit cost is <strong>$15</strong>. The reference price is <strong>$50</strong> — pricing there is
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
            That multiplier applies to a baseline of 1,800 units, further scaled by your quality and brand awareness
            (below), then capped by what you actually produce plus any carried-over inventory, and by your production
            capacity.
          </p>

          <p className="font-medium text-zinc-800 dark:text-zinc-200">
            Worked example — default starting state, producing flat-out at full capacity (1,200 units), no other
            decisions:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="py-1.5 pr-4 font-medium">Price</th>
                  <th className="py-1.5 pr-4 font-medium">Units sold</th>
                  <th className="py-1.5 pr-4 font-medium">Revenue</th>
                  <th className="py-1.5 pr-4 font-medium">Net profit</th>
                </tr>
              </thead>
              <tbody>
                {WORKED_EXAMPLE_ROWS.map(([price, units, revenue, profit]) => (
                  <tr key={price} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-1.5 pr-4">{price}</td>
                    <td className="py-1.5 pr-4 text-zinc-500 dark:text-zinc-400">{units}</td>
                    <td className="py-1.5 pr-4 text-zinc-500 dark:text-zinc-400">{revenue}</td>
                    <td className="py-1.5 pr-4 font-medium text-zinc-900 dark:text-zinc-100">{profit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            $40-$70 all land roughly $10k-12k profit with zero strategy beyond &quot;produce as much as you
            can&quot; — good decisions should beat that, not merely avoid a loss. $30 is the outlier: capacity caps
            how many units that lower margin spreads across, so undercutting that hard doesn&apos;t pay off here.
          </p>
        </Section>

        <Section title="Quality & brand awareness (both 0–100)">
          <p>
            Each contributes a demand factor of <code className="rounded bg-black/5 px-1 dark:bg-white/10">0.5 + 0.5 × (value/100)</code> —
            0 → 0.5×, 100 → 1.0×. At the default starting quality (50) and brand (30) that&apos;s 0.75× and 0.65×; combined
            with neutral price (1.00×) that&apos;s why a fresh game sells about ~878 units at $50 in year 1 — under
            the 1,200 capacity, so at that price demand (not capacity) is what limits you; at lower prices, capacity
            becomes the limit instead (see the table above).
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
            You can&apos;t produce more than <strong>whichever is lower</strong>: your production capacity (starts at
            1,200, grown by <strong>capacity investment:</strong> $10 → +1 unit next year), or what your current
            staff can run — <strong>employees × 200 units</strong> (also 1,200 at the default 6 employees, on
            purpose).
          </p>
          <Callout>
            Employees aren&apos;t optional overhead — they&apos;re what lets you use your capacity. Firing your whole
            workforce caps you at producing (and selling) zero, not just saving on wages. Headcount changes land next
            year, same as marketing/quality.
          </Callout>
          <p>Unsold production carries over as inventory and adds to what&apos;s available to sell next year.</p>
        </Section>

        <Section title="HR & wages">
          <p>
            Wages = employees × wage level. At default (6 × $2,500) that&apos;s <strong>$15,000/year</strong> — sized
            to leave room for profit against the revenue numbers above, but it still scales with headcount: hiring a
            lot without the revenue to back it will eat into that margin. Understaffing has the opposite problem —
            see the capacity note above.
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
          <p>Fixed overhead: $2,500/year. Depreciation: 10%/year of fixed-assets book value.</p>
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
