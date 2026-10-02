/**
 * Chat tools for the strategy builder (Eve Phase 15).
 *
 * `propose_strategy_spec` is how a plain-English strategy becomes a runnable
 * `eve.strategy/1` spec. The model fills in a typed form; this tool checks it
 * locally, has the engine validate it, and gives the model one automatic
 * repair round (a JSON-mode call fed the exact JSON-Pointer issues) before
 * handing back either a valid spec or the remaining problems. Nothing the
 * model writes is ever executed: the engine interprets the spec.
 *
 * `ask_clarification` renders a question with tappable options when a
 * request forks on something that changes the strategy.
 */

import { jsonSchema, tool, type ToolSet } from "ai";
import { z } from "zod";

import { chatJson } from "../ai/groq-json";
import { callTool, isToolError, type BridgeAuth } from "./bridge";
import {
  describeSpec,
  hasErrors,
  localCheck,
  strategySpecJsonSchema,
  type SpecAnalysis,
  type SpecIssue,
  type StrategySpec,
} from "./spec";

export type StrategyToolContext = {
  auth: BridgeAuth;
  /** Groq credentials for the one repair round. Absent -> no repair. */
  apiKey?: string;
  model?: string;
};

export type ProposeSpecOutput = {
  /** valid: the engine accepted it. invalid: errors remain. unchecked: engine down. */
  status: "valid" | "invalid" | "unchecked";
  spec: StrategySpec | null;
  /** Raw spec as submitted when it did not even parse, so the UI can show it. */
  submitted?: unknown;
  summary: string | null;
  errors: SpecIssue[];
  warnings: SpecIssue[];
  defaulted: string[];
  spec_hash: string | null;
  plain_english: string;
  unsupported: string[];
  /** Set when the automatic repair round changed the spec. */
  repaired?: string;
  /** Set when the engine could not be reached; the spec is only locally checked. */
  engine_error?: string;
};

type Checked = {
  ok: boolean;
  engineDown: boolean;
  analysis: SpecAnalysis | null;
  issues: SpecIssue[];
  local: StrategySpec | null;
  engineError?: string;
};

async function check(raw: unknown, ctx: StrategyToolContext): Promise<Checked> {
  const { spec: local, issues: localIssues } = localCheck(raw);
  if (!local || hasErrors(localIssues)) {
    return { ok: false, engineDown: false, analysis: null, issues: localIssues, local };
  }
  const res = await callTool("validate_strategy_spec", { spec: local }, { ...ctx.auth, surface: "chat" });
  if (isToolError(res)) {
    if (res.status && res.status < 500 && res.status !== 429) {
      // The gate rejected the shape (a field this copy of the schema allows).
      const issues: SpecIssue[] = (res.issues ?? [{ path: "/", message: res.error }]).map((i) => ({
        path: i.path,
        message: i.message,
        severity: "error",
        kind: "engine",
      }));
      return { ok: false, engineDown: false, analysis: null, issues, local };
    }
    return { ok: true, engineDown: true, analysis: null, issues: localIssues, local, engineError: res.error };
  }
  const analysis = res as SpecAnalysis;
  return {
    ok: analysis.valid,
    engineDown: false,
    analysis,
    issues: [...analysis.errors, ...analysis.warnings],
    local,
  };
}

const REPAIR_SYSTEM = `You repair trading strategy specs in the eve.strategy/1 JSON format.
You get a spec and a list of problems, each with a JSON Pointer path into the spec.
Return ONLY the corrected spec as one JSON object. Change only what the problems require;
keep every other field exactly as it was. Never add an indicator, field or value outside the
format. If a problem cannot be fixed without guessing the trader's intent, leave that part
unchanged.`;

async function repair(
  raw: unknown,
  issues: SpecIssue[],
  ctx: StrategyToolContext,
): Promise<unknown | null> {
  if (!ctx.apiKey || !ctx.model) return null;
  try {
    const { json } = await chatJson({
      apiKey: ctx.apiKey,
      model: ctx.model,
      timeoutMs: 20_000,
      temperature: 0,
      messages: [
        { role: "system", content: REPAIR_SYSTEM },
        {
          role: "user",
          content: JSON.stringify({
            spec: raw,
            problems: issues.filter((i) => i.severity === "error").map(({ path, message }) => ({ path, message })),
          }),
        },
      ],
    });
    if (!json || typeof json !== "object") return null;
    // Some models wrap the answer: {"spec": {...}}.
    const obj = json as Record<string, unknown>;
    return obj.spec && typeof obj.spec === "object" && !("entry" in obj) ? obj.spec : obj;
  } catch {
    return null;
  }
}

