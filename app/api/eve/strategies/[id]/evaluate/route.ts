/**
 * Honest verdict on a saved strategy version: its latest in-sample backtest,
 * one run on a month it was never backtested on, a correction for how many
 * tries it took, and a buy-and-hold benchmark. Recorded and counted as a trial.
 *
 * POST {holdout_month, version?} -> evaluate_saved_strategy
 */

import { NextResponse } from "next/server";

import { readJson, strategyCall } from "@/lib/eve/strategy-route";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const month = typeof body.holdout_month === "string" ? body.holdout_month : "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'holdout_month must be "YYYY-MM"' }, { status: 400 });
  }
  const version = Number(body.version ?? 0) || 0;
  return strategyCall("evaluate_saved_strategy", { strategy_id: id, holdout_month: month, version });
}
