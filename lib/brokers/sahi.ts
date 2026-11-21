/**
 * Sahi Broker API Service (Aaritya Broking Private Limited)
 * Docs: https://docs.sahi.com/
 * Auth Base URL: https://apis.sahi.com
 * API Base URL:  https://direct.sahi.com/v1
 */

import crypto from "crypto";
import { pairTrades, type DhanRawTrade, type PairedTrade } from "@/lib/brokers/dhan";

const SAHI_AUTH_BASE = "https://apis.sahi.com";
const SAHI_API_BASE = "https://direct.sahi.com/v1";

/* ──────────────────── Types ──────────────────── */

export interface SahiStoredCredentials {
    secret: string;          // sahi_sk_...
    totpSecret?: string;     // Optional Base32 setup key for unattended TOTP keys
    cachedToken?: string;    // Last minted Bearer JWT
    tokenExpiresAt?: string; // ISO timestamp (expires daily at 06:00 IST)
}

export interface SahiTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    expires_at: string;
    scope?: string;
}

export interface SahiOrder {
    order_id: string;
    exchange_order_id?: string | null;
    exchange_segment: string; // NSE | NFO | BSE | BFO
    symbol: string;
    txn_type: "B" | "S";
    order_type: string;       // LMT | MKT | SL-LMT | SL-MKT
    product: string;          // C | I | M | F
    validity: string;
    qty: number;
    filled_qty: number;
    price: number;            // integer paise
    avg_price: number;        // integer paise
    status: string;
    created_at: number;       // epoch ms
    placed_at?: number | null;
    completed_at?: number | null;
    last_modified_at: number;
}

export interface SahiFill {
    exchange_trade_id: string;
    order_id: string;
    exchange_order_id?: string;
    exchange_segment: string; // NSE | NFO | BSE | BFO
    symbol: string;
    txn_type: "B" | "S";
    product: string;          // C | I | M | F
    qty: number;              // units filled by this specific trade
    price: number;            // integer paise
    traded_at: number;        // epoch ms
}

export class SahiApiError extends Error {
    status: number;
    code?: string;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = "SahiApiError";
        this.status = status;
        this.code = code;
    }
}

/* ──────────────────── RFC 6238 TOTP Helper (Zero Dependencies) ──────────────────── */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(input: string): Buffer {
    const cleaned = input.toUpperCase().replace(/[\s\-=]/g, "");
    if (!cleaned) {
        throw new Error("TOTP setup key cannot be empty");
    }

    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (const char of cleaned) {
        const idx = BASE32_ALPHABET.indexOf(char);
        if (idx === -1) {
            throw new Error("Invalid Base32 character in TOTP setup key");
        }
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }

    return Buffer.from(bytes);
}

/**
 * Computes a 6-digit RFC 6238 TOTP code (SHA-1, 30s step) from a Base32 setup key.
 */
export function generateTotpCode(base32Secret: string, nowMs = Date.now()): string {
    const key = decodeBase32(base32Secret);
    const counter = Math.floor(nowMs / 1000 / 30);
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    counterBuf.writeUInt32BE(counter >>> 0, 4);

    const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    return (binary % 1_000_000).toString().padStart(6, "0");
}

/* ──────────────────── Credential Serialization ──────────────────── */

export function parseSahiCredentials(decrypted: string): SahiStoredCredentials {
    try {
        const parsed = JSON.parse(decrypted);
        if (parsed && typeof parsed.secret === "string") {
            return parsed as SahiStoredCredentials;
        }
    } catch {
        // Fallback if a raw secret string was stored directly
    }
    return { secret: decrypted };
}

export function serializeSahiCredentials(creds: SahiStoredCredentials): string {
    return JSON.stringify(creds);
}

/* ──────────────────── Auth & Token Minting ──────────────────── */

async function parseErrorBody(res: Response): Promise<{ code?: string; message?: string; raw: string }> {
    const raw = await res.text();
    try {
        const parsed = JSON.parse(raw);
        return {
            code: parsed?.code || parsed?.error?.code || parsed?.error,
            message: parsed?.message || parsed?.error?.message || parsed?.detail,
            raw,
        };
    } catch {
        return { raw };
    }
}

