"use client";

/**
 * One saved strategy: its rules, every version with what changed, and every
 * backtest recorded against it. The trial count is shown next to every
 * result: a good number found on the fortieth try means less than on the
 * first.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Archive, Loader2, Pencil, Play } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMetric } from "@/components/eve/metrics";
import { cn } from "@/lib/utils";
import { researchMonths, strategiesApi, type SpecChange, type StrategyDetail as Detail } from "./api";
import { Choice } from "./field";
import { MetricsStrip } from "./metrics-strip";
import { IssueList } from "./spec-card";
import { StatusBadge } from "./status-badge";

function show(v: unknown): string {
  if (v === null || v === undefined) return "none";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function ChangeList({ changes }: { changes: SpecChange[] }) {
  if (!changes.length) return <p className="text-[11px] text-muted-foreground">No rule changed.</p>;
  return (
    <ul className="space-y-0.5 font-mono text-[11px]">
      {changes.slice(0, 12).map((c, i) => (
        <li key={i} className="break-all">
          <span className="text-muted-foreground">{c.path}</span>{" "}
          <span className="text-[var(--destructive)] line-through decoration-1">{c.op === "add" ? "" : show(c.before)}</span>{" "}
          <span className="text-[var(--success)]">{c.op === "remove" ? "" : show(c.after)}</span>
        </li>
      ))}
      {changes.length > 12 && <li className="text-muted-foreground">+{changes.length - 12} more</li>}
    </ul>
  );
}

export function StrategyDetail({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState<string[]>([]);
  const [month, setMonth] = useState("");
  const [busy, setBusy] = useState<"backtest" | "archive" | null>(null);

  const load = useCallback(() => {
    strategiesApi
      .get(id)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  useEffect(() => {
    load();
    researchMonths()
      .then((e) => {
        setMonths(e.months);
        setMonth((m) => m || e.months[e.months.length - 1] || "");
      })
      .catch(() => {});
  }, [load]);

  async function backtest() {
    if (!month) return;
    setBusy("backtest");
    try {
      const res = await strategiesApi.backtest(id, month);
      toast.success(`Backtested v${res.version} on ${res.month}`, { description: `Trial ${res.trial_count}` });
      load();
    } catch (err) {
      toast.error("Backtest failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  async function archive() {
    if (!window.confirm("Archive this strategy? Its versions and backtests are kept.")) return;
    setBusy("archive");
    try {
      await strategiesApi.archive(id);
      toast.success("Archived");
      router.push("/dashboard/strategies");
    } catch (err) {
      toast.error("Could not archive", { description: err instanceof Error ? err.message : String(err) });
      setBusy(null);
    }
  }

  if (error) {
    return (
      <Card className="panel-p text-sm">
        <p className="font-medium">Could not load this strategy</p>
        <p className="mt-1 text-muted-foreground">{error}</p>
        <Link href="/dashboard/strategies" className="mt-12 inline-block text-xs underline underline-offset-4">
          Back to strategies
        </Link>
      </Card>
    );
  }
  if (!data) {
    return (
      <div className="space-y-16">
        <Skeleton className="h-[6rem] rounded-xl" />
        <Skeleton className="h-[14rem] rounded-xl" />
      </div>
    );
  }

  const { strategy, version, versions, backtests } = data;
  const archived = strategy.status === "archived";

  return (
    <div>
      <PageHeader
        eyebrow={`Strategy · version ${version.version} of ${versions.length}`}
        title={strategy.name}
        description={
          <>
            {strategy.trial_count} trial{strategy.trial_count === 1 ? "" : "s"} so far (versions saved after the first, plus backtests).
            Built {strategy.source === "chat" ? "with Eve" : "by hand"}.
          </>
        }
        actions={
          <>
            <StatusBadge status={strategy.status} />
            {!archived && (
              <>
                <Button asChild variant="outline" className="h-32 rounded-lg px-3 text-xs gap-1.5">
                  <Link href={`/dashboard/strategies/${id}/edit`}>
                    <Pencil className="size-3.5" /> Edit
                  </Link>
                </Button>
                <Button variant="outline" className="h-32 rounded-lg px-3 text-xs gap-1.5" disabled={busy !== null} onClick={() => void archive()}>
                  {busy === "archive" ? <Loader2 className="size-3.5 animate-spin" /> : <Archive className="size-3.5" />}
                  Archive
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0 space-y-24">
          <Card className="space-y-12 p-20">
            <p className="label-mono">Rules · v{version.version}</p>
            <p className="text-sm leading-relaxed">{version.summary}</p>
            <IssueList title="Warnings" issues={version.validation?.warnings ?? []} tone="warning" />
            <IssueList title="Errors" issues={version.validation?.errors ?? []} tone="error" />
          </Card>

          <Card className="space-y-12 p-20">
            <p className="label-mono">Backtests on this version</p>
            {backtests.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet. Run one from the panel on the right.</p>
            ) : (
              <div className="space-y-16">
                {backtests.map((b) => (
                  <div key={b.id} className="space-y-8 border-b border-border/60 pb-16 last:border-b-0 last:pb-0">
                    <p className="text-xs text-muted-foreground">
                      {b.params?.month} · {b.params?.timeframe} · {b.kind === "in_sample" ? "in-sample" : b.kind} ·{" "}
                      {new Date(b.created_at).toLocaleString("en-IN")}
                      {typeof b.verdict?.trials === "number" ? ` · trial ${b.verdict.trials}` : ""}
                    </p>
                    {b.metrics && <MetricsStrip metrics={b.metrics} />}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-12 p-20">
            <p className="label-mono">Versions</p>
            <ol className="space-y-16">
              {[...versions].reverse().map((v) => (
                <li key={v.id} className={cn("space-y-1.5 border-l-2 pl-12", v.id === version.id ? "border-foreground" : "border-border/60")}>
                  <p className="text-xs">
                    <span className="font-medium">v{v.version}</span>{" "}
                    <span className="text-muted-foreground">{new Date(v.created_at).toLocaleString("en-IN")}</span>
                    {v.id === strategy.current_version_id && <span className="ml-1.5 text-muted-foreground">· current</span>}
                  </p>
                  {v.changes ? <ChangeList changes={v.changes} /> : <p className="text-[11px] text-muted-foreground">First version.</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="space-y-16 lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-12 p-20">
            <p className="label-mono">Backtest the current version</p>
            <Choice
              ariaLabel="Month"
              value={month || "none"}
              options={months.length ? months : ["none"]}
              labels={{ none: "No data yet" }}
              onChange={setMonth}
            />
            <Button className="h-32 w-full gap-1.5 rounded-lg px-3 text-xs" disabled={!month || busy !== null || archived} onClick={() => void backtest()}>
              {busy === "backtest" ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
              Run and record
            </Button>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Recorded against v{version.version} and counted as trial {strategy.trial_count + 1}.
              {backtests[0]?.metrics ? ` Last net ${formatMetric("net_pnl", backtests[0].metrics.net_pnl ?? null)}.` : ""}
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
