# Product Requirement Document (PRD): Hisaab - Intelligent Trading Journal

---

## 1. Executive Summary & Vision

### 1.1 Executive Summary
**Hisaab** is a next-generation, AI-augmented trading journal and analytical platform designed for retail and professional traders. While traditional trading logs rely on manual spreadsheet entries or static P&L summaries, Hisaab combines automated broker synchronization, psychological and emotional tracking, strategy performance analytics, and real-time AI behavioral insights powered by Large Language Models (Groq SDK). 

Hisaab transforms raw execution data into actionable behavioral intelligence—identifying cognitive biases such as revenge trading, tilt, over-trading, and suboptimal risk management before they erode trading capital.

### 1.2 Vision Statement
> *"To become the definitive daily companion for stock, options, and futures traders across India and globally—turning quantitative execution and psychological self-awareness into consistent, long-term market profitability."*

---

## 2. Product Objectives & Target Audience

### 2.1 Core Product Objectives
1. **Automated Trade Ingestion**: Seamlessly import trades via direct broker APIs (starting with Dhan, expanding to Zerodha, Angel One, Fyers, Upstox, Groww) to eliminate manual entry friction.
2. **Behavioral & Psychological Analytics**: Quantify emotional states, confidence scores, setup satisfaction, and mistake patterns alongside numerical metrics (P&L, win rate, risk-reward).
3. **AI-Driven Edge Discovery**: Leverage Groq-powered AI models to generate personalized insights, detect revenge trading cycles, and provide pre-market / post-market strategic guidance.
4. **Strategy & Backtesting Optimization**: Provide quantitative feedback on specific setups (e.g., Breakout, Reversal, Scalping) to help traders filter low-expectancy strategies.
5. **Zero-Trust Security**: Ensure bank-grade token encryption (AES-256-GCM) and absolute user data privacy for sensitive financial metrics.

### 2.2 User Personas

| Persona | Profile & Description | Core Pain Points | Key Hisaab Solution |
| :--- | :--- | :--- | :--- |
| **P1: Active Day Trader (Retail)** | Executes 5-20 intra-day trades daily in F&O / Equities. Highly active, prone to emotional tilt. | Manual logging is tedious; struggles to track revenge trading and drawdown loops. | Automated Dhan integration, Instant P&L Heatmap, AI Revenge Trade Alerts. |
| **P2: Systematic Swing Trader** | Trades trend breakouts and reversals on 1D/4H timeframes. Focuses on risk management. | Difficulty measuring setup expectancy across market regimes; strategy drifting. | Custom Strategy tagging, Backtester Module, Detailed Mistake & Expectancy Reports. |
| **P3: Developing/Novice Trader** | Learning market dynamics, working to achieve consistent profitability. | Lack of disciplined routine; unaware of recurring psychological mistakes. | AI Pre-Market / Post-Market Planner, Audio Insights, Confidence Index tracking. |

---

## 3. System Architecture & Tech Stack

```
+-----------------------------------------------------------------------+
|                             HISAAB CLIENT                             |
|    Next.js 16 (App Router) + React 19 + Tailwind CSS + Radix UI       |
+-----------------------------------------------------------------------+
                                   |
                                   v (HTTPS / REST API)
+-----------------------------------------------------------------------+
|                            NEXT.JS SERVER                             |
|               Middleware (JWT Auth) + API Route Handlers              |
+-----------------------------------------------------------------------+
         |                         |                         |
         v                         v                         v
+------------------+     +------------------+     +--------------------+
|  MONGODB DATABASE|     |   GROQ AI ENGINE |     | BROKER INTEGRATION |
| User, Trade,     |     | Behavioral & LLM |     | Dhan REST API      |
| Strategy Models  |     | Insights Generation|   | (AES-256 Encrypted)|
+------------------+     +------------------+     +--------------------+
```

### 3.1 Technology Stack Details

