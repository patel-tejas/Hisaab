import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

const EXPLORER = {
  name: "Explorer",
  credits: "Early access",
  description: "Full journal access while we're in early access. No card required.",
  originalPrice: "₹2,000",
  price: "₹0",
  discount: "100% off",
  bestFor: "Traders getting started",
  features: [
    "Unlimited trade entries",
    "Analytics & psychology",
    "Dhan broker sync",
    "Calendar heatmap",
    "Strategy comparison",
    "AI session insights",
  ],
  cta: "Start exploring",
  href: "/sign-up",
} as const

/** Single early-access plan — Explorer. */
export function PricingSection() {
  return (
    <section
      id="pricing"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 py-24 sm:px-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a0b0e] via-[#10141c] to-[#0f1011]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232,244,252,0.08) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 70% 60%, rgba(0,179,221,0.08) 0%, transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#0a0b0e] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-obsidian"
      />

      <div className="relative z-[1] mx-auto w-full max-w-[1120px]">
        <div className="mx-auto max-w-[560px] text-center">
          <span className="inline-flex items-center rounded-full border border-pure/15 bg-pure/10 px-4 py-1.5 font-mono-label text-[11px] font-medium uppercase tracking-[0.18em] text-ash">
            Pricing
          </span>
          <h2 className="mt-5 font-display text-[clamp(2.4rem,5.5vw,3.75rem)] leading-[1] tracking-[-0.03em] text-pure">
            Simple early-access pricing
          </h2>
          <p className="mx-auto mt-4 max-w-[420px] font-marketing text-[17px] font-light text-ash">
            Everything free while we&apos;re in early access. Pay nothing today.
          </p>
        </div>

        <article className="relative mx-auto mt-14 flex w-full max-w-[440px] flex-col overflow-hidden rounded-[22px] border border-cyan-signal/35 bg-pure px-8 py-9 shadow-[0_20px_50px_rgba(0,179,221,0.12)] ring-1 ring-cyan-signal/25 sm:px-10 sm:py-11">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-[28px] leading-[1] tracking-[-0.02em] text-void">
              {EXPLORER.name}
            </h3>
            <span className="shrink-0 rounded-full bg-[#e8f6fb] px-2.5 py-1 font-mono-label text-[10px] font-medium uppercase tracking-[0.12em] text-[#0a7a96]">
              {EXPLORER.credits}
            </span>
          </div>

          <p className="mt-3 font-marketing text-[14px] leading-[1.45] text-[#5c6675]">
            {EXPLORER.description}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="font-marketing text-[15px] text-[#9aa3b0] line-through">
              {EXPLORER.originalPrice}
            </span>
            <span className="rounded-full bg-cyan-signal px-2 py-0.5 font-mono-label text-[10px] font-medium uppercase tracking-[0.1em] text-void">
              {EXPLORER.discount}
            </span>
          </div>

          <p className="mt-2 font-display text-[42px] leading-none tracking-[-0.03em] text-void">
            {EXPLORER.price}
          </p>

          <p className="mt-6 font-marketing text-[13px] text-[#5c6675]">
            <span className="font-medium text-void">Best for:</span> {EXPLORER.bestFor}
          </p>

          <ul className="mt-4 space-y-2.5">
            {EXPLORER.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 font-marketing text-[14px] text-[#3a4556]"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8f6fb] text-cyan-signal">
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <Link
            href={EXPLORER.href}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-signal px-4 py-3 font-marketing text-[15px] font-medium text-void transition-opacity duration-200 hover:opacity-90"
          >
            {EXPLORER.cta}
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </Link>
        </article>
      </div>
    </section>
  )
}
