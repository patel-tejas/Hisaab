import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { decrypt, encrypt } from "@/lib/encryption";
import {
    fetchDhanTrades,
    pairTrades,
    mapToAppTrade,
    type DhanRawTrade,
    type PairedTrade,
} from "@/lib/brokers/dhan";
import {
    parseSahiCredentials,
    serializeSahiCredentials,
    resolveSahiAccessToken,
    fetchSahiTrades,
    pairSahiTrades,
    mapSahiToAppTrade,
    SahiApiError,
} from "@/lib/brokers/sahi";

const SUPPORTED_BROKERS = new Set(["dhan", "sahi"]);

/* ── POST: Sync trades from broker ── */
export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { broker, totp } = await req.json();
        if (!SUPPORTED_BROKERS.has(broker)) {
            return NextResponse.json(
                { error: "Only 'dhan' and 'sahi' brokers are supported" },
                { status: 400 }
            );
        }

        const brokerLabel = broker === "sahi" ? "Sahi" : "Dhan";

        const { data: connection, error: connError } = await supabase
            .from("broker_connections")
            .select("*")
            .eq("user_id", user.id)
            .eq("broker", broker)
            .eq("is_active", true)
            .maybeSingle();

        if (connError || !connection) {
            return NextResponse.json(
                { error: `${brokerLabel} broker not connected. Please connect from Broker Settings.` },
                { status: 400 }
            );
        }

        // Decrypt stored credentials
        let decryptedSecret: string;
        try {
            decryptedSecret = decrypt(connection.access_token);
        } catch {
            return NextResponse.json(
                { error: `Failed to decrypt credentials. Please reconnect your ${brokerLabel} account.` },
                { status: 400 }
            );
        }

        let rawTrades: DhanRawTrade[] = [];
        let updatedEncryptedToken: string | null = null;

        if (broker === "dhan") {
            rawTrades = await fetchDhanTrades(decryptedSecret);
        } else {
            const storedCreds = parseSahiCredentials(decryptedSecret);
            const totpOverride = typeof totp === "string" && totp.trim() ? totp.trim() : undefined;

            let resolved = await resolveSahiAccessToken(connection.client_id, storedCreds, {
                totpOverride,
            });

            try {
                rawTrades = await fetchSahiTrades(resolved.accessToken, connection.client_id);
            } catch (err) {
                // If a cached token was invalidated early, re-mint once and retry
                if (err instanceof SahiApiError && err.status === 401 && !resolved.minted) {
                    resolved = await resolveSahiAccessToken(connection.client_id, storedCreds, {
                        totpOverride,
                        forceRefresh: true,
                    });
                    rawTrades = await fetchSahiTrades(resolved.accessToken, connection.client_id);
                } else {
                    throw err;
                }
            }

            if (resolved.minted) {
                updatedEncryptedToken = encrypt(serializeSahiCredentials(resolved.updatedCredentials));
            }
        }

        const now = new Date().toISOString();
        const connUpdate: Record<string, unknown> = { last_synced: now };
        if (updatedEncryptedToken) {
            connUpdate.access_token = updatedEncryptedToken;
        }

        if (rawTrades.length === 0) {
            await supabase
                .from("broker_connections")
                .update(connUpdate)
                .eq("id", connection.id);

            return NextResponse.json({
                success: true,
                imported: 0,
                skipped: 0,
                message: `No trades found for today on ${brokerLabel}.`,
            });
        }

        // Pair BUY+SELL legs
        const paired: PairedTrade[] = broker === "sahi"
            ? pairSahiTrades(rawTrades)
            : pairTrades(rawTrades);

        // Deduplicate: check which broker_order_ids already exist in Supabase
        const orderIds = paired.map((p) => p.orderId);
        const { data: existingTrades } = orderIds.length > 0
            ? await supabase
                .from("trades")
                .select("broker_order_id")
                .eq("user_id", user.id)
                .in("broker_order_id", orderIds)
            : { data: [] };

        const existingSet = new Set((existingTrades || []).map((t) => t.broker_order_id));
        const newTrades = paired.filter((p) => !existingSet.has(p.orderId));

        // Insert new trades into trades table
        let imported = 0;
        if (newTrades.length > 0) {
            const dbRows = newTrades.map((p) => {
                const appTrade = broker === "sahi"
                    ? mapSahiToAppTrade(p, user.id)
                    : mapToAppTrade(p, user.id);
                const dateVal = appTrade.date
                    ? new Date(appTrade.date).toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0];
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
                console.error(`Error inserting synced ${brokerLabel} trades:`, insertError);
            } else {
                imported = dbRows.length;
            }
        }

        // Update last_synced (and refreshed token cache if applicable)
        await supabase
            .from("broker_connections")
            .update(connUpdate)
            .eq("id", connection.id);

        return NextResponse.json({
            success: true,
            imported,
            skipped: paired.length - newTrades.length,
            total: rawTrades.length,
            paired: paired.length,
            message:
                imported > 0
                    ? `Successfully imported ${imported} trade(s) from ${brokerLabel}.`
                    : paired.length === 0
                        ? `Found ${rawTrades.length} open fill(s) on ${brokerLabel} — waiting for closing leg to pair.`
                        : "All trades already imported. No new trades to sync.",
        });
    } catch (err: any) {
        console.error("Broker sync error:", err);
        const status = err instanceof SahiApiError && err.status >= 400 && err.status < 500 ? err.status : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}