- **Frontend Framework**: Next.js 16 (App Router), React 19, TypeScript.
- **UI & Styling**: Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Recharts (Visual Analytics), Tiptap Rich Text Editor, Sonner Toast Notifications.
- **Backend Architecture**: Next.js Serverless Route Handlers (`/app/api/...`), TypeScript, Jose & JWT for HTTP-only cookie session management, Bcryptjs for password hashing.
- **Database & Data Layer**: MongoDB Atlas with Mongoose ODM (Models: `User`, `Trade`, `Strategy`).
- **Encryption Engine**: AES-256-GCM authenticated encryption for storing sensitive broker tokens (`lib/encryption.ts`).
- **AI Infrastructure**: Groq SDK (`groq-sdk`) providing high-speed inference for psychological pattern evaluation, trade debriefing, and strategy recommendations.
- **Broker Connectivity**: Native HTTP Client integration for Dhan (`lib/brokers/dhan.ts`) with sparse unique index order deduplication (`brokerOrderId`).

---

## 4. Detailed Functional Requirements & Feature Modules

```
                        HISAAB MODULE TREE
                        
                    +------------------------+
                    |  Hisaab Trading System |
                    +-----------+------------+
                                |
       +------------------------+------------------------+
       |                        |                        |
+------+------+          +------+------+          +------+------+
| Authentication|        |  Dashboard   |          |    Trades    |
| & User Hub    |        |  Overview    |          | Management   |
+-------------+          +-------------+          +-------------+
       |                        |                        |
+------+------+          +------+------+          +------+------+
| AI Insights |          | AI Planner  |          | Reports &   |
| Engine      |          | & Routines  |          | Analytics   |
+-------------+          +-------------+          +-------------+
       |                        |                        |
+------+------+          +------+------+          +------+------+
| Broker Sync |          | Backtester  |          | Trading     |
| Hub         |          | Module      |          | Utilities   |
+-------------+          +-------------+          +-------------+
```

### 4.1 Module 1: Authentication & User Security (`/sign-in`, `/sign-up`, `/api/auth`)
- **User Registration & Login**: Username/Email and password authentication secured via Bcrypt hashing.
- **Session Management**: Cookie-based JWT authentication validated across protected `/dashboard` routes via Next.js Middleware.
- **User Profile & Credentials**: Management of user details and personal broker connection profiles.

### 4.2 Module 2: Executive Dashboard (`/dashboard`)
- **Key Performance Indicator (KPI) Cards**:
  - Net Realized P&L, Win Rate (%), Total Trades, Profit Factor, Average Win / Average Loss, Risk-Reward Ratio (R:R), Confidence Index.
- **Visual Analytics Widgets**:
  - **Cumulative P&L Chart**: Time-series equity curve displaying account growth over custom date ranges.
  - **Win/Loss Breakdown Chart**: Bar and pie charts highlighting profit distribution.
  - **Monthly Comparison**: Year-over-year & month-over-month performance bar graphs.
  - **Trading Heatmap Calendar**: GitHub-style activity grid indicating daily gain/loss intensity.
  - **Revenge Trading & Behavioral Alert Box**: Real-time detection of high-risk trading behaviors.
  - **Recent Activity & Top Trades Widget**: Quick overview of recently executed trades and top performers.

### 4.3 Module 3: Trade Management & Logging (`/dashboard/trades`)
- **Manual Trade Logging Modal (`add-trade-modal.tsx`)**:
  - **Execution Specs**: Symbol, Date, Trade Type (`long` / `short`), Quantity, Entry Price, Exit Price, Entry Time, Exit Time, Stop Loss, Target Price.
  - **Calculated Fields**: Automatically computed Total Amount, Net P&L ($ / ₹), and P&L Percentage.
  - **Strategy & Outcome**: Assignment to existing strategies, classification of outcome.
  - **Psychology & Behavior**: Entry Confidence (1-10 slider), Satisfaction (1-10 slider), Emotional State selector (Calm, Anxious, Fearful, Greedy, Confident, Impulsive), Multi-select mistake tags (e.g., *Chased Entry*, *FOMO*, *Moved Stop Loss*, *Early Exit*, *Over-Leveraged*).
  - **Rich Media & Notes**: Tiptap rich text editor for detailed notes, lessons learned, and chart screenshot attachment links.
