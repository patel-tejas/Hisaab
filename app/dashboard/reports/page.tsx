"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart2,
  Brain,
  Shield,
  FileText,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Trophy,
  Zap,
  Target,
  Clock,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResponsiveContainer,
  PieChart as RePie,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { ChartCard } from "@/components/reports/chart-card";
import { ChartFilter, PillFilter } from "@/components/reports/chart-filter";

type Tab = "performance" | "psychology" | "risk" | "journal";

interface Trade {
  date: string;
  pnl: number;
  pnlPercent: number;
  symbol: string;
  strategy: string;
  type: string;
  emotionalState: string;
  mistakes: string[];
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  notes: string;
  totalAmount: number;
  stopLoss?: number;
  target?: number;
  entryTime?: string;
  exitTime?: string;
  entryConfidence?: number;
  satisfaction?: number;
  outcome?: string;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-sm">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? `₹${p.value.toLocaleString("en-IN")}` : p.value}
        </p>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <Card className="glass-card relative gap-1 overflow-hidden px-5 py-5 group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={cn("mt-1 text-2xl font-bold", color)}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            color.includes("emerald")
              ? "bg-emerald-500/10 text-emerald-500"
              : color.includes("rose")
                ? "bg-rose-500/10 text-rose-500"
                : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}

