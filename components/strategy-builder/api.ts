/**
 * Browser-side calls for the strategy builder. Every one goes through an
 * auth-gated Hisaab route; the browser never talks to the engine.
 */

import type { SpecAnalysis, SpecIssue, StrategySpec } from "@/lib/eve/spec";
import type { BacktestMetrics } from "@/lib/eve/strategy";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues?: SpecIssue[],
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const issues = Array.isArray(body?.issues)
      ? (body.issues as { path: string; message: string }[]).map((i) => ({
          path: i.path,
          message: i.message,
          severity: "error" as const,
          kind: "engine",
        }))
      : undefined;
    throw new ApiError(body?.error ?? `request failed (${res.status})`, res.status, issues);
  }
  return body.result as T;
}

/** One read-only engine tool via `/api/eve/tools/[name]`. */
export function engineTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
  return request<T>(`/api/eve/tools/${name}`, { method: "POST", body: JSON.stringify(args) });
}

export function validateSpec(spec: StrategySpec) {
  return engineTool<SpecAnalysis>("validate_strategy_spec", { spec });
}

export type SignalPreview = {
  month: string;
  timeframe: string;
  bars: number;
  counts: Record<"BUY" | "SELL" | "EXIT_LONG" | "EXIT_SHORT" | "EXIT", number>;
  recent_events: { timestamp: string; signal_type: string; close: number }[];
};

export function previewSignals(spec: StrategySpec, month: string) {
  return engineTool<SignalPreview>("preview_strategy_signals", { spec, month, count: 10 });
}

// ------------------------------------------------------------------ saved

export type StrategyStatus = "draft" | "validated" | "backtested" | "paper" | "archived";

export type StrategyRow = {
  id: string;
  name: string;
  status: StrategyStatus;
  source: string | null;
  trial_count: number;
  version: number | null;
  summary: string | null;
  spec_hash: string | null;
  updated_at: string | null;
  latest_backtest:
    | (Partial<BacktestMetrics> & { month: string | null; kind: string | null; created_at: string | null })
    | null;
};

export type SpecChange = { path: string; before: unknown; after: unknown; op: "add" | "remove" | "replace" };

export type BacktestRecord = {
  id: string;
  kind: "in_sample" | "holdout" | "paper";
  params: { month?: string; timeframe?: string; slippage?: string; lots?: number; lot_size?: number } | null;
  metrics: Partial<BacktestMetrics> | null;
  verdict: Record<string, unknown> | null;
  status: string | null;
  created_at: string;
};

export type StrategyDetail = {
  strategy: {
    id: string;
    name: string;
    description: string | null;
    status: StrategyStatus;
    source: string | null;
    trial_count: number;
    paper_started_at: string | null;
    created_at: string;
    updated_at: string;
    current_version_id: string | null;
  };
  version: {
    id: string;
    version: number;
    spec: StrategySpec;
    spec_hash: string;
    summary: string;
    validation: { errors: SpecIssue[]; warnings: SpecIssue[] } | null;
    is_current: boolean;
  };
  versions: {
    id: string;
    version: number;
    spec_hash: string;
    summary: string;
    created_at: string;
    changes: SpecChange[] | null;
  }[];
  backtests: BacktestRecord[];
};

export type SaveResult =
  | { status: "saved"; strategy_id: string; version: number; strategy_status: StrategyStatus; spec_hash: string }
  | { status: "exists"; strategy_id: string; name: string | null; version: number; spec_hash: string; message: string };

export type ReviseResult =
  | { status: "revised"; strategy_id: string; version: number; trial_count: number; strategy_status: StrategyStatus; diff: { changes: SpecChange[] } }
  | { status: "unchanged"; version: number; diff: { changes: SpecChange[] } };

export type SavedBacktest = {
  month: string;
  timeframe: string;
  summary: string;
  metrics: BacktestMetrics;
  exit_reasons: Record<string, number>;
  lot_size: number;
  lots: number;
  slippage: string;
  strategy_id: string;
  version: number;
  backtest_id: string;
  trial_count: number;
  strategy_status: StrategyStatus;
};

