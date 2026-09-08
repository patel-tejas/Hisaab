
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { ArrowUpRight, ArrowDownRight, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface TradeItem {
  symbol: string
  pnl: number
  pnlPercent: number
  entryPrice?: number
  direction?: string
  date?: string
}

interface TopTradesProps {
  trades: TradeItem[]
}

export function TopTrades({ trades }: TopTradesProps) {
  const sortedTrades = [...trades].sort((a, b) => b.pnl - a.pnl)

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  return (
    <Card className="p-6 glass-card h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Top Performers</h3>
            <p className="text-xs text-muted-foreground">Best trades by P&L</p>
          </div>
        </div>
        <Link href="/dashboard/trades" className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
          View All <ArrowUpRight className="h-5 w-5" />
        </Link>
      </div>

      <div className="space-y-2 flex-1 overflow-auto pr-1">
        {sortedTrades.slice(0, 5).map((trade, index) => {
          const isProfit = trade.pnl > 0
          return (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-all group cursor-pointer border border-transparent hover:border-border/50"
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className={cn(
                  "h-8 w-8 flex items-center justify-center rounded-lg text-xs font-bold",
                  index === 0 ? "bg-amber-500/10 text-amber-500" :
                    index === 1 ? "bg-zinc-400/10 text-zinc-400" :
                      index === 2 ? "bg-orange-600/10 text-orange-600 dark:text-orange-400" :
                        "bg-secondary/50 text-muted-foreground"
                )}>
                  #{index + 1}
                </div>

                <div>
                  <p className="font-medium text-foreground text-sm flex items-center gap-2">
                    {trade.symbol}
                    {trade.direction && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                        trade.direction === 'long'
                          ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
                          : 'bg-orange-500/10 text-orange-500 dark:text-orange-400'
                      )}>
                        {trade.direction.toUpperCase()}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {trade.date ? formatDate(trade.date) : "—"}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className={cn("font-semibold text-sm", isProfit ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400")}>
                  {isProfit ? "+" : ""}₹{trade.pnl.toLocaleString("en-IN")}
                </p>
                <p className={cn("text-[11px] mt-0.5", isProfit ? "text-emerald-500/60" : "text-rose-500/60")}>
                  {isProfit ? "+" : ""}{trade.pnlPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          )
        })}

        {sortedTrades.length === 0 && (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            No trades yet
          </div>
        )}
      </div>
    </Card>
  )
}
