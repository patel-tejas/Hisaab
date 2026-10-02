/**
 * CSV export of a processed month+timeframe.
 *
 * `get_historical_candles` is a *preview* tool: `limit` is capped at 200 rows
 * (`MAX_PREVIEW_ROWS`). So a full month is assembled by paginating on `offset`
 * — about 40 round trips for a 1m month (8,000+ bars), each on localhost.
 *
 * This works against the bridge as it stands. The better fix is a streamed
 * `GET /export/{month}/{timeframe}.csv` on the bridge itself, reading the
 * parquet once; this route is the version that needs no Python change.
 */

import { NextResponse } from "next/server";

import { callTool } from "@/lib/eve/bridge";
import { getAuthUser } from "@/lib/supabase-auth";
import { TIMEFRAMES, type Timeframe } from "@/lib/eve/strategy";

export const runtime = "nodejs";
export const maxDuration = 300;

/** The bridge's own cap; requesting more is a 400. */
const PAGE = 200;

/** Guard against an unbounded loop if the bridge ever stops advancing. */
const MAX_PAGES = 250;

type CandlesPage = {
  bars: number;
  columns: string[];
  preview: Record<string, unknown>[];
};

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? "";
  const timeframe = (url.searchParams.get("timeframe") ?? "15m") as Timeframe;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "month must be YYYY-MM" },
      { status: 400 },
    );
  }
  if (!TIMEFRAMES.includes(timeframe)) {
    return NextResponse.json(
      { error: `timeframe must be one of ${TIMEFRAMES.join(", ")}` },
      { status: 400 },
    );
  }

  const rows: Record<string, unknown>[] = [];
  let columns: string[] = [];
  let total = Infinity;
  let offset = 0;

  for (let page = 0; page < MAX_PAGES && offset < total; page += 1) {
    const result = await callTool("get_historical_candles", {
      month,
      timeframe,
      limit: PAGE,
      offset,
    });

    if (result && typeof result === "object" && "error" in result) {
      return NextResponse.json(result, { status: 502 });
    }

    const body = result as CandlesPage;
    total = body.bars ?? 0;
    if (columns.length === 0) columns = body.columns ?? Object.keys(body.preview[0] ?? {});

    const batch = body.preview ?? [];
    if (batch.length === 0) break; // nothing further to read
    rows.push(...batch);
    offset += batch.length;
  }

  // Only the preview columns come back, so derive the header from the rows
  // rather than trusting the frame's full column list.
  const header = Object.keys(rows[0] ?? {});
  const body = [
    header.join(","),
    ...rows.map((r) => header.map((h) => csvCell(r[h])).join(",")),
  ].join("\r\n");

  // The BOM is deliberate: Excel misreads UTF-8 CSV without it.
  return new Response(`﻿${body}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="NIFTY-${month}-${timeframe}.csv"`,
      "x-row-count": String(rows.length),
      "x-bars-reported": String(Number.isFinite(total) ? total : rows.length),
    },
  });
}
