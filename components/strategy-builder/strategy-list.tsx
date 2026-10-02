"use client";

/** The user's saved strategies, newest first, with each one's latest result. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { Blocks, Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMetric } from "@/components/eve/metrics";
import { cn } from "@/lib/utils";
import { strategiesApi, type StrategyRow } from "./api";
import { StatusBadge } from "./status-badge";

const FILTERS = [
  { key: "", label: "Active" },
  { key: "paper", label: "Paper" },
  { key: "archived", label: "Archived" },
] as const;

export function StrategyList() {
  const [filter, setFilter] = useState<string>("");
  const [rows, setRows] = useState<StrategyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    setError(null);
    strategiesApi
      .list(filter)
      .then((r) => setRows(filter ? r.strategies : r.strategies.filter((s) => s.status !== "archived")))
      .catch((err: Error) => setError(err.message));
  }, [filter]);

  return (
    <div>
      <PageHeader
        icon={<Blocks />}
        eyebrow="Strategy builder"
        title="Strategies"
        description="Your own rules, built by describing them to Eve or by hand. Every change is a new version, and every backtest is kept."
        actions={
          <Button asChild className="h-32 rounded-lg px-3 text-xs gap-1.5">
            <Link href="/dashboard/strategies/new">
              <Plus className="size-3.5" /> New strategy
            </Link>
          </Button>
        }
      />

      <div className="mb-16 flex gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "interactive h-32 rounded-lg px-3 text-xs font-medium",
              filter === f.key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <Card className="panel-p text-sm">
          <p className="font-medium">Could not load your strategies</p>
          <p className="mt-1 text-muted-foreground">{error}</p>
        </Card>
      ) : rows === null ? (
        <div className="space-y-8">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="panel-p text-center">
          <p className="font-display text-2xl">No strategies yet</p>
          <p className="mx-auto mt-2 max-w-[44ch] text-sm text-muted-foreground">
            Describe one in plain English, like &ldquo;buy when RSI drops below 30 above the 200 EMA, 1% stop&rdquo;,
            and Eve turns it into rules you can test.
          </p>
          <Button asChild className="h-32 rounded-lg px-3 text-xs mt-16 gap-1.5">
            <Link href="/dashboard/strategies/new">
              <Plus className="size-3.5" /> Build your first strategy
            </Link>
          </Button>
        </Card>
      ) : (
        <ul className="space-y-8">
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                href={`/dashboard/strategies/${s.id}`}
                className="interactive block rounded-xl border border-border/60 bg-card px-20 py-16 hover:border-border"
              >
                <div className="flex flex-wrap items-center justify-between gap-12">
                  <div className="flex min-w-0 items-center gap-12">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    v{s.version ?? "?"} · {s.trial_count} trial{s.trial_count === 1 ? "" : "s"}
                    {s.updated_at ? ` · ${new Date(s.updated_at).toLocaleDateString("en-IN")}` : ""}
                  </p>
                </div>
                {s.summary && <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{s.summary}</p>}
                {s.latest_backtest && (
                  <p className="mt-8 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {s.latest_backtest.month} · net {formatMetric("net_pnl", s.latest_backtest.net_pnl ?? null)} · PF{" "}
                    {formatMetric("profit_factor", s.latest_backtest.profit_factor ?? null)} · {formatMetric("total_trades", s.latest_backtest.total_trades ?? null)} trades
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
