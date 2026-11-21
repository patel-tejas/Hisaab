# Hisaab: competitor scan and easy-to-ship features

*Researched 21 Nov 2026 with Exa (web search and fetch). Builds on [Hisaab upgrade opportunities.md](./Hisaab%20upgrade%20opportunities.md). Code claims were re-checked against `feat/skills` HEAD (`1dc870d`). Competitor facts come from vendors' own pages. Several comparison pages are written by competing vendors, so treat feature lists as claims, not audits.*

## Summary

1. **The Indian lane is not empty.** The earlier doc looked only at open-source repos. A web search found at least seven India-focused journals, and most are free or cheap:
   - TradeMarkk (free), TradeDNA, CernoQuant, TradeDiary, TradeMind, Nexus Journal and OneTradeJournal.
   - TradesViz India is the mature paid option.
   - A **charges-aware net P&L, a broker tradebook import and an F&O tax pack are now table stakes**, not differentiators.
2. **Hisaab's edge is real but not unique, so execution matters.** Hisaab has guardrail-audited AI (`lib/ai/guardrail`), the Eve strategy builder with an honest verdict, paper trading and the kill switch. Others are near some of this: Tradoloom says the figures in its AI reviews are "inserted from your journal and checked", TradesViz's AI Coach runs 21 deterministic checks, and its backtester tests results for luck and robustness. What I did not find elsewhere is claim-level auditing of free-form LLM output combined with an India F&O focus. That is a narrow claim from marketing pages, so protect it by making the audit visible in the UI.
3. **The earlier doc's headline bugs are still in the code.** Every one marked below was re-checked at HEAD. Fix them before shipping features. (Logout, Firebase config and the encryption KDF were not re-checked.)
4. **Most of the cheap wins use data Hisaab already stores.** It has `stop_loss`, `target`, `trade_mistakes`, `emotional_state`, `entry_confidence`, `brokerage`, entry/exit times and the revenge-trade detector. No new infrastructure is needed.

## Still true at HEAD (fix first)

| Bug | Evidence |
|---|---|
| Change-password never checks `currentPassword` | `app/api/user/change-password/route.ts:6,23` |
| Ticker returns random-jittered fake prices flagged `valid: true` | `app/api/market-ticker/route.ts:107-114,154-157` |
| Demo credentials in the client bundle | `app/(marketing)/sign-in/page.tsx:11-12` |
| Screenshots use `getPublicUrl` and `Math.random()` names | `components/add-trade-modal.tsx:151,163` |
| Planner cache uses one `localStorage` key for all users | `app/dashboard/planner/page.tsx:34` (`CACHE_KEY = "ai-planner-cache"`) |
| Dhan dedupe key is the *entry* order ID, so two partial exits collide on the unique index | `lib/brokers/dhan.ts:173,228`; `supabase_schema.sql:126-128` |
| Tools page is four inert cards and is not in the sidebar | `app/dashboard/tools/page.tsx`, `components/app-sidebar.tsx:32-45` |
| Calendar shows a hard-coded `avgRR: "1:2.4"` | `app/dashboard/calendar/page.tsx:65` |
| No CI, no `.github/` | repo root |

Three of these (change-password, planner key, ticker) are single-file fixes under an hour each.

## What competitors ship, and what is cheap to copy

