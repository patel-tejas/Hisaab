import Link from "next/link"
import { LandingShell } from "@/components/marketing/landing-shell"
import { SiteFooter } from "@/components/marketing/site-footer"

const FEATURE_TILES = [
  {
    title: "Analytics",
    description: "Equity curves, win rates, expectancy, and symbol breakdowns — clarity without noise.",
    bg: "bg-iris-gleam",
  },
  {
    title: "Psychology",
    description: "Log emotion, confidence, and mistakes. See which mental states actually pay.",
    bg: "bg-orchid-bloom",
  },
  {
    title: "Calendar",
    description: "A heatmap of every session so your best and worst days are impossible to miss.",
    bg: "bg-periwinkle",
  },
  {
    title: "Strategies",
    description: "Compare setups side by side. Know what to repeat — and what to retire.",
    bg: "bg-deep-iris",
  },
  {
    title: "Forecast",
    description: "AI insights that surface patterns in your journal, not generic market chatter.",
    bg: "bg-cyan-signal",
  },
  {
    title: "Broker sync",
    description: "Connect Dhan and import fills automatically. Less typing, more reviewing.",
    bg: "bg-pale-iris text-void",
  },
] as const

const STEPS = [
  {
    step: "01",
    title: "Log the trade",
    description: "Symbol, prices, strategy, and state of mind — under thirty seconds when it matters.",
  },
  {
    step: "02",
    title: "See the pattern",
    description: "Charts and psychology views reveal what your memory conveniently forgets.",
  },
  {
    step: "03",
    title: "Trade cleaner",
    description: "Carry forward lessons into the next session. Consistency compounds.",
  },
] as const

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-obsidian text-cloud">
      <LandingShell>
        {/* Chromatic feature tiles */}
        <section id="features" className="bg-obsidian px-5 py-[80px] sm:px-8">
          <div className="mx-auto max-w-[1200px]">
            <p className="font-mono-label text-center text-[12px] font-medium uppercase tracking-[0.18em] text-ash">
              Modules
            </p>
            <h2 className="mx-auto mt-4 max-w-[720px] text-center font-display text-display-sm text-pure">
              Everything that belongs in a journal
            </h2>
            <p className="mx-auto mt-5 max-w-[480px] text-center font-marketing text-[18px] font-light text-ash">
              Color marks the module. The rest of the interface stays quiet.
            </p>

            <div className="mt-12 grid gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
              {FEATURE_TILES.map((tile) => (
                <article
                  key={tile.title}
                  className={`${tile.bg} flex min-h-[220px] flex-col justify-between rounded-[30px] p-8 transition-transform duration-200 hover:-translate-y-0.5`}
                >
                  <h3
                    className={`font-display text-heading-lg ${
                      tile.bg.includes("pale-iris") ? "text-void" : "text-pure"
                    }`}
                  >
                    {tile.title}
                  </h3>
                  <p
                    className={`mt-6 font-marketing text-[16px] leading-[1.5] ${
                      tile.bg.includes("pale-iris") ? "text-void/80" : "text-pure/90"
                    }`}
                  >
                    {tile.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-abyss px-5 py-[80px] sm:px-8">
          <div className="mx-auto max-w-[1200px]">
            <p className="font-mono-label text-center text-[12px] font-medium uppercase tracking-[0.18em] text-ash">
              Process
            </p>
            <h2 className="mx-auto mt-4 max-w-[640px] text-center font-display text-heading-lg text-pure sm:text-display-sm sm:leading-[1]">
              From fill to feedback
            </h2>

            <div className="mt-12 grid gap-[12px] md:grid-cols-3">
              {STEPS.map((item) => (
                <article
                  key={item.step}
                  className="rounded-[16px] bg-graphite p-8 transition-colors duration-200 hover:bg-steel"
                >
                  <p className="font-mono-label text-[12px] font-medium uppercase tracking-[0.16em] text-ash">
                    {item.step}
                  </p>
                  <h3 className="mt-4 font-display text-[28px] leading-[1.1] text-cloud">
                    {item.title}
                  </h3>
                  <p className="mt-4 font-marketing text-[16px] font-light leading-[1.5] text-ash">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Inverted silver proof */}
        <section className="bg-obsidian px-5 py-[80px] sm:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="rounded-[30px] bg-silver p-8 text-void sm:p-12">
              <p className="font-mono-label text-[12px] font-medium uppercase tracking-[0.18em] text-void/60">
                Early access
              </p>
              <h2 className="mt-4 max-w-[640px] font-display text-heading-lg sm:text-[56px] sm:leading-[0.95]">
                Built for traders who review more than they refresh charts
              </h2>
              <p className="mt-5 max-w-[480px] font-marketing text-[16px] leading-[1.5] text-void/80">
                Hisaab keeps the dashboard honest: P&amp;L, psychology, calendar heat, and strategy
                splits — without turning journaling into another noisy terminal.
              </p>
              <div className="mt-10 grid gap-6 sm:grid-cols-3">
                {[
                  { value: "Dhan sync", label: "Broker import" },
                  { value: "AI review", label: "Session insights" },
                  { value: "₹0 now", label: "Early access" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="font-display text-[32px] leading-none">{stat.value}</p>
                    <p className="mt-2 font-mono-label text-[11px] uppercase tracking-[0.16em] text-void/55">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bg-abyss px-5 py-[80px] sm:px-8">
          <div className="mx-auto max-w-[720px] text-center">
            <span className="inline-flex items-center rounded-full border border-pure/15 bg-pure/12 px-8 py-2.5 font-mono-label text-[12px] font-medium uppercase tracking-[0.18em] text-pure">
              ₹0 for early access — limited time
            </span>
            <h2 className="mt-6 font-display text-display-sm text-pure">
              Grab it while it&apos;s free
            </h2>
            <p className="mx-auto mt-5 max-w-[440px] font-marketing text-[18px] font-light text-ash">
              Full journal, analytics, psychology, and Dhan sync. No card required while we&apos;re in
              early access.
            </p>

            <div className="mt-12 rounded-[30px] bg-graphite p-8 text-left sm:p-10">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 className="font-display text-[38px] leading-[0.9] text-pure">Early Access</h3>
                  <p className="mt-2 font-marketing text-[16px] text-ash">All features. No limits.</p>
                </div>
                <p className="font-display text-[48px] leading-none text-pure">₹0</p>
              </div>

              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  "Unlimited trade entries",
                  "Analytics & reports",
                  "Psychology tracking",
                  "Calendar heatmap",
                  "Strategy comparison",
                  "Dhan broker sync",
                  "AI insights",
                  "Chart screenshots",
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 font-marketing text-[16px] text-cloud"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-pure" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-signal px-[18px] py-3 font-marketing text-[16px] text-void transition-opacity duration-200 hover:opacity-90 sm:w-auto"
              >
                Get started free
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="bg-obsidian px-5 py-[100px] sm:px-8">
          <div className="mx-auto max-w-[800px] text-center">
            <h2 className="font-display text-display-sm text-pure">
              Ready to trade with a cleaner ledger?
            </h2>
            <p className="mx-auto mt-5 max-w-[420px] font-marketing text-[18px] font-light text-ash">
              Open an account — or walk the demo journal first.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-signal px-5 py-3 font-marketing text-[16px] text-void transition-opacity duration-200 hover:opacity-90"
              >
                Create account
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-full border border-pure px-5 py-3 font-marketing text-[16px] text-pure transition-colors duration-200 hover:bg-pure/10"
              >
                Log in
              </Link>
            </div>
          </div>
        </section>

        <SiteFooter />
      </LandingShell>
    </div>
  )
}
