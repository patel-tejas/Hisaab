/**
 * Shared plumbing for the `/api/eve/strategies` routes: authenticate, call
 * one engine tool as this user, map the result to a response.
 *
 * Saved strategies live in Supabase (`algo_*` tables) but are read and
 * written through the engine's gate, not from here: that is where trial
 * counts, spec hashing and the audit log live, so a strategy saved from the
 * chat and one saved from the form go through exactly the same checks.
 * These routes always claim the "ui" surface: a person clicked something.
 */

import { NextResponse } from "next/server";

import { callTool, isToolError } from "./bridge";
import { getAuthContext } from "../supabase-auth";

export async function strategyCall(
  name: string,
  args: Record<string, unknown>,
): Promise<NextResponse> {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.token) {
    return NextResponse.json({ error: "Your session has no access token. Sign in again." }, { status: 401 });
  }
  const result = await callTool(name, args, {
    token: auth.token,
    surface: "ui",
    requestId: crypto.randomUUID(),
  });
  if (isToolError(result)) {
    // No status means the engine could not be reached at all.
    return NextResponse.json(result, { status: result.status ?? 503 });
  }
  return NextResponse.json({ result });
}

export async function readJson(req: Request): Promise<Record<string, unknown> | NextResponse> {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "body must be a JSON object" }, { status: 400 });
    }
    return body as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
}
