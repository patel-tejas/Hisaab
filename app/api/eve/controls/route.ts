/**
 * The kill switch. Engaging it stops every paper-trading strategy at once and
 * blocks new ones; releasing it only lifts the block.
 *
 * GET                              -> trading_controls
 * POST {engaged: true, reason?}    -> engage_kill_switch
 * POST {engaged: false}            -> release_kill_switch (UI only)
 */

import { NextResponse } from "next/server";

import { readJson, strategyCall } from "@/lib/eve/strategy-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return strategyCall("trading_controls", {});
}

export async function POST(req: Request) {
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  if (typeof body.engaged !== "boolean") {
    return NextResponse.json({ error: "engaged must be true or false" }, { status: 400 });
  }
  if (body.engaged) {
    const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : "";
    return strategyCall("engage_kill_switch", { reason });
  }
  return strategyCall("release_kill_switch", {});
}
