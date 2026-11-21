# Fix trust first, then own India's journal

Hisaab's best upgrade path has three steps, in order. **First, close a handful of real security and data-integrity bugs.** The worst are world-readable trade screenshots, a password change that never checks the current password, a Dhan sync that can silently import zero trades, and a market ticker that serves made-up prices labelled valid. **Second, make sync and P&L dependable.** That means a tradebook/contract-note CSV import, charge-accurate net P&L, R-multiples and a working Tools page, which every serious journal treats as table stakes. **Third, compete where nobody else is strong: Indian F&O.** That means first-principles SEBI charges, ITR-3/tax-audit output, auto-sync for more Indian brokers, and a read-only "Hisaab MCP" that pairs with the official Zerodha and Dhan MCP servers. The competitive picture favours this order. The Indian open-source journal niche is essentially empty: no Indian repo found has more than about 5 stars. The closest paid rival, TradesViz, already auto-syncs Zerodha, Angel One, Dhan and Fyers, tracks STT and GST, and ships an MCP server ([TradesViz India](https://www.tradesviz.com/in/trading-journal-india/)). So Hisaab cannot win on "AI journal with broker sync" alone. Hisaab's strongest asset is its new guardrailed AI layer, which checks every LLM claim against a deterministic fact sheet (`lib/ai/guardrail/auditor.ts`). That matches the industry's emerging rule, "the numbers are not AI" ([Trading-Journal-AI](https://github.com/simonro/Trading-Journal-AI)). It should become the base for auto-tagging, process-graded day reviews and post-market plan-vs-actual reviews, the features premium rivals charge $59–99 a month for ([TradeZella pricing](https://www.tradezella.com/blog/tradezella-pricing)).

*Codebase findings below come from a read-only audit of HEAD `18b93a3` (2 Oct 2026) and cite repo paths. Dependencies were not installed, so build, type-check and lint status is inferred, not run.*

## Seven bugs undercut a product that sells verified AI

Hisaab's database layer is solid. RLS is enabled on all seven tables, policies use `(select auth.uid())`, and the SECURITY DEFINER trigger lives in a private schema with `search_path=''` (`supabase_schema.sql:145-364`). The weaknesses sit around that core, in storage, auth flows and broker code. The most serious is **screenshot storage**. The setup script tells operators to create a *public* `trades` bucket (`check-buckets.js:27-28`). The trade modal uploads files under `Math.random()` names at the bucket root and stores `getPublicUrl` links, with no per-user folder, storage policy, or file-type or size check (`components/add-trade-modal.tsx:146-170`). Anyone with a URL can read a trader's chart screenshots, and any signed-in user can write to the bucket. Second, **`POST /api/user/change-password` accepts `currentPassword` but never verifies it** (`app/api/user/change-password/route.ts:6,23-26`). A hijacked session therefore becomes a full account takeover.

Two bugs damage data integrity directly. The **Dhan dedupe key is the entry order ID**. When one entry is closed by two partial exits, the pairing produces two rows with the same `broker_order_id`. That breaks the partial unique index (`supabase_schema.sql:126-128`). Because the rows go in as one batch, the whole insert fails, the error is only `console.error`ed, and the API still returns success with `imported: 0` (`lib/brokers/dhan.ts:173`; `app/api/broker/sync/route.ts:112-117`). Separately, the **market ticker** scrapes Yahoo's unofficial endpoint and maps "MCX" gold, silver and crude to COMEX/NYMEX USD futures. When the scrape fails, it returns hard-coded prices with a random ±1% "variation", flagged `valid: true` (`app/api/market-ticker/route.ts:20-23,88-115`). For a product whose recent PR was titled "verify AI insights … against trade data", showing invented prices is a contradiction.

Several smaller issues should be fixed in the same pass:

- **Demo account.** A real shared account's credentials sit in the client bundle, so any visitor can edit its data or attach a broker token to it (`app/(marketing)/sign-in/page.tsx:11-12`).
- **Planner cache.** The cache uses one fixed `localStorage` key for every user (`app/dashboard/planner/page.tsx:34-53`), so user B on the same browser can see user A's plan.
- **Logging.** `fetchDhanTrades` logs the entire raw broker response (`lib/brokers/dhan.ts:63`).
- **Error leaks.** Raw Supabase error messages are returned to clients (`app/api/broker/connect/route.ts:54,60`).
- **Encryption key.** The broker-token key is a bare SHA-256 of an env var, with no KDF, salt or key versioning (`lib/encryption.ts:1-36`).
- **Logout.** The logout API only clears a legacy cookie (`app/api/logout/route.ts:11-17`).
- **Rate limits.** Eve chat has none, despite allowing 12 tool steps and 300-second bridge calls (`app/api/eve/chat/route.ts:33-36,83`).
- **Leftover code.** A committed but unused Firebase config (`utils/firebase.ts`) should be deleted.

