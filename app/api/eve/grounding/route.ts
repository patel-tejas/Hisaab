/**
 * Proxy to the bridge's numeric grounding check.
 *
 * Advisory only: it reports which figures in an answer trace to a tool result.
 * It lives on its own bridge route (not in the tool manifest) so the model
 * cannot call its own grader and tune an answer to pass.
 */

import { NextResponse } from "next/server";

import { checkGrounding } from "@/lib/eve/bridge";
import { getAuthUser } from "@/lib/supabase-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let answer: string;
  let toolResults: unknown[];
  try {
    const body = (await req.json()) as { answer?: unknown; toolResults?: unknown };
    if (typeof body.answer !== "string") {
      return NextResponse.json({ error: "'answer' must be a string" }, { status: 400 });
    }
    answer = body.answer;
    toolResults = Array.isArray(body.toolResults) ? body.toolResults : [];
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  try {
    return NextResponse.json(await checkGrounding(answer, toolResults));
  } catch (err) {
    // A failed check must never break the conversation, so the client treats
    // any non-OK response as "no report" and carries on.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "grounding check failed" },
      { status: 502 },
    );
  }
}
