
import { Card } from "@/components/ui/card"
import { Sparkles } from "lucide-react"

interface ConfidenceIndexProps {
  value: number
}

export function ConfidenceIndex({ value }: ConfidenceIndexProps) {
  const getConfidenceLevel = (val: number) => {
    if (val >= 80) return "Very High"
    if (val >= 60) return "High"
    if (val >= 40) return "Moderate"
    if (val >= 20) return "Low"
    return "Very Low"
  }

  const getMessage = (val: number) => {
    if (val >= 80) return "Excellent discipline & control."
    if (val >= 60) return "Good consistency, keep it up."
    if (val >= 40) return "Room for improvement."
    return "Review your trading habits."
  }

  return (
    <Card className="p-6 glass-card flex flex-col justify-center h-full relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-50 text-[var(--primary)]/20 group-hover:text-[var(--primary)]/40 transition-colors">
        <Sparkles size={48} />
      </div>

      <div className="flex items-center justify-between z-10">
        <div>
          <h3 className="font-semibold text-foreground">Psychology Score</h3>
          <p className="text-xs text-muted-foreground">Based on Confidence & Satisfaction</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-[var(--primary)]">{value}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>

      <div className="mt-6 z-10">
        <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          <span>Fearful</span>
          <span>Balanced</span>
          <span>Confident</span>
        </div>
        <div className="relative h-2 w-full rounded-full bg-secondary">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[var(--destructive)] via-[var(--warning)] to-[var(--success)] opacity-20"></div>
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white border-2 border-[var(--primary)] shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-700 ease-out"
            style={{ left: `calc(${value}% - 8px)` }}
          />
        </div>
      </div>

      <div className="mt-4 z-10 bg-white/5 rounded-lg p-3 border border-white/5">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${value >= 60 ? "bg-[var(--success)]" : value >= 40 ? "bg-[var(--warning)]" : "bg-[var(--destructive)]"}`}></div>
          <p className="text-sm">
            <span className="font-medium text-foreground">{getConfidenceLevel(value)}</span>
            <span className="text-muted-foreground mx-2">•</span>
            <span className="text-muted-foreground italic">{getMessage(value)}</span>
          </p>
        </div>
      </div>
    </Card>
  )
}
