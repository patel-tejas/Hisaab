import { createClient } from "@/utils/supabase/server";
import { apiError } from "@/lib/api-error";
import { rMultiple } from "@/lib/r-multiple";
import { mapTradeToResponse } from "@/lib/trades/map";

const COLUMNS = [
    "date", "symbol", "direction", "quantity", "entry_price", "exit_price",
    "entry_time", "exit_time", "stop_loss", "target", "r_multiple",
    "gross_pnl", "pnl_percent", "brokerage", "strategy", "outcome",
    "entry_confidence", "satisfaction", "emotional_state", "mistakes",
    "notes", "lessons_learned", "source", "broker_order_id",
] as const;

/** CSV-escape a cell. Text that a spreadsheet would read as a formula is
 *  prefixed with a quote (CSV injection); plain numbers are left alone. */
function csvCell(value: unknown): string {
    if (value === null || value === undefined) return "";
    let s = String(value);
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/* GET: download all of the caller's trades as CSV. */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });

        const { data, error } = await supabase
            .from("trades")
            .select("*, trade_mistakes(mistake)")
            .eq("user_id", user.id)
            .order("trade_date", { ascending: true });
        if (error) return apiError("trades/export", error, 500);

        const lines = [COLUMNS.join(",")];
        for (const row of data ?? []) {
            const t = mapTradeToResponse(row);
            const r = rMultiple({ type: t.type, entryPrice: t.entryPrice, exitPrice: t.exitPrice, stopLoss: t.stopLoss });
            const values: Record<(typeof COLUMNS)[number], unknown> = {
                date: t.date,
                symbol: t.symbol,
                direction: t.type,
                quantity: t.quantity,
                entry_price: t.entryPrice,
                exit_price: t.exitPrice,
                entry_time: t.entryTime,
                exit_time: t.exitTime,
                stop_loss: t.stopLoss ?? "",
                target: t.target ?? "",
                r_multiple: r === null ? "" : r.toFixed(2),
                gross_pnl: t.pnl,
                pnl_percent: t.pnlPercent,
                brokerage: t.brokerage,
                strategy: t.strategy,
                outcome: t.outcome,
                entry_confidence: t.entryConfidence,
                satisfaction: t.satisfaction,
                emotional_state: t.emotionalState,
                mistakes: t.mistakes.join("; "),
                notes: stripHtml(t.notes),
                lessons_learned: stripHtml(t.lessonsLearned),
                source: t.source,
                broker_order_id: t.brokerOrderId ?? "",
            };
            lines.push(COLUMNS.map((c) => csvCell(values[c])).join(","));
        }

        const stamp = new Date().toISOString().slice(0, 10);
        return new Response("﻿" + lines.join("\r\n") + "\r\n", {
            headers: {
                "content-type": "text/csv; charset=utf-8",
                "content-disposition": `attachment; filename="hisaab-trades-${stamp}.csv"`,
                "cache-control": "no-store",
            },
        });
    } catch (err) {
        return apiError("trades/export", err, 500);
    }
}
