
"use client";

import { useEffect, useState } from "react";
import { StatsCards } from "@/components/stats-cards";
import { ConfidenceIndex } from "@/components/confidence-index";
import { CumulativePnlChart } from "@/components/cumulative-pnl-chart";
import { TopTrades } from "@/components/top-trades";
import { HeroPnl } from "@/components/hero-pnl";
import { WinLossChart } from "@/components/win-loss-chart";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { RecentActivity } from "@/components/recent-activity";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { TradingInsights } from "@/components/trading-insights";
import { MonthlyComparison } from "@/components/monthly-comparison";
import { GoalTracker } from "@/components/goal-tracker";
import { RevengeTrades } from "@/components/revenge-trades";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { MarketTicker } from "@/components/market-ticker";

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    fetch("/api/dashboard")
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/sign-in";
          return null;
        }
        if (!res.ok) throw new Error("Failed to fetch data");
        return res.json();
      })
      .then((data) => {
        if (data) setData(data);
      })
      .catch((err) => console.error(err));
  }, []);

  if (!data) return <DashboardSkeleton />;

  const today = format(new Date(), "EEEE, d MMMM yyyy");

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6">
        <MarketTicker />
      </div>

      <div className="space-y-6 pt-6">
      {/* Greeting */}
      <div>
        <h1 className="mb-2 font-display text-3xl tracking-tight text-foreground md:text-4xl">
          {greeting},{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
            {user?.name || "Pro Trader"}
          </span>
        </h1>
        <p className="text-muted-foreground">{today}</p>
      </div>

      {/* Row 1: Hero P&L + Psychology Score */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <HeroPnl
            totalPnl={data.totalPnl}
            totalTrades={data.totalTrades}
            winRate={data.winRate}
          />
        </div>
        <div>
          <ConfidenceIndex value={data.confidenceIndex} />
        </div>
      </div>

      {/* Row 2: Stats Cards with Sparklines */}
      <StatsCards
        highestPnl={data.highestPnl}
        winRate={data.winRate}
        avgRiskReward={data.avgRiskReward}
        tradesThisMonth={data.tradesThisMonth}
        sparklineData={data.weeklyPnl}
      />

      {/* Row 3: Trading Insights */}
      {data.insights && (
        <TradingInsights insights={data.insights} />
      )}

      {/* Row 4: Monthly Stats + Goal + Revenge */}
      <div className="grid gap-6 md:grid-cols-3">
        {data.monthlyComparison && (
          <MonthlyComparison comparison={data.monthlyComparison} />
        )}
        <GoalTracker currentPnl={data.monthlyPnl || 0} />
        <RevengeTrades trades={data.revengeTrades || []} totalTrades={data.totalTrades} />
      </div>

      {/* Row 5: Equity Curve + Win/Loss Donut + Calendar Heatmap */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <CumulativePnlChart data={data.cumulativePnl} />
        </div>
        <div className="md:col-span-1">
          <WinLossChart
            winCount={data.winCount}
            lossCount={data.lossCount}
            winRate={data.winRate}
          />
        </div>
        <div className="md:col-span-1">
          <CalendarHeatmap data={data.dailyPnl} />
        </div>
      </div>

      {/* Row 4: Top Trades + Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <TopTrades trades={data.topTrades} />
        <RecentActivity trades={data.recentTrades} />
      </div>
      </div>
    </div>
  );
}