| Feature | Who has it | Hisaab today |
|---|---|---|
| Net P&L after Indian charges (STT, exchange, SEBI, GST, stamp) | TradeDNA, TradeMarkk, CernoQuant, TradesViz, TradeDiary, OneTradeJournal | Gross only. `brokerage` is stored but unused, and Dhan hard-codes ₹47.5 |
| Tradebook CSV import (Zerodha, Dhan, Upstox, Groww, Fyers, Angel One) | All of the above | None. Only today's Dhan trades can be pulled |
| Mistake cost in rupees ("revenge trade −₹18,400") | TradeMarkk, TradeDNA | The `trade_mistakes` table exists but is never turned into ₹ |
| Tilt and discipline score (0–100) | TradeDNA, Edgewonk Tiltmeter, Tradoloom, Blacklog, KMF | Revenge detector and emotion buckets exist, with no score |
| Daily loss limit and max-trades guard | Blacklog (warn at 80%, block at 100%), TradeMind Guardian, RB Trading | None (the Eve kill switch covers algo strategies only) |
| Position-size, R:R and lot calculators | Blacklog (free on all tiers), EDGE Pro, KMF, RB Trading | Stub page |
| R-multiple and expectancy | KMF, Tradoloom, TradeMind, journedge | Stop loss is stored, R is never computed |
| Playbook with pre-trade checklist and adherence score | EDGE Pro, Blacklog, TradeMind, Tradoloom, RB Trading, TraderMemos | `strategies` has name, description and tags only |
| Guided weekly review | Edgewonk (Edge Finder), Tradoloom, KMF, EDGE Pro | Daily planner only |
| F&O turnover, speculative split and ITR-3 pack | TradeMarkk, CernoQuant, TradeDiary | None |
| Expiry-aware analytics | TradesViz, TradeDiary, TradeDNA | None |
| Shareable P&L cards, PDF and DOCX reports | RB Trading, Blacklog, Tradervue | None |
| Hosted MCP for ChatGPT or Claude | TradesViz | None (Eve is internal) |

## Ranked list: easiest first

Effort assumes one developer who knows this codebase.

### A. Ship in a day or less (no schema change)

| # | Feature | Notes |
|---|---|---|
| A1 | **Real Tools page.** Position size (risk % × account ÷ \|entry − SL\|), R:R, compounding, and F&O lot calculators. Add it to the sidebar. | Pure client code. Lot sizes below. |
| A2 | **R-multiple per trade, average R, and expectancy in R.** Replace the calendar `avgRR` and add weekly totals. | R = pnl ÷ (\|entry − stop\| × qty). Skip trades with no stop loss and say how many were skipped. |
| A3 | **Mistake cost card.** Group P&L by `trade_mistakes.mistake` and show the rupee cost of each habit. | Data already exists. This is the single most shareable insight in the Indian competitors' pitches. |
| A4 | **CSV export** of trades, plus a **privacy mode** that masks ₹ values. | Both are small client features. |
| A5 | **Cmd-K palette.** | `cmdk` is a dependency but no `components/ui/command.tsx` exists, so add the shadcn command component first. |
| A6 | **Discipline score (0–100).** A deterministic blend of revenge-trade rate, trades with a stop loss, trades outside your own plan, and overtrading days. | Reuses `compute-metrics.ts`. Feed it to the guardrail fact sheet so the AI can cite it. |

### B. One to three days (small schema or a new pure module)

| # | Feature | Notes |
|---|---|---|
| B1 | **Indian charges engine, net P&L everywhere, and a "charges ate X% of gross" card.** A pure function with an *effective-dated* rate table, covered by a `verify:charges` script in the style of `verify:ai`. | See the rates section. Needs an instrument type (see risks). Brokerage is a per-broker setting, not a constant. |
| B2 | **Daily loss limit and max-trades-per-day.** Warn at 80% and block the "Add trade" save at 100%, with an override. | Store on `profiles` as a jsonb column or a small table. The block only protects journaling, not orders, so Hisaab stays read-only. |
| B3 | **Weekly review.** Run the existing guardrailed AI generator over the week's facts plus a short reflection box. | Copies the shape of the planner and insights pipelines. |
| B4 | **Playbook checklists.** Add `rules jsonb` to `strategies` and a `trade_rule_checks` table. Show the checklist in the add-trade modal, then show followed-vs-broken P&L. | Rule adherence is the most-copied process metric. Colouring calendar days gold when you won but broke a rule (EDGE Pro) is an extra half day. |
| B5 | **Shareable P&L card** (PNG from a server route). | Cheap marketing. Respect privacy mode. |

### C. About a week

