import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rawTrades, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const trades = (rawTrades || []).map((t) => ({
      ...t,
      date: t.trade_date,
      type: t.trade_type,
      pnl: Number(t.pnl),
      pnlPercent: Number(t.pnl_percent),
      entryPrice: Number(t.entry_price),
      exitPrice: Number(t.exit_price),
      entryTime: t.entry_time,
      exitTime: t.exit_time,
      entryConfidence: Number(t.entry_confidence || 3),
      satisfaction: Number(t.satisfaction || 3),
      strategy: t.strategy,
      symbol: t.symbol,
      direction: t.trade_type === "long" ? "BUY" : "SELL",
    }));

    if (!trades.length) {
      return NextResponse.json({
        highestPnl: 0,
        totalPnl: 0,
        totalTrades: 0,
        winRate: 0,
        winCount: 0,
        lossCount: 0,
        avgRiskReward: "N/A",
        tradesThisMonth: 0,
        confidenceIndex: 50,
        cumulativePnl: [],
        topTrades: [],
        recentTrades: [],
        dailyPnl: [],
        weeklyPnl: [],
        monthlyComparison: null,
        revengeTrades: [],
        monthlyPnl: 0,
      });
    }

    // Total P&L
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

    // Highest PNL
    const highestPnl = Math.max(...trades.map((t) => t.pnl));

    // Win / Loss counts
    const winCount = trades.filter((t) => t.pnl > 0).length;
    const lossCount = trades.filter((t) => t.pnl < 0).length;
    const winRate = Math.round((winCount / trades.length) * 100);

    // Avg Risk Reward
    const wins = trades.filter((t) => t.pnl > 0);
    const lossesArr = trades.filter((t) => t.pnl < 0);
    const avgWin = wins.length > 0 ? wins.reduce((a, t) => a + t.pnl, 0) / wins.length : 0;
    const avgLoss = lossesArr.length > 0 ? Math.abs(lossesArr.reduce((a, t) => a + t.pnl, 0) / lossesArr.length) : 1;
    const avgRR = wins.length > 0 && lossesArr.length > 0
      ? `1:${(avgWin / avgLoss).toFixed(2)}`
      : "N/A";

    // Trades this month
    const now = new Date();
    const thisMonthTrades = trades.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const tradesThisMonth = thisMonthTrades.length;

    // Monthly Comparison
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthTrades = trades.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
    });
    const thisMonthPnl = thisMonthTrades.reduce((s, t) => s + t.pnl, 0);
    const lastMonthPnl = lastMonthTrades.reduce((s, t) => s + t.pnl, 0);
    const thisMonthWins = thisMonthTrades.filter((t) => t.pnl > 0).length;
    const lastMonthWins = lastMonthTrades.filter((t) => t.pnl > 0).length;
    const thisMonthWR = thisMonthTrades.length > 0 ? Math.round((thisMonthWins / thisMonthTrades.length) * 100) : 0;
    const lastMonthWR = lastMonthTrades.length > 0 ? Math.round((lastMonthWins / lastMonthTrades.length) * 100) : 0;
    const pnlChange = lastMonthPnl !== 0
      ? Math.round(((thisMonthPnl - lastMonthPnl) / Math.abs(lastMonthPnl)) * 100)
      : (thisMonthPnl > 0 ? 100 : thisMonthPnl < 0 ? -100 : 0);

    const monthlyComparison = {
      thisMonth: { pnl: Math.round(thisMonthPnl), trades: thisMonthTrades.length, winRate: thisMonthWR },
      lastMonth: { pnl: Math.round(lastMonthPnl), trades: lastMonthTrades.length, winRate: lastMonthWR },
      pnlChange,
    };

    // Revenge Trade Detection
    const sortedByDateTime = [...trades]
      .filter((t) => t.entryTime)
      .map((t) => {
        const d = new Date(t.date);
        const [h, m] = (t.entryTime || "00:00").split(":").map(Number);
        d.setHours(h, m, 0, 0);
        return { ...t, entryDateTime: d.getTime() };
      })
      .sort((a, b) => a.entryDateTime - b.entryDateTime);

    const revengeTrades: any[] = [];
    for (let i = 1; i < sortedByDateTime.length; i++) {
      const prev = sortedByDateTime[i - 1];
      const curr = sortedByDateTime[i];
      if (prev.pnl < 0) {
        const gapMin = (curr.entryDateTime - prev.entryDateTime) / 60000;
        if (gapMin <= 30 && gapMin >= 0) {
          revengeTrades.push({
            trade: { symbol: curr.symbol, date: curr.date, pnl: curr.pnl, entryTime: curr.entryTime },
            afterLoss: { symbol: prev.symbol, pnl: prev.pnl },
            gapMinutes: Math.round(gapMin),
            severity: gapMin <= 5 ? "high" : gapMin <= 15 ? "medium" : "low",
          });
        }
      }
    }

    // Confidence Index
    const avgConfidence =
      (trades.reduce((a, t) => a + (t.entryConfidence + t.satisfaction), 0) /
        (2 * trades.length)) * 10;

    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => +new Date(a.date) - +new Date(b.date));

    // Cumulative PnL chart data
    let cumulative = 0;
    const cumulativePnl = sortedTrades.map((t) => {
      cumulative += t.pnl;
      return { date: new Date(t.date).toDateString(), pnl: cumulative };
    });

    // Top Trades
    const topTrades = [...trades]
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5)
      .map((t) => ({
        symbol: t.symbol,
        pnl: t.pnl,
        pnlPercent: t.pnlPercent,
        direction: t.direction,
        date: t.date,
      }));

    // Recent Trades
    const recentTrades = [...trades]
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 5)
      .map((t) => ({
        symbol: t.symbol,
        pnl: t.pnl,
        pnlPercent: t.pnlPercent,
        direction: t.direction,
        date: t.date,
      }));

    // Daily P&L
    const dailyMap = new Map<string, number>();
    trades.forEach((t) => {
      const dateKey = new Date(t.date).toISOString().split("T")[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + t.pnl);
    });
    const dailyPnl = Array.from(dailyMap.entries())
      .map(([date, pnl]) => ({ date, pnl }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Weekly P&L
    const weeklyPnl = cumulativePnl.slice(-7).map((d) => d.pnl);

    // Best Day of Week
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayMap: Record<string, { pnl: number; count: number; wins: number }> = {};
    dayNames.forEach((d) => (dayMap[d] = { pnl: 0, count: 0, wins: 0 }));
    trades.forEach((t) => {
      const day = dayNames[new Date(t.date).getDay()];
      dayMap[day].pnl += t.pnl;
      dayMap[day].count += 1;
      if (t.pnl > 0) dayMap[day].wins += 1;
    });
    const dayStats = dayNames
      .filter((d) => dayMap[d].count > 0)
      .map((day) => ({
        day,
        pnl: Math.round(dayMap[day].pnl),
        count: dayMap[day].count,
        winRate: Math.round((dayMap[day].wins / dayMap[day].count) * 100),
      }))
      .sort((a, b) => b.pnl - a.pnl);
    const bestDay = dayStats.length > 0 ? dayStats[0] : null;
    const worstDay = dayStats.length > 0 ? dayStats[dayStats.length - 1] : null;

    // Best Time of Day
    const hourMap: Record<string, { pnl: number; count: number; wins: number }> = {};
    trades.forEach((t) => {
      if (!t.entryTime) return;
      const hour = t.entryTime.split(":")[0];
      const label = `${hour}:00`;
      if (!hourMap[label]) hourMap[label] = { pnl: 0, count: 0, wins: 0 };
      hourMap[label].pnl += t.pnl;
      hourMap[label].count += 1;
      if (t.pnl > 0) hourMap[label].wins += 1;
    });
    const hourStats = Object.entries(hourMap)
      .map(([hour, d]) => ({
        hour,
        pnl: Math.round(d.pnl),
        count: d.count,
        winRate: Math.round((d.wins / d.count) * 100),
      }))
      .sort((a, b) => b.pnl - a.pnl);
    const bestTime = hourStats.length > 0 ? hourStats[0] : null;
    const worstTime = hourStats.length > 0 ? hourStats[hourStats.length - 1] : null;

    // Best Strategy
    const stratMap: Record<string, { pnl: number; count: number; wins: number }> = {};
    trades.forEach((t) => {
      if (!stratMap[t.strategy]) stratMap[t.strategy] = { pnl: 0, count: 0, wins: 0 };
      stratMap[t.strategy].pnl += t.pnl;
      stratMap[t.strategy].count += 1;
      if (t.pnl > 0) stratMap[t.strategy].wins += 1;
    });
    const stratStats = Object.entries(stratMap)
      .map(([strategy, d]) => ({
        strategy,
        pnl: Math.round(d.pnl),
        count: d.count,
        winRate: Math.round((d.wins / d.count) * 100),
      }))
      .sort((a, b) => b.pnl - a.pnl);
    const bestStrategy = stratStats.length > 0 ? stratStats[0] : null;

    return NextResponse.json({
      highestPnl,
      totalPnl: Math.round(totalPnl),
      totalTrades: trades.length,
      winRate,
      winCount,
      lossCount,
      avgRiskReward: avgRR,
      tradesThisMonth,
      confidenceIndex: Math.round(avgConfidence),
      cumulativePnl,
      topTrades,
      recentTrades,
      dailyPnl,
      weeklyPnl,
      insights: {
        bestDay,
        worstDay,
        bestTime,
        worstTime,
        bestStrategy,
        dayStats,
        hourStats,
      },
      monthlyComparison,
      revengeTrades: revengeTrades.slice(0, 10),
      monthlyPnl: Math.round(thisMonthPnl),
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Server error", details: error.message }, { status: 500 });
  }
}