function changedPaths(a: unknown, b: unknown, path = ""): string[] {
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    return [...keys].flatMap((k) =>
      changedPaths((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}/${k}`),
    );
  }
  return JSON.stringify(a) === JSON.stringify(b) ? [] : [path || "/"];
}

/** The tool's input schema, with the spec's `$defs` hoisted to the root. */
function toolSchema() {
  const { $defs, ...spec } = strategySpecJsonSchema() as { $defs?: Record<string, unknown> };
  return {
    type: "object" as const,
    properties: {
      spec,
      plain_english: {
        type: "string",
        description: "One or two sentences restating the user's request in their own words.",
      },
      unsupported: {
        type: "array",
        items: { type: "string" },
        description:
          "Parts of the request this format cannot express (options, other instruments, " +
          "news, order-book data, multiple positions). Empty if it all fits.",
      },
    },
    required: ["spec", "plain_english"],
    ...($defs ? { $defs } : {}),
  };
}

function proposeStrategySpec(ctx: StrategyToolContext) {
  return tool({
    description:
      "Turn the user's described strategy into an eve.strategy/1 spec that the engine can run. " +
      "Call this whenever the user describes a trading idea, asks to build or change a strategy, " +
      "or asks what a rule would do. Use only indicators, levels and fields in the schema; put " +
      "anything the format cannot express in `unsupported`, never approximate it silently. Record " +
      "every value you chose without the user saying so (a stop, a session window, a period) as a " +
      "JSON Pointer in spec.meta.defaulted. The tool validates the spec with the engine and may fix " +
      "small errors itself. The interface shows the result as a card the user can edit, save and " +
      "backtest, so after calling it say in two or three sentences what you built, what you assumed, " +
      "and what you could not express. Do not call it again in the same turn unless it returned " +
      "errors you can fix.",
    inputSchema: jsonSchema<{ spec: unknown; plain_english: string; unsupported?: string[] }>(toolSchema()),
    execute: async (args): Promise<ProposeSpecOutput> => {
      const plain_english = String(args.plain_english ?? "");
      const unsupported = Array.isArray(args.unsupported) ? args.unsupported.map(String) : [];
      let raw: unknown = args.spec;
      // Some models send the nested object as a JSON string.
      if (typeof raw === "string") {
        try {
          raw = JSON.parse(raw);
        } catch {
          /* reported by the check below */
        }
      }
      if (raw && typeof raw === "object") {
        const meta = ((raw as Record<string, unknown>).meta ?? {}) as Record<string, unknown>;
        (raw as Record<string, unknown>).meta = { ...meta, source: "chat" };
      }

      let result = await check(raw, ctx);
      let repaired: string | undefined;
      if (!result.ok && !result.engineDown) {
        const fixed = await repair(raw, result.issues, ctx);
        if (fixed) {
          const second = await check(fixed, ctx);
          // Keep the repair only if it actually helped.
          const before = result.issues.filter((i) => i.severity === "error").length;
          const after = second.issues.filter((i) => i.severity === "error").length;
          if (second.ok || after < before) {
            const paths = changedPaths(raw, fixed).slice(0, 8);
            repaired = `Fixed automatically: ${paths.join(", ")}`;
            raw = fixed;
            result = second;
          }
        }
      }

      const errors = result.issues.filter((i) => i.severity === "error");
      const warnings = result.issues.filter((i) => i.severity === "warning");
      const spec = result.analysis?.spec ?? result.local;
      return {
        status: result.engineDown ? "unchecked" : result.ok ? "valid" : "invalid",
        spec,
        ...(spec ? {} : { submitted: raw }),
        summary: result.analysis?.summary ?? (spec && !errors.length ? describeSpec(spec) : null),
        errors,
        warnings,
        defaulted: spec?.meta.defaulted ?? [],
        spec_hash: result.analysis?.spec_hash ?? null,
        plain_english,
        unsupported,
        ...(repaired ? { repaired } : {}),
        ...(result.engineError ? { engine_error: result.engineError } : {}),
      };
    },
  });
}

export type ClarificationOutput = { question: string; options: string[]; why?: string };

const askClarification = tool({
  description:
    "Ask the user ONE question when their strategy forks on something that changes what it " +
    "does (long or short, which exit, which timeframe) and no sensible default exists. Give " +
    "2-4 short options; the interface shows them as buttons. Do not use it for details you can " +
    "default and record in meta.defaulted.",
  inputSchema: z.object({
    question: z.string().describe("The question, in the trader's words, under 20 words."),
    options: z.array(z.string()).min(2).max(4).describe("2-4 short answers, each a few words."),
    why: z.string().optional().describe("One short line on why it matters."),
  }),
  execute: async ({ question, options, why }): Promise<ClarificationOutput> => ({
    question,
    options,
    ...(why ? { why } : {}),
  }),
});

export function strategyTools(ctx: StrategyToolContext): ToolSet {
  return { propose_strategy_spec: proposeStrategySpec(ctx), ask_clarification: askClarification };
}
