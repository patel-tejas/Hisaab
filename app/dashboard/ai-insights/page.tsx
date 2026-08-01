"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect, useCallback } from "react"
import {
    Sparkles, RefreshCw, TrendingUp, TrendingDown, AlertTriangle,
    Target, Brain, Shield, Loader2, Zap, Award, Eye, Flame,
    CheckCircle2, XCircle, Clock, BookOpen, Gauge, BarChart3,
    ArrowUpRight, ArrowDownRight, ArrowRight, Minus, Activity, Heart, Lightbulb,
} from "lucide-react"
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer,
} from "recharts"

/* ──────────────────────────────────── Types ──────────────────────────────────── */
interface ActionItem { text: string; priority?: "high" | "quick-win" | "long-term" }
interface AiInsightsData {
    ready: boolean; overallSummary?: string
    strengths?: string[]; weaknesses?: string[]
    patterns?: { bestSetup: string; worstSetup: string; bestDay: string; emotionalInsight: string; streakAnalysis: string }
    confidenceCalibration?: { finding: string; optimalConfidence: string; overconfidenceBias: boolean }
    lossRecovery?: { finding: string; avgTradesToRecover: number; advice: string }
    overtradingAnalysis?: { finding: string; optimalTradesPerDay: string; isOvertrading: boolean }
    sequentialPatterns?: { finding: string; tiltRisk: string; advice: string }
    whatIfScenarios?: { scenario: string; currentPnl: number; projectedPnl: number; difference: number; advice: string; assumptions?: string }[]
    tradeDuration?: { finding: string; optimalDuration: string; advice: string }
    personalizedRules?: string[]
    performanceForecast?: { projection: string; monthEndTarget: number; confidence: string }
    emotionalTrend?: { finding: string; trend: string; burnoutRisk: string; advice: string }
    riskScore?: { overall: number; maxDrawdown: number; sharpeRatio: number; assessment: string; advice: string }
    actionItems?: (string | ActionItem)[]
    traderLevel?: string; confidenceScore?: number
    summary?: string; parseError?: boolean
    dataRange?: { from: string; to: string; totalDays: number; totalTrades: number }
}

/* ──────────────────────────────────── Cache ──────────────────────────────────── */
const CACHE_KEY = "ai-insights-cache"
const CACHE_TTL = 1000 * 60 * 60 * 4

function getCached(): { data: AiInsightsData; timestamp: number } | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return null
        const { data, timestamp } = JSON.parse(raw)
        if (Date.now() - timestamp > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null }
        return { data, timestamp }
    } catch { return null }
}

/** Normalize action items — handle both old string[] and new {text, priority}[] format */
function normalizeActionItems(items: (string | ActionItem)[]): ActionItem[] {
    return items.map(item =>
        typeof item === "string" ? { text: item } : item
    )
}
function setCache(data: AiInsightsData) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
}

