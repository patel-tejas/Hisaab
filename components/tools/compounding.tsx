"use client"

import { useMemo, useState } from "react"

import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { compounding, recoveryGainPercent } from "@/lib/journal/calculators"
import { inr, parseNum } from "@/lib/journal/format"
import { NumberField, ResultNote, ResultRow } from "./parts"

const UNITS = ["month", "year", "week", "trade"] as const
type Unit = (typeof UNITS)[number]

const DRAWDOWNS = [5, 10, 20, 30, 40, 50] as const

/** At most 12 rows, always including the first and last period. */
function sampleRows<T extends { period: number }>(rows: T[]): T[] {
  if (rows.length <= 12) return rows
  const picked = new Set<number>()
  for (let i = 0; i < 12; i++) picked.add(Math.round((i * (rows.length - 1)) / 11))
  return rows.filter((_, idx) => picked.has(idx))
}

export function CompoundingCalculator() {
  const [principal, setPrincipal] = useState("")
  const [rate, setRate] = useState("")
  const [periods, setPeriods] = useState("12")
  const [contribution, setContribution] = useState("")
  const [unit, setUnit] = useState<Unit>("month")

  const touched = [principal, rate].some((v) => v.trim() !== "")
  const result = useMemo(
    () =>
      compounding({
        principal: parseNum(principal),
        ratePercent: parseNum(rate),
        periods: parseNum(periods),
        contribution: contribution.trim() === "" ? 0 : parseNum(contribution),
      }),
    [principal, rate, periods, contribution]
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card gap-5 p-6">
          <div>
            <h2 className="font-semibold">Compounding</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              What a steady return per period grows into. It shows the arithmetic, not a forecast.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <NumberField id="cp-principal" label="Starting capital" prefix="₹" value={principal} onChange={setPrincipal} />
            <NumberField id="cp-rate" label={`Return per ${unit}`} suffix="%" value={rate} onChange={setRate} />
            <NumberField id="cp-periods" label="Number of periods" value={periods} onChange={setPeriods} />
            <NumberField
              id="cp-contribution"
              label={`Added each ${unit} (optional)`}
              prefix="₹"
              value={contribution}
              onChange={setContribution}
            />
            <div className="space-y-2">
              <Label htmlFor="cp-unit">Period is a</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
                <SelectTrigger id="cp-unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="glass-card gap-4 p-6">
          <h2 className="font-semibold">Result</h2>
          {!touched ? (
            <ResultNote>Enter your starting capital and a return per period.</ResultNote>
          ) : !result.ok ? (
            <ResultNote tone="error">{result.error}</ResultNote>
          ) : (
            <div>
              <ResultRow big label="Final value" value={inr(result.finalValue)} />
              <ResultRow label="Total put in" value={inr(result.contributed)} />
              <ResultRow label="Growth" value={inr(result.gain)} tone={result.gain >= 0 ? "good" : "bad"} />
              <ResultRow
                label="Multiple of money put in"
                value={`${(result.finalValue / result.contributed).toFixed(2)}x`}
              />
            </div>
          )}
        </Card>
      </div>

      {result.ok && touched && (
        <Card className="glass-card gap-3 p-6">
          <h2 className="font-semibold">Path</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="capitalize">{unit}</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Growth so far</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleRows(result.rows).map((r) => (
                <TableRow key={r.period}>
                  <TableCell className="numeric">{r.period}</TableCell>
                  <TableCell className="numeric text-right">{inr(r.balance)}</TableCell>
                  <TableCell className="numeric text-right">{inr(r.balance - r.contributed)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Card className="glass-card gap-3 p-6">
        <div>
          <h2 className="font-semibold">Gain needed to recover a loss</h2>
          <p className="mt-1 text-sm text-muted-foreground">Losses hurt more than the same gain helps. This is why drawdown control matters.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {DRAWDOWNS.map((d) => (
            <div key={d} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
              <p className="label-mono">Lose {d}%</p>
              <p className="numeric mt-1 text-lg font-medium">+{(recoveryGainPercent(d) ?? 0).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">to get back</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