- **Broker Trade Ingestion (`source: "dhan"`)**:
  - Automatic synchronization of trades from Dhan API.
  - Automatic deduplication using sparse unique index on `brokerOrderId`.
  - Automated calculation of trade brokerage and net P&L.
- **Trade Table Features**: Search, filter by setup/symbol/date/outcome, sorting, paginated views, bulk selection, trade deletion dialog, detailed trade view modal.

### 4.4 Module 4: AI Insights Engine (`/dashboard/ai-insights`, `/api/ai-insights`)
- **Behavioral Pattern Recognition**:
  - Detects **Revenge Trading Cycles** (e.g., multiple rapid losing trades within short timeframes with increasing position sizes).
  - Identifies **Tilt & Emotional Risk Drivers** (correlating low entry confidence or negative emotional states with significant losses).
  - Evaluates **Mistake Cost Quantification** (calculating exact financial drain per mistake tag).
- **Groq LLM Integration**:
  - Synthesizes user trade data into natural language executive debriefs, strategic adjustments, and psychological coaching.
- **Audio / Voice Insights**:
  - Integrated audio player component (`components/audio`) for text-to-speech audio feedback delivery.

### 4.5 Module 5: AI Pre-Market & Post-Market Planner (`/dashboard/planner`)
- **Pre-Market Routine**:
  - Setting daily maximum allowed drawdown limit.
  - Defining targeted trading setups and focus symbols.
  - Market environment notes (Bullish, Bearish, Rangebound, Volatile).
- **Post-Market Routine**:
  - End-of-day reflection journaling.
  - AI evaluation comparing pre-market intentions against actual executed trades.

### 4.6 Module 6: Broker Integration Hub (`/dashboard/broker`)
- **Multi-Broker API Framework**:
  - Connection card interface supporting Dhan, Zerodha, Fyers, Angel One, Upstox, and Groww.
- **Token Management & Security**:
  - Client ID & Access Token input forms.
  - Backend encryption via `lib/encryption.ts` (`AES-256-GCM`).
- **Synchronization Controls**:
  - Manual "Sync Now" button, background auto-sync timestamps, connection status indicators (`Active`, `Inactive`).

### 4.7 Module 7: Reports & Custom Analytics (`/dashboard/reports`)
- **Deep-Dive Metrics**:
  - Strategy Performance Matrix: Expectancy rate, Win Rate, and Average R:R per setup.
  - Time-of-Day & Day-of-Week Efficiency: Identification of peak performance trading hours.
  - Mistake Financial Impact: Visual bar charts showing total capital lost due to discipline breaches.
- **Export Capabilities**: CSV / PDF export for tax and record-keeping purposes.

### 4.8 Module 8: Calendar & Interactive Heatmap (`/dashboard/calendar`)
- Dedicated full-calendar view allowing traders to inspect daily trading performance, trade count per day, and daily note logs.

### 4.9 Module 9: Backtesting & Strategy Lab (`/dashboard/backtester`)
- Interactive strategy backtester workspace enabling traders to test historical setups, input hypothetical sample sizes, and verify win-rates and profit factors prior to live market deployment.

### 4.10 Module 10: Trading Tools (`/dashboard/tools`)
- **Position Sizing Calculator**: Calculates optimal share/lot quantity based on account capital, risk percentage (%), and stop loss distance.
- **Risk-to-Reward Calculator**: Determines target prices needed to achieve desired R:R ratios.
- **Compounding / Growth Calculator**: Models equity curve trajectory over time based on steady win-rate and risk management parameters.

