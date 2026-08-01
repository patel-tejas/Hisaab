"use client"

import dynamic from "next/dynamic"
import {
  BarChart3,
  Brain,
  CalendarDays,
  GitCompare,
  Sparkles,
  Link2,
  type LucideIcon,
} from "lucide-react"

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-graphite" />,
})

type FeatureModule = {
  title: string
  description: string
  color1: string
  color2: string
  color3: string
  icon: LucideIcon
  imageLabel: string
  imageHint: string
}

/** Theme-aligned Grainient palettes (DESIGN.md) */
const MODULES: FeatureModule[] = [
  {
    title: "Analytics",
    description:
      "Equity curves, win rates, expectancy, and symbol breakdowns — clarity without noise.",
    color1: "#d1c9ff",
    color2: "#847dff",
    color3: "#4b49aa",
    icon: BarChart3,
    imageLabel: "Equity curve",
    imageHint: "P&L over time",
  },
  {
    title: "Psychology",
    description:
      "Log emotion, confidence, and mistakes. See which mental states actually pay.",
    color1: "#dd90d8",
    color2: "#847dff",
    color3: "#4b49aa",
    icon: Brain,
    imageLabel: "Mood map",
    imageHint: "Emotion vs outcome",
  },
  {
    title: "Calendar",
    description:
      "A heatmap of every session so your best and worst days are impossible to miss.",
    color1: "#90b8f0",
    color2: "#00b3dd",
    color3: "#4b49aa",
    icon: CalendarDays,
    imageLabel: "Session heatmap",
    imageHint: "Daily trading activity",
  },
  {
    title: "Strategies",
    description: "Compare setups side by side. Know what to repeat — and what to retire.",
    color1: "#847dff",
    color2: "#4b49aa",
    color3: "#0f1011",
    icon: GitCompare,
    imageLabel: "Strategy split",
    imageHint: "Win rate by setup",
  },
  {
    title: "Forecast",
    description:
      "AI insights that surface patterns in your journal, not generic market chatter.",
    color1: "#00b3dd",
    color2: "#90b8f0",
    color3: "#4b49aa",
    icon: Sparkles,
    imageLabel: "AI recap",
    imageHint: "Session insights",
  },
  {
    title: "Broker sync",
    description:
      "Connect Dhan and import fills automatically. Less typing, more reviewing.",
    color1: "#d1c9ff",
    color2: "#90b8f0",
    color3: "#847dff",
    icon: Link2,
    imageLabel: "Dhan import",
    imageHint: "One-click trade sync",
  },
]

function DummyPreview({
  icon: Icon,
  label,
  hint,
}: {
  icon: LucideIcon
  label: string
  hint: string
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-pure/10 bg-void/45 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-signal/20 text-cyan-signal">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 text-left">
          <p className="truncate font-marketing text-[13px] font-medium text-pure">{label}</p>
          <p className="truncate font-mono-label text-[10px] uppercase tracking-[0.12em] text-ash">
            {hint}
          </p>
        </div>
      </div>
      {/* Placeholder visual — swap for real screenshots later */}
      <div className="relative h-[120px] overflow-hidden rounded-xl bg-gradient-to-br from-pure/10 via-void/40 to-void/80">
        <div className="absolute inset-x-3 bottom-3 top-3 flex items-end gap-1.5">
          {[40, 65, 45, 80, 55, 90, 70, 50].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-cyan-signal/50"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="absolute inset-x-3 top-3 h-px bg-pure/10" />
        <div className="absolute inset-x-3 top-6 h-px bg-pure/5" />
      </div>
    </div>
  )
}

export function FeatureModules() {
  return (
    <div className="mt-12 grid gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 lg:gap-8">
      {MODULES.map((mod) => (
        <article
          key={mod.title}
          className="group relative flex min-h-[340px] flex-col overflow-hidden rounded-[24px] bg-abyss"
        >
          <div className="absolute inset-0">
            <Grainient
              color1={mod.color1}
              color2={mod.color2}
              color3={mod.color3}
              timeSpeed={0.2}
              colorBalance={0}
              warpStrength={1}
              warpFrequency={5}
              warpSpeed={1.4}
              warpAmplitude={50}
              blendAngle={12}
              blendSoftness={0.45}
              rotationAmount={380}
              noiseScale={2}
              grainAmount={0.08}
              grainScale={2}
              grainAnimated={false}
              contrast={1.25}
              gamma={1}
              saturation={1}
              centerX={0}
              centerY={0}
              zoom={0.85}
            />
          </div>
          {/* Soft edge fade so colors dissolve, not hard-cut */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-void/40 via-void/15 to-void/50" />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(15,16,17,0.35)]" />

          <div className="relative z-10 flex h-full flex-col px-6 pb-6 pt-7 text-center">
            <h3 className="font-display text-[28px] italic leading-[1.1] text-pure sm:text-[32px]">
              {mod.title}
            </h3>
            <p className="mx-auto mt-3 max-w-[280px] font-marketing text-[14px] font-light leading-[1.55] text-cloud/85">
              {mod.description}
            </p>

            <div className="mt-auto pt-6">
              <DummyPreview
                icon={mod.icon}
                label={mod.imageLabel}
                hint={mod.imageHint}
              />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
