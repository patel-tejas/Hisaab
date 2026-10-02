/**
 * R-multiple: the result of a trade in units of the risk taken at entry.
 * Risk per unit is the distance from entry to the stop loss; a trade with no
 * stop, or a stop on the wrong side of entry, has no R.
 */
export type RTradeInput = {
    type?: string | null; // "long" | "short"
    entryPrice: number;
    exitPrice: number;
    stopLoss?: number | null;
};

export function rMultiple(t: RTradeInput): number | null {
    const stop = Number(t.stopLoss);
    if (!Number.isFinite(stop) || stop <= 0) return null;
    const isShort = t.type === "short";
    const risk = isShort ? stop - t.entryPrice : t.entryPrice - stop;
    if (!(risk > 0)) return null;
    const move = isShort ? t.entryPrice - t.exitPrice : t.exitPrice - t.entryPrice;
    const r = move / risk;
    return Number.isFinite(r) ? r : null;
}

/** Average R over the trades that have one, and how many did. */
export function averageR(trades: RTradeInput[]): { avg: number | null; count: number } {
    const rs = trades.map(rMultiple).filter((r): r is number => r !== null);
    if (rs.length === 0) return { avg: null, count: 0 };
    return { avg: rs.reduce((a, b) => a + b, 0) / rs.length, count: rs.length };
}

export function formatR(r: number | null): string {
    if (r === null) return "—";
    return `${r >= 0 ? "+" : ""}${r.toFixed(2)}R`;
}