export type VerdictLabel =
  | "too_few_trades"
  | "failed_holdout"
  | "not_significant"
  | "lags_buy_and_hold"
  | "survived_holdout";

export type Verdict = {
  label: VerdictLabel;
  headline: string;
  reasons: string[];
  trials: number;
  in_sample_trades: number;
  holdout_trades: number;
  deflated_sharpe: { deflated_sharpe: number; observed_sharpe_annualised: number; n_trials: number } | null;
  benchmark: { gross_pnl: number | null; points: number | null } | null;
  holdout_reused: boolean;
  caveat: string;
  in_sample_month: string;
  holdout_month: string;
  in_sample_metrics?: Partial<BacktestMetrics>;
};

export type Evaluation = {
  strategy_id: string;
  version: number;
  trial_count: number;
  in_sample: { month: string; metrics: BacktestMetrics };
  holdout: { month: string; metrics: BacktestMetrics };
  verdict: Verdict;
};

export type Controls = {
  engaged: boolean;
  own: { engaged: boolean; reason: string | null };
  global: { engaged: boolean; reason: string | null };
  stopped_paper_runs?: string[];
};

export type PaperStart = { strategy_id: string; status: StrategyStatus; paper_started_at: string; message: string };

export type PaperResults =
  | { status: "waiting"; bars: number; latest_data: string; paper_started_at: string; message: string }
  | { status: "updated" | "unchanged"; bars: number; until: string; paper_started_at: string; metrics: BacktestMetrics };

export const controlsApi = {
  get: () => request<Controls>("/api/eve/controls"),
  set: (engaged: boolean, reason = "") =>
    request<Controls>("/api/eve/controls", { method: "POST", body: JSON.stringify({ engaged, reason }) }),
};

export const strategiesApi = {
  list: (status = "") =>
    request<{ strategies: StrategyRow[]; count: number }>(
      `/api/eve/strategies${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    ),
  get: (id: string, version = 0) =>
    request<StrategyDetail>(`/api/eve/strategies/${id}${version ? `?version=${version}` : ""}`),
  save: (name: string, spec: StrategySpec, source: "chat" | "form") =>
    request<SaveResult>("/api/eve/strategies", { method: "POST", body: JSON.stringify({ name, spec, source }) }),
  revise: (id: string, base_version: number, spec: StrategySpec) =>
    request<ReviseResult>(`/api/eve/strategies/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ base_version, spec }),
    }),
  archive: (id: string) =>
    request<{ strategy_id: string; status: StrategyStatus }>(`/api/eve/strategies/${id}`, { method: "DELETE" }),
  evaluate: (id: string, holdout_month: string, version = 0) =>
    request<Evaluation>(`/api/eve/strategies/${id}/evaluate`, {
      method: "POST",
      body: JSON.stringify({ holdout_month, version }),
    }),
  startPaper: (id: string) =>
    request<PaperStart>(`/api/eve/strategies/${id}/paper`, { method: "POST", body: JSON.stringify({ action: "start" }) }),
  stopPaper: (id: string) =>
    request<{ status: StrategyStatus }>(`/api/eve/strategies/${id}/paper`, {
      method: "POST",
      body: JSON.stringify({ action: "stop" }),
    }),
  paperResults: (id: string) =>
    request<PaperResults>(`/api/eve/strategies/${id}/paper`, {
      method: "POST",
      body: JSON.stringify({ action: "refresh" }),
    }),
  backtest: (id: string, month: string, version = 0) =>
    request<SavedBacktest>(`/api/eve/strategies/${id}/backtests`, {
      method: "POST",
      body: JSON.stringify({ month, version }),
    }),
};

/** Months that have data, from the status route. */
export async function researchMonths(): Promise<{ months: string[]; engineOk: boolean; modelId: string; modelOk: boolean; raw: Record<string, Record<string, number>> }> {
  const res = await fetch("/api/eve/status", { cache: "no-store" });
  const body = await res.json().catch(() => null);
  const raw = (body?.months ?? {}) as Record<string, Record<string, number>>;
  return {
    months: Object.keys(raw).sort(),
    engineOk: !!body?.bridge?.ok,
    modelId: body?.model?.id ?? "",
    modelOk: !!body?.model?.ok,
    raw,
  };
}
