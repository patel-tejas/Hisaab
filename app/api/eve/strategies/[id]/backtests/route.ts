/**
 * Backtest a saved strategy version. Recorded in `algo_backtests` and counted
 * as a trial, so the evaluation can say how many tries a result came from.
 *
 * POST {month, version?} -> backtest_saved_strategy
 */

import { NextResponse } from "next/server";

import { readJson, strategyCall } from "@/lib/eve/strategy-route";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const month = typeof body.month === "string" ? body.month : "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month must be "YYYY-MM"' }, { status: 400 });
  }
  const version = Number(body.version ?? 0) || 0;
  return strategyCall("backtest_saved_strategy", { strategy_id: id, month, version });
}
