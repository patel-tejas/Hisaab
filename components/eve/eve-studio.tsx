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
import { Download, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
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

  /*
   * Height is bounded, not derived from the viewport. An earlier revision used
   * `calc(100svh - 16rem)`, which — inside a shell that is already h-svh with
   * its own scroller — made the page taller than the viewport and pushed the
   * header off screen.
   */
  const COLUMN = "h-[min(68vh,42rem)]";

  return (
    <div>
      <PageHeader
        eyebrow="Strategy studio"
        title="Eve Agent"
        description="Describe a strategy in plain English. Test it on real NIFTY futures data."
        actions={
          <div className="flex flex-col items-end gap-1.5">
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
        }
      />

      {/*
        One state at a time. Previously an offline engine produced three
        competing half-empty cards — a warning banner, a disabled chat, and a
        lonely "start the engine" note — which is what made the page read as a
        prototype.
      */}
      {status && !ready ? (
        <EngineSetup
          bridgeOk={bridgeOk}
          bridgeUrl={status.bridge.url}
          modelOk={status.model.ok}
          modelDetail={status.model.detail}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div className={cn("bezel", COLUMN)}>
            <div className="bezel-core flex h-full flex-col overflow-hidden">
              <ChatPanel
                onLoadStrategy={loadStrategy}
                loadedKey={params ? JSON.stringify(params) : null}
                seedMessage={seedMessage}
                onSeedConsumed={() => setSeedMessage(null)}
                ready={ready}
              />
            </div>
          </div>

          <ScrollArea className={COLUMN}>
            <div className="space-y-4 pr-3">
              {params ? (
                <>
                  <Card className="panel-p">
                    <ParamSliders
                      params={params}
                      months={months}
                      onChange={setParams}
                      disabled={!bridgeOk}
                    />
                    <div className="mt-6 flex gap-2 border-t border-border/60 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="interactive flex-1 gap-1.5"
                        onClick={askEve}
                        disabled={!ready}
                      >
                        <MessageSquarePlus className="size-3.5" /> Ask Eve about this
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="interactive gap-1.5"
                        onClick={exportCsv}
                        disabled={exporting || !bridgeOk}
                      >
                        <Download className="size-3.5" />
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
                <Card className="panel-p">
                  <p className="label-mono">No data</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    No processed months were found. Download and process a month
                    before running a backtest.
                  </p>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

/**
 * The engine is a separate local process, so "not running" is an ordinary
 * state rather than an error. It gets a real screen: what is wrong, the exact
 * command, and nothing else competing for attention.
 */
function EngineSetup({
  bridgeOk,
  bridgeUrl,
  modelOk,
  modelDetail,
}: {
  bridgeOk: boolean;
  bridgeUrl: string;
  modelOk: boolean;
  modelDetail: string;
}) {
  return (
    <Card className="panel-p">
      <div className="mx-auto max-w-2xl py-6 md:py-10">
        <p className="label-mono">Not connected</p>
        <h2 className="mt-3 font-display text-3xl leading-[1.05] tracking-tight md:text-4xl">
          The quant engine isn&apos;t running.
        </h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Eve reads every number from a local Python engine. Start it and this
          page will connect on its own.
        </p>

        <ol className="mt-8 space-y-5">
          {!bridgeOk && (
            <SetupStep
              n={1}
              title="Start the engine"
              detail={
                <>
                  Run this in <code className="font-mono text-foreground">d:\Trading\EMA_Strategy</code>.
                  It stays in the foreground, so leave the terminal open.
                </>
              }
              command="uv run python -m mcp.quant_server.http_bridge"
              note={`Expected at ${bridgeUrl}`}
            />
          )}
          {!modelOk && (
            <SetupStep
              n={bridgeOk ? 1 : 2}
              title="Configure the model"
              detail={modelDetail}
              command="EVE_MODEL=openai/gpt-oss-120b"
              note="Set in .env, then restart the dev server."
            />
          )}
        </ol>

        <p className="mt-8 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          This page polls on load. Refresh once the engine is up.
        </p>
      </div>
    </Card>
  );
}

function SetupStep({
  n,
  title,
  detail,
  command,
  note,
}: {
  n: number;
  title: string;
  detail: React.ReactNode;
  command: string;
  note?: string;
}) {
  return (
    <li className="flex gap-4">
      <span className="label-mono mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-foreground">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>
        <pre className="panel-inset mt-3 overflow-x-auto px-3.5 py-2.5 font-mono text-xs text-foreground">
          {command}
        </pre>
        {note && <p className="mt-1.5 text-xs text-muted-foreground">{note}</p>}
      </div>
    </li>
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
    <span title={title} className="label-mono flex items-center gap-2">
      <span
        className={cn(
          "size-1.5 rounded-full",
          ok ? "bg-[var(--success)]" : "bg-[var(--destructive)]",
        )}
      />
      {label}
    </span>
  );
}
