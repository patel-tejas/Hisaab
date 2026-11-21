"use client"

import { useMemo, useState } from "react"

import { Card } from "@/components/ui/card"
import { INDEX_LOTS, positionSize, type PositionSize } from "@/lib/journal/calculators"
import { inr, parseNum } from "@/lib/journal/format"
import { cn } from "@/lib/utils"
import { NumberField, ResultNote, ResultRow } from "./parts"

export function PositionSizeCalculator() {
  const [capital, setCapital] = useState("")
  const [riskPercent, setRiskPercent] = useState("1")
  const [entry, setEntry] = useState("")
  const [stop, setStop] = useState("")
  const [target, setTarget] = useState("")
  const [lotSize, setLotSize] = useState("")

  const touched = [capital, entry, stop].some((v) => v.trim() !== "")
  const result = useMemo(
    () =>
      positionSize({
        capital: parseNum(capital),
        riskPercent: parseNum(riskPercent),
        entry: parseNum(entry),
        stop: parseNum(stop),
        target: parseNum(target),
        lotSize: parseNum(lotSize),
      }),
    [capital, riskPercent, entry, stop, target, lotSize]
  )

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="glass-card gap-5 p-6">
        <div>
          <h2 className="font-semibold">Position size</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            How many units to buy or sell so a stop-out costs only what you decided to risk.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <NumberField id="ps-capital" label="Account capital" prefix="₹" value={capital} onChange={setCapital} placeholder="5,00,000" />
          <NumberField id="ps-risk" label="Risk per trade" suffix="%" value={riskPercent} onChange={setRiskPercent} />
          <NumberField id="ps-entry" label="Entry price" value={entry} onChange={setEntry} />
          <NumberField id="ps-stop" label="Stop-loss price" value={stop} onChange={setStop} />
          <NumberField id="ps-target" label="Target price (optional)" value={target} onChange={setTarget} />
          <NumberField id="ps-lot" label="Lot size (F&O, optional)" value={lotSize} onChange={setLotSize} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Index lot sizes</span>
          {INDEX_LOTS.map((l) => (
            <button
              key={l.symbol}
              type="button"
              onClick={() => setLotSize(String(l.lotSize))}
              className={cn(
                "rounded-lg border border-border/60 px-2.5 py-1 text-xs transition-colors hover:bg-muted/60",
                lotSize === String(l.lotSize) && "border-primary/50 bg-primary/10 text-foreground"
              )}
            >
              {l.symbol} {l.lotSize}
            </button>
          ))}
        </div>
      </Card>

      <PositionSizeResult result={result} touched={touched} />
    </div>
  )
}

type Result = PositionSize | { ok: false; error: string }

function PositionSizeResult({ result, touched }: { result: Result; touched: boolean }) {
  return (
    <Card className="glass-card gap-4 p-6">
      <h2 className="font-semibold">Result</h2>
      {!touched ? (
        <ResultNote>Enter your capital, entry and stop to size the trade.</ResultNote>
      ) : !result.ok ? (
        <ResultNote tone="error">{result.error}</ResultNote>
      ) : (
        <SizedTrade size={result} />
      )}
    </Card>
  )
}

function SizedTrade({ size }: { size: PositionSize }) {
  const quantity =
    size.lots !== null
      ? `${size.quantity.toLocaleString("en-IN")} (${size.lots} ${size.lots === 1 ? "lot" : "lots"})`
      : size.quantity.toLocaleString("en-IN")

  return (
    <div>
      <ResultRow big label={size.lots !== null ? "Quantity" : "Quantity (units)"} value={quantity} />
      <ResultRow label="Direction" value={size.direction === "long" ? "Long (stop below entry)" : "Short (stop above entry)"} />
      <ResultRow label="Risk budget" value={inr(size.riskAmount)} />
      <ResultRow label="Risk per unit" value={inr(size.riskPerUnit, 2)} />
      <ResultRow label="Loss if stopped out" value={inr(-size.maxLoss)} tone="bad" />
      <ResultRow
        label="Position value"
        value={`${inr(size.positionValue)} (${size.positionPercentOfCapital.toFixed(0)}% of capital)`}
      />
      {size.reward && (
        <>
          <ResultRow label="Profit at target" value={inr(size.reward.amount)} tone="good" />
          <ResultRow label="Reward to risk" value={`1 : ${size.reward.ratio.toFixed(2)}`} />
        </>
      )}
      {size.warnings.length > 0 && (
        <div className="mt-3 space-y-2">
          {size.warnings.map((w) => (
            <ResultNote key={w} tone="warn">
              {w}
            </ResultNote>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        For futures, position value is the contract value, not the margin your broker blocks. Charges are not included.
      </p>
    </div>
  )
}
