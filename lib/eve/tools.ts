/**
 * Hisaab-side tools, added alongside the bridge manifest.
 *
 * Neither touches the quant engine. `propose_strategy` is the structured
 * handoff from plain English to a config the UI can render and re-run;
 * `load_skill` is progressive disclosure over the skill corpus.
 */

import { tool, type ToolSet } from "ai";
import { z } from "zod";

import { getSkill, listSkills, skillSkeleton, splitSections } from "@/lib/eve/skills";
import {
  PARAM_BOUNDS,
  SIGNAL_MODES,
  SLIPPAGE_MODES,
  TIMEFRAMES,
  normalizeParams,
  type StrategyParams,
} from "@/lib/eve/strategy";

/**
 * The tools that render as UI rather than as a JSON blob. The chat panel
 * special-cases these, so keep the list here next to their definitions.
 */
export const UI_TOOLS = ["propose_strategy"] as const;

/**
 * Tools whose output must be kept out of the grounding check.
 *
 * `load_skill` returns documentation containing real figures (signal counts,
 * cost tables); feeding it to the grader as "evidence" would let an answer
 * appear grounded on numbers that came from prose rather than from a
 * computation. `propose_strategy` echoes parameters, which are inputs.
 */
export const UNGROUNDABLE_TOOLS = ["load_skill", "propose_strategy"] as const;

export function isUngroundable(name: string): boolean {
  return (UNGROUNDABLE_TOOLS as readonly string[]).includes(name);
}

const proposeStrategySchema = z
  .object({
    fast_ema: z
      .number()
      .int()
      .min(PARAM_BOUNDS.fast_ema.min)
      .max(PARAM_BOUNDS.fast_ema.max)
      .describe("Fast EMA period in bars. Must be less than slow_ema."),
    slow_ema: z
      .number()
      .int()
      .min(PARAM_BOUNDS.slow_ema.min)
      .max(PARAM_BOUNDS.slow_ema.max)
      .describe("Slow EMA period in bars."),
    angle_threshold: z
      .number()
      .min(PARAM_BOUNDS.angle_threshold.min)
      .max(PARAM_BOUNDS.angle_threshold.max)
      .describe(
        "Minimum fast-EMA angle in degrees for a signal to count. Applies to both directions.",
      ),
    angle_lookback: z
      .number()
      .int()
      .min(PARAM_BOUNDS.angle_lookback.min)
      .max(PARAM_BOUNDS.angle_lookback.max)
      .describe("Bars over which the angle is measured."),
    signal_mode: z
      .enum(SIGNAL_MODES)
      .describe(
        "crossover = variant A (no angle gate); crossover_and_angle = B (default); crossover_angle_and_trend = C (also requires close above slow EMA to buy).",
      ),
    month: z.string().regex(/^\d{4}-\d{2}$/).describe('Research month, "YYYY-MM".'),
    timeframe: z.enum(TIMEFRAMES),
    slippage: z.enum(SLIPPAGE_MODES),
    plain_english: z
      .string()
      .describe(
        "One or two sentences restating the user's own request, in their words. Not a description of the parameters — the UI generates that itself.",
      ),
    tweakable: z
      .array(z.string())
      .describe(
        "The parameter names most worth varying for this particular request, most significant first.",
      ),
    unsupported: z
      .array(z.string())
      .describe(
        "Anything the user asked for that this engine cannot test (RSI, MACD, stops, targets, position sizing, other instruments). Empty array if the request fits entirely. NEVER silently drop a requirement — name it here.",
      ),
  })
  .describe("A strategy configuration derived from the user's description.");

export type ProposeStrategyOutput = {
  params: StrategyParams;
  plain_english: string;
  tweakable: string[];
  unsupported: string[];
  adjusted?: string;
};

/**
 * Turn a plain-English strategy into a config the UI can render.
 *
 * No bridge call: `execute` validates and echoes. The backtest is run by the
 * card's button on the deterministic path, so a slider tweak never costs an
 * LLM turn and 300 trade records never enter the model's context.
 */
const proposeStrategy = tool({
  description:
    "Turn the user's described strategy into a concrete, testable configuration. " +
    "Call this FIRST whenever the user describes a strategy, asks to test an idea, " +
    "or asks what a set of parameters would do. Do NOT run a backtest in the same " +
    "turn — the interface runs it from your proposal and shows the results. " +
    "After calling this, briefly say what you understood and what you could not test.",
  inputSchema: proposeStrategySchema,
  execute: async (args): Promise<ProposeStrategyOutput> => {
    const requested: StrategyParams = {
      fast_ema: args.fast_ema,
      slow_ema: args.slow_ema,
      angle_threshold: args.angle_threshold,
      angle_lookback: args.angle_lookback,
      signal_mode: args.signal_mode,
      month: args.month,
      timeframe: args.timeframe,
      slippage: args.slippage,
    };
    const params = normalizeParams(requested);

    // Surface a repair rather than hiding it: if the model proposed
    // fast >= slow, the user should be told what actually got tested.
    const adjusted =
      params.fast_ema !== requested.fast_ema || params.slow_ema !== requested.slow_ema
        ? `Adjusted to fast ${params.fast_ema} / slow ${params.slow_ema} — the fast average must be shorter than the slow one.`
        : undefined;

    return {
      params,
      plain_english: args.plain_english,
      tweakable: args.tweakable,
      unsupported: args.unsupported,
      ...(adjusted ? { adjusted } : {}),
    };
  },
});

const loadSkill = tool({
  description:
    "Read the project's reference documentation. Call with a name alone to get " +
    "that skill's section headings, then call again with a section to read it. " +
    "Use this before answering questions about strategy rules, the cost or " +
    "execution model, metric definitions, or research methodology — do not " +
    "answer those from memory.",
  inputSchema: z.object({
    name: z.string().describe("Skill name, exactly as listed in the system prompt."),
    section: z
      .string()
      .optional()
      .describe(
        "A section heading from this skill's skeleton. Omit on the first call to see what is available.",
      ),
  }),
  execute: async ({ name, section }) => {
    const skill = getSkill(name);
    if (!skill) {
      return {
        error: `unknown skill ${JSON.stringify(name)}`,
        available: listSkills().map((s) => s.name),
      };
    }
    if (!section) return skillSkeleton(skill);

    const sections = splitSections(skill.body);
    const wanted = section.trim().toLowerCase();
    const hit =
      sections.find((s) => s.heading.toLowerCase() === wanted) ??
      sections.find((s) => s.heading.toLowerCase().includes(wanted));

    if (!hit) {
      return {
        error: `skill ${JSON.stringify(name)} has no section ${JSON.stringify(section)}`,
        sections: sections.map((s) => s.heading),
      };
    }
    return { skill: skill.name, section: hit.heading, content: hit.content };
  },
});

export function hisaabTools(): ToolSet {
  return { propose_strategy: proposeStrategy, load_skill: loadSkill };
}
