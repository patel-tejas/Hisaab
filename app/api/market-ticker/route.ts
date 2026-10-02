import { NextResponse } from "next/server";

/**
 * Index, commodity and crypto quotes for the dashboard ticker.
 *
 * Source: Yahoo Finance's public chart endpoint, which is unofficial and
 * delayed. When a quote cannot be fetched it is returned with
 * `valid: false` and no price. This route never invents a number.
 *
 * Gold, silver and crude are COMEX/NYMEX USD futures, not MCX contracts,
 * and are labelled that way.
 */

interface TickerItem {
  symbol: string;
  label: string;
  currency: "INR" | "USD";
  price: number | null;
  change: number | null;
  percent: number | null;
  valid: boolean;
  source: "yahoo" | "unavailable";
  asOf: string | null;
}

const SYMBOLS: { symbol: string; label: string; yahoo: string; currency: "INR" | "USD" }[] = [
  { symbol: "NSE:NIFTY", label: "NIFTY", yahoo: "^NSEI", currency: "INR" },
  { symbol: "NSE:BANKNIFTY", label: "BANKNIFTY", yahoo: "^NSEBANK", currency: "INR" },
  { symbol: "BSE:SENSEX", label: "SENSEX", yahoo: "^BSESN", currency: "INR" },
  { symbol: "NSE:MIDCPNIFTY", label: "MIDCPNIFTY", yahoo: "^CRSLMID", currency: "INR" },
  { symbol: "NSE:FINNIFTY", label: "FINNIFTY", yahoo: "NIFTY_FIN_SERVICE.NS", currency: "INR" },
  { symbol: "COMEX:GC", label: "GOLD (COMEX)", yahoo: "GC=F", currency: "USD" },
  { symbol: "COMEX:SI", label: "SILVER (COMEX)", yahoo: "SI=F", currency: "USD" },
  { symbol: "NYMEX:CL", label: "CRUDE (NYMEX)", yahoo: "CL=F", currency: "USD" },
  { symbol: "CRYPTO:BTCUSD", label: "BTC", yahoo: "BTC-USD", currency: "USD" },
  { symbol: "CRYPTO:ETHUSD", label: "ETH", yahoo: "ETH-USD", currency: "USD" },
  { symbol: "CRYPTO:SOLUSD", label: "SOL", yahoo: "SOL-USD", currency: "USD" },
];

const FETCH_TIMEOUT_MS = 6000;
const round2 = (n: number) => Math.round(n * 100) / 100;

async function fetchQuote(s: (typeof SYMBOLS)[number]): Promise<TickerItem> {
  const unavailable: TickerItem = {
    symbol: s.symbol, label: s.label, currency: s.currency,
    price: null, change: null, percent: null,
    valid: false, source: "unavailable", asOf: null,
  };

  try {
    const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s.yahoo)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return unavailable;

    const meta = (await res.json())?.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    const prevClose = Number(meta?.chartPreviousClose ?? meta?.previousClose);
    if (!Number.isFinite(price) || price <= 0) return unavailable;

    const hasPrev = Number.isFinite(prevClose) && prevClose > 0;
    const change = hasPrev ? price - prevClose : null;
    const marketTime = Number(meta?.regularMarketTime);

    return {
      symbol: s.symbol, label: s.label, currency: s.currency,
      price: round2(price),
      change: change === null ? null : round2(change),
      percent: change === null ? null : round2((change / prevClose) * 100),
      valid: true,
      source: "yahoo",
      asOf: Number.isFinite(marketTime) && marketTime > 0 ? new Date(marketTime * 1000).toISOString() : null,
    };
  } catch (error) {
    console.error(`Ticker fetch failed for ${s.symbol}:`, (error as Error)?.message);
    return unavailable;
  }
}

export async function GET() {
  const data = await Promise.all(SYMBOLS.map(fetchQuote));
  const available = data.filter((d) => d.valid).length;

  return NextResponse.json({
    success: available > 0,
    data,
    available,
    count: data.length,
    delayed: true,
    source: "Yahoo Finance (unofficial, delayed)",
    timestamp: new Date().toISOString(),
  });
}
