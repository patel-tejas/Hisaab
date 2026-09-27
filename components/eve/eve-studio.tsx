"use client";

/**
 * Strategy Studio: chat on the left, the config and its results on the right.
 *
 * The two paths are deliberately separate. Eve (LLM) understands the request
 * and proposes a config; everything numeric runs through `/api/eve/tools/*`
 * with no model in the loop. So moving a slider re-backtests immediately
 * without spending an LLM turn, and 300 trade records never enter the model's
 * context.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Sparkles, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChatPanel } from "@/components/eve/chat-panel";
import { ParamSliders } from "@/components/eve/param-sliders";
import { ResultsPanel, ResultsSkeleton } from "@/components/eve/results-panel";
import {
  VerdictPanel,
  type SignificanceReport,
  type ValidationReport,
  type VerdictKind,
} from "@/components/eve/verdict-panel";
import {
  DEFAULT_PARAMS,
  describeStrategy,
  toBridgeArgs,
  type BacktestResult,
  type StrategyParams,
} from "@/lib/eve/strategy";
import type { ProposeStrategyOutput } from "@/lib/eve/tools";

type Status = {
  bridge: { url: string; ok: boolean; tools?: number; error?: string };
  model: { id: string; provider: string; ok: boolean; keyPresent: boolean; detail: string };
  months: Record<string, Record<string, number>>;
};

/** Call one read-only quant tool. Throws with the bridge's own message. */
async function callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/eve/tools/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? `${name} failed (${res.status})`);
  }
  return body.result as T;
}

