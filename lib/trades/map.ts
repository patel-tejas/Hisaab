/* Shape a DB trade row (with relations) into the JSON the UI expects.
   Shared by /api/trades and /api/trades/export. */

// Helper to map DB outcome to UI label
export function mapOutcomeToLabel(outcome: string): string {
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
