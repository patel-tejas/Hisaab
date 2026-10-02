/**
 * The deterministic path: call one read-only quant tool directly, no LLM.
 *
 * This is what the sliders, charts and month picker use. Moving a slider must
 * re-run a backtest without costing an LLM turn — a turn is slow, burns Groq
 * rate limit, and would route numbers through the model. It also keeps bulky
 * payloads (300 trade records, grid results) out of the model's context.
 *
 * An allowlist, not a passthrough: the bridge has no auth and a 300-second
 * timeout, and its write tools would reach the broker API and overwrite
 * parquet. This route decides what is reachable.
 */

import { NextResponse } from "next/server";

import { callTool, coerceArgs, fetchManifest, isReadTool } from "@/lib/eve/bridge";
import { getAuthUser } from "@/lib/supabase-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await params;
  if (!isReadTool(name)) {
    return NextResponse.json(
      {
        error: `${name} is not callable from the dashboard.`,
        hint: "Only read-only research tools are exposed here.",
      },
      { status: 403 },
    );
  }

  let args: Record<string, unknown>;
  try {
    const raw = await req.text();
    args = raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return NextResponse.json({ error: "body must be a JSON object" }, { status: 400 });
  }

  // Coerce against the tool's own schema. The bridge passes the body straight
  // into a Python signature with no coercion, so a numeric field arriving as a
  // string raises TypeError and comes back as an opaque 400.
  let schema;
  try {
    schema = (await fetchManifest()).find((t) => t.name === name)?.parameters;
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "quant bridge unreachable",
        hint: "Start the engine: uv run python -m mcp.quant_server.http_bridge",
      },
      { status: 503 },
    );
  }

  const result = await callTool(name, coerceArgs(args, schema));

  // `callTool` returns bridge errors rather than throwing, so that the chat
  // loop can self-correct. On this path there is no model to self-correct, so
  // map it back to a real status code for the UI.
  if (result && typeof result === "object" && "error" in result) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json({ tool: name, result });
}
