import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { decrypt } from "@/lib/encryption";
import { fetchDhanTrades, pairTrades, mapToAppTrade } from "@/lib/brokers/dhan";

/* ── POST: Sync trades from broker ── */
export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { broker } = await req.json();
        if (broker !== "dhan") {
            return NextResponse.json({ error: "Only 'dhan' broker is supported" }, { status: 400 });
        }

        const { data: connection, error: connError } = await supabase
            .from("broker_connections")
            .select("*")
            .eq("user_id", user.id)
            .eq("broker", "dhan")
            .eq("is_active", true)
            .maybeSingle();

        if (connError || !connection) {
            return NextResponse.json(
                { error: "Dhan broker not connected. Please connect from Broker Settings." },
                { status: 400 }
            );
        }

        // Decrypt the stored access token
        let accessToken: string;
        try {
            accessToken = decrypt(connection.access_token);
        } catch {
            return NextResponse.json(
                { error: "Failed to decrypt access token. Please reconnect your Dhan account." },
                { status: 400 }
            );
        }

        // Fetch trades from Dhan
        const rawTrades = await fetchDhanTrades(accessToken);

        const now = new Date().toISOString();

        if (rawTrades.length === 0) {
            await supabase
                .from("broker_connections")
                .update({ last_synced: now })
                .eq("id", connection.id);

            return NextResponse.json({
                success: true,
                imported: 0,
                skipped: 0,
                message: "No trades found for today on Dhan.",
            });
        }

        // Pair BUY+SELL legs
        const paired = pairTrades(rawTrades);

        // Deduplicate: check which broker_order_ids already exist in Supabase
        const orderIds = paired.map((p) => p.orderId);
        const { data: existingTrades } = await supabase
            .from("trades")
            .select("broker_order_id")
            .eq("user_id", user.id)
            .in("broker_order_id", orderIds);

        const existingSet = new Set((existingTrades || []).map((t) => t.broker_order_id));
        const newTrades = paired.filter((p) => !existingSet.has(p.orderId));

        // Insert new trades into trades table
        let imported = 0;
        if (newTrades.length > 0) {
            const dbRows = newTrades.map((p) => {
                const appTrade = mapToAppTrade(p, user.id);
                const dateVal = appTrade.date ? new Date(appTrade.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
                return {
                    user_id: user.id,
                    symbol: appTrade.symbol,
                    trade_date: dateVal,
                    trade_type: appTrade.type,
                    quantity: appTrade.quantity,
                    entry_price: appTrade.entryPrice,
                    exit_price: appTrade.exitPrice,
                    entry_time: appTrade.entryTime,
                    exit_time: appTrade.exitTime,
                    total_amount: appTrade.totalAmount,
                    pnl: appTrade.pnl,
                    pnl_percent: appTrade.pnlPercent,
                    strategy: appTrade.strategy,
                    outcome: appTrade.outcome,
                    entry_confidence: appTrade.entryConfidence,
                    satisfaction: appTrade.satisfaction,
                    emotional_state: appTrade.emotionalState,
                    notes: appTrade.notes,
                    lessons_learned: appTrade.lessonsLearned,
                    source: appTrade.source,
                    broker_order_id: appTrade.brokerOrderId,
                    brokerage: appTrade.brokerage,
                };
            });

            const { error: insertError } = await supabase.from("trades").insert(dbRows);
            if (insertError) {
                console.error("Error inserting synced Dhan trades:", insertError);
            } else {
                imported = dbRows.length;
            }
        }

        // Update last_synced timestamp
        await supabase
            .from("broker_connections")
            .update({ last_synced: now })
            .eq("id", connection.id);

        return NextResponse.json({
            success: true,
            imported,
            skipped: paired.length - newTrades.length,
            total: rawTrades.length,
            paired: paired.length,
            message:
                imported > 0
                    ? `Successfully imported ${imported} trade(s) from Dhan.`
                    : "All trades already imported. No new trades to sync.",
        });
    } catch (err: any) {
        console.error("Broker sync error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
