"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface TickerItem {
  symbol: string
  price: number
  change: number
  percent: number
  valid: boolean
  source?: string
  name?: string
}

const FALLBACK_TICKERS: TickerItem[] = [
  { symbol: "NIFTY", name: "NIFTY", price: 22500.5, change: 120.5, percent: 0.54, valid: true },
  { symbol: "BANKNIFTY", name: "BANKNIFTY", price: 48000.2, change: -150.1, percent: -0.31, valid: true },
  { symbol: "SENSEX", name: "SENSEX", price: 74000.8, change: 200.25, percent: 0.27, valid: true },
  { symbol: "GOLD", name: "GOLD", price: 62250, change: 150, percent: 0.24, valid: true },
  { symbol: "BTC", name: "BTC", price: 68000.45, change: 1250.3, percent: 1.85, valid: true },
]

function formatSymbol(symbol: string) {
  return symbol.split(":").pop() || symbol
}

export function MarketTicker() {
  const [ticker, setTicker] = useState<TickerItem[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)

  const loadTicker = useCallback(async () => {
    try {
      const res = await fetch("/api/market-ticker")
      const data = await res.json()
      if (data.success && data.data) {
        const items = data.data
          .filter((i: TickerItem) => i.valid)
          .map((i: TickerItem) => ({ ...i, name: formatSymbol(i.symbol) }))
        setTicker(items.length ? items : FALLBACK_TICKERS)
      } else {
        setTicker(FALLBACK_TICKERS)
      }
    } catch {
      setTicker(FALLBACK_TICKERS)
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
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Live
        </span>
      </div>

      <div className="h-4 w-px shrink-0 bg-border/60" />

      <div className="pointer-events-none absolute bottom-0 left-[4.5rem] top-0 z-10 w-8 bg-gradient-to-r from-background to-transparent md:left-[5.25rem]" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />

      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 items-center gap-6 overflow-hidden whitespace-nowrap"
      >
        {[...ticker, ...ticker].map((item, i) => {
          const up = item.change >= 0
          return (
            <div
              key={`${item.symbol}-${i}`}
              className="flex items-center gap-2 text-xs font-medium"
            >
              <span className="text-foreground/90">{item.name}</span>
              <span className={up ? "text-emerald-500" : "text-rose-500"}>
                {item.price.toLocaleString()}
              </span>
              <span className={up ? "text-emerald-500/80" : "text-rose-500/80"}>
                {up ? "+" : ""}
                {item.percent}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
