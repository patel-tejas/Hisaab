"use client"

import { useEffect, useState } from "react"
import { SiteHeader } from "@/components/marketing/site-header"
import { HeroSection } from "@/components/marketing/hero-section"
import { getHeroPeriod, type HeroPeriod } from "@/lib/hero-period"

export function LandingShell({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = useState<HeroPeriod>("morning")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setPeriod(getHeroPeriod())
    setReady(true)
  }, [])

  return (
    <>
      <SiteHeader />
      <HeroSection period={period} onPeriodChange={setPeriod} ready={ready} />
      {children}
    </>
  )
}