### 4.11 Module 11: Settings & Customization (`/dashboard/settings`)
- Strategy Builder: Create, edit, and tag custom strategies.
- User Profile & Password settings.
- UI Theme Switcher (Dark / Light mode).

---

## 5. Database Schema & Data Models

### 5.1 Trade Model (`models/Trade.ts`)

```typescript
export interface ITrade extends Document {
  user: mongoose.Types.ObjectId | string;
  symbol: string;
  date: Date;
  type: "long" | "short";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  entryTime?: string;     // HH:mm
  exitTime?: string;      // HH:mm
  totalAmount: number;
  pnl: number;
  pnlPercent: number;
  stopLoss?: number;
  target?: number;
  strategy: string;
  outcome: string;        // "win" | "loss" | "breakeven" | "success"
  entryConfidence: number; // 1-10
  satisfaction: number;    // 1-10
  emotionalState?: string;
  mistakes: string[];
  notes?: string;
  lessonsLearned?: string;
  images: string[];
  source?: "manual" | "dhan";
  brokerOrderId?: string;  // Unique sparse index for deduplication
  brokerage?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.2 User Model (`models/User.ts`)

```typescript
export interface IBrokerConnection {
  broker: string;         // e.g. "dhan"
  clientId: string;
  accessToken: string;    // Encrypted string (AES-256-GCM)
  lastSynced?: Date;
  isActive: boolean;
}