export async function mintSahiAccessToken(params: {
    keyId: string;
    secret: string;
    totp?: string;
    scopes?: string[];
}): Promise<SahiTokenResponse> {
    const payload: Record<string, unknown> = {
        key_id: params.keyId.trim(),
        secret: params.secret.trim(),
        scopes: params.scopes ?? ["orders.read"],
    };

    const trimmedTotp = params.totp?.trim();
    if (trimmedTotp) {
        payload.totp = trimmedTotp;
    }

    const res = await fetch(`${SAHI_AUTH_BASE}/api/v1/apikeys/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const err = await parseErrorBody(res);
        const code = err.code || "";

        if (res.status === 401 || code === "Unauthorized") {
            throw new SahiApiError(
                "Invalid Sahi API Key ID or Secret. Double-check your pk_... key ID and sahi_sk_... secret.",
                401,
                code
            );
        }

        if (res.status === 403) {
            throw new SahiApiError(
                "Your Sahi API key is not approved for today (keys reset at 6:00 AM IST) or lacks 'orders.read' access. Open web.sahi.com → Profile → API Dashboard, click Approve, and try again.",
                403,
                code
            );
        }

        if (code === "InvalidTotp") {
            throw new SahiApiError(
                "Invalid 6-digit TOTP code. Make sure your authenticator code or TOTP Setup Key is correct.",
                400,
                code
            );
        }

        if (code === "InvalidRequest" || res.status === 400) {
            const detail = err.message || err.raw;
            if (/totp/i.test(detail)) {
                throw new SahiApiError(
                    "TOTP mismatch: TOTP keys require a 6-digit TOTP code (or TOTP Setup Key), while Regular keys must not include a TOTP code.",
                    400,
                    code
                );
            }
            if (/scope/i.test(detail)) {
                throw new SahiApiError(
                    "Your Sahi API key does not have 'orders.read' permission. Create a key with Full access in the Sahi API Dashboard.",
                    400,
                    code
                );
            }
            throw new SahiApiError(`Sahi authentication failed: ${detail}`, 400, code);
        }

        if (res.status === 429) {
            throw new SahiApiError(
                code === "MintLimitReached"
                    ? "Daily Sahi token mint limit (100/day) reached. Resets at 6:00 AM IST."
                    : "Too many Sahi token requests. Please wait 60 seconds and try again.",
                429,
                code
            );
        }

        throw new SahiApiError(
            `Sahi auth error (${res.status}): ${err.message || err.raw}`,
            res.status,
            code
        );
    }

    const data = (await res.json()) as SahiTokenResponse;
    if (!data?.access_token) {
        throw new SahiApiError("Sahi auth returned an empty access token.", 500);
    }
    return data;
}

function isTokenFresh(expiresAt?: string): boolean {
    if (!expiresAt) return false;
    const expMs = Date.parse(expiresAt);
    if (Number.isNaN(expMs)) return false;
    // Refresh if within 2 minutes of expiry (06:00 IST)
    return expMs - Date.now() > 2 * 60 * 1000;
}

export async function resolveSahiAccessToken(
    keyId: string,
    stored: SahiStoredCredentials,
    options?: { totpOverride?: string; forceRefresh?: boolean }
): Promise<{
    accessToken: string;
    updatedCredentials: SahiStoredCredentials;
    minted: boolean;
}> {
    if (!options?.forceRefresh && stored.cachedToken && isTokenFresh(stored.tokenExpiresAt)) {
        return {
            accessToken: stored.cachedToken,
            updatedCredentials: stored,
            minted: false,
        };
    }

    let totp = options?.totpOverride?.trim();
    if (!totp && stored.totpSecret) {
        totp = generateTotpCode(stored.totpSecret);
    }

    const tokenRes = await mintSahiAccessToken({
        keyId,
        secret: stored.secret,
        totp,
        scopes: ["orders.read"],
    });

    const updatedCredentials: SahiStoredCredentials = {
        ...stored,
        cachedToken: tokenRes.access_token,
        tokenExpiresAt: tokenRes.expires_at,
    };

    return {
        accessToken: tokenRes.access_token,
        updatedCredentials,
        minted: true,
    };
}

/* ──────────────────── API Helpers ──────────────────── */

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sahiGet<T>(path: string, accessToken: string): Promise<T> {
    const attempt = async () =>
        fetch(`${SAHI_API_BASE}${path}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
            },
        });

    let res = await attempt();

    // Respect Sahi's 429 Retry-After (up to 5s) once on read calls
    if (res.status === 429) {
        const retryAfterSec = Number(res.headers.get("Retry-After") || "1");
        if (Number.isFinite(retryAfterSec) && retryAfterSec > 0 && retryAfterSec <= 5) {
            await sleep(retryAfterSec * 1000);
            res = await attempt();
        }
    }

    if (!res.ok) {
        const err = await parseErrorBody(res);
        if (res.status === 401) {
            throw new SahiApiError(
                "Sahi access token expired or revoked. Please re-approve your key on web.sahi.com and sync again.",
                401,
                err.code
            );
        }
        if (res.status === 403) {
            throw new SahiApiError(
                "Sahi API key lacks 'orders.read' permission. Create a Full access key in Sahi API Dashboard.",
                403,
                err.code
            );
        }
        throw new SahiApiError(
            `Sahi API error (${res.status}): ${err.message || err.raw}`,
            res.status,
            err.code
        );
    }

    return (await res.json()) as T;
}