| # | Feature | Notes |
|---|---|---|
| C1 | **Zerodha and Dhan tradebook CSV import.** Auto-detect the format, pair fills FIFO, dedupe by order ID, and report a skipped-row count. | Highest value after net P&L. Fix the Dhan partial-exit dedupe key at the same time, because the importer needs the same fix. Add other brokers one at a time. |
| C2 | **Expiry analytics.** P&L by expiry day and by days-to-expiry band, plus expiry markers on the calendar. | Depends on parsing underlying, strike and expiry from the symbol. |
| C3 | **F&O turnover and ITR-3 helper.** Turnover, speculative vs non-speculative split, and an audit-threshold flag. | Verify the turnover formula with a CA before launch. Label the output "not tax advice". |

### D. Later or not worth it

| Feature | Why |
|---|---|
| Trade replay and 70+ indicator backtesting | TradesViz and TradeZella have years of head start. Hisaab's Eve strategies and paper trading already cover the "test an idea" story. |
| Broker hard lock, Chrome extension capturing orders | Moves Hisaab toward order control. This conflicts with the read-only stance that keeps it clear of SEBI's retail algo rules (the earlier doc flags that reading as needing confirmation). |
| Prop-firm trackers (FTMO and similar) | Forex and US-centric. Little Indian demand. |
| Native mobile apps | Do a PWA first. |
| XP, badges and streaks | Cheap, but it dilutes the "trustworthy numbers" positioning. Optional polish. |
| Read-only Hisaab MCP | Real differentiation, but it needs personal access tokens and a hosted endpoint. Do it after B1 and C1 so the data is worth querying. |

## Reference: facts needed for B1 and A1

Verified on 21 Nov 2026. The STT change is **not** in the earlier doc and a naive engine will get it wrong.

- **STT rose on 1 April 2026** (Finance Act 2026, NSE circular `NSE/FATAX/73524`):
  - Options sale: 0.10% → **0.15%** of premium.
  - Options exercised: 0.125% → **0.15%** of intrinsic value (paid by the purchaser).
  - Futures sale: 0.02% → **0.05%**.
  - Equity intraday: 0.025% on the sell side (unchanged).
  - Equity delivery: 0.1% on buy and sell (unchanged).
  - So the rate table must be keyed by trade date, and 2025-26 trades need the old rates.
