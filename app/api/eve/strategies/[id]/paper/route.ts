/**
 * Paper trading for one saved strategy. A forward test with no money and no
 * broker: only bars processed after "start" count.
 *
 * POST {action: "start"}   -> promote_to_paper (UI only; blocked by the kill switch)
 * POST {action: "stop"}    -> stop_paper
 * POST {action: "refresh"} -> paper_results
 */

import { NextResponse } from "next/server";

import { readJson, strategyCall } from "@/lib/eve/strategy-route";

export const runtime = "nodejs";
export const maxDuration = 300;

const TOOLS = { start: "promote_to_paper", stop: "stop_paper", refresh: "paper_results" } as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const action = body.action as keyof typeof TOOLS;
  if (!(action in TOOLS)) {
    return NextResponse.json({ error: 'action must be "start", "stop" or "refresh"' }, { status: 400 });
  }
  return strategyCall(TOOLS[action], { strategy_id: id });
}
