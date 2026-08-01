"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { HisaabLogo } from "@/components/marketing/hisaab-logo"
import { SerinAgentIcon } from "@/lib/landing/serin-agent-icons"
import {
  getHisaabAgentAriaLabel,
  getHisaabAgentPlatformsForFooter,
} from "@/lib/landing/hisaab-agent-redirects"
import { handleHisaabAgentLinkClick } from "@/lib/landing/open-hisaab-agent-link"

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-abyss" />,
})

const FOOTER_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#integrations", label: "Integrations" },
  { href: "#pricing", label: "Pricing" },
  { href: "/sign-in", label: "Log in" },
  { href: "/sign-up", label: "Get started" },
] as const

const AGENT_PLATFORMS = getHisaabAgentPlatformsForFooter()

/** Footer with two-tone Grainient — cyan at bottom, fading to black toward the top. */
export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Grainient
          color1="#0a0b0e"
          color2="#00b3dd"
          color3="#00b3dd"
          timeSpeed={0.15}
          colorBalance={0.15}
          warpStrength={0.7}
          warpFrequency={4}
          warpSpeed={1}
          warpAmplitude={40}
          blendAngle={90}
          blendSoftness={0.65}
          rotationAmount={0}
          noiseScale={1.5}
          grainAmount={0.05}
          grainScale={2}
          grainAnimated={false}
          contrast={1.1}
          gamma={1}
          saturation={1.05}
          centerX={0}
          centerY={0.35}
          zoom={0.9}
        />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0a0b0e 0%, rgba(10,11,14,0.72) 35%, rgba(10,11,14,0.15) 70%, transparent 100%)",
        }}
      />

      <div className="relative z-[1] mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[360px]">
            <HisaabLogo tone="light" />
            <p className="mt-4 font-marketing text-[16px] font-light leading-[1.55] text-cloud/80">
              Own every trade. Review with clarity. Trade cleaner.
            </p>
          </div>

          {/* Agent logos sit directly above the nav links */}
          <div className="flex flex-col items-start gap-5 lg:items-end">
            <ul className="flex flex-wrap items-center gap-4 sm:gap-5">
              {AGENT_PLATFORMS.map((platform) => (
                <li key={platform.id}>
                  <a
                    href={platform.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={getHisaabAgentAriaLabel(platform)}
                    title={platform.name}
                    onClick={(e) => handleHisaabAgentLinkClick(platform, e)}
                    className="inline-flex text-cloud/65 transition-colors duration-200 hover:text-pure"
                  >
                    <SerinAgentIcon
                      id={platform.id}
                      variant="mono"
                      className="h-5 w-5 sm:h-6 sm:w-6"
                    />
                  </a>
                </li>
              ))}
            </ul>

            <nav className="flex flex-wrap gap-x-7 gap-y-3 font-marketing text-[14px] text-cloud/75 lg:justify-end">
              {FOOTER_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors duration-200 hover:text-pure"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center border-t border-pure/10 py-12 text-center sm:py-14">
          <p className="font-marketing text-[14px] text-cloud/60">
            ©{new Date().getFullYear()} Hisaab. All rights reserved
          </p>
          <p className="mt-1 font-marketing text-[14px] italic text-cloud/45">
            Made on Earth, by Humans
          </p>
        </div>
      </div>
    </footer>
  )
}
