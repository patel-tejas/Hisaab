import Link from "next/link"
import { LandingShell } from "@/components/marketing/landing-shell"
import { SiteFooter } from "@/components/marketing/site-footer"
import { FeatureModules } from "@/components/marketing/feature-modules"
import { ProcessSection } from "@/components/marketing/process-section"
import { ProofSection } from "@/components/marketing/proof-section"
import { IntegrationsSection } from "@/components/marketing/integrations-section"
import { PricingSection } from "@/components/marketing/pricing-section"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-obsidian text-cloud">
      <LandingShell>
        {/* Features + Process share one atmosphere so the seam dissolves */}
        <div className="relative overflow-x-clip">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `
                linear-gradient(180deg,
                  #0f1011 0%,
                  #11151c 18%,
                  #0d1620 42%,
                  #0a141c 68%,
                  #090a0b 100%
                )
              `,
            }}
          />

          <section
            id="features"
            className="relative flex min-h-[100svh] flex-col justify-center px-5 py-24 sm:px-8"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-obsidian via-obsidian/80 to-transparent"
            />
            {/* Seam bloom — anchored to features bottom, spills into process */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[70vh] translate-y-[35%]"
              style={{
                background:
                  "radial-gradient(ellipse 90% 60% at 50% 40%, rgba(0,179,221,0.16) 0%, rgba(30,80,110,0.1) 32%, rgba(15,20,28,0.04) 55%, transparent 75%)",
              }}
            />

            <div className="relative z-[1] mx-auto w-full max-w-[1200px]">
              <h2 className="mx-auto max-w-[720px] text-center font-display text-display-sm text-pure">
                Everything that belongs in a journal
              </h2>
              <p className="mx-auto mt-5 max-w-[480px] text-center font-marketing text-[18px] font-light text-ash">
                Six modules. One quiet ledger.
              </p>

              <FeatureModules />
            </div>
          </section>

          <ProcessSection />
        </div>

        <ProofSection />

        <IntegrationsSection />

        <PricingSection />

        {/* Closing CTA */}
        <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 py-24 sm:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-obsidian via-[#101318] to-[#0a0b0e]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 55%, rgba(144,184,240,0.1) 0%, transparent 70%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-obsidian to-transparent"
          />

          <div className="relative z-[1] mx-auto max-w-[800px] text-center">
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
