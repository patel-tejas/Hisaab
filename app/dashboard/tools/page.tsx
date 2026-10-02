"use client"

import { useMemo, useState } from "react"
import { Calculator, Scale, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/* Spacing note: in this app `p-24` is 24px and `gap-16` is 16px (px-named
   tokens from globals.css), so stock steps like p-6 are avoided here. */

const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`

const num = (v: string) => {
  const n = Number(v)
  return v.trim() === "" || !Number.isFinite(n) ? null : n
}

function Field({ id, label, value, onChange, hint, suffix }: {
  id: string; label: string; value: string; onChange: (v: string) => void; hint?: string; suffix?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="label-mono text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className={cn(suffix && "pr-40")} />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-12 flex items-center text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Result({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-12 py-8">
      <p className="label-mono text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold tabular-nums",
        tone === "good" && "text-[var(--success)]",
        tone === "bad" && "text-[var(--destructive)]")}>{value}</p>
    </div>
  )
}

function ToolCard({ icon: Icon, title, description, children }: {
  icon: typeof Calculator; title: string; description: string; children: React.ReactNode
}) {
  return (
    <Card className="gap-16 p-24">
      <div className="flex items-start gap-12">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </Card>
  )
}

/* ─── Position size ─── */
function PositionSize() {
  const [capital, setCapital] = useState("500000")
  const [riskPct, setRiskPct] = useState("1")
  const [entry, setEntry] = useState("")
  const [stop, setStop] = useState("")
  const [lot, setLot] = useState("1")

  const r = useMemo(() => {
    const c = num(capital), p = num(riskPct), e = num(entry), s = num(stop), l = num(lot) ?? 1
    if (!c || !p || !e || !s || l <= 0) return null
    const riskPerUnit = Math.abs(e - s)
    if (riskPerUnit === 0) return null
    const riskBudget = (c * p) / 100
    const lots = Math.floor(riskBudget / (riskPerUnit * l))
    const qty = lots * l
    return { riskBudget, riskPerUnit, lots, qty, actualRisk: qty * riskPerUnit, exposure: qty * e }
  }, [capital, riskPct, entry, stop, lot])

  return (
    <ToolCard icon={Calculator} title="Position size" description="How many units or lots you can take so a stop-out costs only your chosen share of capital.">
      <div className="grid grid-cols-2 gap-12">
        <Field id="ps-capital" label="Capital (₹)" value={capital} onChange={setCapital} />
        <Field id="ps-risk" label="Risk per trade" value={riskPct} onChange={setRiskPct} suffix="%" />
        <Field id="ps-entry" label="Entry price" value={entry} onChange={setEntry} />
        <Field id="ps-stop" label="Stop loss" value={stop} onChange={setStop} />
        <Field id="ps-lot" label="Lot size" value={lot} onChange={setLot} hint="1 for cash equity; your contract's lot size for F&O." />
      </div>
      {r ? (
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <Result label="Quantity" value={r.qty.toLocaleString("en-IN")} />
          <Result label="Lots" value={r.lots.toLocaleString("en-IN")} />
          <Result label="Risk if stopped" value={inr(r.actualRisk)} tone="bad" />
          <Result label="Risk budget" value={inr(r.riskBudget)} />
          <Result label="Risk per unit" value={inr(r.riskPerUnit)} />
          <Result label="Position value" value={inr(r.exposure)} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Enter capital, risk, entry and a stop that differs from entry.</p>
      )}
      {r && r.lots === 0 && (
        <p className="text-sm text-[var(--warning)]">One lot risks more than your budget. Widen the budget or tighten the stop.</p>
      )}
    </ToolCard>
  )
}

/* ─── Risk : reward ─── */
function RiskReward() {
  const [entry, setEntry] = useState("")
  const [stop, setStop] = useState("")
  const [target, setTarget] = useState("")

  const r = useMemo(() => {
    const e = num(entry), s = num(stop), t = num(target)
    if (e === null || s === null || t === null) return null
    const isShort = s > e
    const risk = Math.abs(e - s)
    const reward = isShort ? e - t : t - e
    if (risk === 0) return null
    const rr = reward / risk
    return { isShort, risk, reward, rr, breakeven: rr > 0 ? 100 / (1 + rr) : null }
  }, [entry, stop, target])

  return (
    <ToolCard icon={Scale} title="Risk : reward" description="Reward per unit of risk, and the win rate you need to break even before charges.">
      <div className="grid grid-cols-3 gap-12">
        <Field id="rr-entry" label="Entry" value={entry} onChange={setEntry} />
        <Field id="rr-stop" label="Stop loss" value={stop} onChange={setStop} />
        <Field id="rr-target" label="Target" value={target} onChange={setTarget} />
      </div>
      {r ? (
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <Result label="Direction" value={r.isShort ? "Short" : "Long"} />
          <Result label="R : R" value={`1 : ${r.rr.toFixed(2)}`} tone={r.rr >= 1 ? "good" : "bad"} />
          <Result label="Reward / unit" value={r.reward.toFixed(2)} />
          <Result label="Break-even win rate" value={r.breakeven === null ? "—" : `${r.breakeven.toFixed(1)}%`} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Enter entry, stop and target. A stop above entry is treated as a short.</p>
      )}
      {r && r.reward <= 0 && (
        <p className="text-sm text-[var(--warning)]">The target is on the losing side of entry.</p>
      )}
    </ToolCard>
  )
}

/* ─── Compounding ─── */
function Compounding() {
  const [capital, setCapital] = useState("100000")
  const [rate, setRate] = useState("3")
  const [periods, setPeriods] = useState("12")

  const r = useMemo(() => {
    const c = num(capital), p = num(rate), n = num(periods)
    if (!c || p === null || !n || n < 1 || n > 600) return null
    const final = c * Math.pow(1 + p / 100, Math.floor(n))
    return { final, gain: final - c, multiple: final / c }
  }, [capital, rate, periods])

  return (
    <ToolCard icon={TrendingUp} title="Compounding" description="What a steady return per period does to capital over time. Real returns are not steady; use this as a ceiling check.">
      <div className="grid grid-cols-3 gap-12">
        <Field id="cp-capital" label="Start (₹)" value={capital} onChange={setCapital} />
        <Field id="cp-rate" label="Return / period" value={rate} onChange={setRate} suffix="%" />
        <Field id="cp-periods" label="Periods" value={periods} onChange={setPeriods} hint="e.g. months" />
      </div>
      {r ? (
        <div className="grid grid-cols-3 gap-8">
          <Result label="Ending capital" value={inr(r.final)} />
          <Result label="Gain" value={inr(r.gain)} tone={r.gain >= 0 ? "good" : "bad"} />
          <Result label="Multiple" value={`${r.multiple.toFixed(2)}×`} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Enter a starting amount, a return and 1 to 600 periods.</p>
      )}
    </ToolCard>
  )
}

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl leading-[1.02] tracking-tight md:text-[2.75rem]">Trading Tools</h1>
        <p className="mt-3 text-muted-foreground">Size positions and sanity-check a trade before you take it.</p>
      </div>

      <div className="grid gap-24 lg:grid-cols-2">
        <PositionSize />
        <RiskReward />
        <Compounding />
      </div>
    </div>
  )
}
