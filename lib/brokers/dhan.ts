/**
 * Dhan Broker API Service
 * Docs: https://dhanhq.co/docs/v2/
 * Base URL: https://api.dhan.co/v2
 */

const DHAN_BASE = "https://api.dhan.co/v2";

/* ──────────────────── Raw Dhan types ──────────────────── */
export interface DhanRawTrade {
    dhanClientId: string;
    orderId: string;
    exchangeOrderId: string;
    transactionType: "BUY" | "SELL";
    exchangeSegment: string;
    productType: string;
    orderType: string;
    tradingSymbol: string;
    securityId: string;
    tradedQuantity: number;
    tradedPrice: number;
    createTime: string;
    updateTime: string;
    exchangeTime: string;
}

/* ──────────────────── Paired trade (our internal format) ──────────────────── */
export interface PairedTrade {
    symbol: string;
    date: string;         // YYYY-MM-DD, exchange (IST) date
    type: "long" | "short";
    quantity: number;
    entryPrice: number;
    exitPrice: number;
    entryTime: string;    // HH:mm
    exitTime: string;     // HH:mm
    pnl: number;
    pnlPercent: number;
    totalAmount: number;
    orderId: string;      // dedupe key: "<entryOrderId>:<exitOrderId>"
    entryOrderId: string;
    exitOrderId: string;
    exchangeSegment: string;
    productType: string;
    brokerage: number;
}

