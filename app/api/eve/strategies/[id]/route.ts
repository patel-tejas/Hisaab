/**
 * One saved strategy.
 *
 * GET    ?version=N            -> get_my_strategy (versions, diffs, backtests)
 * PATCH  {base_version, spec}  -> revise_strategy (a new version; never overwrites)
 * DELETE                       -> archive_strategy (UI-only on the engine side)
 */

import { NextResponse } from "next/server";

import { readJson, strategyCall } from "@/lib/eve/strategy-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const version = Number(new URL(req.url).searchParams.get("version") ?? 0) || 0;
  return strategyCall("get_my_strategy", { strategy_id: id, version });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const base = Number(body.base_version);
  if (!Number.isInteger(base) || base < 1) {
    return NextResponse.json({ error: "base_version must be the version you edited" }, { status: 400 });
  }
  if (!body.spec || typeof body.spec !== "object") {
    return NextResponse.json({ error: "spec is required" }, { status: 400 });
  }
  return strategyCall("revise_strategy", { strategy_id: id, base_version: base, spec: body.spec });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return strategyCall("archive_strategy", { strategy_id: id });
}