/**
 * Verifies Sahi credentials by minting an orders.read token and reading today's order book.
 */
export async function verifySahiCredentials(params: {
    keyId: string;
    secret: string;
    totp?: string;
    totpSecret?: string;
}): Promise<{ accessToken: string; expiresAt: string }> {
    let totp = params.totp?.trim();
    if (!totp && params.totpSecret?.trim()) {
        totp = generateTotpCode(params.totpSecret.trim());
    }

    const tokenRes = await mintSahiAccessToken({
        keyId: params.keyId,
        secret: params.secret,
        totp,
        scopes: ["orders.read"],
    });

    // Confirm the minted token actually works against direct.sahi.com/v1/orders
    await sahiGet<{ orders?: SahiOrder[] }>("/orders", tokenRes.access_token);

    return {
        accessToken: tokenRes.access_token,
        expiresAt: tokenRes.expires_at,
    };
}

/* ──────────────────── Fetch Today's Trades ──────────────────── */

const SAHI_PRODUCT_MAP: Record<string, string> = {
    C: "CNC",
    I: "INTRADAY",
    M: "MARGIN",
    F: "MTF",
};

function mapProductCode(code: string): string {
    return SAHI_PRODUCT_MAP[code] || code;
}

/**
 * Fetches all executed fills for the current trading day via Sahi's 2-step flow:
 *   1. GET /v1/orders
 *   2. For each order with filled_qty > 0: GET /v1/orders/{order_id}/trades
 *
 * Converts prices from integer paise to rupees and normalizes into our shared execution format.
 */
