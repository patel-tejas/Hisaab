/**
 * Chat endpoint: Groq drives a tool loop over the deterministic quant engine.
 *
 * Ported from `EMA_Strategy/apps/web/app/api/chat/route.ts`, plus Hisaab's auth
 * gate and the two local tools (`propose_strategy`, `load_skill`).
 *
 * The model never computes a number. Every figure in an answer comes from a
 * tool result produced by `quant/`.
 */

import { createGroq } from "@ai-sdk/groq";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";

import { buildTools, fetchManifest } from "@/lib/eve/bridge";
import { systemPrompt } from "@/lib/eve/prompt";
import { hisaabTools } from "@/lib/eve/tools";
import { getAuthContext } from "@/lib/supabase-auth";

// The tool loop calls a local Python service; keep it on Node, not Edge.
export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_MODEL = "openai/gpt-oss-20b";

function errorResponse(message: string, hint: string, status = 500) {
  return new Response(JSON.stringify({ error: message, hint }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request) {
  // The bridge has no auth of its own and a 300s timeout per call, so this
  // gate is the only thing standing in front of it.
  const auth = await getAuthContext();
  if (!auth) return errorResponse("Unauthorized", "Sign in to use the Eve agent.", 401);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return errorResponse(
      "GROQ_API_KEY is not set.",
      "Add it to .env and restart the dev server. Get a key at https://console.groq.com/keys",
      503,
    );
  }

  let messages: UIMessage[];
  let mode: "studio" | "builder" = "studio";
  let currentSpec: string | null = null;
  try {
    const body = (await req.json()) as { messages: UIMessage[]; mode?: string; current_spec?: unknown };
    messages = body.messages;
    if (body.mode === "builder") mode = "builder";
    if (mode === "builder" && body.current_spec && typeof body.current_spec === "object") {
      const json = JSON.stringify(body.current_spec);
      // A spec is ~2 KB; anything far larger is not one.
      if (json.length <= 12_000) currentSpec = json;
    }
  } catch {
    return errorResponse("Request body was not valid JSON.", "", 400);
  }

  // Fetched per request so a tool added in Python shows up on the next turn
  // without restarting Next. It is a localhost call on a tiny payload.
  const model = process.env.EVE_MODEL || DEFAULT_MODEL;
  // Every bridge call in this turn carries the user's token, so the engine's
  // gate knows whose strategies it is reading and saving.
  const bridgeAuth = { token: auth.token, requestId: crypto.randomUUID(), model };
  let tools;
  try {
    tools = {
      ...buildTools(await fetchManifest(), bridgeAuth),
      ...hisaabTools({ auth: bridgeAuth, apiKey, model }),
    };
    // The builder works on specs only; the EMA slider workbench is not on
    // that page, so its proposal tool would have nowhere to land.
    if (mode === "builder") delete tools.propose_strategy;
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Quant bridge unreachable.",
      "Start the engine: uv run python -m mcp.quant_server.http_bridge",
      503,
    );
  }

  // GROQ_BASE_URL lets a corporate proxy -- or a local mock during testing --
  // stand in for api.groq.com without touching this file.
  const groq = createGroq({
    apiKey,
    ...(process.env.GROQ_BASE_URL ? { baseURL: process.env.GROQ_BASE_URL } : {}),
  });

  const result = streamText({
    model: groq(model),
    system: systemPrompt(mode, currentSpec),
    messages: await convertToModelMessages(messages),
    tools,
    // Without a multi-step stop condition the run ends at the first tool call
    // and the user sees raw JSON instead of an answer. 12 leaves room for a
    // list -> inspect -> backtest -> compare chain.
    stopWhen: stepCountIs(12),
    temperature: 0.2,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      // Surfaced in the UI, so make it actionable rather than "[object Object]".
      const message = error instanceof Error ? error.message : String(error);
      if (/api key|unauthorized|401|invalid_api_key/i.test(message)) {
        return "Groq rejected the API key. Check GROQ_API_KEY in .env.";
      }
      if (/model|404|does not exist|decommission/i.test(message)) {
        return `Groq rejected the model "${model}". Set EVE_MODEL in .env to a current model id.`;
      }
      return message;
    },
  });
}
