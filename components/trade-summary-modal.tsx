"use client"

import { useState } from "react"
import {
  Tag,
  Shield,
  Star,
  FileText,
  ImageIcon,
  X,
  AlertTriangle,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Trade } from "@/lib/types"

interface TradeSummaryModalProps {
  trade: Trade | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function sanitizeRichHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, "")
}

function hasVisibleContent(value?: string | null): boolean {
  if (!value) return false
  return value.replace(/<[^>]*>/g, "").trim().length > 0
}

function getEmotionTone(state?: string) {
  const normalized = (state ?? "").trim().toLowerCase()
  if (["calm", "focused", "confident", "disciplined", "patient"].includes(normalized)) {
    return "bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/25"
  }
  if (["overconfident", "anxious", "hesitant", "impatient", "bored", "neutral", "uncertain"].includes(normalized)) {
    return "bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/25"
  }
  return "bg-[var(--destructive)]/15 text-[var(--destructive)] border border-[var(--destructive)]/25"
}

function formatOutcome(outcome?: string) {
  if (!outcome) return "N/A"
  const normalized = outcome.trim().toLowerCase()
  if (normalized === "full-success" || normalized === "full success") return "Full Success"
  if (normalized === "partial") return "Partial"
  if (normalized === "breakeven") return "Breakeven"
  if (normalized === "mistake") return "Mistake"
  return outcome.charAt(0).toUpperCase() + outcome.slice(1)
}