// ─── Helper: apply symbol/direction filters to trades ───
function applyFilters(trades: Trade[], symbolFilter: string, dirFilter: string): Trade[] {
  let result = trades;
  if (symbolFilter !== "all") {
    result = result.filter((t) => {
      const clean = t.symbol.split("-")[0].trim();
      return clean === symbolFilter;
    });
  }
  if (dirFilter !== "all") result = result.filter((t) => t.type === dirFilter);
  return result;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("performance");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [range, setRange] = useState("365");

  // ── Per-chart filter state ──
  const [eqSymbol, setEqSymbol] = useState("all");
  const [eqDir, setEqDir] = useState("all");
  const [dailySymbol, setDailySymbol] = useState("all");
  const [dailyDir, setDailyDir] = useState("all");
  const [monthlySymbol, setMonthlySymbol] = useState("all");
  const [monthlyDir, setMonthlyDir] = useState("all");
  const [symbolDir, setSymbolDir] = useState("all");
  const [stratDir, setStratDir] = useState("all");

  const [emotionDir, setEmotionDir] = useState("all");
  const [confDir, setConfDir] = useState("all");
  const [confSymbol, setConfSymbol] = useState("all");
  const [satDir, setSatDir] = useState("all");
  const [dowDir, setDowDir] = useState("all");
  const [todDir, setTodDir] = useState("all");

  const [ddSymbol, setDdSymbol] = useState("all");
  const [psDir, setPsDir] = useState("all");

  useEffect(() => {
    fetch("/api/trades")
      .then((res) => res.json())
      .then((data) => setTrades(data));
  }, []);

  // ── BASE FILTER BY DATE RANGE ──
  const filteredTrades = useMemo(() => {
    let result = trades;
    if (range !== "all") {
      const days = Number(range);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = trades.filter((t) => new Date(t.date) >= cutoff);
    }
    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [trades, range]);

  // ── UNIQUE SYMBOLS ──
  /* ── UNIQUE SYMBOLS (Aggregated) ── */
  const uniqueSymbols = useMemo(() => {
    const s = new Set(filteredTrades.map((t) => t.symbol.split("-")[0].trim()));
    return Array.from(s).sort();
  }, [filteredTrades]);

  const symbolOptions = [{ label: "All Symbols", value: "all" }, ...uniqueSymbols.map((s) => ({ label: s, value: s }))];
  const dirOptions = [{ label: "All", value: "all" }, { label: "Long", value: "long" }, { label: "Short", value: "short" }];

  // ── CUMULATIVE PNL ──
  const cumulativeData = useMemo(() => {
    const src = applyFilters(filteredTrades, eqSymbol, eqDir);
    let runningTotal = 0;
    return src.map((t) => {
      runningTotal += t.pnl;
      return { date: new Date(t.date).toLocaleDateString(), pnl: runningTotal, dailyPnl: t.pnl };
    });
  }, [filteredTrades, eqSymbol, eqDir]);

  // ── CORE PERFORMANCE METRICS (always use full filteredTrades) ──
  const performance = useMemo(() => {
    if (filteredTrades.length === 0) {
      return { wins: 0, losses: 0, breakeven: 0, winRate: 0, avgWin: 0, avgLoss: 0, expectancy: 0, dailyStats: [] as any[], bestDay: 0, worstDay: 0, profitFactor: 0, totalPnl: 0 };
    }
    const wins = filteredTrades.filter((t) => t.pnl > 0).length;
    const losses = filteredTrades.filter((t) => t.pnl < 0).length;
    const breakeven = filteredTrades.filter((t) => t.pnl === 0).length;
    const winTrades = filteredTrades.filter((t) => t.pnl > 0);
    const lossTrades = filteredTrades.filter((t) => t.pnl < 0);
    const totalWin = winTrades.reduce((s, t) => s + t.pnl, 0);
    const totalLoss = Math.abs(lossTrades.reduce((s, t) => s + t.pnl, 0));
    const avgWin = totalWin / (winTrades.length || 1);
    const avgLoss = totalLoss / (lossTrades.length || 1);
    const winRate = Math.round((wins / filteredTrades.length) * 100);
    const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;
    const profitFactor = totalLoss === 0 ? (totalWin > 0 ? 100 : 0) : Number((totalWin / totalLoss).toFixed(2));
    const dailyMap: Record<string, number[]> = {};
    filteredTrades.forEach((t) => { const d = new Date(t.date).toLocaleDateString(); if (!dailyMap[d]) dailyMap[d] = []; dailyMap[d].push(t.pnl); });
    const dailyStats = Object.entries(dailyMap).map(([date, arr]) => ({ date, pnl: arr.reduce((s, v) => s + v, 0) }));
    const bestDay = dailyStats.length ? Math.max(...dailyStats.map((x) => x.pnl)) : 0;
    const worstDay = dailyStats.length ? Math.min(...dailyStats.map((x) => x.pnl)) : 0;
    const totalPnl = totalWin - totalLoss;
    return { wins, losses, breakeven, winRate, avgWin, avgLoss, expectancy, dailyStats, bestDay, worstDay, profitFactor, totalPnl };
  }, [filteredTrades]);

  // ── DAILY P&L (filtered) ──
  const dailyPnlData = useMemo(() => {
    const src = applyFilters(filteredTrades, dailySymbol, dailyDir);
    const dailyMap: Record<string, number> = {};
    src.forEach((t) => { const d = new Date(t.date).toLocaleDateString(); dailyMap[d] = (dailyMap[d] || 0) + t.pnl; });
    return Object.entries(dailyMap).map(([date, pnl]) => ({ date, pnl }));
  }, [filteredTrades, dailySymbol, dailyDir]);

  // ── STRATEGY PNL (filtered) ──
  const strategyStats = useMemo(() => {
    const src = applyFilters(filteredTrades, "all", stratDir);
    const map: Record<string, { pnl: number; count: number; wins: number }> = {};
    src.forEach((t) => {
      if (!map[t.strategy]) map[t.strategy] = { pnl: 0, count: 0, wins: 0 };
      map[t.strategy].pnl += t.pnl; map[t.strategy].count += 1; if (t.pnl > 0) map[t.strategy].wins += 1;
    });
    return Object.entries(map).map(([strategy, d]) => ({ strategy, pnl: d.pnl, count: d.count, winRate: Math.round((d.wins / d.count) * 100) })).sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades, stratDir]);

  // ── SYMBOL PERFORMANCE (filtered by direction) ──
  const symbolStats = useMemo(() => {
    const src = applyFilters(filteredTrades, "all", symbolDir);
    const map: Record<string, { pnl: number; count: number; wins: number }> = {};
    src.forEach((t) => {
      const clean = t.symbol.split("-")[0].trim();
      if (!map[clean]) map[clean] = { pnl: 0, count: 0, wins: 0 };
      map[clean].pnl += t.pnl; map[clean].count += 1; if (t.pnl > 0) map[clean].wins += 1;
    });
    return Object.entries(map).map(([symbol, d]) => ({ symbol, pnl: d.pnl, count: d.count, winRate: Math.round((d.wins / d.count) * 100) })).sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades, symbolDir]);

  // ── LONG vs SHORT ──
  const longShortStats = useMemo(() => {
    const long = filteredTrades.filter((t) => t.type === "long");
    const short = filteredTrades.filter((t) => t.type === "short");
    const calc = (arr: Trade[]) => ({
      count: arr.length, pnl: arr.reduce((s, t) => s + t.pnl, 0),
      winRate: arr.length ? Math.round((arr.filter((t) => t.pnl > 0).length / arr.length) * 100) : 0,
      avgPnl: arr.length ? arr.reduce((s, t) => s + t.pnl, 0) / arr.length : 0,
    });
    return { long: calc(long), short: calc(short) };
  }, [filteredTrades]);

  // ── MONTHLY PNL (filtered) ──
  const monthlyPnl = useMemo(() => {
    const src = applyFilters(filteredTrades, monthlySymbol, monthlyDir);
    const map: Record<string, number> = {};
    src.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + t.pnl;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([month, pnl]) => {
      const [y, m] = month.split("-");
      return { month: new Date(+y, +m - 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }), pnl };
    });
  }, [filteredTrades, monthlySymbol, monthlyDir]);

  // ── WIN/LOSS STREAKS ──
  const streaks = useMemo(() => {
    let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0;
    filteredTrades.forEach((t) => {
      if (t.pnl > 0) { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin); }
      else if (t.pnl < 0) { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss); }
      else { curWin = 0; curLoss = 0; }
    });
    let currentStreak = 0, currentType = "";
    for (let i = filteredTrades.length - 1; i >= 0; i--) {
      const type = filteredTrades[i].pnl > 0 ? "win" : filteredTrades[i].pnl < 0 ? "loss" : "even";
      if (currentType === "") currentType = type;
      if (type === currentType) currentStreak++; else break;
    }
    return { maxWin, maxLoss, currentStreak, currentType };
  }, [filteredTrades]);

  const winLossData = [
    { name: "Wins", value: performance.wins, color: "#10b981" },
    { name: "Losses", value: performance.losses, color: "#f43f5e" },
  ];

  // ── DRAWDOWN (filtered) ──
  const drawdownData = useMemo(() => {
    const src = applyFilters(filteredTrades, ddSymbol, "all");
    let peak = 0, running = 0;
    return src.map((t) => {
      running += t.pnl;
      if (running > peak) peak = running;
      const drawdown = peak > 0 ? ((running - peak) / peak) * 100 : 0;
      return { date: new Date(t.date).toLocaleDateString(), drawdown, drawdownAmount: peak - running, equity: running };
    });
  }, [filteredTrades, ddSymbol]);

  const maxDrawdown = useMemo(() => drawdownData.length ? Math.min(...drawdownData.map((d) => d.drawdown)) : 0, [drawdownData]);
  const maxDrawdownAmount = useMemo(() => drawdownData.length ? Math.max(...drawdownData.map((d) => d.drawdownAmount)) : 0, [drawdownData]);

  // ── RISK METRICS (filtered) ──
  const riskMetrics = useMemo(() => {
    const src = applyFilters(filteredTrades, "all", psDir);
    const positionSizes = src.map((t) => t.quantity * t.entryPrice);
    const avgPositionSize = positionSizes.length ? positionSizes.reduce((s, v) => s + v, 0) / positionSizes.length : 0;
    const largestWin = src.length ? Math.max(...src.map((t) => t.pnl)) : 0;
    const largestLoss = src.length ? Math.min(...src.map((t) => t.pnl)) : 0;
    const riskPerTrade = src.filter((t) => t.stopLoss && t.entryPrice).map((t) => ({
      date: new Date(t.date).toLocaleDateString(),
      risk: Math.abs(t.entryPrice - (t.stopLoss || t.entryPrice)) * t.quantity,
      actual: t.pnl,
    }));
    const positionSizeOverTime = src.map((t) => ({ date: new Date(t.date).toLocaleDateString(), size: t.quantity * t.entryPrice }));
    return { avgPositionSize, largestWin, largestLoss, riskPerTrade, positionSizeOverTime };
  }, [filteredTrades, psDir]);

  // ── EMOTIONAL STATE STATS (filtered) ──
  const emotionStats = useMemo(() => {
    const src = applyFilters(filteredTrades, "all", emotionDir);
    const map: Record<string, number> = {};
    const pnlMap: Record<string, number> = {};
    src.forEach((t) => {
      const state = t.emotionalState || "Unknown";
      if (!map[state]) { map[state] = 0; pnlMap[state] = 0; }
      map[state] += 1; pnlMap[state] += t.pnl;
    });
    return Object.entries(map).map(([state, count]) => ({
      state, count, percentage: Math.round((count / (src.length || 1)) * 100), avgPnl: pnlMap[state] / count,
    })).sort((a, b) => b.count - a.count);
  }, [filteredTrades, emotionDir]);

  // ── MISTAKES ──
  const mistakeCount = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTrades.forEach((t) => { t.mistakes?.forEach((m) => { map[m] = (map[m] || 0) + 1; }); });
    return Object.entries(map).filter(([k]) => k !== "No Mistakes").map(([mistake, count]) => ({ mistake, count })).sort((a, b) => b.count - a.count);
  }, [filteredTrades]);

  // ── CONFIDENCE vs P&L (filtered) ──
  const confidenceVsPnl = useMemo(() => {
    const src = applyFilters(filteredTrades, confSymbol, confDir);
    return src.filter((t) => t.entryConfidence !== undefined).map((t) => ({ confidence: t.entryConfidence, pnl: t.pnl, symbol: t.symbol }));
  }, [filteredTrades, confSymbol, confDir]);

  // ── SATISFACTION vs P&L (filtered) ──
  const satisfactionVsPnl = useMemo(() => {
    const src = applyFilters(filteredTrades, "all", satDir);
    return src.filter((t) => t.satisfaction !== undefined).map((t) => ({ satisfaction: t.satisfaction, pnl: t.pnl, symbol: t.symbol }));
  }, [filteredTrades, satDir]);

  // ── DAY-OF-WEEK (filtered) ──
  const dayOfWeekStats = useMemo(() => {
    const src = applyFilters(filteredTrades, "all", dowDir);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const map: Record<string, { pnl: number; count: number; wins: number }> = {};
    days.forEach((d) => (map[d] = { pnl: 0, count: 0, wins: 0 }));
    src.forEach((t) => {
      const day = days[new Date(t.date).getDay()];
      map[day].pnl += t.pnl; map[day].count += 1; if (t.pnl > 0) map[day].wins += 1;
    });
    return days.filter((d) => map[d].count > 0).map((day) => ({
      day: day.substring(0, 3), pnl: map[day].pnl, count: map[day].count,
      winRate: Math.round((map[day].wins / map[day].count) * 100), avgPnl: map[day].pnl / map[day].count,
    }));
  }, [filteredTrades, dowDir]);

  // ── TIME-OF-DAY (filtered) ──
  const timeOfDayStats = useMemo(() => {
    const src = applyFilters(filteredTrades, "all", todDir);
    const map: Record<string, { pnl: number; count: number; wins: number }> = {};
    src.forEach((t) => {
      if (!t.entryTime) return;
      const hour = t.entryTime.split(":")[0];
      const label = `${hour}:00`;
      if (!map[label]) map[label] = { pnl: 0, count: 0, wins: 0 };
      map[label].pnl += t.pnl; map[label].count += 1; if (t.pnl > 0) map[label].wins += 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([hour, d]) => ({
      hour, pnl: d.pnl, count: d.count, winRate: Math.round((d.wins / d.count) * 100), avgPnl: d.pnl / d.count,
    }));
  }, [filteredTrades, todDir]);

  const journalEntries = [...filteredTrades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const tabs = [
    { id: "performance" as Tab, label: "Performance", icon: BarChart2 },
    { id: "psychology" as Tab, label: "Psychology", icon: Brain },
    { id: "risk" as Tab, label: "Risk", icon: Shield },
    { id: "journal" as Tab, label: "Journal", icon: FileText },
  ];

  const rangeLabel = range === "7" ? "7 Days" : range === "30" ? "30 Days" : range === "90" ? "90 Days" : range === "all" ? "All Time" : "This Year";

  return (
    <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-foreground">Analytics & Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">{filteredTrades.length} trades in the last {rangeLabel.toLowerCase()}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                <tab.icon className="size-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl">{rangeLabel} <ChevronDown className="ml-2 h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRange("7")}>Last 7 Days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRange("30")}>Last 30 Days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRange("90")}>Last 90 Days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRange("365")}>This Year</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRange("all")}>All Time</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          PERFORMANCE TAB
      ═══════════════════════════════════════ */}
      {activeTab === "performance" && (
        <div className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total P&L" value={`₹${performance.totalPnl.toLocaleString("en-IN")}`} sub={`${filteredTrades.length} trades`} icon={performance.totalPnl >= 0 ? TrendingUp : TrendingDown} color={performance.totalPnl >= 0 ? "text-emerald-500" : "text-rose-500"} />
            <StatCard label="Win Rate" value={`${performance.winRate}%`} sub={`${performance.wins}W / ${performance.losses}L`} icon={Trophy} color="text-foreground" />
            <StatCard label="Profit Factor" value={performance.profitFactor.toFixed(2)} sub={`Avg Win ₹${Math.round(performance.avgWin).toLocaleString()}`} icon={Target} color="text-foreground" />
            <StatCard label="Expectancy" value={`₹${Math.round(performance.expectancy).toLocaleString()}`} sub="Per trade" icon={Zap} color={performance.expectancy >= 0 ? "text-emerald-500" : "text-rose-500"} />
          </div>

          {/* Streak Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 glass-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Best Day</p>
              <p className="text-xl font-bold text-emerald-500 mt-1">+₹{performance.bestDay.toLocaleString("en-IN")}</p>
            </Card>
            <Card className="p-4 glass-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Worst Day</p>
              <p className="text-xl font-bold text-rose-500 mt-1">₹{performance.worstDay.toLocaleString("en-IN")}</p>
            </Card>
            <Card className="p-4 glass-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Max Win Streak</p>
              <p className="text-xl font-bold text-emerald-500 mt-1">{streaks.maxWin} trades</p>
            </Card>
            <Card className="p-4 glass-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Max Loss Streak</p>
              <p className="text-xl font-bold text-rose-500 mt-1">{streaks.maxLoss} trades</p>
            </Card>
          </div>

          {/* Equity Curve + Daily P&L */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard
              title="Equity Curve (Cumulative P&L)"
              filters={<>
                <ChartFilter label="Symbol" options={symbolOptions} value={eqSymbol} onChange={setEqSymbol} />
                <ChartFilter label="Direction" options={dirOptions} value={eqDir} onChange={setEqDir} />
              </>}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeData}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="pnl" stroke="#10b981" fill="url(#eqGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Daily P&L"
              filters={<>
                <ChartFilter label="Symbol" options={symbolOptions} value={dailySymbol} onChange={setDailySymbol} />
                <ChartFilter label="Direction" options={dirOptions} value={dailyDir} onChange={setDailyDir} />
              </>}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnlData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {dailyPnlData.map((entry, i) => (
                      <Cell key={i} fill={entry.pnl >= 0 ? "#10b981" : "#f43f5e"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Monthly P&L + Win/Loss Pie + Long vs Short */}
          <div className="grid lg:grid-cols-3 gap-6">
            <ChartCard
              title="Monthly P&L"
              height="h-[280px]"
              filters={<>
                <ChartFilter label="Symbol" options={symbolOptions} value={monthlySymbol} onChange={setMonthlySymbol} />
                <ChartFilter label="Direction" options={dirOptions} value={monthlyDir} onChange={setMonthlyDir} />
              </>}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyPnl}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {monthlyPnl.map((entry, i) => (
                      <Cell key={i} fill={entry.pnl >= 0 ? "#10b981" : "#f43f5e"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Win / Loss Ratio" height="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RePie>
                  <Pie data={winLossData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} strokeWidth={0}>
                    {winLossData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </RePie>
              </ResponsiveContainer>
            </ChartCard>

            {/* Long vs Short */}
            <Card className="p-5 glass-card flex flex-col justify-center">
              <h3 className="font-semibold text-foreground mb-4">Long vs Short</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-indigo-500">Long</span>
                    <span className="text-muted-foreground">{longShortStats.long.count} trades</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className={cn("font-semibold", longShortStats.long.pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>{longShortStats.long.pnl >= 0 ? "+" : ""}₹{longShortStats.long.pnl.toLocaleString("en-IN")}</span>
                    <span className="text-muted-foreground">WR: {longShortStats.long.winRate}%</span>
                    <span className="text-muted-foreground">Avg: ₹{Math.round(longShortStats.long.avgPnl).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-2 bg-secondary/50 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${longShortStats.long.winRate}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-orange-500">Short</span>
                    <span className="text-muted-foreground">{longShortStats.short.count} trades</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className={cn("font-semibold", longShortStats.short.pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>{longShortStats.short.pnl >= 0 ? "+" : ""}₹{longShortStats.short.pnl.toLocaleString("en-IN")}</span>
                    <span className="text-muted-foreground">WR: {longShortStats.short.winRate}%</span>
                    <span className="text-muted-foreground">Avg: ₹{Math.round(longShortStats.short.avgPnl).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-2 bg-secondary/50 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${longShortStats.short.winRate}%` }} />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Symbol + Strategy Performance */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard
              title="Symbol Performance"
              filters={<ChartFilter label="Direction" options={dirOptions} value={symbolDir} onChange={setSymbolDir} />}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={symbolStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="symbol" type="category" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                    {symbolStats.map((entry, i) => (<Cell key={i} fill={entry.pnl >= 0 ? "#10b981" : "#f43f5e"} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Strategy Performance"
              filters={<ChartFilter label="Direction" options={dirOptions} value={stratDir} onChange={setStratDir} />}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={strategyStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="strategy" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                    {strategyStats.map((entry, i) => (<Cell key={i} fill={entry.pnl >= 0 ? "#8b5cf6" : "#f43f5e"} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          PSYCHOLOGY TAB
      ═══════════════════════════════════════ */}
      {activeTab === "psychology" && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard
              title="Emotional State Distribution"
              filters={<ChartFilter label="Direction" options={dirOptions} value={emotionDir} onChange={setEmotionDir} />}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={emotionStats}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="state" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip cursor={{ fill: "transparent" }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Average P&L by Emotion"
              filters={<ChartFilter label="Direction" options={dirOptions} value={emotionDir} onChange={setEmotionDir} />}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={emotionStats}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="state" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgPnl" radius={[4, 4, 0, 0]}>
                    {emotionStats.map((entry, i) => (<Cell key={i} fill={entry.avgPnl >= 0 ? "#10b981" : "#f43f5e"} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Confidence + Satisfaction scatter */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard
              title="Confidence vs P&L"
              filters={<>
                <ChartFilter label="Symbol" options={symbolOptions} value={confSymbol} onChange={setConfSymbol} />
                <ChartFilter label="Direction" options={dirOptions} value={confDir} onChange={setConfDir} />
              </>}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="confidence" name="Confidence" type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="pnl" name="P&L" tickFormatter={(v) => `₹${v}`} />
                  <ZAxis range={[40, 200]} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value: number, name: string) => [name === "P&L" ? `₹${value.toLocaleString()}` : value, name]} />
                  <Scatter data={confidenceVsPnl} fill="#8b5cf6" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Satisfaction vs P&L"
              filters={<ChartFilter label="Direction" options={dirOptions} value={satDir} onChange={setSatDir} />}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="satisfaction" name="Satisfaction" type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="pnl" name="P&L" tickFormatter={(v) => `₹${v}`} />
                  <ZAxis range={[40, 200]} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value: number, name: string) => [name === "P&L" ? `₹${value.toLocaleString()}` : value, name]} />
                  <Scatter data={satisfactionVsPnl} fill="#f59e0b" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Day-of-Week + Time-of-Day */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard
              title="Day-of-Week Performance"
              height="h-[280px]"
              filters={<ChartFilter label="Direction" options={dirOptions} value={dowDir} onChange={setDowDir} />}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekStats}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {dayOfWeekStats.map((entry, i) => (<Cell key={i} fill={entry.pnl >= 0 ? "#10b981" : "#f43f5e"} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {timeOfDayStats.length > 0 ? (
              <ChartCard
                title="Time-of-Day Performance"
                height="h-[280px]"
                filters={<ChartFilter label="Direction" options={dirOptions} value={todDir} onChange={setTodDir} />}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeOfDayStats}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `₹${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                      {timeOfDayStats.map((entry, i) => (<Cell key={i} fill={entry.pnl >= 0 ? "#10b981" : "#f43f5e"} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            ) : (
              <Card className="p-5 glass-card flex flex-col items-center justify-center text-muted-foreground">
                <Clock className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">No Time Data</p>
                <p className="text-sm mt-1">Add entry/exit times to your trades to see hourly analysis.</p>
              </Card>
            )}
          </div>

          {/* Mistakes */}
          <Card className="p-5 glass-card">
            <h3 className="font-semibold text-foreground mb-4">Common Mistakes Impact</h3>
            {mistakeCount.length > 0 ? (
              <div className="space-y-3">
                {mistakeCount.map((m) => (
                  <div key={m.mistake} className="flex items-center gap-4">
                    <span className="w-40 text-sm text-foreground truncate">{m.mistake}</span>
                    <div className="flex-1 bg-secondary/30 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${(m.count / filteredTrades.length) * 100}%` }} />
                    </div>
                    <span className="text-sm font-semibold w-12 text-right text-foreground">{m.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No mistakes recorded — great discipline! 🎯</p>
            )}
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════
          RISK TAB
      ═══════════════════════════════════════ */}
      {activeTab === "risk" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 glass-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Max Drawdown</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-rose-500 mt-1">{maxDrawdown.toFixed(1)}%</p>
                <p className="text-sm font-medium text-rose-400">(-₹{maxDrawdownAmount.toLocaleString("en-IN")})</p>
              </div>
              <p className="text-xs text-muted-foreground">From peak equity</p>
            </Card>
            <Card className="p-4 glass-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Position Size</p>
              <p className="text-2xl font-bold text-foreground mt-1">₹{Math.round(riskMetrics.avgPositionSize).toLocaleString("en-IN")}</p>
            </Card>
            <Card className="p-4 glass-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Largest Win</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">+₹{riskMetrics.largestWin.toLocaleString("en-IN")}</p>
            </Card>
            <Card className="p-4 glass-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Largest Loss</p>
              <p className="text-2xl font-bold text-rose-500 mt-1">₹{riskMetrics.largestLoss.toLocaleString("en-IN")}</p>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard
              title="Drawdown from Peak"
              filters={<ChartFilter label="Symbol" options={symbolOptions} value={ddSymbol} onChange={setDdSymbol} />}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={drawdownData}>
                  <defs>
                    <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-sm">
                        <p className="text-muted-foreground text-xs mb-1">{label}</p>
                        <p className="font-semibold text-rose-500">Drawdown: {data.drawdown.toFixed(2)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Amount: -₹{Math.round(data.drawdownAmount || 0).toLocaleString("en-IN")}</p>
                        <p className="text-xs text-muted-foreground">Equity: ₹{Math.round(data.equity).toLocaleString("en-IN")}</p>
                      </div>
                    )
                  }} />
                  <Area type="monotone" dataKey="drawdown" stroke="#f43f5e" fill="url(#ddGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Position Size Over Time"
              filters={<ChartFilter label="Direction" options={dirOptions} value={psDir} onChange={setPsDir} />}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskMetrics.positionSizeOverTime}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Position Size"]} />
                  <Line type="monotone" dataKey="size" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {riskMetrics.riskPerTrade.length > 0 && (
            <ChartCard title="Planned Risk vs Actual P&L per Trade">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskMetrics.riskPerTrade}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="risk" name="Planned Risk" fill="#6366f1" opacity={0.4} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual P&L" radius={[4, 4, 0, 0]}>
                    {riskMetrics.riskPerTrade.map((entry, i) => (<Cell key={i} fill={entry.actual >= 0 ? "#10b981" : "#f43f5e"} />))}
                  </Bar>
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════
          JOURNAL TAB
      ═══════════════════════════════════════ */}
      {activeTab === "journal" && (
        <Card className="glass-card overflow-hidden">
          <div className="bg-muted/30 px-6 py-3 border-b border-border flex font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
            <div className="w-28">Date</div>
            <div className="w-24">Symbol</div>
            <div className="w-24 text-right">P&L</div>
            <div className="flex-1 px-4">Notes</div>
            <div className="w-28">Emotion</div>
          </div>
          <div className="divide-y divide-border/50 max-h-[600px] overflow-auto">
            {journalEntries.map((entry, i) => (
              <div key={i} className="px-6 py-4 flex items-start text-sm hover:bg-muted/20 transition-colors">
                <div className="w-28 text-muted-foreground text-xs">{new Date(entry.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                <div className="w-24 font-semibold text-foreground">{entry.symbol}</div>
                <div className={cn("w-24 text-right font-semibold", entry.pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {entry.pnl >= 0 ? "+" : ""}₹{entry.pnl.toLocaleString("en-IN")}
                </div>
                <div className="flex-1 px-4 text-muted-foreground text-xs line-clamp-2">{entry.notes || "—"}</div>
                <div className="w-28">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[11px] font-medium">{entry.emotionalState || "Neutral"}</span>
                </div>
              </div>
            ))}
            {journalEntries.length === 0 && (
              <div className="flex items-center justify-center py-16 text-muted-foreground"><p>No journal entries in this period.</p></div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
