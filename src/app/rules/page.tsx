import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Rules — EduGame",
  description: "How EduGame's simulation math works, in plain language.",
};

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

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {headers.map((h) => (
              <th key={h} className="py-1.5 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
              {row.map((cell, j) => (
                <td key={j} className={`py-1.5 pr-4 ${j === 0 ? "" : "text-zinc-500 dark:text-zinc-400"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RulesPage() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">How the simulation works</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            The numbers behind the game, in plain language. Balanced by calculation and one full playtest, not
            extensively played yet.{" "}
            <Link href="/solo/new" className="underline">
              Back to game setup
            </Link>
            .
          </p>
        </div>

        <Callout>
          The single most important rule: <strong>this year&apos;s investment pays off next year</strong>, not this
          one. Demand uses quality/brand/productivity/innovation as they stood at the <em>start</em> of the year.
          Price is the exception — it affects this year&apos;s demand immediately.
        </Callout>

        <Section title="The company">
          <p>
            You run a surfboard company with <strong>three product lines</strong>, each with its own price,
            production, staffing, quality, and training decisions. Marketing (brand), R&amp;D (innovation), and
            financing are <strong>company-wide</strong> — one shared lever across all three, not per-product.
          </p>
          <Table
            headers={["Product", "Reference price", "Unit cost", "Market size"]}
            rows={[
              ["Shortboard", "$50", "$15", "1,800/yr — mass market"],
              ["Longboard", "$110", "$30", "900/yr — mid-market"],
              ["Luxury Fishboard", "$350", "$150", "300/yr — niche"],
            ]}
          />
        </Section>

        <Section title="Pricing & demand">
          <p>Price reacts sharply against a product&apos;s own reference price (elasticity 1.5):</p>
          <Table
            headers={["Price vs. reference", "Demand multiplier", "Read as"]}
            rows={[
              ["0.4×", "×3.95", "very low, floods demand"],
              ["0.6×", "×2.15", "low"],
              ["0.8×", "×1.40", "somewhat low"],
              ["1.0× (reference)", "×1.00", "neutral"],
              ["1.2×", "×0.76", "somewhat high"],
              ["1.4×", "×0.60", "high"],
              ["2.0×", "×0.35", "extreme"],
            ]}
          />
          <p>
            That multiplier applies to the product&apos;s own baseline demand, scaled by its effective quality and
            the company&apos;s brand awareness, then capped by whichever is lower of physical capacity and what
            current staff can run.
          </p>
          <p className="font-medium text-zinc-800 dark:text-zinc-200">
            Worked example — default state, all three lines flat-out at capacity, no other spend:
          </p>
          <Table
            headers={["Product", "Units sold", "Revenue", "Gross profit"]}
            rows={[
              ["Shortboard", "900 (capacity-capped)", "$45,000", "$31,500"],
              ["Longboard", "450 (capacity-capped)", "$49,500", "$36,000"],
              ["Fishboard", "150 (capacity-capped)", "$52,500", "$30,000"],
            ]}
          />
          <p>
            Total: <strong>$147,000 revenue</strong>. After $1,000 marketing, $25,000 wages, $20,000 overhead:{" "}
            <strong>net profit $51,500</strong> (35% margin) — the baseline &quot;did nothing clever&quot; outcome.
          </p>
        </Section>

        <Section title="Quality, productivity, brand, innovation">
          <p>
            Each product&apos;s <strong>effective quality</strong> for demand ={" "}
            <code className="rounded bg-black/5 px-1 dark:bg-white/10">quality + productivity×0.2 + innovation×0.15</code>.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Quality</strong> (per product): $200 → +1 point next year.
            </li>
            <li>
              <strong>Productivity</strong> (per product): raised by training, $100 → +1 point next year — also
              drives labor capacity (below). <strong>Decays 15%/year without training</strong> — a company that
              stops training quietly loses staffing capacity over time.
            </li>
            <li>
              <strong>Brand awareness</strong> (company-wide): $150 → +1 point next year, decays 15%/year unspent.
            </li>
            <li>
              <strong>Innovation</strong> (company-wide, from R&amp;D): $300 → +1 point next year, decays slower
              (10%/year — knowledge sticks around).
            </li>
          </ul>
        </Section>

        <Section title="Wages & training (productivity)">
          <p>
            Wages don&apos;t just cost money — they set output per employee.{" "}
            <code className="rounded bg-black/5 px-1 dark:bg-white/10">wage factor = clamp(wage / 2500, 0.6, 1.4)</code>{" "}
            — underpay and output drops toward 60%; overpay and it rises toward 140%.
          </p>
          <p>
            <strong>Labor capacity</strong> = employees × 200 × wage factor × training-productivity factor.
            Production is capped by <strong>whichever is lower</strong>: labor capacity or physical production
            capacity.
          </p>
          <Callout>
            Firing an entire product line&apos;s staff means it produces and sells nothing next year — regardless of
            physical capacity. Confirmed by a dedicated test.
          </Callout>
          <p>
            Firing costs 5 morale/employee (company-wide); a wage raise/cut nudges morale by its percentage.
          </p>
          <Callout>Morale is tracked but has no other gameplay effect yet — a placeholder for later.</Callout>
        </Section>

        <Section title="R&D (innovation)">
          <p>Company-wide, two effects: adds to every product&apos;s effective quality, and:</p>
          <p>
            <strong>Reduces capacity investment cost</strong> company-wide:{" "}
            <code className="rounded bg-black/5 px-1 dark:bg-white/10">$/unit = 10 × max(0.5, 1 − innovation×0.005)</code>{" "}
            — at innovation 100, capacity costs half as much per unit.
          </p>
        </Section>

        <Section title="Finance">
          <p>
            <strong>Loans:</strong> +$X cash and debt immediately; interest (8%/year) is charged on debt as it stood
            at the <em>start</em> of the year — a new loan doesn&apos;t cost interest until next year.
          </p>
          <p>
            <strong>Other capex:</strong> adds to fixed assets, depreciating 10%/year.
          </p>
        </Section>

        <Section title="Overhead, depreciation, cash">
          <p>Fixed overhead: $20,000/year, company-wide. Depreciation: 10%/year of fixed-assets book value.</p>
          <Callout>Cash can go negative with no bankruptcy consequence yet.</Callout>
        </Section>

        <Section title="Random events">
          <p>
            Each year: an independent 25% chance of a company-wide event, and a 25% chance of an event that hits{" "}
            <strong>one randomly-chosen product line</strong> only.
          </p>
          <Table
            headers={["Event", "Scope", "Effect"]}
            rows={[
              ["Economic downturn", "company-wide", "demand ×0.8"],
              ["Positive demand shock", "company-wide", "demand ×1.2"],
              ["Negative demand shock", "company-wide", "demand ×0.85"],
              ["Cost inflation", "company-wide", "unit cost ×1.1"],
              ["Regulatory change", "company-wide", "unit cost ×1.05, −$2,000"],
              ["Demand surge", "one product", "demand ×1.4"],
              ["Supply disruption", "one product", "unit cost ×1.15"],
              ["Competitor price war", "one product", "price capped ×0.95"],
            ]}
          />
        </Section>

        <Section title="Multiplayer">
          <p>
            Each product&apos;s demand pool is split by <strong>category leadership, not smoothed proportionally</strong>:
            cheapest price, highest quality, highest brand, and highest innovation each win their whole weighted
            share outright (ties split evenly) — not a blend across everyone.
          </p>
          <Table
            headers={["Product", "Price", "Quality", "Brand", "Innovation"]}
            rows={[
              ["Shortboard", 60, 15, 15, 10],
              ["Longboard", 35, 30, 25, 10],
              ["Fishboard", 10, 50, 30, 10],
            ]}
          />
          <p>
            So undercutting on shortboard price alone nets 60% of its whole pool regardless of quality/brand/
            innovation — but on fishboard you need to win quality+brand+innovation (90% combined) since price barely
            matters there. Winning nothing gets you 0% of that product&apos;s demand that year.
          </p>
          <p>
            The table above is each product&apos;s <em>own</em> weights — in multiplayer they get blended with the
            destination country&apos;s weights (see &quot;International expansion&quot; below) and run separately
            per country. Total demand pool per product per country = baseline × country&apos;s demand multiplier ×
            number of players licensed there. <strong>Bots</strong> fill reserved seats with one of three fixed
            personalities (aggressive/premium/balanced) that don&apos;t adapt to rivals — good enough to fill a
            table, not a serious opponent. A year resolves once every human has submitted (bots are pre-seeded the
            moment it&apos;s their turn).
          </p>
          <Callout>
            Sign-in is a display name only — no password, no real account. A game&apos;s own link is its invite —
            whoever opens it can join if a seat is free. Deliberate, documented tradeoff for a personal project.
          </Callout>
        </Section>

        <Section title="International expansion">
          <p>
            You start able to sell into, and manufacture in, <strong>France only</strong> — its numbers are known
            from the start. Everywhere else costs a decision, and like every other investment it only takes effect{" "}
            <strong>next</strong> year.
          </p>
          <Table
            headers={["Country", "Labor", "Demand yr 1 (Short/Long/Fish)", "Growth/yr", "License", "Factory", "Research"]}
            rows={[
              ["France (start)", "×1.4", "1.3/1.1/0.7", "0%", "free", "free", "free"],
              ["Morocco", "×0.5", "0.7/0.4/0.2", "+2%", "$8,000", "$15,000", "$1,500"],
              ["Portugal", "×0.7", "1.3/1.2/0.9", "+2.5%", "$15,000", "$25,000", "$2,000"],
              ["China", "×0.35", "0.5/0.35/0.1", "+5%", "$20,000", "$20,000", "$2,500"],
              ["Australia", "×1.05", "1.4/1.5/1.6", "+1%", "$25,000", "$35,000", "$3,000"],
            ]}
          />
          <p>
            Demand size is per-product, not one flat number per country — Morocco/China skew hard toward cheap
            entry boards with almost no luxury demand, while Australia&apos;s affluent surf culture makes the niche
            fishboard line do relatively <em>better</em> than the mass-market lines there. It also compounds year
            over year at a slow, deterministic rate — no randomness — so emerging markets (especially China, off a
            tiny base) get meaningfully bigger the longer a game runs. Every demand figure shown in the app is
            already the effective value for the year it&apos;d take effect, not the raw year-1 number above.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>License</strong> (company-wide, one-time): no license in a country means zero demand from it,
              for every product, full stop.
            </li>
            <li>
              <strong>Factory</strong> (per product, one-time per country the first time anyone opens one there):
              sets that product&apos;s manufacturing base and its labor-cost multiplier on wages. One workforce per
              product, wherever its factory currently is.
            </li>
            <li>
              <strong>Transport cost:</strong> a flat <strong>+$5/unit</strong> surcharge on units sold into a
              country other than a product&apos;s factory country.
            </li>
            <li>
              <strong>Market research</strong> (company-wide, one-time): reveals a country&apos;s price/quality/
              brand/innovation weights in the status table. UI-only — the simulation always uses the real weights.
            </li>
          </ul>
          <p>
            <strong>Blending:</strong>{" "}
            <code className="rounded bg-black/5 px-1 dark:bg-white/10">effective[category] = (product[category] + country[category]) / 2</code>{" "}
            — a luxury fishboard sold into brand-conscious Australia leans hard into brand/quality; the same
            fishboard sold into price-driven Morocco gets pulled toward price mattering more.
          </p>
        </Section>

        <Section title="Difficulty levels">
          <p>
            <strong>Beginner:</strong> only price and production volume per product, plus company marketing.
            Everything else stays at its default. <strong>Standard:</strong> the full decision set, except
            international expansion. <strong>Advanced:</strong> same as Standard, plus international expansion
            (factory relocation per product; licenses and market research company-wide).
          </p>
        </Section>

        <Section title="Scoring">
          <p>
            <code className="rounded bg-black/5 px-1 dark:bg-white/10">score = cumulativeNetProfit×0.001 + finalValuation×0.001</code>{" "}
            — every $1,000 of profit or final equity is worth 1 point. Completed games are recorded to the{" "}
            <Link href="/leaderboard" className="underline">
              leaderboard
            </Link>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
