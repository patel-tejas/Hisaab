"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface TickerItem {
  symbol: string
  label: string
  currency: "INR" | "USD"
  price: number | null
  change: number | null
  percent: number | null
  valid: boolean
}

type TickerState = "loading" | "ready" | "unavailable"

export function MarketTicker() {
  const [ticker, setTicker] = useState<TickerItem[]>([])
  const [state, setState] = useState<TickerState>("loading")
  const scrollRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)

  // No made-up fallback: if quotes can't be fetched, say so.
  const loadTicker = useCallback(async () => {
    try {
      const res = await fetch("/api/market-ticker")
      const data = await res.json()
      const items: TickerItem[] = Array.isArray(data?.data)
        ? data.data.filter((i: TickerItem) => i.valid && typeof i.price === "number")
        : []
      setTicker(items)
      setState(items.length ? "ready" : "unavailable")
    } catch {
      setTicker([])
      setState("unavailable")
    }
  }, [])

  useEffect(() => {
    void loadTicker()
  }, [loadTicker])

  useEffect(() => {
    const scroll = () => {
      if (scrollRef.current) {
        if (scrollRef.current.scrollLeft >= scrollRef.current.scrollWidth / 2) {
          scrollRef.current.scrollLeft = 0
        } else {
          scrollRef.current.scrollLeft += 1
        }
        animationRef.current = requestAnimationFrame(scroll)
      }
    }
    if (ticker.length > 0) animationRef.current = requestAnimationFrame(scroll)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [ticker])

  return (
    <div className="relative flex h-10 w-full min-w-0 items-center gap-4 border-b border-border/50 bg-background px-4 md:px-6">
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`inline-flex h-1.5 w-1.5 rounded-full ${state === "ready" ? "bg-[var(--warning)]" : "bg-muted-foreground/50"}`}
        />
        <span className="label-mono text-muted-foreground" title="Quotes from Yahoo Finance, delayed. Gold, silver and crude are COMEX/NYMEX USD futures.">
          Delayed
        </span>
      </div>

      <div className="h-4 w-px shrink-0 bg-border/60" />

      <div className="pointer-events-none absolute bottom-0 left-[4.5rem] top-0 z-10 w-8 bg-gradient-to-r from-background to-transparent md:left-[5.25rem]" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />

      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 items-center gap-6 overflow-hidden whitespace-nowrap"
      >
        {state === "unavailable" && (
          <span className="text-xs text-muted-foreground">Market data is unavailable right now.</span>
        )}
        {[...ticker, ...ticker].map((item, i) => {
          const up = (item.change ?? 0) >= 0
          return (
            <div
              key={`${item.symbol}-${i}`}
              className="flex items-center gap-2 text-xs font-medium"
            >
              <span className="text-foreground/90">{item.label}</span>
              <span className={up ? "text-[var(--success)]" : "text-[var(--destructive)]"}>
                {item.currency === "USD" ? "$" : ""}
                {item.price?.toLocaleString(item.currency === "INR" ? "en-IN" : "en-US")}
              </span>
              {item.percent !== null && (
                <span className={up ? "text-[var(--success)]/80" : "text-[var(--destructive)]/80"}>
                  {up ? "+" : ""}
                  {item.percent}%
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
