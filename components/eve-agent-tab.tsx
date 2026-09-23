"use client";
import { useState } from "react";
import { Sparkles, Send, Bot, BarChart3, Download, Database, Loader2 } from "lucide-react";

const BRIDGE_URL = "http://localhost:8010";

export default function EveAgentTab() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ role: "bot", text: "Eve agent ready — ask about quant / download datasets (Nifty, quant)." }]);
  const [loading, setLoading] = useState(false);

  const callTool = async (name: string, args: Record<string, any>) => {
    const res = await fetch(`${BRIDGE_URL}/tools/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    return res.json();
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const q = input;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      // Simple intent detection for demo
      if (/quant.*dataset/i.test(q)) {
        const data = await callTool("list_research_months", {});
        setMessages((m) => [...m, { role: "bot", text: `Quant months: ${JSON.stringify(data, null, 2)}` }]);
      } else if (/nifty.*dataset/i.test(q)) {
        const data = await callTool("get_historical_candles", { month: "2026-07", timeframe: "1m", limit: "5" });
        setMessages((m) => [...m, { role: "bot", text: `Nifty sample: ${JSON.stringify(data, null, 2)}` }]);
      } else if (/backtest/i.test(q)) {
        const data = await callTool("run_backtest_signals", { month: "2026-07", timeframe: "5m", include_trades: "true" });
        setMessages((m) => [...m, { role: "bot", text: `Backtest: ${JSON.stringify(data, null, 2)}` }]);
      } else if (/signal/i.test(q)) {
        const data = await callTool("generate_signal", { month: "2026-07", timeframe: "5m" });
        setMessages((m) => [...m, { role: "bot", text: `Signals: ${JSON.stringify(data, null, 2)}` }]);
      } else {
        const data = await callTool("list_research_months", {});
        setMessages((m) => [...m, { role: "bot", text: `Available: ${JSON.stringify(data.tools?.map((t: any) => t.name) || data)}` }]);
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: "bot", text: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const downloadQuant = async () => {
    setLoading(true);
    try {
      const data = await callTool("list_research_months", {});
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quant-dataset.json";
      a.click();
      URL.revokeObjectURL(url);
      setMessages((m) => [...m, { role: "bot", text: "Quant dataset downloaded." }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "bot", text: `Download failed: ${e.message}` }]);
    }
    setLoading(false);
  };

  const downloadNifty = async () => {
    setLoading(true);
    try {
      const data = await callTool("get_historical_candles", { month: "2026-07", timeframe: "1m", limit: "200" });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nifty-dataset.json";
      a.click();
      URL.revokeObjectURL(url);
      setMessages((m) => [...m, { role: "bot", text: "Nifty dataset downloaded." }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "bot", text: `Download failed: ${e.message}` }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-7 w-7 text-amber-500" />
        <h1 className="text-2xl font-bold">Eve Agent</h1>
      </div>
      <div className="rounded-xl border bg-card p-4 h-[50vh] overflow-auto space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 text-sm ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "bot" && <Bot className="h-5 w-5 shrink-0 text-amber-600" />}
            <div className={`${m.role === "bot" ? "bg-muted rounded-lg px-3 py-2" : "bg-amber-600 text-white rounded-lg px-3 py-2"}`}>{m.text}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={downloadQuant} disabled={loading} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"><Database className="h-4 w-4"/> Quant dataset</button>
        <button onClick={downloadNifty} disabled={loading} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"><Download className="h-4 w-4"/> Nifty dataset</button>
      </div>
      <div className="flex gap-2">
        <input className="flex-1 rounded-lg border px-4 py-2 text-sm bg-background" placeholder="Ask Eve agent..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} disabled={loading} />
        <button onClick={handleSend} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}