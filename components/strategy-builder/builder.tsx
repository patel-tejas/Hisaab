"use client";

/**
 * The strategy builder: describe a strategy to Eve or fill in the form. Both
 * edit the same spec, so you can start in chat and finish by hand.
 *
 * The right column always shows what will run: the template summary (made by
 * code from the spec), the engine's checks, a cheap signal preview, and Save.
 * A P&L only comes from a recorded backtest of a saved version, so every
 * result is tied to exact rules and counted as a trial.
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { History, Loader2, MessageSquare, Play, Save, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatPanel } from "@/components/eve/chat-panel";
import { cn } from "@/lib/utils";
import {
  checkSpec,
  describeSpec,
  hasErrors,
  parseSpec,
  starterSpec,
  type SpecAnalysis,
  type SpecIssue,
  type StrategySpec,
} from "@/lib/eve/spec";
import { takeStashedSpec } from "@/lib/eve/spec/handoff";
import type { ProposeSpecOutput } from "@/lib/eve/strategy-tools";
import {
  ApiError,
  previewSignals,
  researchMonths,
  strategiesApi,
  validateSpec,
  type SavedBacktest,
  type SignalPreview,
  type StrategyStatus,
} from "./api";
import { Choice } from "./field";
import { MetricsStrip } from "./metrics-strip";
import { IssueList } from "./spec-card";
import { SpecForm } from "./spec-form";
import { StatusBadge } from "./status-badge";

export type BuilderInitial = {
  id: string;
  version: number;
  spec: StrategySpec;
  status: StrategyStatus;
  trialCount: number;
};

const BUILDER_EXAMPLES = [
  "Buy when RSI(14) drops below 30 and price is above the 200 EMA, 1% stop, 2R target",
  "Short when price breaks below yesterday's low after 10:00, exit at 14:45",
  "Go long when MACD crosses above its signal line on 5-minute bars",
  "Buy a close above the upper Bollinger Band, trail the stop by 2 ATR",
];

const TAB = "h-full gap-1.5 rounded-lg px-3.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm";

export function StrategyBuilder({ initial }: { initial?: BuilderInitial }) {
  const search = useSearchParams();
  const [spec, setSpec] = useState<StrategySpec>(() => initial?.spec ?? starterSpec());
  const [tab, setTab] = useState<"chat" | "form">(initial ? "form" : "chat");
  const [saved, setSaved] = useState<{ id: string; version: number; json: string } | null>(
    initial ? { id: initial.id, version: initial.version, json: JSON.stringify(initial.spec) } : null,
  );
  const [status, setStatus] = useState<StrategyStatus | null>(initial?.status ?? null);
  const [trials, setTrials] = useState<number>(initial?.trialCount ?? 0);
  const [loadedHash, setLoadedHash] = useState<string | null>(null);
  const [env, setEnv] = useState<Awaited<ReturnType<typeof researchMonths>> | null>(null);
  const [month, setMonth] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<"preview" | "backtest" | null>(null);
  const [preview, setPreview] = useState<SignalPreview | null>(null);
  const [result, setResult] = useState<SavedBacktest | null>(null);

  // A spec handed over from the Agent tab's chat.
  useEffect(() => {
    if (initial || search.get("from") !== "chat") return;
    const raw = takeStashedSpec();
    if (!raw) return;
    const { spec: parsed } = parseSpec(raw);
    if (parsed) {
      setSpec(parsed);
      setTab("form");
    }
  }, [initial, search]);

  useEffect(() => {
    researchMonths()
      .then((e) => {
        setEnv(e);
        setMonth((m) => m || e.months[e.months.length - 1] || "");
      })
      .catch(() => setEnv({ months: [], engineOk: false, modelId: "", modelOk: false, raw: {} }));
  }, []);

  // ---------------------------------------------------------------- checks
  const specJson = useMemo(() => JSON.stringify(spec), [spec]);
  const localIssues = useMemo(() => checkSpec(spec), [spec]);
  const [engine, setEngine] = useState<{ json: string; analysis?: SpecAnalysis; issues?: SpecIssue[]; down?: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (hasErrors(localIssues)) return; // the local errors say it all; save the call
    timer.current = setTimeout(() => {
      validateSpec(spec)
        .then((analysis) => setEngine({ json: specJson, analysis }))
        .catch((err: unknown) => {
          if (err instanceof ApiError && err.issues) setEngine({ json: specJson, issues: err.issues });
          else setEngine({ json: specJson, down: err instanceof Error ? err.message : String(err) });
        });
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [spec, specJson, localIssues]);

  const engineCurrent = engine?.json === specJson ? engine : null;
  const issues: SpecIssue[] = hasErrors(localIssues)
    ? localIssues
    : engineCurrent?.analysis
      ? [...engineCurrent.analysis.errors, ...engineCurrent.analysis.warnings]
      : (engineCurrent?.issues ?? localIssues);
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const valid = errors.length === 0;
  const summary = valid ? (engineCurrent?.analysis?.summary ?? describeSpec(spec)) : null;
  const dirty = !saved || saved.json !== specJson;

  // ---------------------------------------------------------------- actions
  const onLoadSpec = useCallback((out: ProposeSpecOutput) => {
    const { spec: parsed } = parseSpec(out.spec);
    if (!parsed) return;
    setSpec(parsed);
    setLoadedHash(out.spec_hash);
    toast.success("Loaded into the form", { description: "Check the fields Eve marked as defaults." });
  }, []);

  async function save(): Promise<{ id: string; version: number } | null> {
    if (!spec.name.trim()) {
      toast.error("Give the strategy a name first");
      return null;
    }
    if (!dirty && saved) return saved;
    setSaving(true);
    try {
      if (!saved) {
        const source = spec.meta.source === "chat" ? "chat" : "form";
        const res = await strategiesApi.save(spec.name.trim(), spec, source);
        if (res.status === "exists") {
          toast.info(`Already saved as "${res.name ?? "a strategy"}" v${res.version}`);
        } else {
          toast.success(`Saved "${spec.name.trim()}" as version 1`);
          setStatus(res.strategy_status);
        }
        const next = { id: res.strategy_id, version: res.version, json: specJson };
        setSaved(next);
        // Point the URL at what is now a saved strategy without remounting
        // (a router navigation would drop the chat and any result on screen).
        window.history.replaceState(null, "", `/dashboard/strategies/${res.strategy_id}/edit`);
        return next;
      }
      const res = await strategiesApi.revise(saved.id, saved.version, spec);
      if (res.status === "unchanged") {
        toast.info("No rule changed, so no new version");
      } else {
        toast.success(`Saved version ${res.version}`, {
          description: `${res.diff.changes.length} change${res.diff.changes.length === 1 ? "" : "s"}. Trial ${res.trial_count}.`,
        });
        setStatus(res.strategy_status);
        setTrials(res.trial_count);
      }
      const next = { id: saved.id, version: res.version, json: specJson };
      setSaved(next);
      return next;
    } catch (err) {
      toast.error("Could not save", { description: err instanceof Error ? err.message : String(err) });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function runPreview() {
    if (!month) return;
    setRunning("preview");
    try {
      setPreview(await previewSignals(spec, month));
    } catch (err) {
      toast.error("Preview failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setRunning(null);
    }
  }

  async function saveAndBacktest() {
    if (!month) return;
    const target = await save();
    if (!target) return;
    setRunning("backtest");
    try {
      const res = await strategiesApi.backtest(target.id, month, target.version);
      setResult(res);
      setTrials(res.trial_count);
      setStatus(res.strategy_status);
    } catch (err) {
      toast.error("Backtest failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setRunning(null);
    }
  }

  const COLUMN = "h-[min(76vh,52rem)]";
  const ready = !!env?.engineOk && !!env?.modelOk;

  return (
    <div>
      <PageHeader
        eyebrow={saved ? `Strategy · version ${saved.version}` : "New strategy"}
        title={spec.name.trim() || "Untitled strategy"}
        description="Describe it to Eve or build it by hand. Both edit the same rules; Eve never writes code, the engine runs exactly what you see."
        actions={
          <>
            {status && <StatusBadge status={status} />}
            {saved && (
              <Button asChild variant="outline" className="h-32 rounded-lg px-3 text-xs gap-1.5">
                <Link href={`/dashboard/strategies/${saved.id}`}>
                  <History className="size-3.5" /> History
                </Link>
              </Button>
            )}
            <Button className="h-32 rounded-lg px-3 text-xs gap-1.5" disabled={saving || !dirty} onClick={() => void save()}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {saved ? (dirty ? "Save new version" : "Saved") : "Save"}
            </Button>
          </>
        }
      />

      <div className="grid gap-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "chat" | "form")} className="min-w-0">
          <TabsList className="mb-12 h-10 gap-1 rounded-xl border border-border/60 bg-secondary/40 p-1">
            <TabsTrigger value="chat" className={TAB}>
              <MessageSquare className="size-3.5" /> Describe it
            </TabsTrigger>
            <TabsTrigger value="form" className={TAB}>
              <SlidersHorizontal className="size-3.5" /> Edit the rules
              {errors.length > 0 && <span className="size-1.5 rounded-full bg-[var(--destructive)]" />}
            </TabsTrigger>
          </TabsList>

          {/* forceMount keeps the conversation alive while the form is open. */}
          <TabsContent value="chat" forceMount className={cn("mt-0", tab !== "chat" && "hidden")}>
            <div className={cn("bezel", COLUMN)}>
              <div className="bezel-core flex h-full flex-col overflow-hidden">
                <ChatPanel
                  mode="builder"
                  storageKey={`hisaab.eve.builder.${saved?.id ?? "new"}.v1`}
                  title="Strategy builder"
                  examples={BUILDER_EXAMPLES}
                  currentSpec={spec}
                  onLoadSpec={onLoadSpec}
                  loadedSpecHash={loadedHash}
                  loadedKey={null}
                  seedMessage={null}
                  onSeedConsumed={() => {}}
                  ready={ready}
                  status={{ months: env?.raw ?? {}, modelId: env?.modelId || "checking…", modelOk: env?.modelOk ?? false }}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="form" className="mt-0">
            <Card className="panel-p">
              <SpecForm spec={spec} issues={issues} onChange={setSpec} />
            </Card>
          </TabsContent>
        </Tabs>

        <aside className="space-y-16 lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-12 p-20">
            <p className="label-mono">What will run</p>
            {summary ? (
              <p className="text-sm leading-relaxed">{summary}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Fix the errors below to see the rules in plain English.</p>
            )}
            <CheckState valid={valid} checked={!!engineCurrent?.analysis} down={engineCurrent?.down} />
            <IssueList title="Errors" issues={errors} tone="error" onSelect={() => setTab("form")} />
            <IssueList title="Warnings" issues={warnings} tone="warning" />
          </Card>

          <Card className="space-y-12 p-20">
            <div className="flex items-center justify-between gap-12">
              <p className="label-mono">Test</p>
              {saved && <span className="text-[11px] text-muted-foreground">{trials} trial{trials === 1 ? "" : "s"} so far</span>}
            </div>
            <Choice
              ariaLabel="Month"
              value={month || "none"}
              options={env?.months.length ? env.months : ["none"]}
              labels={{ none: env ? "No data yet" : "Loading months…" }}
              onChange={(m) => {
                setMonth(m);
                setPreview(null);
              }}
            />
            <div className="grid grid-cols-2 gap-8">
              <Button
                variant="outline"
                className="h-32 gap-1.5 rounded-lg px-3 text-xs"
                disabled={!valid || !month || running !== null || !env?.engineOk}
                onClick={() => void runPreview()}
              >
                {running === "preview" ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                Signals
              </Button>
              <Button
                className="h-32 gap-1.5 rounded-lg px-3 text-xs"
                disabled={!valid || !month || running !== null || saving || !env?.engineOk}
                onClick={() => void saveAndBacktest()}
              >
                {running === "backtest" ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                {dirty ? "Save & backtest" : "Backtest"}
              </Button>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Signals shows when the rules fire, with no P&amp;L. A backtest saves this exact version first and is recorded,
              so the history shows how many tries a result took.
            </p>

            {preview && (
              <div className="space-y-1.5 rounded-lg border border-border/60 px-12 py-8 text-xs">
                <p className="text-muted-foreground">
                  {preview.month} · {preview.timeframe} · {preview.bars.toLocaleString("en-IN")} bars
                </p>
                <p className="font-mono tabular-nums">
                  {Object.entries(preview.counts)
                    .filter(([, n]) => n > 0)
                    .map(([k, n]) => `${k} ${n}`)
                    .join(" · ") || "No signals in this month"}
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-8">
                <p className="text-xs text-muted-foreground">
                  v{result.version} on {result.month}, {result.timeframe}, {result.lots} lot × {result.lot_size}, {result.slippage} slippage
                </p>
                <MetricsStrip metrics={result.metrics} />
                {Object.keys(result.exit_reasons).length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Exits:{" "}
                    {Object.entries(result.exit_reasons)
                      .map(([k, n]) => `${k} ${n}`)
                      .join(" · ")}
                  </p>
                )}
                <Link href={`/dashboard/strategies/${result.strategy_id}`} className="text-xs underline underline-offset-4">
                  See every version and backtest
                </Link>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function CheckState({ valid, checked, down }: { valid: boolean; checked: boolean; down?: string }) {
  if (!valid) return null;
  return (
    <p className="text-[11px] text-muted-foreground">
      {down
        ? `Checked locally only; the engine is unreachable (${down}).`
        : checked
          ? "Checked by the engine."
          : "Checking with the engine…"}
    </p>
  );
}
