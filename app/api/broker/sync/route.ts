import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { decrypt, encrypt, needsReencrypt } from "@/lib/encryption";
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

        // Upgrade tokens stored in the legacy format or under a rotated key.
        if (needsReencrypt(connection.access_token)) {
            await supabase
                .from("broker_connections")
                .update({ access_token: encrypt(accessToken) })
                .eq("id", connection.id);
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

        // Deduplicate against what is already stored. Rows imported before the
        // key became "<entry>:<exit>" carry the bare entry order id, so a match
        // on either form counts as already imported.
        const lookupIds = Array.from(new Set(paired.flatMap((p) => [p.orderId, p.entryOrderId])));
        const { data: existingTrades, error: existingError } = await supabase
            .from("trades")
            .select("broker_order_id")
            .eq("user_id", user.id)
            .in("broker_order_id", lookupIds);

        if (existingError) {
            console.error("Dhan sync: dedupe lookup failed:", existingError.message);
            return NextResponse.json({ error: "Could not check existing trades. Nothing was imported." }, { status: 500 });
        }

        const existingSet = new Set((existingTrades || []).map((t) => t.broker_order_id));
        const newTrades = paired.filter((p) => !existingSet.has(p.orderId) && !existingSet.has(p.entryOrderId));

        // Insert one row at a time so a single bad row cannot sink the batch,
        // and so every failure is counted and reported back to the caller.
        let imported = 0;
        const failures: { symbol: string; reason: string }[] = [];
        for (const p of newTrades) {
            const appTrade = mapToAppTrade(p, user.id);
            const row = {
                user_id: user.id,
                symbol: appTrade.symbol,
                trade_date: appTrade.date || now.split("T")[0],
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

            const { error: insertError } = await supabase.from("trades").insert(row);
            if (!insertError) {
                imported++;
            } else if (insertError.code === "23505") {
                // Unique violation: imported by a concurrent sync. Not a failure.
                existingSet.add(p.orderId);
            } else {
                console.error("Dhan sync: insert failed:", insertError.code, insertError.message);
                failures.push({ symbol: appTrade.symbol, reason: "Could not save this trade" });
            }
        }

        const skipped = paired.length - imported - failures.length;

        if (failures.length > 0) {
            // Leave last_synced alone so the UI does not imply a clean sync.
            // `error` is set too so callers that only read it on !res.ok still
            // see why (502 when nothing went in).
            const message = `${failures.length} of ${newTrades.length} new trade(s) could not be imported${imported > 0 ? `; ${imported} were imported` : ""}. Try syncing again.`;
            return NextResponse.json(
                {
                    success: false,
                    imported,
                    skipped,
                    failed: failures.length,
                    failures,
                    total: rawTrades.length,
                    paired: paired.length,
                    message,
                    error: message,
                },
                { status: imported > 0 ? 207 : 502 }
            );
        }

        // Update last_synced timestamp
        await supabase
            .from("broker_connections")
            .update({ last_synced: now })
            .eq("id", connection.id);

        return NextResponse.json({
            success: true,
            imported,
            skipped,
            failed: 0,
            total: rawTrades.length,
            paired: paired.length,
            message:
                imported > 0
                    ? `Successfully imported ${imported} trade(s) from Dhan.`
                    : "All trades already imported. No new trades to sync.",
        });
    } catch (err: any) {
        console.error("Broker sync error:", err?.message);
        return NextResponse.json({ error: err?.message || "Sync failed" }, { status: 500 });
    }
}
