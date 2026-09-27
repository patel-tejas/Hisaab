
import { TrendingUp, Trophy, Target, Activity } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatsCardsProps {
  highestPnl: number
  winRate: number
  avgRiskReward: string
  tradesThisMonth: number
  sparklineData?: number[]
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const height = 32
  const width = 80

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - min) / range) * height
    return `${x},${y}`
  }).join(" ")

  return (
    <svg width={width} height={height} className="opacity-60 group-hover:opacity-100 transition-opacity">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

export function StatsCards({ highestPnl, winRate, avgRiskReward, tradesThisMonth, sparklineData = [] }: StatsCardsProps) {
  const stats = [
    {
      label: "Highest P&L",
      value: `₹${highestPnl.toLocaleString("en-IN")}`,
      progressColor: "bg-[var(--success)]",
      sparkColor: "#10b981",
      progress: 100,
      icon: TrendingUp,
      iconBg: "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20",
    },
    {
      label: "Win Rate",
      value: `${winRate}%`,
      progressColor: "bg-[var(--primary)]",
      sparkColor: "#818cf8",
      progress: winRate,
      icon: Trophy,
      iconBg: "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20",
    },
    {
      label: "Avg. Risk/Reward",
      value: avgRiskReward,
      progressColor: "bg-[var(--primary)]",
      sparkColor: "#3b82f6",
      progress: 50,
      icon: Target,
      iconBg: "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20",
    },
    {
      label: "Trades This Month",
      value: tradesThisMonth.toString(),
      progressColor: "bg-transparent",
      sparkColor: "#f43f5e",
      progress: 0,
      icon: Activity,
      iconBg: "bg-[var(--destructive)]/10 text-[var(--destructive)] border border-[var(--destructive)]/20",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-5 glass-card relative overflow-hidden group hover: transition-shadow duration-300">
          {/* Glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1 flex-1">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", stat.iconBg)}>
                <stat.icon className="h-5 w-5" />
              </div>
              {sparklineData.length > 1 && (
                <MiniSparkline data={sparklineData} color={stat.sparkColor} />
              )}
            </div>
          </div>
          {stat.progress > 0 && (
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
              <div
                className={cn("h-full rounded-full transition-all shadow-[0_0_10px_currentColor]", stat.progressColor)}
                style={{ width: `${stat.progress}%` }}
              />
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
