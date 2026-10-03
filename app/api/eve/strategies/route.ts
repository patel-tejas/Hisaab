/**
 * The signed-in user's saved strategies.
 *
 * GET  ?status=draft|validated|backtested|paper|archived -> list_my_strategies
 * POST {name, spec}                                      -> save_strategy (source "form")
 */

import { NextResponse } from "next/server";

import { readJson, strategyCall } from "@/lib/eve/strategy-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get("status") ?? "";
  return strategyCall("list_my_strategies", { status });
}

export async function POST(req: Request) {
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!body.spec || typeof body.spec !== "object") {
    return NextResponse.json({ error: "spec is required" }, { status: 400 });
  }
  const source = body.source === "chat" ? "chat" : "form";
  return strategyCall("save_strategy", { name, spec: body.spec, source });
}