/* ─────────────── Section Wrapper (stagger fade-in + divider) ─────────────── */
function Section({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
    return (
        <div
            className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", className)}
            style={{ animationDelay: delay + "ms", animationFillMode: "both" }}
        >
            {children}
        </div>
    )
}

function SectionDivider() {
    return <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
}

/* ──────────────────────────────────── Gauge SVG ──────────────────────────────────── */
function ConfidenceGauge({ score }: { score: number }) {
    const r = 72, sw = 10, circ = Math.PI * r, prog = (score / 100) * circ
    const clr = score >= 80 ? "#10b981" : score >= 60 ? "#6366f1" : score >= 40 ? "#f59e0b" : "#ef4444"
    return (
        <div className="flex flex-col items-center">
            <svg width="180" height="110" viewBox="0 0 180 110">
                <defs>
                    <linearGradient id="gg" x1="0%" y1="0%" x2="100%"><stop offset="0%" stopColor="#ef4444" stopOpacity=".25" /><stop offset="50%" stopColor="#6366f1" stopOpacity=".25" /><stop offset="100%" stopColor="#10b981" stopOpacity=".25" /></linearGradient>
                    <filter id="gl"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>
                <path d={`M ${90 - r} 95 A ${r} ${r} 0 0 1 ${90 + r} 95`} fill="none" stroke="url(#gg)" strokeWidth={sw} strokeLinecap="round" />
                <path d={`M ${90 - r} 95 A ${r} ${r} 0 0 1 ${90 + r} 95`} fill="none" stroke={clr} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${prog} ${circ}`} filter="url(#gl)" className="transition-all duration-1000" />
                <text x="90" y="72" textAnchor="middle" className="fill-foreground font-bold" fontSize="32">{score}</text>
                <text x="90" y="92" textAnchor="middle" className="fill-muted-foreground" fontSize="11">/ 100</text>
            </svg>
            <span className="text-xs font-medium text-muted-foreground -mt-1">AI Confidence</span>
        </div>
    )
}

/* ──────────────────────────── Mini Ring Gauge (for Risk) ──────────────────────────── */
function MiniGauge({ value, max = 100, size = 56, color }: { value: number; max?: number; size?: number; color: string }) {
    const r = (size - 8) / 2, circ = 2 * Math.PI * r, prog = (Math.min(value, max) / max) * circ
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-muted/30" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round"
                strokeDasharray={`${prog} ${circ}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="transition-all duration-1000"
            />
            <text x={size / 2} y={size / 2 + 5} textAnchor="middle" className="fill-foreground font-bold" fontSize="14">{value}</text>
        </svg>
    )
}

/* ──────────────────────────────────── Trader Level ──────────────────────────────────── */
const lvlCfg: Record<string, { emoji: string; color: string }> = {
    beginner: { emoji: "🌱", color: "text-blue-400" },
    intermediate: { emoji: "⚡", color: "text-amber-400" },
    advanced: { emoji: "🔥", color: "text-indigo-400" },
    expert: { emoji: "👑", color: "text-emerald-400" },
}

function TraderLevel({ level }: { level: string }) {
    const cfg = lvlCfg[level] || lvlCfg.beginner
    const levels = ["beginner", "intermediate", "advanced", "expert"]
    const idx = levels.indexOf(level)
    return (
        <div>
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Trader Level</h4>
            <p className={cn("text-xl font-bold mb-3", cfg.color)}>{cfg.emoji} {level.charAt(0).toUpperCase() + level.slice(1)}</p>
            <div className="flex gap-1">
                {levels.map((l, i) => (
                    <div key={l} className="flex-1">
                        <div className={cn("h-1.5 rounded-full", i <= idx ? "bg-primary" : "bg-muted/30")} style={{ opacity: i <= idx ? 0.4 + (i / 4) * 0.6 : 1 }} />
                        <span className="text-[8px] text-muted-foreground capitalize block mt-0.5 text-center">{l}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ──────────────────────────────────── Skill Radar ──────────────────────────────────── */
function SkillRadar({ strengths, weaknesses }: { strengths: string[]; weaknesses: string[] }) {
    const kw = (arr: string[], ...words: string[]) => arr.some(s => words.some(w => s.toLowerCase().includes(w)))
    const data = [
        { s: "Strategy", v: kw(strengths, "strat", "setup") ? 85 : kw(weaknesses, "strat", "setup") ? 35 : 60 },
        { s: "Risk", v: kw(weaknesses, "risk", "loss", "stop") ? 35 : 70 },
        { s: "Psychology", v: kw(strengths, "emotion", "discip", "psych") ? 85 : kw(weaknesses, "emotion", "tilt") ? 35 : 55 },
        { s: "Consistency", v: kw(strengths, "consist") ? 85 : 55 },
        { s: "Timing", v: kw(weaknesses, "timing", "entry", "exit") ? 35 : 65 },
        { s: "Execution", v: strengths.length >= 3 ? 80 : 55 },
    ]

    const renderLabel = (props: any) => {
        const { x, y, payload } = props
        const item = data.find(d => d.s === payload.value)
        const score = item?.v ?? 0
        const clr = score >= 70 ? "var(--color-emerald-400, #34d399)" : score >= 50 ? "var(--color-amber-400, #fbbf24)" : "var(--color-rose-400, #fb7185)"
        return (
            <g>
                <text x={x} y={y} textAnchor="middle" fill="var(--muted-foreground)" fontSize={10}>{payload.value}</text>
                <text x={x} y={y + 13} textAnchor="middle" fill={clr} fontSize={9} fontWeight="bold">{score}</text>
            </g>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="65%">
                <PolarGrid stroke="var(--muted-foreground)" strokeOpacity={.12} />
                <PolarAngleAxis dataKey="s" tick={renderLabel} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="v" stroke="#6366f1" fill="url(#radarGrad)" fillOpacity={.3} strokeWidth={2} />
                <defs>
                    <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                    </radialGradient>
                </defs>
            </RadarChart>
        </ResponsiveContainer>
    )
}

/* ──────────────────────────────────── Insight Card Shell ──────────────────────────────────── */
function InsightCard({ icon: Icon, title, color, badge, children }: { icon: any; title: string; color: string; badge?: React.ReactNode; children: React.ReactNode }) {
    return (
        <Card className="glass-card p-5 relative overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
            <div className={cn("absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-[.07] group-hover:opacity-[.12] transition-opacity", `bg-${color}-500`)} />
            {badge && (
                <div className="absolute top-3 right-3 z-20">{badge}</div>
            )}
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", `bg-${color}-500/10`)}>
                        <Icon className={cn("h-4 w-4", `text-${color}-400`)} />
                    </div>
                    <h4 className={cn("text-xs font-bold uppercase tracking-wider", `text-${color}-400`)}>{title}</h4>
                </div>
                {children}
            </div>
        </Card>
    )
}

/* ──────────────────────────────────── Trend Indicator ──────────────────────────────────── */
function TrendBadge({ trend }: { trend: string }) {
    const map: Record<string, { icon: any; color: string; label: string }> = {
        improving: { icon: ArrowUpRight, color: "text-emerald-400 bg-emerald-500/10", label: "Improving" },
        declining: { icon: ArrowDownRight, color: "text-rose-400 bg-rose-500/10", label: "Declining" },
        stable: { icon: Minus, color: "text-blue-400 bg-blue-500/10", label: "Stable" },
    }
    const cfg = map[trend] || map.stable
    return (
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", cfg.color)}>
            <cfg.icon className="h-3 w-3" /> {cfg.label}
        </span>
    )
}

/* ──────────────────────────────────── Risk Badge ──────────────────────────────────── */
function RiskBadge({ level }: { level: string }) {
    const clr = level === "high" ? "text-rose-400 bg-rose-500/10" : level === "medium" ? "text-amber-400 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10"
    return <span className={cn("inline-flex text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", clr)}>{level}</span>
}

/* ────────────────────────── What-If Scenario Cards (NEW) ────────────────────────── */
function WhatIfCards({ scenarios }: { scenarios: { scenario: string; currentPnl: number; projectedPnl: number; difference: number; advice: string; assumptions?: string }[] }) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            {scenarios.map((s, i) => {
                const isPositive = s.difference > 0
                return (
                    <Card key={i} className="glass-card p-5 relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
                        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-[.05] bg-emerald-500 group-hover:opacity-[.1] transition-opacity" />
                        <div className="relative z-10 space-y-4">
                            {/* Scenario Title */}
                            <div className="flex items-start gap-2">
                                <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <Target className="h-3.5 w-3.5 text-emerald-400" />
                                </div>
                                <p className="text-sm font-medium text-foreground leading-snug">{s.scenario}</p>
                            </div>

                            {/* Current → Projected */}
                            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                                <div className="text-center flex-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Current</p>
                                    <p className="text-lg font-bold text-foreground font-mono">
                                        ₹{s.currentPnl.toLocaleString("en-IN")}
                                    </p>
                                </div>
                                <div className="flex flex-col items-center gap-0.5 px-2">
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="text-center flex-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Projected</p>
                                    <p className={cn("text-lg font-bold font-mono", isPositive ? "text-emerald-400" : "text-rose-400")}>
                                        ₹{s.projectedPnl.toLocaleString("en-IN")}
                                    </p>
                                </div>
                            </div>

                            {/* Difference Badge */}
                            <div className="flex items-center justify-between">
                                <span className={cn(
                                    "inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg",
                                    isPositive
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                )}>
                                    {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                    {isPositive ? "+" : ""}₹{s.difference.toLocaleString("en-IN")}
                                </span>
                                <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", isPositive ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10")}>
                                    {isPositive ? "Potential Gain" : "Net Impact"}
                                </span>
                            </div>

                            {/* Assumptions */}
                            {s.assumptions && (
                                <p className="text-[10px] text-muted-foreground/70 italic">{s.assumptions}</p>
                            )}

                            {/* Advice */}
                            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                <Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground leading-relaxed">{s.advice}</p>
                            </div>
                        </div>
                    </Card>
                )
            })}
        </div>
    )
}

/* ──────────────────────────────────── Action Checklist ──────────────────────────────────── */
const priorityCfg: Record<string, { label: string; color: string }> = {
    high: { label: "🔴 High Impact", color: "text-rose-400 bg-rose-500/10" },
    "quick-win": { label: "🟡 Quick Win", color: "text-amber-400 bg-amber-500/10" },
    "long-term": { label: "🔵 Long-term", color: "text-blue-400 bg-blue-500/10" },
}

function ActionChecklist({ items }: { items: ActionItem[] }) {
    const [checked, setChecked] = useState<boolean[]>([])
    useEffect(() => {
        try { const s = localStorage.getItem("ai-action-checks"); setChecked(s ? JSON.parse(s) : items.map(() => false)) }
        catch { setChecked(items.map(() => false)) }
    }, [items])
    const toggle = (i: number) => {
        const next = [...checked]; next[i] = !next[i]; setChecked(next)
        localStorage.setItem("ai-action-checks", JSON.stringify(next))
    }
    const done = checked.filter(Boolean).length
    const pct = checked.length > 0 ? Math.round((done / checked.length) * 100) : 0
    return (
        <div className="space-y-2">
            {items.map((item, i) => {
                const pCfg = item.priority ? priorityCfg[item.priority] : null
                return (
                    <button key={i} onClick={() => toggle(i)} className={cn("w-full flex items-start gap-3 text-left p-3 rounded-xl transition-all border", checked[i] ? "bg-emerald-500/5 border-emerald-500/20 opacity-60" : "bg-muted/20 border-transparent hover:border-indigo-500/20")}>
                        {checked[i] ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> : <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40 shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                            <span className={cn("text-sm", checked[i] && "line-through text-muted-foreground")}>{item.text}</span>
                            {pCfg && (
                                <span className={cn("ml-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full inline-block", pCfg.color)}>{pCfg.label}</span>
                            )}
                        </div>
                    </button>
                )
            })}
            {checked.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: pct + "%" }} /></div>
                    <span className="text-xs text-muted-foreground">{done}/{checked.length}</span>
                </div>
            )}
        </div>
    )
}

/* ──────────────── Progress Ring (for Action Items Header) ──────────────── */
function ProgressRing({ done, total, size = 28 }: { done: number; total: number; size?: number }) {
    const r = (size - 4) / 2, circ = 2 * Math.PI * r
    const pct = total > 0 ? done / total : 0
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={2.5} className="text-muted/30" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round"
                strokeDasharray={`${pct * circ} ${circ}`}
                className="transition-all duration-700"
            />
        </svg>
    )
}

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function AiInsightsPage() {
    const [data, setData] = useState<AiInsightsData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [actionChecked, setActionChecked] = useState<boolean[]>([])
    const [cachedAt, setCachedAt] = useState<number | null>(null)

    useEffect(() => { const c = getCached(); if (c?.data?.ready) { setData(c.data); setCachedAt(c.timestamp) } }, [])

    // Keep local action check state for progress ring
    useEffect(() => {
        if (data?.actionItems) {
            try { const s = localStorage.getItem("ai-action-checks"); setActionChecked(s ? JSON.parse(s) : data.actionItems.map(() => false)) }
            catch { setActionChecked(data.actionItems.map(() => false)) }
        }
    }, [data?.actionItems])

    // Listen for storage changes from ActionChecklist
    useEffect(() => {
        const handler = () => {
            try { const s = localStorage.getItem("ai-action-checks"); if (s) setActionChecked(JSON.parse(s)) } catch { }
        }
        window.addEventListener("storage", handler)
        return () => window.removeEventListener("storage", handler)
    }, [])

    const fetchInsights = useCallback(async () => {
        setLoading(true); setError("")
        try {
            const res = await fetch("/api/ai-insights")
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.details || e.error || "Failed") }
            const json = await res.json()
            setData(json); if (json.ready) { setCache(json); setCachedAt(Date.now()) }
        } catch (err: any) { setError(err.message || "Failed to load.") }
        finally { setLoading(false) }
    }, [])

    /* ─── Empty State ─── */
    if (!data && !loading && !error) {
        return (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div>
                    <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground mb-2 flex items-center gap-3">
                        <Brain className="h-8 w-8 text-violet-400" /> AI Trading Coach
                    </h1>
                    <p className="text-muted-foreground">Deep performance analysis powered by Groq Llama AI</p>
                </div>
                <Card className="glass-card relative overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-10 bg-violet-500 animate-pulse" />
                        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-10 bg-indigo-500 animate-pulse" style={{ animationDelay: "1s" }} />
                    </div>
                    <div className="relative z-10 flex flex-col items-center justify-center py-20 px-8 text-center">
                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center border border-violet-500/20 mb-6">
                            <Sparkles className="h-10 w-10 text-violet-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-3">Deep Performance Analysis</h2>
                        <p className="text-muted-foreground max-w-lg mb-8 leading-relaxed">
                            10 deep insights including confidence calibration, loss recovery, what-if scenarios,
                            overtrading detection, tilt analysis, and your personalized trading rulebook.
                        </p>
                        <Button size="lg" onClick={fetchInsights} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/20 px-8">
                            <Sparkles className="h-5 w-5 mr-2" /> Generate Deep Analysis
                        </Button>
                        <p className="text-xs text-muted-foreground mt-4">Takes 5-10 seconds • Cached for 4 hours</p>
                    </div>
                </Card>
            </div>
        )
    }

    /* ─── Loading ─── */
    if (loading) {
        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                <div><h1 className="font-display text-3xl tracking-tight text-foreground flex items-center gap-3"><Brain className="h-8 w-8 text-violet-400" /> AI Trading Coach</h1></div>
                <Card className="glass-card relative overflow-hidden">
                    <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-15 bg-violet-500 animate-pulse" />
                    <div className="relative z-10 flex flex-col items-center py-24">
                        <Loader2 className="h-10 w-10 text-violet-400 animate-spin mb-4" />
                        <p className="text-lg font-semibold text-foreground mb-1">Analyzing your trades...</p>
                        <p className="text-sm text-muted-foreground">Running 10 deep analytics on your data</p>
                        <div className="flex gap-1 mt-5">{[0, 1, 2, 3, 4].map(i => <div key={i} className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: i * .2 + "s" }} />)}</div>
                    </div>
                </Card>
            </div>
        )
    }

    /* ─── Error ─── */
    if (error) {
        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                <div><h1 className="font-display text-3xl tracking-tight text-foreground flex items-center gap-3"><Brain className="h-8 w-8 text-violet-400" /> AI Trading Coach</h1></div>
                <Card className="glass-card p-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                    <p className="text-foreground font-medium mb-2">Failed to generate insights</p>
                    <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto">{error}</p>
                    <Button onClick={fetchInsights} variant="outline"><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
                </Card>
            </div>
        )
    }

    if (!data?.ready) {
        return (
            <div className="space-y-5"><Card className="glass-card p-8 text-center"><Sparkles className="h-12 w-12 text-violet-400 mx-auto mb-4" /><p className="text-muted-foreground">{data?.summary}</p></Card></div>
        )
    }

    const actionDone = actionChecked.filter(Boolean).length
    const normalizedActions = data?.actionItems ? normalizeActionItems(data.actionItems) : []
    const lastUpdatedStr = cachedAt ? new Date(cachedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : null

    /* ═══════════════════════════════ Full Insights View ═══════════════════════════════ */
    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground mb-1 flex items-center gap-3">
                        <Brain className="h-8 w-8 text-violet-400" /> AI Trading Coach
                    </h1>
                    <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                        {data.dataRange ? (
                            <span>{data.dataRange.totalTrades} trades • {data.dataRange.from} – {data.dataRange.to}</span>
                        ) : (
                            <span>Deep analysis based on your trading history</span>
                        )}
                        {lastUpdatedStr && (
                            <span className="text-[10px] px-2 py-0.5 bg-muted/30 rounded-full">Updated {lastUpdatedStr}</span>
                        )}
                    </div>
                </div>
                <Button variant="outline" onClick={fetchInsights} disabled={loading} className="gap-2 shrink-0">
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
                </Button>
            </div>

            {/* ──── ROW 1: Summary + Gauge + Level ──── */}
            <Section delay={0}>
                <div className="grid gap-5 md:grid-cols-3">
                    <Card className="glass-card p-5 relative overflow-hidden md:col-span-2">
                        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-[.07] bg-violet-500" />
                        <h4 className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI Summary</h4>
                        <p className="text-sm text-foreground leading-relaxed">{data.overallSummary}</p>
                    </Card>
                    <Card className="glass-card p-5 flex flex-col items-center justify-center">
                        <ConfidenceGauge score={data.confidenceScore ?? 0} />
                        <div className="mt-3 w-full">
                            <TraderLevel level={data.traderLevel || "beginner"} />
                        </div>
                    </Card>
                </div>
                {data.performanceForecast && (
                    <Card className="glass-card p-4 mt-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-blue-400 shrink-0" />
                            <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Forecast</h4>
                            <RiskBadge level={data.performanceForecast.confidence} />
                            <span className="text-xs text-foreground flex-1">{data.performanceForecast.projection}</span>
                        </div>
                    </Card>
                )}
            </Section>

            <SectionDivider />

            {/* ──── ROW 2: Radar + Strengths/Weaknesses ──── */}
            <Section delay={100}>
                <div className="grid gap-5 md:grid-cols-2">
                    <Card className="glass-card p-5">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Eye className="h-3 w-3" /> Skill Breakdown</h4>
                        {data.strengths && data.weaknesses && <SkillRadar strengths={data.strengths} weaknesses={data.weaknesses} />}
                    </Card>
                    <Card className="glass-card p-5">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Strengths & Weaknesses</h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {data.strengths && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Strengths</p>
                                    {data.strengths.map((s, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /><span className="text-foreground">{s}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {data.weaknesses && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Weaknesses</p>
                                    {data.weaknesses.map((w, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" /><span className="text-foreground">{w}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </Section>

            <SectionDivider />

            {/* ──── ROW 3: Deep Insights Grid ──── */}
            <Section delay={200}>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-5"><Zap className="h-4 w-4" /> Deep Insights</h3>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

                    {/* Confidence Calibration */}
                    {data.confidenceCalibration && (
                        <InsightCard icon={Gauge} title="Confidence Calibration" color="indigo"
                            badge={data.confidenceCalibration.overconfidenceBias ? (
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse">⚠ Overconfidence</span>
                            ) : undefined}
                        >
                            <p className="text-sm text-foreground leading-relaxed mb-2">{data.confidenceCalibration.finding}</p>
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                                <Target className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                <span className="text-xs text-muted-foreground">Optimal confidence: <strong className="text-indigo-400">{data.confidenceCalibration.optimalConfidence}</strong></span>
                            </div>
                        </InsightCard>
                    )}

                    {/* Loss Recovery */}
                    {data.lossRecovery && (
                        <InsightCard icon={Activity} title="Loss Recovery" color="rose">
                            <p className="text-sm text-foreground leading-relaxed mb-3">{data.lossRecovery.finding}</p>
                            <div className="flex items-center gap-4">
                                <div className="text-center p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/10">
                                    <p className="text-2xl font-bold text-rose-400">{data.lossRecovery.avgTradesToRecover}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">trades to recover</p>
                                </div>
                                <p className="text-xs text-muted-foreground italic flex-1 leading-relaxed">{data.lossRecovery.advice}</p>
                            </div>
                        </InsightCard>
                    )}

                    {/* Overtrading */}
                    {data.overtradingAnalysis && (
                        <InsightCard icon={Flame} title="Overtrading Analysis" color="orange"
                            badge={data.overtradingAnalysis.isOvertrading ? (
                                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full animate-pulse">🔴 Overtrading</span>
                            ) : undefined}
                        >
                            <p className="text-sm text-foreground leading-relaxed mb-2">{data.overtradingAnalysis.finding}</p>
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
                                <Target className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                                <span className="text-xs text-muted-foreground">Optimal: <strong className="text-orange-400">{data.overtradingAnalysis.optimalTradesPerDay}</strong> trades/day</span>
                            </div>
                        </InsightCard>
                    )}

                    {/* Sequential Patterns */}
                    {data.sequentialPatterns && (
                        <InsightCard icon={Zap} title="Tilt / Sequential Patterns" color="violet">
                            <p className="text-sm text-foreground leading-relaxed mb-2">{data.sequentialPatterns.finding}</p>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xs text-muted-foreground">Tilt risk: <RiskBadge level={data.sequentialPatterns.tiltRisk} /></span>
                            </div>
                            <p className="text-xs text-muted-foreground italic leading-relaxed">{data.sequentialPatterns.advice}</p>
                        </InsightCard>
                    )}

                    {/* Trade Duration */}
                    {data.tradeDuration && (
                        <InsightCard icon={Clock} title="Trade Duration" color="blue">
                            <p className="text-sm text-foreground leading-relaxed mb-2">{data.tradeDuration.finding}</p>
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/10 mb-2">
                                <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                <span className="text-xs text-muted-foreground">Best hold time: <strong className="text-blue-400">{data.tradeDuration.optimalDuration}</strong></span>
                            </div>
                            <p className="text-xs text-muted-foreground italic leading-relaxed">{data.tradeDuration.advice}</p>
                        </InsightCard>
                    )}

                    {/* Emotional Trend */}
                    {data.emotionalTrend && (
                        <InsightCard icon={Heart} title="Emotional Trend" color="pink">
                            <p className="text-sm text-foreground leading-relaxed mb-3">{data.emotionalTrend.finding}</p>
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                                <TrendBadge trend={data.emotionalTrend.trend} />
                                <span className="text-xs text-muted-foreground">Burnout: <RiskBadge level={data.emotionalTrend.burnoutRisk} /></span>
                            </div>
                            <p className="text-xs text-muted-foreground italic leading-relaxed">{data.emotionalTrend.advice}</p>
                        </InsightCard>
                    )}
                </div>
            </Section>

            <SectionDivider />

            {/* ──── ROW 4: What-If Scenarios (REDESIGNED) ──── */}
            {data.whatIfScenarios && data.whatIfScenarios.length > 0 && (
                <Section delay={300}>
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-5">
                        <Target className="h-4 w-4 text-emerald-400" /> What-If Scenarios
                    </h3>
                    <WhatIfCards scenarios={data.whatIfScenarios} />
                </Section>
            )}

            <SectionDivider />

            {/* ──── ROW 5: Risk Score + Personalized Rules ──── */}
            <Section delay={400}>
                <div className="grid gap-5 md:grid-cols-2">
                    {/* Risk Score with Mini Gauge */}
                    {data.riskScore && (
                        <Card className="glass-card p-5">
                            <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Risk Assessment</h4>
                            <div className="flex items-center gap-5 mb-4">
                                <MiniGauge
                                    value={data.riskScore.overall}
                                    color={data.riskScore.overall >= 70 ? "#ef4444" : data.riskScore.overall >= 40 ? "#f59e0b" : "#10b981"}
                                />
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                    <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30 text-center">
                                        <p className="text-lg font-bold text-foreground font-mono">₹{data.riskScore.maxDrawdown.toLocaleString("en-IN")}</p>
                                        <p className="text-[10px] text-muted-foreground">Max Drawdown</p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30 text-center">
                                        <p className="text-lg font-bold text-foreground font-mono">{data.riskScore.sharpeRatio}</p>
                                        <p className="text-[10px] text-muted-foreground">Sharpe Ratio</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed mb-1">{data.riskScore.assessment}</p>
                            <p className="text-xs text-muted-foreground italic">{data.riskScore.advice}</p>
                        </Card>
                    )}

                    {/* Personalized Rules */}
                    {data.personalizedRules && data.personalizedRules.length > 0 && (
                        <Card className="glass-card p-5">
                            <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Your Trading Rulebook</h4>
                            <div className="space-y-2">
                                {data.personalizedRules.map((rule, i) => (
                                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/20 border border-transparent hover:border-amber-500/20 transition-colors">
                                        <span className="text-amber-400 font-bold text-sm shrink-0 mt-px flex items-center justify-center h-6 w-6 rounded-md bg-amber-500/10">#{i + 1}</span>
                                        <p className="text-sm text-foreground">{rule}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </Section>

            <SectionDivider />

            {/* ──── ROW 6: Pattern Cards — Compact Strip ──── */}
            {data.patterns && (
                <Section delay={500}>
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-5"><Eye className="h-4 w-4" /> Trading Patterns</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            { icon: TrendingUp, title: "Best Setup", color: "emerald", text: data.patterns.bestSetup },
                            { icon: TrendingDown, title: "Worst Setup", color: "amber", text: data.patterns.worstSetup },
                            { icon: Clock, title: "Best Day", color: "blue", text: data.patterns.bestDay },
                            { icon: Brain, title: "Emotional", color: "violet", text: data.patterns.emotionalInsight },
                            { icon: Flame, title: "Streak", color: "orange", text: data.patterns.streakAnalysis },
                        ].map((p, i) => (
                            <Card key={i} className="glass-card overflow-hidden group hover:border-primary/20 transition-all duration-300">
                                <div className={cn("h-1 w-full", `bg-${p.color}-500/40`)} />
                                <div className="p-4">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <p.icon className={cn("h-3.5 w-3.5", `text-${p.color}-400`)} />
                                        <h4 className={cn("text-[10px] font-bold uppercase tracking-wider", `text-${p.color}-400`)}>{p.title}</h4>
                                    </div>
                                    <p className="text-sm text-foreground leading-relaxed">{p.text}</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                </Section>
            )}

            <SectionDivider />

            {/* ──── ROW 7: Action Items with Progress Ring ──── */}
            {normalizedActions.length > 0 && (
                <Section delay={600}>
                    <Card className="glass-card p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <ProgressRing done={actionDone} total={normalizedActions.length} />
                            <div>
                                <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Action Items</h4>
                                <p className="text-[10px] text-muted-foreground">{actionDone} of {normalizedActions.length} completed</p>
                            </div>
                        </div>
                        <ActionChecklist items={normalizedActions} />
                    </Card>
                </Section>
            )}
        </div>
    )
}
