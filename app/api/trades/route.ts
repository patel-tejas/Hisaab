import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Helper to map UI outcome values to DB-allowed values
function mapOutcome(outcome: string): "success" | "failure" {
    const failure = ["Mistake", "failure"];
    return failure.includes(outcome) ? "failure" : "success";
}

// Helper to map DB outcome to UI label
function mapOutcomeToLabel(outcome: string): string {
    if (outcome === "failure") return "Mistake";
    return "Full Success";
}

// Helper function to convert DB trade row + relations to JSON response format expected by UI
export function mapTradeToResponse(t: any) {
    return {
        _id: t.id,
        id: t.id,
        user: t.user_id,
        symbol: t.symbol,
        date: t.trade_date,
        type: t.trade_type,
        quantity: Number(t.quantity),
        entryPrice: Number(t.entry_price),
        exitPrice: Number(t.exit_price),
        entryTime: t.entry_time || "",
        exitTime: t.exit_time || "",
        totalAmount: Number(t.total_amount),
        pnl: Number(t.pnl),
        pnlPercent: Number(t.pnl_percent),
        stopLoss: t.stop_loss ? Number(t.stop_loss) : undefined,
        target: t.target ? Number(t.target) : undefined,
        strategy: t.strategy,
        outcome: mapOutcomeToLabel(t.outcome),
        entryConfidence: t.entry_confidence || 3,
        satisfaction: t.satisfaction || 3,
        emotionalState: t.emotional_state || "",
        mistakes: Array.isArray(t.trade_mistakes) ? t.trade_mistakes.map((m: any) => m.mistake) : [],
        notes: t.notes || "",
        lessonsLearned: t.lessons_learned || "",
        images: Array.isArray(t.trade_images) ? t.trade_images.map((img: any) => img.image_url) : [],
        source: t.source || "manual",
        brokerOrderId: t.broker_order_id || null,
        brokerage: Number(t.brokerage || 0),
        createdAt: t.created_at,
        updatedAt: t.updated_at,
    };
}

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: trades, error } = await supabase
            .from("trades")
            .select("*, trade_mistakes(mistake), trade_images(image_url)")
            .eq("user_id", user.id)
            .order("trade_date", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const formattedTrades = (trades || []).map(mapTradeToResponse);
        return NextResponse.json(formattedTrades);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { mistakes = [], images = [], ...tradeData } = body;

        const dateVal = tradeData.date ? new Date(tradeData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

        const insertRow = {
            user_id: user.id,
            symbol: tradeData.symbol,
            trade_date: dateVal,
            trade_type: tradeData.type,
            quantity: tradeData.quantity,
            entry_price: tradeData.entryPrice,
            exit_price: tradeData.exitPrice,
            entry_time: tradeData.entryTime || null,
            exit_time: tradeData.exitTime || null,
            total_amount: tradeData.totalAmount,
            pnl: tradeData.pnl,
            pnl_percent: tradeData.pnlPercent,
            stop_loss: tradeData.stopLoss || null,
            target: tradeData.target || null,
            strategy: tradeData.strategy,
            outcome: mapOutcome(tradeData.outcome),
            entry_confidence: tradeData.entryConfidence || 3,
            satisfaction: tradeData.satisfaction || 3,
            emotional_state: tradeData.emotionalState || null,
            notes: tradeData.notes || null,
            lessons_learned: tradeData.lessonsLearned || null,
            source: tradeData.source || "manual",
            broker_order_id: tradeData.brokerOrderId || null,
            brokerage: tradeData.brokerage || 0,
        };

        const { data: newTrade, error: insertError } = await supabase
            .from("trades")
            .insert(insertRow)
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 400 });
        }

        // Insert Mistakes
        if (Array.isArray(mistakes) && mistakes.length > 0) {
            const mistakeRows = mistakes.map((m: string) => ({
                trade_id: newTrade.id,
                mistake: m,
            }));
            await supabase.from("trade_mistakes").insert(mistakeRows);
        }

        // Insert Images
        if (Array.isArray(images) && images.length > 0) {
            const imageRows = images.map((img: string) => ({
                trade_id: newTrade.id,
                image_url: img,
            }));
            await supabase.from("trade_images").insert(imageRows);
        }

        // Re-fetch trade with relations
        const { data: fullTrade } = await supabase
            .from("trades")
            .select("*, trade_mistakes(mistake), trade_images(image_url)")
            .eq("id", newTrade.id)
            .single();

        return NextResponse.json(mapTradeToResponse(fullTrade || newTrade), { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}

export async function PUT(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { _id, id, mistakes = [], images = [], ...tradeData } = body;
        const tradeId = _id || id;

        if (!tradeId) {
            return NextResponse.json({ error: "Trade ID required" }, { status: 400 });
        }

        const dateVal = tradeData.date ? new Date(tradeData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

        const updateRow = {
            symbol: tradeData.symbol,
            trade_date: dateVal,
            trade_type: tradeData.type,
            quantity: tradeData.quantity,
            entry_price: tradeData.entryPrice,
            exit_price: tradeData.exitPrice,
            entry_time: tradeData.entryTime || null,
            exit_time: tradeData.exitTime || null,
            total_amount: tradeData.totalAmount,
            pnl: tradeData.pnl,
            pnl_percent: tradeData.pnlPercent,
            stop_loss: tradeData.stopLoss || null,
            target: tradeData.target || null,
            strategy: tradeData.strategy,
            outcome: mapOutcome(tradeData.outcome),
            entry_confidence: tradeData.entryConfidence,
            satisfaction: tradeData.satisfaction,
            emotional_state: tradeData.emotionalState || null,
            notes: tradeData.notes || null,
            lessons_learned: tradeData.lessonsLearned || null,
            brokerage: tradeData.brokerage || 0,
            updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
            .from("trades")
            .update(updateRow)
            .eq("id", tradeId)
            .eq("user_id", user.id);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        // Update mistakes (delete & insert)
        await supabase.from("trade_mistakes").delete().eq("trade_id", tradeId);
        if (Array.isArray(mistakes) && mistakes.length > 0) {
            const mistakeRows = mistakes.map((m: string) => ({
                trade_id: tradeId,
                mistake: m,
            }));
            await supabase.from("trade_mistakes").insert(mistakeRows);
        }

        // Update images (delete & insert)
        await supabase.from("trade_images").delete().eq("trade_id", tradeId);
        if (Array.isArray(images) && images.length > 0) {
            const imageRows = images.map((img: string) => ({
                trade_id: tradeId,
                image_url: img,
            }));
            await supabase.from("trade_images").insert(imageRows);
        }

        // Re-fetch trade
        const { data: updatedTrade } = await supabase
            .from("trades")
            .select("*, trade_mistakes(mistake), trade_images(image_url)")
            .eq("id", tradeId)
            .single();

        return NextResponse.json(mapTradeToResponse(updatedTrade));
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
