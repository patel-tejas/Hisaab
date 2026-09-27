"use client";

/**
 * The conversation with Eve.
 *
 * Streaming via the AI SDK's `useChat`. Tool calls render inline, the grounding
 * check runs once per finished answer, and a `propose_strategy` part becomes a
 * Strategy Card rather than a JSON dump.
 */

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import { Send, Square } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { GroundingBadge } from "@/components/eve/grounding-badge";
import { StrategyCard } from "@/components/eve/strategy-card";
import { ToolCall, type AnyToolPart } from "@/components/eve/tool-call";
import type { GroundingReport } from "@/lib/eve/bridge";
import type { ProposeStrategyOutput } from "@/lib/eve/tools";

const EXAMPLES = [
  "Buy when the 9 EMA crosses above the 21 and it's rising steeply",
  "I want to buy when RSI drops below 30",
  "What months and timeframes can I test?",
  "Explain what the steepness filter actually does",
];

/** Tool parts whose output is documentation or input, not computed evidence. */
const UNGROUNDABLE = new Set(["load_skill", "propose_strategy"]);

export function ChatPanel({
  onLoadStrategy,
  loadedKey,
  seedMessage,
  onSeedConsumed,
  ready,
}: {
  onLoadStrategy: (proposal: ProposeStrategyOutput) => void;
  loadedKey: string | null;
  seedMessage: string | null;
  onSeedConsumed: () => void;
  ready: boolean;
}) {
  const [input, setInput] = useState("");
  // The default transport posts to `/api/chat`; Hisaab's route is namespaced
  // under `/api/eve/`, so it must be named explicitly or every send 404s.
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/eve/chat" }),
  });
  const [grounding, setGrounding] = useState<Record<string, GroundingReport>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const busy = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  // "Ask Eve about this" from the sliders injects the current config here, so
  // the conversation can discuss the state the user actually tweaked to.
  useEffect(() => {
    if (!seedMessage || busy) return;
    sendMessage({ text: seedMessage });
    onSeedConsumed();
  }, [seedMessage, busy, sendMessage, onSeedConsumed]);

  useEffect(() => {
    const el = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Check the finished answer's numbers against the tool results it was built
  // from. Runs once per assistant message, only after streaming settles, so a
  // half-written number is never judged.
  useEffect(() => {
    if (status !== "ready") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || grounding[last.id]) return;

    const answer = last.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("\n");
    if (!answer.trim()) return;

    // Skill documentation contains real figures (signal counts, cost tables).
    // Passing it as evidence would let an answer look grounded on numbers that
    // came from prose rather than a computation.
    const toolResults = last.parts
      .filter(
        (p) =>
          isToolUIPart(p) &&
          p.state === "output-available" &&
          !UNGROUNDABLE.has(getToolName(p)),
      )
      .map((p) => (p as { output: unknown }).output);

    let cancelled = false;
    fetch("/api/eve/grounding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answer, toolResults }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((report: GroundingReport | null) => {
        if (!cancelled && report && "grounded" in report) {
          setGrounding((prev) => ({ ...prev, [last.id]: report }));
        }
      })
      .catch(() => {
        // Advisory only: a failed check must never break the conversation.
      });
    return () => {
      cancelled = true;
    };
  }, [messages, status, grounding]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea ref={scrollRef} className="min-h-0 flex-1 pr-3">
        <div className="space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Describe a strategy in your own words. Eve turns it into something the engine
                can actually test, and tells you what it had to leave out.
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    onClick={() => submit(example)}
                    disabled={!ready}
                    className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              grounding={grounding[message.id]}
              onLoadStrategy={onLoadStrategy}
              loadedKey={loadedKey}
            />
          ))}

          {status === "submitted" && (
            <p className="text-xs text-muted-foreground">Thinking…</p>
          )}
          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {error.message}
            </div>
          )}
        </div>
      </ScrollArea>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="shrink-0 border-t pt-3"
      >
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={ready ? "Describe your strategy…" : "Start the quant engine to begin"}
            disabled={!ready}
            className="text-sm"
          />
          {busy ? (
            <Button type="button" variant="outline" onClick={stop} className="gap-1.5">
              <Square className="h-3.5 w-3.5" /> Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim() || !ready} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Every figure comes from the Python engine. Research only — not investment advice.
        </p>
      </form>
    </div>
  );
}

function Message({
  message,
  grounding,
  onLoadStrategy,
  loadedKey,
}: {
  message: UIMessage;
  grounding?: GroundingReport;
  onLoadStrategy: (proposal: ProposeStrategyOutput) => void;
  loadedKey: string | null;
}) {
  const isUser = message.role === "user";

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={isUser ? "max-w-[85%]" : "w-full"}>
        {!isUser && (
          <div className="mb-1 font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">
            Eve
          </div>
        )}
        <div
          className={cn(
            isUser
              ? "rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground"
              : "space-y-2.5 text-sm leading-relaxed",
          )}
        >
          {message.parts.map((part, i) => {
            if (part.type === "text") {
              return isUser ? (
                <p key={i} className="whitespace-pre-wrap">
                  {part.text}
                </p>
              ) : (
                <div
                  key={i}
                  className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-table:text-xs prose-headings:text-sm"
                >
                  <Markdown remarkPlugins={[remarkGfm]}>{part.text}</Markdown>
                </div>
              );
            }

            if (isToolUIPart(part)) {
              const toolPart = part as AnyToolPart;
              // A strategy proposal is the product's centrepiece, so it gets a
              // card instead of a collapsible JSON blob.
              if (
                getToolName(toolPart) === "propose_strategy" &&
                toolPart.state === "output-available" &&
                toolPart.output &&
                typeof toolPart.output === "object" &&
                "params" in toolPart.output
              ) {
                const proposal = toolPart.output as ProposeStrategyOutput;
                return (
                  <StrategyCard
                    key={i}
                    proposal={proposal}
                    onLoad={onLoadStrategy}
                    isLoaded={loadedKey === JSON.stringify(proposal.params)}
                  />
                );
              }
              return <ToolCall key={i} part={toolPart} />;
            }
            return null;
          })}
          {!isUser && grounding && <GroundingBadge report={grounding} />}
        </div>
      </div>
    </div>
  );
}
