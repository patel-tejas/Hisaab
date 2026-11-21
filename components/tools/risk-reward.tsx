"use client"

import { useMemo, useState } from "react"

import { Card } from "@/components/ui/card"
import { riskReward } from "@/lib/journal/calculators"
import { inr, parseNum } from "@/lib/journal/format"
import { NumberField, ResultNote, ResultRow } from "./parts"

export function RiskRewardCalculator() {
  const [entry, setEntry] = useState("")
  const [stop, setStop] = useState("")
  const [target, setTarget] = useState("")
  const [quantity, setQuantity] = useState("")

  const touched = [entry, stop, target].some((v) => v.trim() !== "")
  const result = useMemo(
    () => riskReward({ entry: parseNum(entry), stop: parseNum(stop), target: parseNum(target), quantity: parseNum(quantity) }),
    [entry, stop, target, quantity]
  )

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="glass-card gap-5 p-6">
        <div>
          <h2 className="font-semibold">Risk to reward</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            What the trade pays for every rupee it risks, and how often you need to win to break even.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NumberField id="rr-entry" label="Entry price" value={entry} onChange={setEntry} />
          <NumberField id="rr-stop" label="Stop-loss price" value={stop} onChange={setStop} />
          <NumberField id="rr-target" label="Target price" value={target} onChange={setTarget} />
          <NumberField id="rr-qty" label="Quantity (optional)" value={quantity} onChange={setQuantity} hint="Adds rupee amounts" />
        </div>
      </Card>

      <Card className="glass-card gap-4 p-6">
        <h2 className="font-semibold">Result</h2>
        {!touched ? (
          <ResultNote>Enter entry, stop and target.</ResultNote>
        ) : !result.ok ? (
          <ResultNote tone="error">{result.error}</ResultNote>
        ) : (
          <div>
            <ResultRow big label="Reward to risk" value={`1 : ${result.ratio.toFixed(2)}`} />
            <ResultRow label="Direction" value={result.direction === "long" ? "Long" : "Short"} />
            <ResultRow label="Risk per unit" value={inr(result.riskPerUnit, 2)} />
            <ResultRow label="Reward per unit" value={inr(result.rewardPerUnit, 2)} />
            <ResultRow label="Breakeven win rate" value={`${result.breakevenWinRate.toFixed(1)}%`} />
            {result.amounts && (
              <>
                <ResultRow label="Amount at risk" value={inr(-result.amounts.risk)} tone="bad" />
                <ResultRow label="Amount to gain" value={inr(result.amounts.reward)} tone="good" />
              </>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              At this ratio you break even winning {result.breakevenWinRate.toFixed(0)} of every 100 trades, before brokerage and
              taxes. Costs raise that number.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