export function EveStudio() {
  const [status, setStatus] = useState<Status | null>(null);
  const [params, setParams] = useState<StrategyParams | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [significance, setSignificance] = useState<SignificanceReport | null>(null);
  const [verdictLoading, setVerdictLoading] = useState<VerdictKind | null>(null);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const months = useMemo(() => Object.keys(status?.months ?? {}).sort(), [status]);
  const bridgeOk = status?.bridge.ok ?? false;
  const ready = bridgeOk && (status?.model.ok ?? false);

  useEffect(() => {
    fetch("/api/eve/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  // Seed the config from the newest available month once the status lands, so
  // nothing is hardcoded to a month that may not exist.
  useEffect(() => {
    if (params || months.length === 0) return;
    setParams({ ...DEFAULT_PARAMS, month: months[months.length - 1] });
  }, [months, params]);

  /**
   * Re-run whenever the config changes, debounced so dragging a slider issues
   * one backtest rather than forty.
   */
  const runSeq = useRef(0);
  useEffect(() => {
    if (!params || !bridgeOk) return;

    const seq = ++runSeq.current;
    const timer = setTimeout(() => {
      setRunning(true);
      callTool<BacktestResult>("run_backtest_signals", {
        ...toBridgeArgs(params),
        include_trades: true,
      })
        .then((res) => {
          // Ignore a slower in-flight run that a newer change superseded.
          if (seq === runSeq.current) setResult(res);
        })
        .catch((err: Error) => {
          if (seq === runSeq.current) {
            setResult(null);
            toast.error("Backtest failed", { description: err.message });
          }
        })
        .finally(() => {
          if (seq === runSeq.current) setRunning(false);
        });
    }, 350);

    return () => clearTimeout(timer);
  }, [params, bridgeOk]);

  // A verdict belongs to the config it was computed for. The grid verdict is
  // per month+timeframe; the significance verdict is per exact parameter set,
  // so a slider move stales it.
  useEffect(() => {
    setValidation(null);
  }, [params?.month, params?.timeframe]);

  useEffect(() => {
    setSignificance(null);
  }, [params]);

  const loadStrategy = useCallback((proposal: ProposeStrategyOutput) => {
    setParams(proposal.params);
    setValidation(null);
    setSignificance(null);
  }, []);

  const runVerdict = useCallback(
    (kind: VerdictKind) => {
      if (!params) return;
      setVerdictLoading(kind);

      // The exact config gets backtest_significance (no multiple-testing
      // correction, because nothing was searched). The grid gets
      // validate_parameter_search, which adds the corrections a searched-for
      // winner needs. Conflating them would report one as the other.
      const job =
        kind === "config"
          ? callTool<SignificanceReport>("backtest_significance", toBridgeArgs(params)).then(
              setSignificance,
            )
          : callTool<ValidationReport>("validate_parameter_search", {
              month: params.month,
              timeframe: params.timeframe,
            }).then(setValidation);

      job
        .catch((err: Error) => toast.error("Test failed", { description: err.message }))
        .finally(() => setVerdictLoading(null));
    },
    [params],
  );

  const exportCsv = useCallback(async () => {
    if (!params) return;
    setExporting(true);
    try {
      const res = await fetch(
        `/api/eve/export?month=${params.month}&timeframe=${params.timeframe}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `export failed (${res.status})`);
      }
      const rows = res.headers.get("x-row-count");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NIFTY-${params.month}-${params.timeframe}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${Number(rows).toLocaleString("en-IN")} candles`);
    } catch (err) {
      toast.error("Export failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setExporting(false);
    }
  }, [params]);

  const askEve = useCallback(() => {
    if (!params) return;
    setSeedMessage(
      `Interpret this backtest for me. Config: ${describeStrategy(params)} ` +
        `Explain in plain terms whether this looks like an edge and what I should change next.`,
    );
  }, [params]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display text-3xl leading-none tracking-tight">Eve Agent</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Describe a strategy. Test it on real NIFTY futures data.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <StatusDot
            ok={bridgeOk}
            label={bridgeOk ? `engine · ${status?.bridge.tools} tools` : "engine offline"}
            title={status?.bridge.error ?? status?.bridge.url}
          />
          <StatusDot
            ok={status?.model.ok ?? false}
            label={`${status?.model.provider ?? "groq"} · ${status?.model.id ?? "…"}`}
            title={status?.model.detail ?? "checking…"}
          />
        </div>
      </div>

      {status && !ready && (
        <Card className="border-amber-300 bg-amber-50 p-4 text-xs dark:border-amber-900/60 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-200">Setup needed</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-amber-900/90 dark:text-amber-200/90">
            {!bridgeOk && (
              <li>
                Start the quant engine:{" "}
                <code className="rounded bg-amber-100 px-1 font-mono dark:bg-amber-900/40">
                  uv run python -m mcp.quant_server.http_bridge
                </code>{" "}
                in <code className="font-mono">d:\Trading\EMA_Strategy</code>
              </li>
            )}
            {!status.model.ok && (
              <li>
                {status.model.detail} Set it in <code className="font-mono">.env</code> and
                restart the dev server.
              </li>
            )}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <Card className="flex h-[calc(100svh-15rem)] min-h-[520px] flex-col p-4">
          <ChatPanel
            onLoadStrategy={loadStrategy}
            loadedKey={params ? JSON.stringify(params) : null}
            seedMessage={seedMessage}
            onSeedConsumed={() => setSeedMessage(null)}
            ready={ready}
          />
        </Card>

        <ScrollArea className="h-[calc(100svh-15rem)] min-h-[520px]">
          <div className="space-y-4 pr-3">
            {params ? (
              <>
                <Card className="p-4">
                  <ParamSliders
                    params={params}
                    months={months}
                    onChange={setParams}
                    disabled={!bridgeOk}
                  />
                  <div className="mt-4 flex gap-2 border-t pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={askEve}
                      disabled={!ready}
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" /> Ask Eve about this
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={exportCsv}
                      disabled={exporting || !bridgeOk}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {exporting ? "Exporting…" : "CSV"}
                    </Button>
                  </div>
                </Card>

                <VerdictPanel
                  significance={significance}
                  validation={validation}
                  loading={verdictLoading}
                  onRun={runVerdict}
                  monthCount={months.length}
                />

                {running && !result ? (
                  <ResultsSkeleton />
                ) : result ? (
                  <div className={cn(running && "opacity-60 transition-opacity")}>
                    <ResultsPanel result={result} />
                  </div>
                ) : null}
              </>
            ) : (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                {bridgeOk
                  ? "No processed months found. Download and process a month first."
                  : "Start the quant engine to load the available months."}
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function StatusDot({
  ok,
  label,
  title,
}: {
  ok: boolean;
  label: string;
  title?: string;
}) {
  return (
    <span title={title} className="flex items-center gap-1.5 text-muted-foreground">
      <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-500" : "bg-red-500")} />
      {label}
    </span>
  );
}
