"use client"

import { useState } from "react"
import { Tag, Shield, Trophy, Star, FileText, ImageIcon, X, AlertTriangle, BookOpen } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Trade } from "@/lib/types"

interface TradeSummaryModalProps {
  trade: Trade | null
  open: boolean
  onOpenChange: (open: boolean) => void
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[65vw] max-h-[92vh] overflow-y-auto p-0">
          {/* Header Banner */}
          <div className={cn(
            "px-6 py-5 border-b",
            trade.pnl >= 0
              ? "bg-green-500/10 border-green-500/20"
              : "bg-red-500/10 border-red-500/20"
          )}>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold tracking-tight">
                    {trade.symbol}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tradeDate} • {trade.direction === "long" ? "📈 Long" : "📉 Short"} • {trade.strategy}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-3xl font-bold",
                    (trade.pnl ?? 0) >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {(trade.pnl ?? 0) >= 0 ? "+" : ""}₹{(trade.pnl ?? 0).toLocaleString("en-IN")}
                  </p>
                  <p className={cn(
                    "text-sm font-medium",
                    (trade.pnl ?? 0) >= 0 ? "text-green-500/80" : "text-red-500/80"
                  )}>
                    {(trade.pnlPercent ?? 0) >= 0 ? "+" : ""}{(trade.pnlPercent ?? 0).toFixed(2)}%
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-8">

            {/* === SECTION 1: Trade Details Grid === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Trade Overview */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-foreground mb-3">
                  <Tag className="h-5 w-5 text-blue-500" />
                  Trade Overview
                </div>
                <div className="bg-muted/40 rounded-lg p-4 space-y-3">
                  <Row label="Entry Price" value={trade.entryPrice != null ? `₹${trade.entryPrice.toLocaleString("en-IN")}` : "N/A"} />
                  <Row label="Exit Price" value={trade.exitPrice != null ? `₹${trade.exitPrice.toLocaleString("en-IN")}` : "N/A"} />
                  <Row label="Quantity" value={trade.quantity != null ? `${trade.quantity} Qty` : "N/A"} />
                  {trade.entryTime && <Row label="Entry Time" value={trade.entryTime} />}
                  {trade.exitTime && <Row label="Exit Time" value={trade.exitTime} />}
                  <Row label="Duration" value={formatDuration()} />
                </div>
              </div>

              {/* Risk Management */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-foreground mb-3">
                  <Shield className="h-5 w-5 text-orange-500" />
                  Risk Management
                </div>
                <div className="bg-muted/40 rounded-lg p-4 space-y-3">
                  <Row label="Stop Loss" value={trade.stopLoss != null ? `₹${trade.stopLoss.toLocaleString("en-IN")}` : "N/A"} valueClass="text-red-500" />
                  <Row label="Target" value={trade.target != null ? `₹${trade.target.toLocaleString("en-IN")}` : "N/A"} valueClass="text-green-500" />
                  <Row label="Expected R:R" value={expectedRiskReward()} />
                  <Row label="Actual R:R" value={actualRiskReward()} />
                  <Row label="Outcome" value={
                    trade.outcome === "full-success"
                      ? "✅ Full Success"
                      : trade.outcome === "partial"
                        ? "⚡ Partial"
                        : trade.outcome === "breakeven"
                          ? "➖ Breakeven"
                          : trade.outcome === "mistake"
                            ? "❌ Mistake"
                            : trade.outcome.charAt(0).toUpperCase() + trade.outcome.slice(1)
                  } />
                </div>
              </div>
            </div>

            {/* === SECTION 2: Psychology === */}
            <div>
              <div className="flex items-center gap-2 font-semibold text-foreground mb-3">
                <Star className="h-5 w-5 text-amber-500" />
                Psychology & Evaluation
              </div>
              <div className="bg-muted/40 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Entry Confidence */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Entry Confidence</p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${trade.entryConfidence * 10}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold">{trade.entryConfidence}/10</span>
                    </div>
                  </div>
                  {/* Satisfaction */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Satisfaction</p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${trade.satisfaction * 10}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold">{trade.satisfaction}/10</span>
                    </div>
                  </div>
                  {/* Emotional State */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Emotional State</p>
                    <span className={cn(
                      "text-sm font-semibold capitalize px-2 py-0.5 rounded-full",
                      trade.emotionalState === "calm" ? "bg-green-500/20 text-green-500" :
                        trade.emotionalState === "overconfident" ? "bg-amber-500/20 text-amber-500" :
                          "bg-red-500/20 text-red-500"
                    )}>
                      {trade.emotionalState}
                    </span>
                  </div>
                  {/* Strategy */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Strategy</p>
                    <span className="text-sm font-semibold">{trade.strategy}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* === SECTION 3: Journal / Analysis === */}
            <div>
              <div className="flex items-center gap-2 font-semibold text-foreground mb-3">
                <FileText className="h-5 w-5 text-purple-500" />
                Trade Analysis & Notes
              </div>
              <div className="bg-muted/40 rounded-lg p-4 space-y-4">
                {trade.tradeAnalysis && (
                  <div>
                    <h4 className="text-xs uppercase text-muted-foreground font-semibold mb-2">Analysis</h4>
                    <div
                      className="text-sm text-foreground/90 prose prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                      dangerouslySetInnerHTML={{ __html: trade.tradeAnalysis }}
                    />
                  </div>
                )}
                {trade.notes && (
                  <div>
                    <h4 className="text-xs uppercase text-muted-foreground font-semibold mb-2">Notes</h4>
                    <p className="text-sm text-foreground/80">{trade.notes}</p>
                  </div>
                )}
                {trade.lessonsLearned && (
                  <div>
                    <h4 className="text-xs uppercase text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                      <BookOpen className="h-5 w-5" /> Lessons Learned
                    </h4>
                    <p className="text-sm text-foreground/80">{trade.lessonsLearned}</p>
                  </div>
                )}
                {trade.mistakes && trade.mistakes.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-5 w-5 text-amber-500" /> Mistakes
                    </h4>
                    <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1">
                      {trade.mistakes.map((mistake, index) => (
                        <li key={index}>{mistake}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* === SECTION 4: Media === */}
            {trade.images && trade.images.length > 0 && (
              <div>
                <div className="flex items-center gap-2 font-semibold text-foreground mb-3">
                  <ImageIcon className="h-5 w-5 text-cyan-500" />
                  Screenshots ({trade.images.length})
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {trade.images.map((img, index) => (
                    <div
                      key={index}
                      className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
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
            <div className="flex justify-end pt-2 border-t border-border">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] bg-transparent border-none shadow-none p-0 flex items-center justify-center focus:outline-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={selectedImage || ""}
              alt="Full screen"
              className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl"
            />
            <button
              className="absolute -top-12 right-0 md:-right-4 md:top-0 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors backdrop-blur-sm z-50"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-6 w-6" />
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
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium", valueClass)}>{value}</span>
    </div>
  )
}