export interface IUser extends Document {
  name?: string;
  email?: string;
  username: string;       // Unique
  password: string;       // Bcrypt Hashed
  brokerConnections: IBrokerConnection[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.3 Strategy Model (`models/Strategy.ts`)

```typescript
export interface IStrategy extends Document {
  user: mongoose.Types.ObjectId | string;
  name: string;           // e.g., "Breakout", "Reversal", "Scalping"
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 6. API Route Specifications

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/signup` | Registers a new user with hashed password. | No |
| `POST` | `/api/signin` | Validates credentials, issues HTTP-only JWT cookie. | No |
| `POST` | `/api/logout` | Clears authentication session cookie. | Yes |
| `GET` | `/api/user` | Retrieves current logged-in user profile. | Yes |
| `GET` | `/api/trades` | Fetches filtered & paginated trades for current user. | Yes |
| `POST` | `/api/trades` | Creates a new manual trade record. | Yes |
| `PUT` | `/api/trades/[id]` | Updates an existing trade record. | Yes |
| `DELETE`| `/api/trades/[id]` | Deletes a trade record. | Yes |
| `GET` | `/api/strategies` | Fetches all custom strategies for current user. | Yes |
| `POST` | `/api/strategies` | Creates a new strategy configuration. | Yes |
| `POST` | `/api/broker/connect` | Saves encrypted broker credentials. | Yes |
| `POST` | `/api/broker/sync` | Triggers Dhan broker trade ingestion & deduplication. | Yes |
| `POST` | `/api/ai-insights` | Generates Groq LLM behavioral analysis & suggestions. | Yes |
| `POST` | `/api/ai-planner` | Processes pre/post-market journals & AI recommendations. | Yes |
| `GET` | `/api/dashboard` | Aggregates summary stats (P&L, win rate, heatmaps). | Yes |

---

## 7. Security, Privacy & Data Compliance

1. **Token Encryption at Rest**: All sensitive API keys and access tokens from third-party brokers (Dhan, Zerodha, etc.) are encrypted using **AES-256-GCM** before being saved to MongoDB. Decryption keys are stored exclusively in environment variables (`BROKER_ENCRYPTION_KEY`).
2. **Password Security**: Passwords are hashed using `bcryptjs` with salt rounds >= 10.
3. **Session Integrity**: JWT authentication cookies are configured with `HttpOnly`, `SameSite=Lax/Strict`, and `Secure` flags in production to prevent XSS and CSRF risks.
4. **Data Isolation**: Database queries enforce `user: req.userId` scoping across all models to ensure complete multi-tenant data isolation.

---

## 8. UX/UI Design System & Aesthetics

1. **Design Theme**: Modern, high-contrast dark theme with glowing accents (Tailwind CSS v4 & Radix UI).
2. **Color Tokens**:
   - **Background**: Deep Navy / Charcoal (`#090d16`, `#0f172a`)
   - **Profit Accent**: Vibrant Emerald / Neon Green (`#10b981`, `#22c55e`)
   - **Loss Accent**: Crimson Red / Rose (`#ef4444`, `#f43f5e`)
   - **AI Accent**: Electric Indigo / Violet (`#6366f1`, `#8b5cf6`)
3. **Typography**: Clean sans-serif hierarchy (Inter / Outfit / System font stacks).
4. **Interactivity**: Micro-animations on cards, hover state feedback on chart nodes, smooth transitions, and instant feedback via Sonner toast notifications.

---

## 9. Non-Functional Requirements & Performance Targets

- **Page Load Time**: Server-side rendered pages to achieve First Contentful Paint (FCP) < 1.2s.
- **API Latency**: Trade logging and retrieval routes response time < 200ms.
- **AI Processing**: Groq LLM response stream rendered within < 2.5s.
- **Scalability**: Stateless Next.js App Router architecture ready for serverless deployment on Vercel with MongoDB Atlas auto-scaling.
- **Mobile Responsiveness**: Fully responsive viewport layouts across desktop, tablet, and mobile browsers.

---

## 10. Product Roadmap & Future Enhancements

```
Phase 1 (Current / Core)      Phase 2 (Near-Term)          Phase 3 (Future Scale)
+-----------------------+     +-----------------------+    +-----------------------+
| - Manual Trade Logger |     | - Zerodha & Fyers     |    | - Mobile App          |
| - Dhan Broker Sync    | --> |   Broker API Sync     | -> |   (iOS / Android)     |
| - Groq AI Insights    |     | - Social Sharing &    |    | - Real-time WebSockets|
| - P&L Analytics       |     |   Leaderboards        |    |   Market Data Feed    |
| - Backtester & Tools  |     | - Automated Rule-     |    | - Institutional PDF   |
+-----------------------+     |   Based Risk Alerts   |    |   Investor Reports    |
                              +-----------------------+    +-----------------------+
```

### Phase 1: Core Foundation (Completed / Current Release)
- Full Next.js 16 + MongoDB architecture.
- Manual logging with rich text & psychological tracking.
- Dhan API broker synchronization with automated deduplication.
- Groq AI behavioral analysis & insights generation.
- Interactive Dashboard, Reports, Backtester, and Utilities.

### Phase 2: Expanded Ecosystem (Q3 - Q4 2026)
- Additional broker integrations: Zerodha Kite Connect, Fyers API, Angel One SmartAPI, Upstox API.
- Automated real-time push alerts when daily drawdown limits are exceeded.
- Community & mentor sharing (verifiable trader performance badges).

### Phase 3: Advanced Intelligence (2027)
- Native Mobile App (React Native / Expo).
- Real-time market tick audio alerts during active trading sessions.
- Multi-asset support (Crypto, Forex, Global Equities).

---

## 11. Key Performance Indicators (KPIs) & Success Metrics

1. **Daily Active Journaling Rate**: % of active users logging or syncing trades daily.
2. **Trader Behavioral Improvement**: % reduction in logged "Revenge Trading" and "FOMO" mistake tags over a 30-day window per user.
3. **Broker Sync Adoption**: % of users connecting active broker accounts vs. manual entry.
4. **Retention Rate**: 30-day and 90-day user retention rate.
5. **System Uptime**: 99.9% uptime across Next.js API routes and MongoDB database cluster.

---
*Document Version: 1.0.0*  
*Last Updated: July 2026*  
*Author: Hisaab Core Product & Engineering Team*