Most of these are an afternoon's work each. Together they decide whether Hisaab can honestly market itself as trustworthy.

## Half the promised product is a stub or a misdescription

The working core is real: Supabase auth, trade CRUD with psychology fields, a 673-line metrics engine, guardrailed Groq insights and planner, Dhan sync, and the Eve quant agent. Around that core, though, the product promises more than it delivers.

| Area | What exists | What the docs or UI claim |
|---|---|---|
| Trading Tools | Four static cards with no calculators, no onClick and no state (`app/dashboard/tools/page.tsx`). The page is also missing from the sidebar. | The PRD promises working position-sizing, R:R and compounding calculators. |
| Backtester | Aggregates the user's own journal trades by strategy tag (`app/dashboard/backtester/page.tsx:19-62`). | The PRD describes testing historical setups. |
| Brokers | Only Dhan works, via a pasted token that pulls *today's* trade book on a manual click (`lib/brokers/dhan.ts:46-65`). The other five brokers are "Coming Soon" cards. | The README says all six are integrated. |
| P&L | `brokerage` is stored, but neither metrics engine reads it, so every number is gross. Dhan imports hard-code ₹47.5 per trade (`lib/brokers/dhan.ts:176`). | The PRD promises automated brokerage calculation. |
| Calendar | Shows a hard-coded `avgRR: "1:2.4"` placeholder (`app/dashboard/calendar/page.tsx:65`). | |
| Import/export | No CSV import or export of trades exists. | Both are promised. |

The documentation is stale too. PRD.md still describes MongoDB, Mongoose, JWT and bcrypt. The README says auth uses NextAuth/Clerk. DESIGN.md is a scraped style reference for a different, real company ("Origin Financial"), which is a brand-distinctiveness risk.

The engineering base has gaps of its own:

- No test runner, no CI and no `.github/` directory. ESLint config references packages that are not installed.
- The package is still named `my-v0-project`, and stale `tsc` logs from another machine are committed.
- `/api/trades` returns every trade with joins, with no pagination, and each dashboard page re-aggregates client-side.
- Two metrics engines exist side by side: `/api/dashboard` and `lib/ai/insights/compute-metrics.ts`.
- Trade PUT replaces mistakes and images with delete-then-insert, outside a transaction.
- Times use server-local `toLocaleTimeString`, which shifts timestamps on UTC hosts (`lib/brokers/dhan.ts:158-169`).
- There is no forgot-password flow, no OAuth and no onboarding. Clickable broker cards are `div`s with no keyboard support.