/* ──────────────────── Fetch today's trades ──────────────────── */
export async function fetchDhanTrades(accessToken: string): Promise<DhanRawTrade[]> {
    const res = await fetch(`${DHAN_BASE}/trades`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "access-token": accessToken,
        },
    });

    if (!res.ok) {
        if (res.status === 401) throw new Error("Dhan access token expired or invalid. Please regenerate from web.dhan.co");
        throw new Error(`Dhan API error (${res.status}). Please try again shortly.`);
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

/* ──────────────────── Pair BUY+SELL into trades ──────────────────── */
/* ──────────────────── Pair BUY+SELL into trades (FIFO) ──────────────────── */
export const MCX_MULTIPLIERS: Record<string, number> = {
    "SILVERM": 5,
    "SILVER": 30,
    "GOLD": 100,
    "GOLDM": 10,
    "CRUDEOIL": 100,
    "NATGAS": 1250,
    "COPPER": 2500,
    "ZINC": 5000,
    "LEAD": 5000,
    "ALUMINIUM": 5000
};

export function getSymbolMultiplier(symbol: string): number {
    if (!symbol) return 1;

    // Normalize symbol: uppercase
    const s = symbol.toUpperCase();

    // Check for keys in MCX_MULTIPLIERS
    // We sort keys by length descending to ensure "SILVERM" is matched before "SILVER"
    const keys = Object.keys(MCX_MULTIPLIERS).sort((a, b) => b.length - a.length);

    for (const key of keys) {
        // We assume the symbol starts with the key, followed by a non-letter char (space, hyphen, digit)
        // or it IS the key.
        // Regex: ^KEY(\W|\d|$)
        const regex = new RegExp(`^${key}([^A-Z]|$)`);
        if (regex.test(s)) {
            return MCX_MULTIPLIERS[key];
        }
    }

    return 1;
}

/**
 * Dhan reports exchange time in IST as "YYYY-MM-DD HH:mm:ss" with no offset.
 * Read the wall-clock parts straight from the string so the result does not
 * depend on the server's timezone. Falls back to formatting in Asia/Kolkata.
 */
export function parseDhanTime(raw: string): { date: string; time: string } {
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/.exec(raw ?? "");
    if (m) return { date: m[1], time: `${m[2]}:${m[3]}` };

    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return { date: "", time: "" };
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}` };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function pairTrades(rawTrades: DhanRawTrade[]): PairedTrade[] {
    // Group by symbol
    const bySymbol = new Map<string, DhanRawTrade[]>();

    for (const t of rawTrades) {
        const key = `${t.tradingSymbol}_${t.exchangeSegment}`;
        if (!bySymbol.has(key)) bySymbol.set(key, []);
        bySymbol.get(key)!.push(t);
    }

    // One round trip per (entry order, exit order). An entry closed by two
    // partial exits yields two round trips; an order that Dhan reports as
    // several fills is merged back into one, with volume-weighted prices.
    const byKey = new Map<string, {
        entry: DhanRawTrade; exit: DhanRawTrade; isLong: boolean;
        qty: number; entryValue: number; exitValue: number;
        firstEntryTime: string; lastExitTime: string;
    }>();

    for (const [, trades] of bySymbol) {
        // Sort by time (earliest first)
        trades.sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());

        // FIFO queue of open legs
        const openLegs: { trade: DhanRawTrade; type: "BUY" | "SELL"; remainingQty: number }[] = [];

        for (const t of trades) {
            let remainingQty = t.tradedQuantity;

            while (remainingQty > 0 && openLegs.length > 0) {
                const head = openLegs[0];

                // Same direction → accumulating, not closing
                if (head.type === t.transactionType) break;

                const matchQty = Math.min(remainingQty, head.remainingQty);
                const entry = head.trade;
                const key = `${entry.orderId}:${t.orderId}`;

                const agg = byKey.get(key) ?? {
                    entry, exit: t, isLong: head.type === "BUY",
                    qty: 0, entryValue: 0, exitValue: 0,
                    firstEntryTime: entry.createTime, lastExitTime: t.createTime,
                };
                agg.qty += matchQty;
                agg.entryValue += entry.tradedPrice * matchQty;
                agg.exitValue += t.tradedPrice * matchQty;
                if (entry.createTime < agg.firstEntryTime) agg.firstEntryTime = entry.createTime;
                if (t.createTime > agg.lastExitTime) agg.lastExitTime = t.createTime;
                byKey.set(key, agg);

                remainingQty -= matchQty;
                head.remainingQty -= matchQty;
                if (head.remainingQty <= 0) openLegs.shift();
            }

            if (remainingQty > 0) {
                openLegs.push({ trade: t, type: t.transactionType, remainingQty });
            }
        }
    }

    const paired: PairedTrade[] = [];
    for (const [key, a] of byKey) {
        const entryPrice = a.entryValue / a.qty;
        const exitPrice = a.exitValue / a.qty;
        const multiplier = getSymbolMultiplier(a.entry.tradingSymbol);

        const pnl = a.isLong
            ? (exitPrice - entryPrice) * a.qty * multiplier
            : (entryPrice - exitPrice) * a.qty * multiplier;
        const totalAmount = entryPrice * a.qty * multiplier;
        const pnlPercent = totalAmount > 0 ? (pnl / totalAmount) * 100 : 0;

        const entryAt = parseDhanTime(a.firstEntryTime);
        const exitAt = parseDhanTime(a.lastExitTime);

        paired.push({
            symbol: a.entry.tradingSymbol,
            date: entryAt.date,
            type: a.isLong ? "long" : "short",
            quantity: a.qty,
            entryPrice: round2(entryPrice),
            exitPrice: round2(exitPrice),
            entryTime: entryAt.time,
            exitTime: exitAt.time,
            pnl: round2(pnl),
            pnlPercent: round2(pnlPercent),
            totalAmount: round2(totalAmount),
            orderId: key,
            entryOrderId: a.entry.orderId,
            exitOrderId: a.exit.orderId,
            exchangeSegment: a.entry.exchangeSegment,
            productType: a.entry.productType,
            brokerage: 47.5,
        });
    }

    return paired;
}

/* ──────────────────── Convert paired trade → app trade shape ──────────────────── */
export function mapToAppTrade(paired: PairedTrade, userId: string) {
    // NB: date is a "YYYY-MM-DD" string in IST, not a Date.
    return {
        user: userId,
        symbol: paired.symbol.replace(/^NIFTY/, "NIFTY 50"),
        date: paired.date,
        type: paired.type,
        quantity: paired.quantity,
        entryPrice: paired.entryPrice,
        exitPrice: paired.exitPrice,
        entryTime: paired.entryTime,
        exitTime: paired.exitTime,
        totalAmount: paired.totalAmount,
        pnl: paired.pnl,
        pnlPercent: paired.pnlPercent,
        strategy: "Dhan Import",
        outcome: paired.pnl >= 0 ? "success" : "failure",
        entryConfidence: 5,
        satisfaction: 5,
        emotionalState: "",
        mistakes: [],
        notes: `Auto-imported from Dhan (${paired.exchangeSegment}, ${paired.productType})`,
        lessonsLearned: "",
        images: [],
        source: "dhan",
        brokerOrderId: paired.orderId,
        brokerage: paired.brokerage,
    };
}