export function TradeSummaryModal({ trade, open, onOpenChange }: TradeSummaryModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  if (!trade) return null

  const formatDuration = () => {
    if (!trade.entryTime || !trade.exitTime) return "N/A"
    const [eh, em] = trade.entryTime.split(":").map(Number)
    const [xh, xm] = trade.exitTime.split(":").map(Number)
    let diffMins = (xh * 60 + xm) - (eh * 60 + em)
    if (diffMins < 0) diffMins += 24 * 60
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    if (hours === 0) return `${mins}m`
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const expectedRiskReward = () => {
    if (!trade.stopLoss || !trade.target || !trade.entryPrice) return "N/A"
    const risk = Math.abs(trade.entryPrice - trade.stopLoss)
    if (risk === 0) return "N/A"
    const reward = Math.abs(trade.target - trade.entryPrice)
    return `1:${(reward / risk).toFixed(1)}`
  }

  const actualRiskReward = () => {
    if (!trade.stopLoss || !trade.entryPrice || !trade.exitPrice) return "N/A"
    const risk = Math.abs(trade.entryPrice - trade.stopLoss)
    if (risk === 0) return "N/A"
    const actual = Math.abs(trade.exitPrice - trade.entryPrice)
    return `1:${(actual / risk).toFixed(2)}`
  }

  const tradeDate = new Date(trade.date).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  const showAnalysis = hasVisibleContent(trade.tradeAnalysis)
  const showNotes = hasVisibleContent(trade.notes)
  const showLessons = hasVisibleContent(trade.lessonsLearned)
  const showMistakes = Boolean(trade.mistakes && trade.mistakes.length > 0)
  const hasJournalSection = showAnalysis || showNotes || showLessons || showMistakes
  const notesHasHtml = Boolean(trade.notes && /<[a-z][\s\S]*>/i.test(trade.notes))

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-3xl sm:max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          {/* Header Banner — pr-12 keeps P&L clear of the Dialog close X button */}
          <div className={cn("pl-6 pr-12 py-5 border-b",
            (trade.pnl ?? 0) >= 0
              ? "bg-[var(--success)]/10 border-[var(--success)]/20"
              : "bg-[var(--destructive)]/10 border-[var(--destructive)]/20"
          )}>
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <DialogTitle className="text-2xl font-bold tracking-tight">
                    {trade.symbol}
                  </DialogTitle>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{tradeDate}</span>
                    <span className="opacity-40">•</span>
                    <span className={cn(
                      "inline-flex items-center gap-1 font-medium",
                      trade.direction === "long" ? "text-[var(--success)]" : "text-[var(--destructive)]"
                    )}>
                      {trade.direction === "long" ? (
                        <ArrowUpRight className="size-3.5" />
                      ) : (
                        <ArrowDownRight className="size-3.5" />
                      )}
                      {trade.direction === "long" ? "Long" : "Short"}
                    </span>
                    {trade.strategy && (
                      <>
                        <span className="opacity-40">•</span>
                        <span>{trade.strategy}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <p className={cn("text-2xl sm:text-3xl font-bold tracking-tight",
                    (trade.pnl ?? 0) >= 0 ? "text-[var(--success)]" : "text-[var(--destructive)]"
                  )}>
                    {(trade.pnl ?? 0) >= 0 ? "+" : ""}₹{(trade.pnl ?? 0).toLocaleString("en-IN")}
                  </p>
                  <p className={cn("text-sm font-medium",
                    (trade.pnl ?? 0) >= 0 ? "text-[var(--success)]/80" : "text-[var(--destructive)]/80"
                  )}>
                    {(trade.pnlPercent ?? 0) >= 0 ? "+" : ""}{(trade.pnlPercent ?? 0).toFixed(2)}%
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6">

            {/* === SECTION 1: Trade Details Grid === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Trade Overview */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Tag className="size-4 text-primary" />
                  Trade Overview
                </div>
                <div className="bg-secondary/30 rounded-xl border border-border/60 p-5 space-y-3">
                  <Row label="Entry Price" value={trade.entryPrice != null ? `₹${trade.entryPrice.toLocaleString("en-IN")}` : "N/A"} />
                  <Row label="Exit Price" value={trade.exitPrice != null ? `₹${trade.exitPrice.toLocaleString("en-IN")}` : "N/A"} />
                  <Row label="Quantity" value={trade.quantity != null ? `${trade.quantity} Qty` : "N/A"} />
                  {trade.entryTime && <Row label="Entry Time" value={trade.entryTime} />}
                  {trade.exitTime && <Row label="Exit Time" value={trade.exitTime} />}
                  <Row label="Duration" value={formatDuration()} />
                </div>
              </div>

              {/* Risk Management */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Shield className="size-4 text-[var(--warning)]" />
                  Risk Management
                </div>
                <div className="bg-secondary/30 rounded-xl border border-border/60 p-5 space-y-3">
                  <Row label="Stop Loss" value={trade.stopLoss != null ? `₹${trade.stopLoss.toLocaleString("en-IN")}` : "N/A"} valueClass="text-[var(--destructive)]" />
                  <Row label="Target" value={trade.target != null ? `₹${trade.target.toLocaleString("en-IN")}` : "N/A"} valueClass="text-[var(--success)]" />
                  <Row label="Expected R:R" value={expectedRiskReward()} />
                  <Row label="Actual R:R" value={actualRiskReward()} />
                  <Row label="Outcome" value={formatOutcome(trade.outcome)} />
                </div>
              </div>
            </div>

            {/* === SECTION 2: Psychology === */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Star className="size-4 text-[var(--warning)]" />
                Psychology & Evaluation
              </div>
              <div className="bg-secondary/30 rounded-xl border border-border/60 p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                  {/* Entry Confidence */}
                  <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                    <p className="text-xs text-muted-foreground">Entry Confidence</p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-[var(--warning)] rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, (trade.entryConfidence ?? 0) * 10))}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{trade.entryConfidence}/10</span>
                    </div>
                  </div>
                  {/* Satisfaction */}
                  <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                    <p className="text-xs text-muted-foreground">Satisfaction</p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-[var(--success)] rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, (trade.satisfaction ?? 0) * 10))}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{trade.satisfaction}/10</span>
                    </div>
                  </div>
                  {/* Emotional State */}
                  <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                    <p className="text-xs text-muted-foreground">Emotional State</p>
                    <span className={cn(
                      "inline-flex items-center text-xs font-medium capitalize px-2.5 py-0.5 rounded-full",
                      getEmotionTone(trade.emotionalState)
                    )}>
                      {trade.emotionalState || "N/A"}
                    </span>
                  </div>
                  {/* Strategy */}
                  <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                    <p className="text-xs text-muted-foreground">Strategy</p>
                    <span className="text-sm font-semibold">{trade.strategy || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* === SECTION 3: Journal / Analysis === */}
            {hasJournalSection && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="size-4 text-primary" />
                  Trade Analysis & Notes
                </div>
                <div className="bg-secondary/30 rounded-xl border border-border/60 p-5 space-y-4">
                  {showAnalysis && trade.tradeAnalysis && (
                    <div>
                      <h4 className="label-mono mb-2">Analysis</h4>
                      <div
                        className="text-sm text-foreground/90 prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(trade.tradeAnalysis) }}
                      />
                    </div>
                  )}
                  {showNotes && trade.notes && (
                    <div>
                      <h4 className="label-mono mb-2">Notes</h4>
                      {notesHasHtml ? (
                        <div
                          className="text-sm text-foreground/90 prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                          dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(trade.notes) }}
                        />
                      ) : (
                        <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">{trade.notes}</p>
                      )}
                    </div>
                  )}
                  {showLessons && (
                    <div>
                      <h4 className="label-mono mb-2 flex items-center gap-1.5">
                        <BookOpen className="size-3.5" /> Lessons Learned
                      </h4>
                      <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">{trade.lessonsLearned}</p>
                    </div>
                  )}
                  {showMistakes && trade.mistakes && (
                    <div>
                      <h4 className="label-mono mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="size-3.5 text-[var(--warning)]" /> Mistakes
                      </h4>
                      <ul className="list-disc list-inside text-sm text-foreground/85 space-y-1">
                        {trade.mistakes.map((mistake, index) => (
                          <li key={index}>{mistake}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === SECTION 4: Media === */}
            {trade.images && trade.images.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ImageIcon className="size-4 text-primary" />
                  Screenshots ({trade.images.length})
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {trade.images.map((img, index) => (
                    <div
                      key={index}
                      className="relative aspect-video rounded-xl overflow-hidden border border-border/60 bg-secondary/30 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                      onClick={() => setSelectedImage(img)}
                    >
                      <img
                        src={img}
                        alt={`Trade screenshot ${index + 1}`}
                        className="object-contain w-full h-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t border-border/60">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent
          showCloseButton={false}
          className="w-[95vw] max-w-[95vw] sm:max-w-[95vw] max-h-[95vh] bg-transparent border-none shadow-none p-0 flex items-center justify-center focus:outline-none"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={selectedImage || ""}
              alt="Full screen"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              type="button"
              className="absolute top-3 right-3 bg-background/80 hover:bg-background text-foreground rounded-full p-2 border border-border transition-colors backdrop-blur-sm z-50"
              onClick={() => setSelectedImage(null)}
            >
              <X className="size-5" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* Reusable row for key-value pairs */
function Row({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium tabular-nums text-right", valueClass)}>{value}</span>
    </div>
  )
}