- **Other levies** (NSE page and Zerodha's charge page):
  - SEBI fee is ₹10 per crore.
  - Stamp duty is on the buy side: futures 0.002%, options 0.003%, intraday equity 0.003%, delivery 0.015%.
  - GST is 18% on brokerage + SEBI fee + exchange charges (not on STT or stamp duty).
  - NSE exchange charge: options 0.03553% of premium, futures 0.00183%, equity 0.00307%. Exchanges revise these, so keep them in the editable table.
- **Brokerage examples (Zerodha):** options flat ₹20 per order. Futures and intraday are the lower of 0.03% or ₹20 per order.
- **Index lot sizes** (NSE circular `NSE/FAOP/70616`, effective 28 Oct 2025):
  - NIFTY 65, BANKNIFTY 30, FINNIFTY 60, MIDCPNIFTY 120, NIFTYNXT50 25.
  - One aggregator page says Sensex goes 20 → 25 from January 2027. Treat that as unconfirmed.
  - Lot sizes change by contract month, so store them effective-dated and not as constants. Some competitor pages still show the old NIFTY 75, so don't copy lot sizes from them.

## Risks and open questions

- **Instrument type is not stored.** `trades` has `symbol`, `quantity` and prices, but no segment (equity, futures, option), strike, expiry or lot size. B1, C2 and C3 all need it. Either parse it from the symbol (check what Dhan returns first) or add an `instrument_type` column. Decide this once and before B1.
- **P&L has no fees today.** `pnl` and `pnl_percent` are stored values. Decide whether net P&L is a computed view (preferred, so rates can be corrected later) or a stored column.
- **There are two metrics engines** (`app/api/dashboard/route.ts` and `lib/ai/insights/compute-metrics.ts`). Adding R-multiple, discipline score and net P&L to both doubles the work. Put new metrics in `compute-metrics.ts` and have the dashboard call it.
- **`my-app/` is a committed copy of the whole app** (a submodule at `e635444`). Search and edit in the repo root, or you will change the wrong tree.
- **Competitor facts are marketing claims.** A paid user survey is still missing, as the earlier doc noted.

## Suggested order

1. The three one-file P0 fixes (change-password, planner key, ticker). Then screenshot privacy and demo credentials.
2. **A1, A2, A3.** About two days. They visibly upgrade the product and need no schema.
3. Decide the instrument-type question, then **B1** (net P&L).
4. **C1** (tradebook import) with the Dhan dedupe fix.
5. **B2, B4, B3**, then **A6** and the discipline-score story on the guardrail fact sheet.

## Status of the A-list (updated after implementation)

Built on `feat/skills`, not committed. Verified with `npm run verify:journal` (23 checks), the existing `verify:ai` and `verify:spec`, `tsc` (0 errors), a react-doctor scan of the changed files (clean), and a server-render smoke test, in an isolated copy, of the Tools page and the discipline card only. Never exercised: the Cmd+K palette (open, filter, select), the CSV download, and the dashboard API against real data. Nothing was clicked through in a browser with a signed-in account, because the repo has no `.env.local`.

| # | Status | What changed |
|---|---|---|
| A1 | Shipped | `/dashboard/tools` is now four working calculators: position size, risk to reward, F&O lots, compounding (plus a drawdown-recovery table). It is in the sidebar. NSE index lot sizes only (circular `NSE/FAOP/70616`); Sensex left out because its January 2027 revision is unconfirmed. |
| A2 | Shipped, scope reduced | Real average R replaces the calendar's `1:2.4` placeholder, and each trade in the day view shows its R. R is computed from prices, not stored P&L. Trades with no usable stop are skipped and counted on the card. **Weekly totals already existed** on the calendar, so nothing was added there. |
| A3 | Shipped, scope reduced | Analytics "Common Mistakes Impact" now shows rupee cost beside the count. **AI Insights already charted mistake cost in rupees**; the gap was the Analytics tab. |
| A4 | Half shipped | CSV export on the Trades page (exports the filtered rows, adds charges, net P&L and R, guards against spreadsheet formula injection). **Privacy mode is deferred.** There are about 93 rupee render sites in 28 files outside marketing (Reports alone has 32, with chart tick and tooltip formatters). A partial blur would leak on the next page, which is worse than no toggle. It needs a shared `<Money>` component and a full pass. |
| A5 | Shipped | Cmd/Ctrl+K palette (pages and two actions) and a Search button in the header. The sidebar, header title and palette now read one list, `lib/nav.ts`. This also fixed the header showing "Dashboard" on the Agent and Strategies pages. |
| A6 | Shipped, scope reduced | Discipline score card on the dashboard, plus the same number in the AI insights fact sheet and prompt so the guardrail accepts it. The proposed "trades outside your own plan" component was **dropped**: the journal has no plan field yet (it arrives with Playbooks, B4). |

### Things that changed behaviour (read before merging)

- **The AI Insights radar's "Discipline" skill now uses the new score** when the journal has 5+ trades (it used a cruder overtrading and mistake formula). That also moves `compositeScore`, and so the AI's `confidenceScore` verdict, for existing users. Revert by passing `disciplineScore: null` in `deriveSkillScores`.
- **The dashboard score uses all trades; AI Insights uses the last 365 days, capped at 500.** For older or larger journals the two numbers can differ. The dashboard card says "Across all N trades".
- **"No Mistakes" is no longer counted as a mistake** in the AI metrics (`mistakeRate` and the mistake cost chart). Reports already excluded it.
- **The Revenge Trades card** is now fed by the shared detector. It is no longer capped at 10 events (the old cap made the count and "% of trades" wrong for heavy revengers) and lists the newest first.
- The calendar's `AVG. R:R` card is now `AVG. R`.

### Still open
- ESLint cannot run: `eslint.config.mjs` imports `@eslint/eslintrc`, which is not a dependency (pre-existing).
- The Dashboard "Avg R:R" card is the average win divided by the average loss (a payoff ratio), not R. It is correct but misnamed.
- The header's search hint says "Ctrl K" on every platform. Cmd+K also works on Mac.
