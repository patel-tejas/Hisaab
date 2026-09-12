"use client"
import { useState, useEffect, useRef } from "react"

export default function EveAgentTab() {
  const [input, setInput] = useState("")
  const [status, setStatus] = useState<any>(null)

  useEffect(() => {
    fetch("http://localhost:8010/health")
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => setStatus(null))
  }, [])

  return (
    <div className="flex h-dvh flex-col p-6 bg-zinc-950 text-zinc-100">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Eve Agent</h1>
        <p className="text-sm text-zinc-400">
          Chat/research interface to the Eve quant engine via HTTP bridge (port 8010)
        </p>
        <div className="mt-2 text-xs text-zinc-500">
          {status ? `Bridge: ${status.ok ? "online" : "offline"} · Tools: ${status.tools ?? "?"}` : "Checking bridge..."}
        </div>
      </header>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 flex-1 overflow-y-auto">
        <p className="text-xs text-zinc-400">Embed Eve research/chat UI here (references apps/web/ at Eve_Agentic_Trading). Call http://localhost:8010/tools for manifest and POST /tools/&#123;name&#125; for research.</p>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); setInput(""); }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Eve..."
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-zinc-100 text-zinc-900 px-4 py-2 text-sm font-medium">Send</button>
      </form>
    </div>
  )
}
