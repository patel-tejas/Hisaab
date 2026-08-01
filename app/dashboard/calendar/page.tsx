"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TradeSummaryModal } from "@/components/trade-summary-modal";
import { Trade } from "@/lib/types";

// Types
interface DayData {
  pnl: number;
  trades: number;
  items: any[];
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trades, setTrades] = useState<any[]>([]);
  const [selectedTrades, setSelectedTrades] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [viewTrade, setViewTrade] = useState<Trade | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // FETCH REAL TRADES
  useEffect(() => {
    fetch("/api/trades")
      .then((res) => res.json())
      .then(setTrades);
  }, []);

  // === MONTHLY STATS ===
  const monthlyStats = useMemo(() => {
    const monthTrades = trades.filter((t) => {
      const tradeDate = new Date(t.date);
      return (
        tradeDate.getMonth() === currentDate.getMonth() &&
        tradeDate.getFullYear() === currentDate.getFullYear()
      );
    });

    const totalPnl = monthTrades.reduce((sum, t) => sum + t.pnl, 0);
    const wins = monthTrades.filter((t) => t.pnl > 0).length;

    const winRate =
      monthTrades.length > 0
        ? Math.round((wins / monthTrades.length) * 100)
        : 0;

    return {
      totalPnl,
      winRate,
      totalTrades: monthTrades.length,
      avgRR: "1:2.4", // Simplified placeholder
    };
  }, [currentDate, trades]);

  // === DAY WISE DATA (CALENDAR) ===
  const calendarData = useMemo(() => {
    const data: Record<string, DayData> = {};

    trades.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      if (!data[key]) {
        data[key] = { pnl: 0, trades: 0, items: [] };
      }

      data[key].pnl += t.pnl;
      data[key].trades += 1;
      data[key].items.push(t);
    });

    return data;
  }, [trades]);

  // === WEEKLY SUMMARY (Current Month Only) ===
  const weeklySummary = useMemo(() => {
    // 1. Generate weekly buckets for the current month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    const weeks: { start: number; end: number; label: string; pnl: number; trades: number; wins: number }[] = [];

    // Create chunks: 1-7, 8-14, 15-21, 22-end
    let startDay = 1;
    while (startDay <= lastDay) {
      let endDay = startDay + 6;
      if (endDay > lastDay) endDay = lastDay;

      const monthShort = currentDate.toLocaleString('default', { month: 'short' });
      const label = `${monthShort} ${startDay} - ${monthShort} ${endDay}`;

      weeks.push({ start: startDay, end: endDay, label, pnl: 0, trades: 0, wins: 0 });
      startDay += 7;
    }

    // 2. Fill buckets with trade data
    trades.forEach((t) => {
      const d = new Date(t.date);
      // Filter: Must be in selected month/year
      if (d.getMonth() !== month || d.getFullYear() !== year) return;

      const day = d.getDate();
      const week = weeks.find(w => day >= w.start && day <= w.end);

      if (week) {
        week.pnl += t.pnl;
        week.trades += 1;
        if (t.pnl > 0) week.wins += 1;
      }
    });

    return weeks;
  }, [trades, currentDate]);

  // === MONTHLY HIGHLIGHTS: HEATMAP, STREAKS, INSIGHTS ===
  const monthlyHighlights = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Filter trades for current month
    const monthTrades = trades.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    // 1. Heatmap Max PnL — use same key format as calendarData
    let maxDailyPnl = 0;
    const dailyPnls: Record<string, number> = {};

    monthTrades.forEach((t) => {
      const d = new Date(t.date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dailyPnls[dateKey] = (dailyPnls[dateKey] || 0) + t.pnl;
    });

    Object.values(dailyPnls).forEach((pnl) => {
      if (Math.abs(pnl) > maxDailyPnl) maxDailyPnl = Math.abs(pnl);
    });

    // 2. Streaks (Consecutive profitable CALENDAR days, not just trading days)
    const lastDay = new Date(year, month + 1, 0).getDate();
    const streakDates = new Set<string>();
    let currentStreak: string[] = [];

    for (let d = 1; d <= lastDay; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      if (dailyPnls[dateKey] && dailyPnls[dateKey] > 0) {
        currentStreak.push(dateKey);
      } else if (dailyPnls[dateKey] !== undefined) {
        // Loss day — flush streak
        if (currentStreak.length >= 3) {
          currentStreak.forEach((dk) => streakDates.add(dk));
        }
        currentStreak = [];
      }
      // Days with no trades: don't break streak, just skip
    }
    // Flush remaining streak at month end
    if (currentStreak.length >= 3) {
      currentStreak.forEach((dk) => streakDates.add(dk));
    }

    // 3. Best Day Analysis
    const dayStats: Record<number, { wins: number; total: number }> = {};
    monthTrades.forEach((t) => {
      const day = new Date(t.date).getDay();
      if (!dayStats[day]) dayStats[day] = { wins: 0, total: 0 };
      dayStats[day].total++;
      if (t.pnl > 0) dayStats[day].wins++;
    });

    let bestDay = "";
    let bestWinRate = -1;
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    Object.entries(dayStats).forEach(([day, stats]) => {
      if (stats.total < 2) return;
      const wr = (stats.wins / stats.total) * 100;
      if (wr > bestWinRate) {
        bestWinRate = wr;
        bestDay = days[Number(day)];
      }
    });

    return { maxDailyPnl, streakDates, bestDay, bestWinRate };
  }, [trades, currentDate]);

  // === CALENDAR GRID ===
  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);

    const days: (number | null)[] = [];

    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(d);

    return days;
  };

  const days = generateCalendar();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const openDateTrades = (day: number) => {
    const key = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const dayInfo = calendarData[key];

    if (dayInfo) {
      setSelectedTrades(dayInfo.items);
      setSelectedDate(key);
      setModalOpen(true);
    }
  };

  const prevMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );

  const nextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );

  const monthName = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Monthly Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="fade-in gap-1 px-5 py-5">
          <p className="text-xs text-muted-foreground">TOTAL P&L</p>
          <h2
            className={cn(
              "mt-1 text-2xl font-bold",
              monthlyStats.totalPnl >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {monthlyStats.totalPnl >= 0 ? "+" : "-"}
            ₹{Math.abs(monthlyStats.totalPnl).toLocaleString("en-IN")}
          </h2>
        </Card>

        <Card className="fade-in gap-1 px-5 py-5">
          <p className="text-xs text-muted-foreground">WIN RATE</p>
          <h2 className="mt-1 text-2xl font-bold">{monthlyStats.winRate}%</h2>
        </Card>

        <Card className="fade-in gap-1 px-5 py-5">
          <p className="text-xs text-muted-foreground">TOTAL TRADES</p>
          <h2 className="mt-1 text-2xl font-bold">{monthlyStats.totalTrades}</h2>
        </Card>

        <Card className="fade-in gap-1 px-5 py-5">
          <p className="text-xs text-muted-foreground">AVG. R:R</p>
          <h2 className="mt-1 text-2xl font-bold">{monthlyStats.avgRR}</h2>
        </Card>
      </div>

      {/* Weekly Summary */}
      <Card className="fade-in gap-4 px-6 py-6">
        <h2 className="mb-1 font-semibold">Weekly Performance</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {weeklySummary.map((week, index) => (
            <Card key={index} className="scale-in gap-1 bg-muted/50 px-4 py-4 shadow-sm">
              <h3 className="mb-1 text-sm font-medium text-muted-foreground">{week.label}</h3>

              <div className="mb-2 flex items-baseline justify-between">
                <p
                  className={cn(
                    "text-xl font-bold",
                    week.pnl >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {week.pnl >= 0 ? "+" : "-"}₹
                  {Math.abs(week.pnl).toLocaleString("en-IN")}
                </p>
                {week.trades > 0 && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
                    {Math.round((week.wins / week.trades) * 100)}% WR
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {week.trades} trades
              </p>
            </Card>
          ))}
        </div>
      </Card>

      {/* Calendar */}
      <Card className="gap-4 px-6 py-6">
        <div className="mb-4 flex justify-between">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft />
          </Button>
          <h2 className="text-lg font-semibold">{monthName}</h2>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight />
          </Button>
        </div>

        {/* Week Headers */}
        <div className="grid grid-cols-8 mb-2">
          {weekDays.map((w) => (
            <div key={w} className="text-center text-sm text-muted-foreground">
              {w}
            </div>
          ))}
          <div className="text-center text-sm text-muted-foreground font-semibold">
            Week P&L
          </div>
        </div>

        {/* Day Grid with Weekly P&L */}
        <div className="grid grid-cols-8 gap-2">
          {(() => {
            const rows: React.ReactNode[] = [];
            let weekPnl = 0;

            days.forEach((day, idx) => {
              if (day === null) {
                rows.push(<div key={`empty-${idx}`} className="aspect-square" />);
              } else {
                const key = `${currentDate.getFullYear()}-${String(
                  currentDate.getMonth() + 1
                ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                const dayInfo = calendarData[key];

                if (dayInfo) {
                  weekPnl += dayInfo.pnl;
                }

                const isStreak = monthlyHighlights.streakDates.has(key);

                rows.push(
                  <div
                    key={`day-${idx}`}
                    onClick={() => openDateTrades(day)}
                    className="relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-border/40 bg-muted/30 p-3 text-foreground/80 transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
                    style={{
                      backgroundColor: dayInfo
                        ? dayInfo.pnl >= 0
                          ? `rgba(34, 197, 94, ${0.1 + (Math.min(Math.abs(dayInfo.pnl) / (monthlyHighlights.maxDailyPnl || 1), 1) * 0.6)})`
                          : `rgba(239, 68, 68, ${0.1 + (Math.min(Math.abs(dayInfo.pnl) / (monthlyHighlights.maxDailyPnl || 1), 1) * 0.6)})`
                        : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium opacity-70">
                        {day}
                      </span>
                      {isStreak && (
                        <span className="animate-pulse text-base" title="Winning Streak! (3+ Days)">
                          🔥
                        </span>
                      )}
                    </div>

                    {dayInfo && (
                      <div className="mt-2 text-left">
                        <p
                          className={cn(
                            "truncate text-sm font-bold",
                            dayInfo.pnl >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                          )}
                        >
                          {dayInfo.pnl >= 0 ? "+" : "-"}₹
                          {Math.abs(dayInfo.pnl).toLocaleString("en-IN")}
                        </p>

                        <p className="mt-0.5 text-[10px] font-medium text-muted-foreground/80">
                          {dayInfo.trades} trades
                        </p>
                      </div>
                    )}
                  </div>
                );
              }

              // End of week row (Saturday = position 6 in the 0-indexed column) or last day
              const colInRow = (idx + 1) % 7;
              if (colInRow === 0 || idx === days.length - 1) {
                // If this is the last row and it's not complete, pad remaining day cells
                if (idx === days.length - 1 && colInRow !== 0) {
                  for (let p = colInRow; p < 7; p++) {
                    rows.push(<div key={`pad-${idx}-${p}`} className="aspect-square" />);
                  }
                }

                // Week P&L summary cell
                const thisWeekPnl = weekPnl;
                rows.push(
                  <div
                    key={`week-${idx}`}
                    className="flex aspect-square flex-col items-center justify-center rounded-xl border border-border/20 bg-muted/20 p-3"
                  >
                    {thisWeekPnl !== 0 ? (
                      <>
                        <p className={cn(
                          "text-sm font-bold",
                          thisWeekPnl >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {thisWeekPnl >= 0 ? "+" : ""}₹{Math.round(thisWeekPnl).toLocaleString("en-IN")}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">weekly</p>
                      </>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">—</p>
                    )}
                  </div>
                );

                weekPnl = 0;
              }
            });

            return rows;
          })()}
        </div>
      </Card>

      {/* MONTHLY INSIGHTS */}
      {monthlyHighlights.bestDay && (
        <Card className="p-6 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-indigo-500/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-full text-indigo-500">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Monthly Insight</h3>
              <p className="text-muted-foreground">
                You performed best on <span className="font-bold text-foreground">{monthlyHighlights.bestDay}s</span> this month,
                with a <span className="font-bold text-green-500">{monthlyHighlights.bestWinRate.toFixed(0)}% Win Rate</span>.
                {monthlyHighlights.streakDates.size > 0 && <span> You also had <strong>{monthlyHighlights.streakDates.size} days</strong> part of winning streaks! 🔥</span>}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* DATE TRADE MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {/* Header Banner */}
          {(() => {
            const dayPnl = selectedTrades.reduce((s, t) => s + (t.pnl || 0), 0);
            const wins = selectedTrades.filter(t => (t.pnl || 0) > 0).length;
            const losses = selectedTrades.length - wins;
            const displayDate = selectedDate ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
            return (
              <>
                <div className={cn(
                  "px-6 py-5 border-b",
                  dayPnl >= 0 ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
                )}>
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold">{displayDate}</DialogTitle>
                  </DialogHeader>
                  <div className="flex items-center gap-6 mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Day P&L</p>
                      <p className={cn("text-2xl font-bold", dayPnl >= 0 ? "text-green-500" : "text-red-500")}>
                        {dayPnl >= 0 ? "+" : ""}₹{dayPnl.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Trades</p>
                      <p className="text-lg font-semibold">{selectedTrades.length}</p>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">W / L</p>
                      <p className="text-lg font-semibold">
                        <span className="text-green-500">{wins}</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-red-500">{losses}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Trade Cards */}
                <div className="p-5 space-y-3 max-h-[55vh] overflow-y-auto">
                  {selectedTrades.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No trades on this date.</p>
                  ) : (
                    selectedTrades.map((trade, i) => (
                      <div
                        key={i}
                        className="group relative rounded-xl border border-border/60 p-4 cursor-pointer hover:bg-muted/40 hover:border-primary/30 transition-all"
                        onClick={() => {
                          setViewTrade(trade);
                          setDetailsOpen(true);
                        }}
                      >
                        {/* Row 1: Symbol + Direction + PnL */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base font-bold">{trade.symbol}</span>
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold",
                              (trade.type || trade.direction) === "long"
                                ? "bg-indigo-500/15 text-indigo-500"
                                : "bg-orange-500/15 text-orange-500"
                            )}>
                              {(trade.type || trade.direction) === "long" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {(trade.type || trade.direction) === "long" ? "LONG" : "SHORT"}
                            </span>
                          </div>
                          <span className={cn(
                            "text-lg font-bold",
                            (trade.pnl || 0) >= 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {(trade.pnl || 0) >= 0 ? "+" : ""}₹{(trade.pnl || 0).toLocaleString("en-IN")}
                          </span>
                        </div>

                        {/* Row 2: Details */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Entry: <span className="text-foreground font-medium">{trade.entryPrice || "—"}</span></span>
                          <span>Exit: <span className="text-foreground font-medium">{trade.exitPrice || "—"}</span></span>
                          <span>Qty: <span className="text-foreground font-medium">{trade.quantity || "—"}</span></span>
                          {trade.entryTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {trade.entryTime}{trade.exitTime ? ` – ${trade.exitTime}` : ""}
                            </span>
                          )}
                        </div>

                        {/* Row 3: Strategy + Outcome */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">Strategy: <span className="font-medium text-foreground">{trade.strategy}</span></span>
                          {trade.outcome && (
                            <span className={cn(
                              "text-[11px] font-medium px-2 py-0.5 rounded-full",
                              trade.outcome === "full-success" || trade.outcome === "success" ? "bg-green-500/15 text-green-500" :
                                trade.outcome === "mistake" ? "bg-red-500/15 text-red-500" :
                                  trade.outcome === "partial" ? "bg-blue-500/15 text-blue-500" :
                                    "bg-zinc-500/15 text-zinc-400"
                            )}>
                              {trade.outcome === "full-success" ? "Full Success" : trade.outcome.charAt(0).toUpperCase() + trade.outcome.slice(1)}
                            </span>
                          )}
                        </div>

                        {/* View Details Hint */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>


      {/* TRADE DETAILS MODAL */}
      <TradeSummaryModal
        trade={viewTrade}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
