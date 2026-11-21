"use client"

import { useMemo, useState } from "react"

import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { INDEX_LOTS, INDEX_LOTS_SOURCE, lotCalc } from "@/lib/journal/calculators"
import { inr, parseNum } from "@/lib/journal/format"
import { NumberField, ResultNote, ResultRow } from "./parts"

const CUSTOM = "CUSTOM"

export function LotCalculator() {
  const [index, setIndex] = useState<string>("NIFTY")
  const [customLot, setCustomLot] = useState("")
  const [lots, setLots] = useState("1")
  const [price, setPrice] = useState("")
  const [stopPoints, setStopPoints] = useState("")
  const [targetPoints, setTargetPoints] = useState("")

  const preset = INDEX_LOTS.find((l) => l.symbol === index)
  const lotSize = preset ? preset.lotSize : parseNum(customLot)

  const touched = price.trim() !== ""
  const result = useMemo(
    () =>
      lotCalc({
        lotSize,
        lots: parseNum(lots),
        price: parseNum(price),
        stopPoints: parseNum(stopPoints),
        targetPoints: parseNum(targetPoints),
      }),
    [lotSize, lots, price, stopPoints, targetPoints]
  )

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="glass-card gap-5 p-6">
        <div>
          <h2 className="font-semibold">F&O lots</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Turn lots into quantity, contract value and the rupees that ride on every point.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lot-index">Contract</Label>
            <Select value={index} onValueChange={setIndex}>
              <SelectTrigger id="lot-index" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDEX_LOTS.map((l) => (
                  <SelectItem key={l.symbol} value={l.symbol}>
                    {l.symbol} (lot {l.lotSize})
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM}>Stock or other (enter lot size)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {index === CUSTOM ? (
            <NumberField id="lot-custom" label="Lot size" value={customLot} onChange={setCustomLot} />
          ) : (
            <NumberField id="lot-count" label="Number of lots" value={lots} onChange={setLots} />
          )}
          {index === CUSTOM && <NumberField id="lot-count" label="Number of lots" value={lots} onChange={setLots} />}
          <NumberField id="lot-price" label="Price per unit" prefix="₹" value={price} onChange={setPrice} hint="Option premium or futures price" />
          <NumberField id="lot-stop" label="Stop (points, optional)" value={stopPoints} onChange={setStopPoints} />
          <NumberField id="lot-target" label="Target (points, optional)" value={targetPoints} onChange={setTargetPoints} />
        </div>
        <p className="text-xs text-muted-foreground">
          Lot sizes are from NSE circular {INDEX_LOTS_SOURCE.circular}, effective {INDEX_LOTS_SOURCE.effective}. NSE revises
          them from time to time, so confirm with your broker before you trade.
        </p>
      </Card>

      <Card className="glass-card gap-4 p-6">
        <h2 className="font-semibold">Result</h2>
        {!touched ? (
          <ResultNote>Enter a price to see the quantity and the value of the position.</ResultNote>
        ) : !result.ok ? (
          <ResultNote tone="error">{result.error}</ResultNote>
        ) : (
          <div>
            <ResultRow big label="Quantity" value={result.quantity.toLocaleString("en-IN")} />
            <ResultRow label="Contract value" value={inr(result.value)} />
            <ResultRow label="Rupees per 1-point move" value={inr(result.rupeesPerPoint)} />
            {result.atStop !== null && <ResultRow label="Loss at stop" value={inr(-result.atStop)} tone="bad" />}
            {result.atTarget !== null && <ResultRow label="Gain at target" value={inr(result.atTarget)} tone="good" />}
            <p className="mt-4 text-xs text-muted-foreground">
              For an option buyer the contract value is the premium paid. For a seller or a futures trader it is notional value,
              not margin.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
