"use client";

import { useState } from "react";
import { Sparkles, Send, Bot, BarChart3 } from "lucide-react";

export default function EveAgentTab() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting">("idle");

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-7 w-7 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Eve Agent</h1>
          <p className="text-sm text-muted-foreground">
            Deterministic quant engine chat — connects to Eve at{" "}
            <code>localhost:8010</code>
          </p>
        </div>
      </div>
      <div className="rounded-xl border bg-card shadow-sm p-4 h-[60vh] overflow-auto space-y-4">
        <div className="flex gap-3 text-sm text-muted-foreground">
          <Bot className="h-5 w-5 shrink-0" />
          <div>
            <p>Ask Eve about backtests, parameter searches, or market data. Example prompts:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Backtest EMA 9/15 on July 2026, 15m</li>
              <li>Compare timeframes for July</li>
            </ul>
          </div>
        </div>
        <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 px-3 py-2 rounded-lg">
          Integration: this UI connects to Eve Agentic Trading via HTTP bridge (port 8010).
          Run Eve&apos;s bridge: <code>python -m mcp.quant_server.http_bridge</code>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border px-4 py-2 text-sm bg-background"
          placeholder="Ask Eve agent..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          onClick={() => { setStatus("connecting"); setTimeout(() => setStatus("idle"), 800); }}
        >
          <Send className="h-4 w-4" /> Send
        </button>
      </div>
    </div>
  );
}
