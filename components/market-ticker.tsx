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
    <div className="relative flex min-w-0 items-center overflow-hidden rounded-xl border border-border/50 bg-card/40 px-3 py-2.5">
      <div className="mr-4 flex shrink-0 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Live Market
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-[118px] top-0 z-10 w-10 bg-gradient-to-r from-card to-transparent" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-10 bg-gradient-to-l from-card to-transparent" />

      <div
        ref={scrollRef}
        className="flex w-full items-center gap-8 overflow-hidden whitespace-nowrap"
      >
        {[...ticker, ...ticker].map((item, i) => (
          <div
            key={`${item.symbol}-${i}`}
            className="flex cursor-default items-center gap-3 rounded-lg border border-border/40 bg-background/40 px-3 py-1.5 text-xs font-medium opacity-90 transition-opacity hover:opacity-100"
          >
            <span className="font-semibold text-foreground">{item.name}</span>
            <div className="h-3 w-px bg-border" />
            <span
              className={
                item.change >= 0
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-rose-500 dark:text-rose-400"
              }
            >
              {item.price.toLocaleString()}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                item.change >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              {item.change >= 0 ? "+" : ""}
              {item.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