The most consequential gap is that **only today's Dhan trades can be imported**. A trader who forgets to sync on a given day loses that day's trades for good, unless they re-enter them by hand. Reviews show this is exactly where trust breaks: TradeZella holds a 4.8/5 Trustpilot score, yet its most pointed complaints are about broker-sync reliability ([Trustpilot](https://www.trustpilot.com/review/tradezella.com)).

## Rivals converge on deterministic math, playbooks and agentic AI

Across the most active open-source journals, the same baseline recurs:

- a P&L calendar with weekly totals;
- FIFO round-trip reconstruction that handles partial exits and scale-ins;
- expectancy, profit factor and R-multiples;
- typed tags (setup, psych, mistake);
- multi-format CSV import with a column mapper.

The standout reference is **LuxAlgo/trade-journal**. It reached 394 stars within about six weeks of creation and is MIT-licensed Next.js. Its core math and importers are published as framework-free npm packages, `@luxalgo/journal-core` and `@luxalgo/journal-importers`. Those include a FIFO/LIFO/WAVG round-trip engine, 14 auto-detected statement formats (TradeZella and Tradervue migration among them), playbooks with followed-vs-broken analytics, candle replay with estimated MAE/MFE, voice-dictated journaling, and a privacy mode that masks money values ([LuxAlgo](https://github.com/LuxAlgo/trade-journal)). Hisaab can legally depend on these packages, and doing so would fix its partial-exit pairing bug at the root. **Playbook rule-adherence scoring** appears in at least four repos: LuxAlgo, TraderMemos, ai-trading-journal and journedge ([ai-trading-journal](https://github.com/Bilovodskyi/ai-trading-journal), [journedge](https://github.com/TheQuantum-Dev/journedge)). It is the most-copied "process" metric, and Hisaab's existing strategies table makes it cheap to add. journedge also models **pre-trade plans compared with execution**, a position-sizing calculator, Sortino/Calmar and risk-of-ruin metrics.

Commercial products have moved AI from chat to agents. TradeZella sells an Auto-Tagger that applies rules on import, a Session Review agent that compares the pre-market plan with results, and detection of "behavioral cascades (loss → FOMO → revenge trading)". All of it is metered by credits and gated to the $59 and $99 tiers ([TradeZella](https://www.tradezella.com/blog/the-only-ai-trading-tool-you-will-ever-need-in-2026)). TradesViz's AI Coach takes the opposite stance: it runs "21 deterministic checks" and exposes a hosted MCP for ChatGPT and Claude ([TradesViz vs TradeZella](https://www.tradesviz.com/tradesviz-vs-tradezella/)). On the open-source side, Trading-Journal-AI extracts strategy, stops, emotions and mistakes from **handwritten diary photos or screenshots**, matches them to fills, and grades each day on process, not P&L ([Trading-Journal-AI](https://github.com/simonro/Trading-Journal-AI)). Deltalytix, which runs on Hisaab's own stack (Next.js 16 + Supabase), offers **AI column mapping for arbitrary CSVs** ([Deltalytix](https://github.com/hugodemenez/deltalytix)). TraderMemos adds revocable share links, a "Year Wrapped" recap, and personal access tokens for MCP clients and scripts ([TraderMemos](https://github.com/sinhong2011/TraderMemos)).

Hisaab already has several of the hardest pieces:

- a guardrail auditor that rejects ungrounded LLM claims;
- a cached, hash-checked insights table;
- revenge-trade detection based on 30-minute gaps after a loss;
- emotion and confidence buckets.

The gap lies less in AI capability than in plumbing. Hisaab has no import path, no net P&L, no playbook model, and no post-market loop to close the PRD's "intent vs actual" promise.

## India-native correctness is the open lane

The Indian open-source cluster is small but technically deep:

- **khata** (Apache-2.0) has shipped Dhan auto-sync and recomputes STT, stamp duty, exchange charges, SEBI fee, IPFT and GST from first principles. It plans to support Groww, ICICI and HDFC through contract-note import, since those brokers have no retail API ([khata](https://github.com/khata-dev/khata)).
- **Vyuha** auto-detects eight Indian broker formats and ships per-broker rate cards and an effective-dated NSE calendar. Its ITR pack covers s.111A/112A heads, grandfathering FMV, advance tax and AIS reconciliation ([VYUHA-LOG](https://github.com/Thejesh-k463/VYUHA-LOG)).

Zerodha Console already splits capital gains before and after 23 July 2024 and reports segment turnover ([Zerodha](https://zerodha.com/z-connect/updates/tax-filing-simplified-with-zerodha-consoles-tax-reports)). Basic tax P&L is therefore a floor, not a premium feature. The urgency is real: SEBI found **over 91% of individual F&O traders lost money in FY25**, with aggregate net losses, transaction costs included, of **Rs 1,05,603 crore, up 41%** ([Business Standard](https://www.business-standard.com/markets/news/net-losses-of-traders-in-fo-widens-in-fy25-sebi-study-125070701221_1.html)). A "charges ate your edge" view and behaviour-loss attribution speak directly to that pain.

The broker landscape points to a two-track sync strategy. The Kite Connect personal tier is free for trades and positions, but tokens expire daily ([Zerodha](https://zerodha.com/z-connect/updates/free-personal-apis-from-kite-connect)). Any API sync therefore needs a one-tap daily re-auth flow, backed by end-of-day tradebook import. Zerodha also runs an official, MIT-licensed hosted MCP that can be restricted to read-only ([kite-mcp-server](https://github.com/zerodha/kite-mcp-server)). Dhan reportedly launched its own MCP in May 2026, though that comes from a community forum, not official docs ([MadeForTrade](https://madefortrade.in/t/official-dhan-mcp-server-for-direct-cloud-ai-integration-advanced-analysis/89843)). OpenAlgo puts 36 Indian broker plugins behind one API, but it is AGPL. Hisaab can run it as a separate service but should not vendor its code ([OpenAlgo](https://github.com/marketcalls/openalgo)).

Staying strictly **read-only** keeps Hisaab outside most of SEBI's retail algo obligations, such as algo IDs and order-rate thresholds. That framework has applied fully since 1 April 2026 ([Business Standard](https://www.business-standard.com/markets/news/sebi-extends-retail-algo-trading-framework-rollout-to-2026-125093000956_1.html)). This conclusion rests on a secondary reading of the circular and should be confirmed against each broker's API terms.

Two strategic caveats apply. First, a separate MIT repo named **Devansh-365/hisaab** pitches a "zero-friction trading journal for Indian traders" built on broker CSVs ([GitHub](https://github.com/Devansh-365/hisaab)). That is a real naming and SEO collision. Second, Indian willingness to pay is anchored low: Sensibull Pro costs about Rs 392/mo billed annually ([Strike.money](https://www.strike.money/reviews/sensibull)). A generous free tier (sync, net P&L, charges) with metered AI on top fits both that anchor and TradesViz's model ([TradesViz pricing](https://www.tradesviz.com/pricing/)).

## The prioritized upgrade list

Effort is a rough estimate. "Inspired by" names the product or repo that demonstrates each pattern. On licensing: MIT and Apache code (LuxAlgo, journedge, Trading-Journal-AI, khata, kite-mcp-server) can be reused with attribution. GPL and AGPL (TradeNote, TraderMemos, OpenAlgo), CC BY-NC (Deltalytix), and unlicensed or proprietary code (Vyuha, journalit) are references for ideas only ([LuxAlgo](https://github.com/LuxAlgo/trade-journal), [Deltalytix](https://github.com/hugodemenez/deltalytix)).

### P0 — Security and integrity fixes (this week)

| # | Item | Why | Inspired by |
|---|---|---|---|
| 1 | Make the `trades` bucket private, store files under `{user_id}/` paths, add storage RLS policies, serve via signed URLs, and validate MIME type and size | Screenshots are currently world-readable | LuxAlgo's encrypted-at-rest credentials and privacy posture |
| 2 | Re-authenticate with `signInWithPassword` before `updateUser` in change-password | Closes the session-to-account-takeover path | Audit finding |
| 3 | Fix the Dhan dedupe key (entry + exit order IDs, or fill-level storage), upsert per row, and surface failures in the API response | Partial exits currently cause silent zero-imports | LuxAlgo round-trip engine (handles partials) |
| 4 | Remove the ticker's fabricated fallback. Show "stale/unavailable" instead and label COMEX proxies honestly, or drop MCX | The product cannot sell verified AI while showing invented prices | TradesViz "grounded in deterministic stats" positioning |
| 5 | Replace the shared demo account with a read-only seeded sandbox, or reset it nightly and block broker connect on it | Prevents vandalism and token attachment by visitors | — |
| 6 | Scope the planner cache key by user ID; stop logging raw broker payloads; return generic error messages; add HKDF with key versioning for broker tokens; rate-limit Eve chat and AI routes; delete the Firebase config and dead code | Hygiene; prevents cross-user leaks | Audit finding |

### Quick wins (1–2 weeks)

| # | Item | Inspired by |
|---|---|---|
| 7 | Compute net P&L everywhere (gross − charges) and add a "charges ate X% of your gross" card | khata fee engine; SEBI loss data |
| 8 | R-multiple metric (stop loss is already captured); replace the calendar's `avgRR` placeholder; add weekly totals to the calendar | LuxAlgo; journedge |
| 9 | Build the Tools page: position size, R:R and compounding calculators, plus F&O lot-size awareness | journedge; tradr pre-trade calculator |
| 10 | CSV export of trades; forgot-password flow; fix the planner's dynamic Tailwind classes; keyboard-accessible broker cards; add a Cmd-K menu using the already-installed `cmdk` | LuxAlgo; TradeTally |
| 11 | Rewrite README, PRD and DESIGN to match reality, and remove the "six brokers integrated" claim | TradeZella reviews show onboarding expectations drive trust |
| 12 | Add Vitest, run CI on PRs (tsc, lint, guardrail verification), and fix the ESLint dependencies | — |

### Core (1–2 months)

| # | Item | Inspired by |
|---|---|---|
| 13 | **Tradebook and contract-note CSV import** for Zerodha, Dhan, Upstox, Angel One, Groww and Fyers, with auto-detection, a column mapper and an AI mapping fallback | LuxAlgo (14 formats); Vyuha (8 Indian brokers); Deltalytix (AI mapping); bsteps (Zerodha merge by order ID) |
| 14 | Adopt a single metrics and round-trip engine (vendor `@luxalgo/journal-core` or unify the two in-house engines), with server-side, paginated aggregation | LuxAlgo |
| 15 | First-principles Indian charges engine (STT, exchange, SEBI, IPFT, stamp, GST, per-broker brokerage) plus correct F&O lot multipliers and IST timestamps | khata (Apache, portable); Vyuha rate cards (re-implement) |
| 16 | Historical Dhan sync, a scheduled end-of-day sync job, and Zerodha Kite personal-API sync with a one-tap daily re-auth flow | TradesViz India; khata roadmap |
| 17 | **Playbooks** with per-trade rule checklists and followed-vs-broken P&L; typed tags (setup/psych/mistake); a tag merge and rename library | LuxAlgo; TraderMemos; ai-trading-journal; khata; Trading-Journal-AI |
| 18 | Pre-market plan inputs (max loss, focus symbols) and a post-market reflection, with a guardrailed AI plan-vs-actual review graded on process | journedge; TradeZella Session Review; Trading-Journal-AI |
| 19 | Onboarding: connect a broker or import a CSV, then reach a first insight within minutes; add a mobile quick-log PWA | TradeZella reviews; khata's "sub-ten-second capture" |

### Differentiators (quarter-scale)

| # | Item | Inspired by |
|---|---|---|
| 20 | **India tax pack**: speculative vs non-speculative income, F&O turnover for audit thresholds, STCG/LTCG split around 23 July 2024, ITR-3 schedule export, AIS reconciliation | Vyuha; Zerodha Console; Devansh-365/hisaab |
| 21 | **Read-only Hisaab MCP** with personal access tokens, so users' Claude or ChatGPT can combine broker MCPs (live data) with Hisaab (history, psychology, charges) | TradesViz MCP; TraderMemos PATs; OpenTraderWorld; Zerodha Kite MCP |
| 22 | AI auto-tagger on import and behavioural-cascade detection (loss → FOMO → revenge), with rupee loss attribution by error class, all audited by the existing guardrail | TradeZella agents; leionion audit tool; Hisaab's own revenge detector |
| 23 | F&O analytics: expectancy by days-to-expiry band, hedged vs unhedged, weekly-expiry markers on the calendar | Vyuha; khata |
| 24 | Diary and screenshot extraction (photo of notes → structured fields matched to fills), plus Hindi/Hinglish voice journaling | Trading-Journal-AI; LuxAlgo voice dictation; journalit (Hindi UI) |
| 25 | Trade replay with MAE/MFE on NSE candles; turn the Backtester into a real replay or paper mode feeding the same reports | LuxAlgo; TraderMemos; Edgewonk |
| 26 | Privacy mode, revocable share links, PDF reports, a "Year Wrapped" recap | LuxAlgo; TraderMemos; journedge |
| 27 | Freemium in INR: free sync, net P&L and charges; metered AI coach, tax pack and MCP on a paid tier priced near the Rs 400/mo anchor | TradesViz; Sensibull |

## Conclusion

Rivals do not force Hisaab's priorities as much as its own pitch does. A journal that markets AI claims verified against trade data cannot also serve fabricated prices, gross-only P&L and silently dropped syncs. The P0 and quick-win rows are therefore the cheapest marketing Hisaab can buy. Strategically, the guardrail module is more valuable than it looks. Premium rivals sell autonomous agents, and TradesViz sells deterministic checks. Hisaab can sell both together: agents whose every claim is audited against the numbers. Pointed at India-specific outputs such as charges drag, expiry-aware behaviour and ITR-3 schedules, that combines things no single competitor offers today.

Three uncertainties remain:

- No first-hand Indian user sentiment or willingness-to-pay data was gathered.
- Dhan's MCP launch and other brokers' API limits rest on secondary sources.
- The build, lint and storage-policy state of the live project was not verified.

Before building the tax pack, run a short user survey and check the live Supabase storage policies. Also resolve the "hisaab" naming collision before the product is shared more widely.
