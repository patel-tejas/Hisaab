"use client";
import { useState } from "react";
import { Sparkles, Send, Bot, BarChart3, Download, Database } from "lucide-react";

export default function EveAgentTab() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ role: "bot", text: "Eve agent ready — ask about quant / download datasets (Nifty, quant)." }]);
  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, { role: "user", text: input }, { role: "bot", text: "Eve bridge (localhost:8010) — dataset + chat response." }]);
    setInput("");
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
        <button onClick={() => alert("Download quant dataset (MCP)")} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"><Database className="h-4 w-4"/> Quant dataset</button>
        <button onClick={() => alert("Download Nifty dataset (MCP)")} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"><Download className="h-4 w-4"/> Nifty dataset</button>
      </div>
      <div className="flex gap-2">
        <input className="flex-1 rounded-lg border px-4 py-2 text-sm bg-background" placeholder="Ask Eve agent..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} />
        <button onClick={handleSend} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"><Send className="h-4 w-4"/> Send</button>
      </div>
    </div>
  );
}
