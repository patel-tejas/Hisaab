"use client";

/**
 * The Agent tab: what Eve is, whether it can run right now, and what it can
 * reach. Everything here comes from /api/eve/status except the defaults and
 * guardrails, which mirror lib/eve/strategy.ts and the system prompt.
 */

import { useState, type ReactNode } from "react";
import { BookOpen, CalendarDays, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";
import { humanizeTool } from "@/components/eve/tool-call";
import { DEFAULT_PARAMS, PARAM_META, SIGNAL_MODE_META, type NumericParam } from "@/lib/eve/strategy";

export type AgentStatus = {
  bridge: { url: string; ok: boolean; tools?: number; error?: string };
  model: { id: string; provider: string; ok: boolean; keyPresent: boolean; detail: string };
  months: Record<string, Record<string, number>>;
  tools?: { name: string; description: string }[];
  skills?: { name: string; description: string; category: string }[];
};

const GUARDRAILS = [
  {
    title: "AI orchestrates, Python calculates",
    body: "Eve never computes a P&L, return or ratio. Every figure comes from a tool result in the same conversation.",
  },
  {
    title: "Numbers are checked after every answer",
    body: "A grounding pass traces each figure back to a tool output and flags any that don't match.",
  },
  {
    title: "Search luck is corrected",
    body: "A parameter-search winner is reported as uncorrected. Validation adds deflated Sharpe, a bootstrap interval and PBO.",
  },
  {
    title: "Eve proposes, the engine runs",
    body: "A strategy Eve understands becomes a card you load into the studio. The backtest never passes through the model.",
  },
];

const NUMERIC: NumericParam[] = ["fast_ema", "slow_ema", "angle_threshold", "angle_lookback"];

export function AgentOverview({
  status,
  loading,
  onRefresh,
}: {
  status: AgentStatus | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const bridgeOk = status?.bridge.ok ?? false;
  const modelOk = status?.model.ok ?? false;
  const months = Object.entries(status?.months ?? {}).sort(([a], [b]) => b.localeCompare(a));
  const tools = status?.tools ?? [];
  const skills = status?.skills ?? [];

  return (
    <div className="flex flex-col gap-10">
      {/* ── health ─────────────────────────────────────── */}
      <Section
        title="Status"
        action={
          <button
            type="button"
            onClick={onRefresh}
            className="interactive flex h-32 items-center gap-1.5 rounded-lg border border-border/70 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Refresh
          </button>
        }
      >
        <div className="grid gap-16 md:grid-cols-2">
          <HealthCard
            label="Quant engine"
            pending={!status}
            ok={bridgeOk}
            value={bridgeOk ? `${status?.bridge.tools ?? tools.length} tools online` : "Offline"}
            detail={bridgeOk ? status?.bridge.url : (status?.bridge.error ?? "Checking…")}
            fix={!bridgeOk && status ? "uv run python -m mcp.quant_server.http_bridge" : undefined}
          />
          <HealthCard
            label="Model"
            pending={!status}
            ok={modelOk}
            value={status ? `${status.model.provider} · ${status.model.id}` : "Checking…"}
            detail={status?.model.detail}
            fix={!modelOk && status ? "Set GROQ_API_KEY and EVE_MODEL in .env, then restart" : undefined}
          />
        </div>
      </Section>

      {/* ── data ───────────────────────────────────────── */}
      <Section title="Research data" icon={<CalendarDays />} meta={months.length ? `${months.length} months` : undefined}>
        {months.length > 0 ? (
          <div className="panel overflow-hidden">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/40 text-left">
                  <th className="label-mono px-5 py-3 font-normal">Month</th>
                  {["1m", "5m", "15m"].map((tf) => (
                    <th key={tf} className="label-mono px-5 py-3 text-right font-normal">
                      {tf} bars
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map(([month, tfs]) => (
                  <tr key={month} className="border-b border-border/50 last:border-b-0">
                    <td className="px-5 py-3 font-mono text-foreground">{month}</td>
                    {["1m", "5m", "15m"].map((tf) => (
                      <td key={tf} className="px-5 py-3 text-right text-muted-foreground">
                        {tfs[tf]?.toLocaleString("en-IN") ?? "–"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{bridgeOk ? "No processed months found." : "Start the quant engine to list processed months."}</Empty>
        )}
      </Section>

      {/* ── defaults ───────────────────────────────────── */}
      <Section title="Strategy defaults" icon={<SlidersHorizontal />} meta={SIGNAL_MODE_META[DEFAULT_PARAMS.signal_mode].label}>
        <div className="grid grid-cols-2 gap-16 md:grid-cols-4">
          {NUMERIC.map((key) => (
            <div key={key} className="panel p-5" title={PARAM_META[key].hint}>
              <p className="label-mono">{PARAM_META[key].label}</p>
              <p className="numeric mt-2 text-xl text-foreground">
                {DEFAULT_PARAMS[key]}
                {PARAM_META[key].unit && (
                  <span className="ml-1 text-xs text-muted-foreground">{PARAM_META[key].unit}</span>
                )}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── tools ──────────────────────────────────────── */}
      <Section title="Tools" icon={<Wrench />} meta={tools.length ? `${tools.length} available` : undefined}>
        {tools.length > 0 ? (
          <FilterList
            items={tools.map((t) => ({ key: t.name, title: humanizeTool(t.name), mono: t.name, body: t.description }))}
            placeholder="Filter tools"
          />
        ) : (
          <Empty>{bridgeOk ? "The engine returned no tools." : "Tools appear here once the engine is running."}</Empty>
        )}
      </Section>

      {/* ── skills ─────────────────────────────────────── */}
      {skills.length > 0 && (
        <Section title="Skills" icon={<BookOpen />} meta={`${skills.length} loaded on demand`}>
          <div className="grid gap-16 md:grid-cols-2">
            {skills.map((s) => (
              <div key={s.name} className="panel p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{humanizeTool(s.name.replace(/-/g, "_"))}</p>
                  <span className="label-mono">{s.category}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── guardrails ─────────────────────────────────── */}
      <Section title="Guardrails" icon={<ShieldCheck />}>
        <div className="grid gap-16 md:grid-cols-2">
          {GUARDRAILS.map((g) => (
            <div key={g.title} className="panel p-5">
              <p className="text-sm font-medium text-foreground">{g.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.body}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  meta,
  action,
  children,
}: {
  title: string;
  icon?: ReactNode;
  meta?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-16">
      <div className="flex min-h-32 items-center gap-2">
        {icon && <span className="text-muted-foreground [&_svg]:size-16">{icon}</span>}
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {meta && <span className="label-mono ml-auto">{meta}</span>}
        {action && <span className={cn(!meta && "ml-auto")}>{action}</span>}
      </div>
      {children}
    </section>
  );
}

function HealthCard({
  label,
  ok,
  pending,
  value,
  detail,
  fix,
}: {
  label: string;
  ok: boolean;
  pending: boolean;
  value: string;
  detail?: string;
  fix?: string;
}) {
  return (
    <div className="panel flex flex-col gap-2 p-5">
      <div className="flex items-center gap-2">
        <span className="label-mono">{label}</span>
        <span
          className={cn(
            "ml-auto flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium",
            pending
              ? "bg-secondary text-muted-foreground"
              : ok
                ? "bg-[var(--success)]/10 text-[var(--success)]"
                : "bg-[var(--destructive)]/10 text-[var(--destructive)]",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              pending ? "bg-muted-foreground" : ok ? "bg-[var(--success)]" : "bg-[var(--destructive)]",
            )}
          />
          {pending ? "Checking" : ok ? "Ready" : "Needs setup"}
        </span>
      </div>
      <p className="truncate text-base text-foreground">{value}</p>
      {detail && (
        <p className="truncate text-xs text-muted-foreground" title={detail}>
          {detail}
        </p>
      )}
      {fix && (
        <pre className="panel-inset mt-1 overflow-x-auto px-3.5 py-2.5 font-mono text-xs text-foreground">{fix}</pre>
      )}
    </div>
  );
}

function FilterList({
  items,
  placeholder,
}: {
  items: { key: string; title: string; mono: string; body: string }[];
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = items.filter((i) => !q || i.mono.includes(q) || i.body.toLowerCase().includes(q));

  return (
    <div className="panel overflow-hidden">
      <label className="flex h-11 items-center gap-2.5 border-b border-border/60 px-5 text-muted-foreground">
        <Search className="size-16" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none"
        />
      </label>
      <ul>
        {visible.map((item) => (
          <li key={item.key} className="border-b border-border/50 px-5 py-16 last:border-b-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-medium text-foreground">{item.title}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{item.mono}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {item.body.split(/\n\s*\n/)[0].replace(/\s+/g, " ").trim()}
            </p>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="px-5 py-16 text-sm text-muted-foreground">No tools match &ldquo;{query}&rdquo;.</li>
        )}
      </ul>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="panel-quiet px-5 py-16 text-sm text-muted-foreground">{children}</div>;
}
