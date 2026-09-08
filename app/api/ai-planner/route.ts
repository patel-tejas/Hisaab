import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    try {
        const apiKey = (process.env.GROQ_API_KEY || "").trim();
        if (!apiKey) {
            return NextResponse.json({ error: "GROQ_API_KEY is not set" }, { status: 500 });
        }

        const groq = new Groq({ apiKey });

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: rawTrades, error } = await supabase
            .from("trades")
            .select("*, trade_mistakes(mistake)")
            .eq("user_id", user.id)
            .order("trade_date", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const trades = (rawTrades || []).map((t) => ({
            ...t,
            date: t.trade_date,
            type: t.trade_type,
            pnl: Number(t.pnl),
            pnlPercent: Number(t.pnl_percent),
            entryPrice: Number(t.entry_price),
            exitPrice: Number(t.exit_price),
            entryTime: t.entry_time,
            exitTime: t.exit_time,
            entryConfidence: Number(t.entry_confidence || 3),
            satisfaction: Number(t.satisfaction || 3),
            emotionalState: t.emotional_state,
            strategy: t.strategy,
            symbol: t.symbol,
            mistakes: Array.isArray(t.trade_mistakes) ? t.trade_mistakes.map((m: any) => m.mistake) : [],
        }));

        if (trades.length < 3) {
            return NextResponse.json({
                ready: false,
                summary: "Add at least 3 trades to unlock the AI Daily Planner.",
            });
        }

        const now = new Date();
        const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];

        // ── Day-of-week breakdown ──
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayMap: Record<string, { pnl: number; count: number; wins: number }> = {};
        trades.forEach((t: any) => {
            const day = dayNames[new Date(t.date).getDay()];
            if (!dayMap[day]) dayMap[day] = { pnl: 0, count: 0, wins: 0 };
            dayMap[day].pnl += t.pnl;
            dayMap[day].count++;
            if (t.pnl > 0) dayMap[day].wins++;
        });

        // ── Strategy breakdown ──
        const stratMap: Record<string, { pnl: number; count: number; wins: number }> = {};
        trades.forEach((t: any) => {
            if (!stratMap[t.strategy]) stratMap[t.strategy] = { pnl: 0, count: 0, wins: 0 };
            stratMap[t.strategy].pnl += t.pnl;
            stratMap[t.strategy].count++;
            if (t.pnl > 0) stratMap[t.strategy].wins++;
        });

        // ── Emotional state breakdown ──
        const emotionMap: Record<string, { pnl: number; count: number; wins: number }> = {};
        trades.forEach((t: any) => {
            const e = t.emotionalState || "Unknown";
            if (!emotionMap[e]) emotionMap[e] = { pnl: 0, count: 0, wins: 0 };
            emotionMap[e].pnl += t.pnl;
            emotionMap[e].count++;
            if (t.pnl > 0) emotionMap[e].wins++;
        });

        // ── Confidence breakdown ──
        const confMap: Record<number, { count: number; wins: number; pnl: number }> = {};
        trades.forEach((t: any) => {
            const c = t.entryConfidence || 3;
            if (!confMap[c]) confMap[c] = { count: 0, wins: 0, pnl: 0 };
            confMap[c].count++;
            confMap[c].pnl += t.pnl;
            if (t.pnl > 0) confMap[c].wins++;
        });

        // ── Time-of-day analysis ──
        const hourMap: Record<string, { count: number; wins: number; pnl: number }> = {};
        trades.forEach((t: any) => {
            if (t.entryTime) {
                const hour = parseInt(t.entryTime.split(":")[0]);
                const slot = hour < 10 ? "09:00-10:00" : hour < 11 ? "10:00-11:00" : hour < 12 ? "11:00-12:00" : hour < 13 ? "12:00-13:00" : hour < 14 ? "13:00-14:00" : "14:00+";
                if (!hourMap[slot]) hourMap[slot] = { count: 0, wins: 0, pnl: 0 };
                hourMap[slot].count++;
                hourMap[slot].pnl += t.pnl;
                if (t.pnl > 0) hourMap[slot].wins++;
            }
        });

        // ── Overtrading analysis ──
        const dateTradeMap: Record<string, { count: number; pnl: number }> = {};
        trades.forEach((t: any) => {
            const key = new Date(t.date).toDateString();
            if (!dateTradeMap[key]) dateTradeMap[key] = { count: 0, pnl: 0 };
            dateTradeMap[key].count++;
            dateTradeMap[key].pnl += t.pnl;
        });
        const dayCounts = Object.values(dateTradeMap).map(d => d.count);
        const avgTradesPerDay = dayCounts.length > 0 ? Math.round(dayCounts.reduce((s, c) => s + c, 0) / dayCounts.length * 10) / 10 : 0;

        // ── Recent streak ──
        const sorted = [...trades].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        let streak = 0;
        let streakType = "";
        for (const t of sorted) {
            if (streak === 0) { streakType = (t as any).pnl > 0 ? "win" : "loss"; streak = 1; }
            else if ((streakType === "win" && (t as any).pnl > 0) || (streakType === "loss" && (t as any).pnl <= 0)) streak++;
            else break;
        }

        // ── Common mistakes ──
        const mistakeMap: Record<string, number> = {};
        trades.forEach((t: any) => {
            (t.mistakes || []).forEach((m: string) => { mistakeMap[m] = (mistakeMap[m] || 0) + 1; });
        });

        // ── Build context ──
        const lines: string[] = [];
        lines.push("=== TODAY: " + todayName + " ===");
        lines.push("Current streak: " + streak + " " + streakType + "(s)");
        lines.push("Avg trades per trading day: " + avgTradesPerDay);
        lines.push("");

        lines.push("=== DAY OF WEEK PERFORMANCE ===");
        Object.entries(dayMap).forEach(([d, v]) => {
            lines.push("- " + d + ": Rs" + Math.round(v.pnl) + " (" + v.count + " trades, " + Math.round((v.wins / v.count) * 100) + "% WR)");
        });
        lines.push("");

        lines.push("=== STRATEGY PERFORMANCE ===");
        Object.entries(stratMap).forEach(([s, d]) => {
            lines.push("- " + s + ": Rs" + Math.round(d.pnl) + " (" + d.count + " trades, " + Math.round((d.wins / d.count) * 100) + "% WR)");
        });
        lines.push("");

        lines.push("=== EMOTIONAL STATE IMPACT ===");
        Object.entries(emotionMap).forEach(([e, v]) => {
            lines.push("- " + e + ": Rs" + Math.round(v.pnl) + " (" + v.count + " trades, " + Math.round((v.wins / v.count) * 100) + "% WR)");
        });
        lines.push("");

        lines.push("=== CONFIDENCE CALIBRATION ===");
        Object.entries(confMap).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([c, d]) => {
            lines.push("- Confidence " + c + "/5: " + d.count + " trades, " + Math.round((d.wins / d.count) * 100) + "% WR, Rs" + Math.round(d.pnl));
        });
        lines.push("");

        lines.push("=== TIME-OF-DAY PERFORMANCE ===");
        Object.entries(hourMap).forEach(([h, v]) => {
            lines.push("- " + h + ": " + v.count + " trades, " + Math.round((v.wins / v.count) * 100) + "% WR, Rs" + Math.round(v.pnl));
        });
        lines.push("");

        lines.push("=== TOP MISTAKES ===");
        Object.entries(mistakeMap).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([m, c]) => {
            lines.push("- " + m + ": " + c + " times");
        });
        lines.push("");

        lines.push("=== RECENT 5 TRADES ===");
        sorted.slice(0, 5).forEach((t: any) => {
            lines.push("- " + new Date(t.date).toLocaleDateString("en-IN") + " | " + t.symbol + " " + t.type + " | Rs" + t.pnl + " | " + t.strategy + " | conf:" + (t.entryConfidence || "?") + " | " + (t.emotionalState || "?"));
        });

        const tradeDataContext = lines.join("\n");

        const jsonStructure = JSON.stringify({
            greeting: "Personalized one-line morning greeting mentioning today's day and encouraging tone",
            focusStrategy: {
                name: "Best strategy name for today",
                reason: "1-2 sentence why — cite day-of-week win rate and historical performance numbers",
                winRate: "XX%",
                avgPnl: 0,
            },
            avoidStrategy: {
                name: "Strategy to avoid today",
                reason: "1 sentence with data why this underperforms",
            },
            tradeLimit: {
                max: 0,
                reason: "1 sentence — cite overtrading analysis numbers",
            },
            confidenceThreshold: {
                min: 0,
                reason: "1 sentence — cite confidence calibration data",
            },
            bestTimeWindows: [
                { time: "HH:MM - HH:MM", reason: "1 sentence with win rate data" },
            ],
            emotionalAdvice: {
                watchFor: "Emotional state to be careful about today",
                tip: "1-2 sentence actionable advice based on emotional patterns",
            },
            keyRules: [
                "Rule 1 — specific to this trader with numbers",
                "Rule 2 — specific to this trader with numbers",
                "Rule 3 — specific to this trader with numbers",
            ],
            streakAdvice: "1-2 sentence advice based on current streak situation",
            marketFocus: "1 sentence about which instruments/symbols to focus on based on historical performance",
        }, null, 2);

        const prompt = `You are an elite trading coach preparing a personalized daily game plan for a trader. Today is ${todayName}. Analyze their comprehensive historical data and create an actionable, data-driven plan for today. Be specific — cite exact numbers, percentages, and Rs amounts from the data. Be motivational but honest.

${tradeDataContext}

Return ONLY valid JSON (no markdown, no code blocks) matching this structure:
${jsonStructure}`;

        const result = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "openai/gpt-oss-20b",
            response_format: { type: "json_object" },
        });
        const responseText = result.choices[0]?.message?.content?.trim() || "{}";

        let parsed;
        try {
            parsed = JSON.parse(responseText);
        } catch {
            return NextResponse.json({ ready: true, summary: responseText, parseError: true });
        }

        return NextResponse.json({ ready: true, ...parsed });
    } catch (error: any) {
        console.error("AI Planner error:", error);
        return NextResponse.json({ error: "Failed to generate plan", details: error.message }, { status: 500 });
    }
}