export async function fetchSahiTrades(accessToken: string, keyId = ""): Promise<DhanRawTrade[]> {
    const orderBook = await sahiGet<{ orders?: SahiOrder[] }>("/orders", accessToken);
    const orders = Array.isArray(orderBook?.orders) ? orderBook.orders : [];

    const filledOrders = orders.filter((o) => (o.filled_qty ?? 0) > 0);
    if (filledOrders.length === 0) return [];

    const normalized: DhanRawTrade[] = [];

    // Pace requests in batches of 4 to stay safely under Sahi's 5 req/sec read pool
    const BATCH_SIZE = 4;
    for (let i = 0; i < filledOrders.length; i += BATCH_SIZE) {
        if (i > 0) {
            await sleep(260);
        }
        const batch = filledOrders.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
            batch.map(async (order) => {
                try {
                    const res = await sahiGet<{ trades?: SahiFill[] }>(
                        `/orders/${encodeURIComponent(order.order_id)}/trades`,
                        accessToken
                    );
                    return { order, fills: Array.isArray(res?.trades) ? res.trades : [] };
                } catch (err) {
                    // Re-throw auth errors immediately; fall back to order avg_price on transient order lookup issues
                    if (err instanceof SahiApiError && (err.status === 401 || err.status === 403)) {
                        throw err;
                    }
                    return { order, fills: [] as SahiFill[] };
                }
            })
        );

        for (const { order, fills } of batchResults) {
            if (fills.length > 0) {
                for (const fill of fills) {
                    const isoTime = new Date(fill.traded_at || order.completed_at || order.last_modified_at).toISOString();
                    normalized.push({
                        dhanClientId: keyId,
                        orderId: `sahi:${fill.order_id}`,
                        exchangeOrderId: fill.exchange_order_id || order.exchange_order_id || "",
                        transactionType: fill.txn_type === "B" ? "BUY" : "SELL",
                        exchangeSegment: fill.exchange_segment || order.exchange_segment,
                        productType: mapProductCode(fill.product || order.product),
                        orderType: order.order_type,
                        tradingSymbol: fill.symbol || order.symbol,
                        securityId: fill.exchange_trade_id || fill.order_id,
                        tradedQuantity: fill.qty,
                        tradedPrice: Math.round(fill.price) / 100, // paise → rupees
                        createTime: isoTime,
                        updateTime: isoTime,
                        exchangeTime: isoTime,
                    });
                }
            } else if (order.filled_qty > 0 && order.avg_price > 0) {
                // Fallback to order-level summary if /trades returned empty
                const isoTime = new Date(order.completed_at || order.last_modified_at || order.created_at).toISOString();
                normalized.push({
                    dhanClientId: keyId,
                    orderId: `sahi:${order.order_id}`,
                    exchangeOrderId: order.exchange_order_id || "",
                    transactionType: order.txn_type === "B" ? "BUY" : "SELL",
                    exchangeSegment: order.exchange_segment,
                    productType: mapProductCode(order.product),
                    orderType: order.order_type,
                    tradingSymbol: order.symbol,
                    securityId: order.order_id,
                    tradedQuantity: order.filled_qty,
                    tradedPrice: Math.round(order.avg_price) / 100, // paise → rupees
                    createTime: isoTime,
                    updateTime: isoTime,
                    exchangeTime: isoTime,
                });
            }
        }
    }

    return normalized;
}

/* ──────────────────── Pair & Map to App Trade ──────────────────── */

function estimateSahiBrokerage(paired: PairedTrade): number {
    // Sahi brokerage: flat ₹10/order on F&O (₹20 round-trip); ₹10 or 0.05% per order on Equity
    if (paired.exchangeSegment === "NFO" || paired.exchangeSegment === "BFO") {
        return 20;
    }
    const entryVal = paired.entryPrice * paired.quantity;
    const exitVal = paired.exitPrice * paired.quantity;
    const entryFee = Math.min(10, entryVal * 0.0005);
    const exitFee = Math.min(10, exitVal * 0.0005);
    return Math.round((entryFee + exitFee) * 100) / 100;
}

export function pairSahiTrades(rawTrades: DhanRawTrade[]): PairedTrade[] {
    return pairTrades(rawTrades).map((t) => ({
        ...t,
        brokerage: estimateSahiBrokerage(t),
    }));
}

export function mapSahiToAppTrade(paired: PairedTrade, userId: string) {
    return {
        user: userId,
        symbol: paired.symbol.replace(/^NIFTY(?=\d|\s|$)/, "NIFTY 50"),
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
        strategy: "Sahi Import",
        outcome: paired.pnl >= 0 ? "success" : "failure",
        entryConfidence: 5,
        satisfaction: 5,
        emotionalState: "",
        mistakes: [],
        notes: `Auto-imported from Sahi (${paired.exchangeSegment}, ${paired.productType})`,
        lessonsLearned: "",
        images: [],
        source: "sahi",
        brokerOrderId: paired.orderId,
        brokerage: paired.brokerage,
    };
}
