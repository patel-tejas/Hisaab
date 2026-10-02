"use client";

/**
 * The conversation with Eve.
 *
 * Streaming via the AI SDK's `useChat`. Tool calls render as timed steps, the
 * grounding check runs once per finished answer, and a `propose_strategy` part
 * becomes a Strategy Card rather than a JSON dump. A `propose_strategy_spec`
 * part becomes a Spec Card (the strategy builder's spec), and
 * `ask_clarification` becomes a question with tappable answers.
 *
 * The conversation is kept in this browser's localStorage so leaving the page
 * (to check a trade, say) does not throw it away. "New chat" starts over.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import { ArrowUpRight, Check, Copy, CornerDownRight, RotateCcw, SquarePen } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import { GroundingBadge } from "@/components/eve/grounding-badge";
import { LoadingState } from "@/components/eve/loading-state";
import { PromptBar, type PromptCommand } from "@/components/eve/prompt-bar";
import { StrategyCard } from "@/components/eve/strategy-card";
import { ToolSteps, humanizeTool, toolRunning, type AnyToolPart } from "@/components/eve/tool-call";
import { EveAvatar } from "@/components/eve/eve-avatar";
import type { GroundingReport } from "@/lib/eve/bridge";
import type { ProposeStrategyOutput } from "@/lib/eve/tools";
import type { ClarificationOutput, ProposeSpecOutput } from "@/lib/eve/strategy-tools";
import { ClarifyCard, SpecCard } from "@/components/strategy-builder/spec-card";

const DEFAULT_STORAGE_KEY = "hisaab.eve.chat.v1";

const EXAMPLES = [
  "Buy when the 9 EMA crosses above the 21 and it's rising steeply",
  "I want to buy when RSI drops below 30",
  "What months and timeframes can I test?",
  "Explain what the steepness filter actually does",
];

/** Tool parts whose output is documentation or input, not computed evidence. */
const UNGROUNDABLE = new Set([
  "load_skill",
  "propose_strategy",
  "propose_strategy_spec",
  "ask_clarification",
]);

/** "studio": the Agent tab. "builder": the Strategies builder (spec tools only). */
export type ChatMode = "studio" | "builder";

export type ChatStatus = {
  months: Record<string, Record<string, number>>;
  modelId: string;
  modelOk: boolean;
};

function commandsFor(months: string[]): PromptCommand[] {
  const m = months[months.length - 1] ?? "the latest month";
  return [
    { key: "months", name: "/months", desc: "What data can I test?", prompt: "What months and timeframes can I test?" },
    { key: "strategy", name: "/strategy", desc: "Describe a strategy to test", prompt: "Buy when the 9 EMA crosses above the 21 and it's rising steeply" },
    { key: "backtest", name: "/backtest", desc: "Defaults on one month", prompt: `Backtest the default EMA 9/15 strategy on ${m}, 15m` },
    { key: "compare", name: "/compare", desc: "1m vs 5m vs 15m", prompt: `Compare 1m, 5m and 15m for ${m}` },
    { key: "validate", name: "/validate", desc: "Is the best config credible?", prompt: `Validate a parameter search on 15m ${m}. Is the winner credible?` },
    { key: "explain", name: "/explain", desc: "How a filter works", prompt: "Explain what the steepness filter actually does" },
  ];
}

/** Next steps that fit what Eve just ran; research hygiene first. */
function followUpsFor(toolNames: string[]) {
  const used = new Set(toolNames);
  const out: string[] = [];
  if (used.has("propose_strategy")) out.push("Is this strategy statistically significant?");
  if (used.has("propose_strategy_spec")) {
    out.push("Add a stop-loss and a target to it");
    out.push("Make it trade short as well");
  }
  if (used.has("parameter_search") && !used.has("validate_parameter_search"))
    out.push("Validate that search with deflated Sharpe and PBO");
  if ([...used].some((n) => n.startsWith("backtest") || n.startsWith("run_backtest")) && !used.has("backtest_significance"))
    out.push("Is this backtest result statistically significant?");
  if (!used.has("walk_forward_test") && used.size > 0) out.push("Run a walk-forward test on the same window");
  out.push("Compare 1m, 5m and 15m for the same month");
  return [...new Set(out)].slice(0, 3);
}

function loadMessages(key: string): UIMessage[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

type ChatProps = {
  /** Loads a `propose_strategy` config into the slider workbench (studio only). */
  onLoadStrategy?: (proposal: ProposeStrategyOutput) => void;
  loadedKey: string | null;
  /** Loads a `propose_strategy_spec` result into the builder. Without it the
   *  card offers "Open in builder" instead. */
  onLoadSpec?: (out: ProposeSpecOutput) => void;
  loadedSpecHash?: string | null;
  seedMessage: string | null;
  onSeedConsumed: () => void;
  ready: boolean;
  status: ChatStatus;
  mode?: ChatMode;
  storageKey?: string;
  examples?: string[];
  title?: string;
  /** Builder only: the spec in the form right now, sent with each message so
   *  "make the stop tighter" edits what the user is looking at. */
  currentSpec?: unknown;
};

export function ChatPanel(props: ChatProps) {
  const storageKey = props.storageKey ?? DEFAULT_STORAGE_KEY;
  // Saved messages are read after mount (localStorage is client-only) and the
  // thread mounts once they are known, so useChat starts from them.
  const [saved, setSaved] = useState<UIMessage[] | null>(null);
  const [chatId, setChatId] = useState("eve");

  useEffect(() => {
    setSaved(loadMessages(storageKey));
  }, [storageKey]);

  const newChat = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setSaved([]);
    setChatId(`eve-${Date.now()}`);
  }, [storageKey]);

  if (saved === null) return <div className="min-h-0 flex-1" />;
  return (
    <ChatThread
      key={chatId}
      id={chatId}
      initialMessages={saved}
      onNewChat={newChat}
      {...props}
      storageKey={storageKey}
    />
  );
}

function ChatThread({
  id,
  initialMessages,
  onNewChat,
  onLoadStrategy,
  loadedKey,
  onLoadSpec,
  loadedSpecHash,
  seedMessage,
  onSeedConsumed,
  ready,
  status: env,
  mode = "studio",
  storageKey,
  examples = EXAMPLES,
  title = "Strategy research",
  currentSpec,
}: ChatProps & {
  id: string;
  initialMessages: UIMessage[];
  onNewChat: () => void;
  storageKey: string;
}) {
  // The default transport posts to `/api/chat`; Hisaab's route is namespaced
  // under `/api/eve/`, so it must be named explicitly or every send 404s.
  const specRef = useRef(currentSpec);
  specRef.current = currentSpec;
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/eve/chat",
        body: () => ({ mode, ...(specRef.current ? { current_spec: specRef.current } : {}) }),
      }),
  );
  const { messages, sendMessage, regenerate, status, error, stop } = useChat({
    id,
    messages: initialMessages,
    transport,
  });
  const [grounding, setGrounding] = useState<Record<string, GroundingReport>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const busy = status === "submitted" || status === "streaming";
  const months = Object.keys(env.months).sort();

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy || !ready) return;
    stickToBottom.current = true;
    sendMessage({ text: trimmed });
  }

  // Persist once a turn settles, so a half-streamed answer is never saved.
  useEffect(() => {
    if (busy || messages.length === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // Full or blocked storage only costs history, never the live chat.
    }
  }, [messages, busy, storageKey]);

  // "Ask Eve about this" from the sliders injects the current config here, so
  // the conversation can discuss the state the user actually tweaked to.
  useEffect(() => {
    if (!seedMessage || busy) return;
    stickToBottom.current = true;
    sendMessage({ text: seedMessage });
    onSeedConsumed();
  }, [seedMessage, busy, sendMessage, onSeedConsumed]);

  // Follow the stream unless the reader has scrolled up to look at something.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && messages.length > 0 && stickToBottom.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

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

  // What the loader says: the tool currently running, else "Thinking".
  const last = messages[messages.length - 1];
  const running =
    last?.role === "assistant"
      ? (last.parts.filter(isToolUIPart) as AnyToolPart[]).find(toolRunning)
      : undefined;
  const lastHasText =
    last?.role === "assistant" && last.parts.some((p) => p.type === "text" && p.text.trim());
  const showLoader = status === "submitted" || (status === "streaming" && (!!running || !lastHasText));

  return (
    /*
     * The panel owns its own gutters: the bezel core is p-0 so the scroll
     * area can run edge to edge and the composer can sit on a full-width rule.
     */
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-48 shrink-0 items-center gap-2.5 border-b border-border/60 px-5 md:px-6">
        <EveAvatar size={22} />
        <span className="text-sm font-medium">Eve</span>
        <span className="label-mono hidden sm:inline">{title}</span>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={onNewChat}
            disabled={busy}
            className="interactive ml-auto flex h-32 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <SquarePen className="size-3.5" /> New chat
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col justify-center px-5 py-32 md:px-32">
            <p className="label-mono">Start here</p>
            <h2 className="mt-2.5 max-w-[20ch] font-display text-[1.75rem] leading-[1.1] tracking-tight md:text-[2rem]">
              Describe a strategy the way you&apos;d say it out loud.
            </h2>
            <p className="mt-2.5 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
              Eve turns it into something the engine can actually test and tells
              you what it had to leave out.
            </p>

            <ul className="panel-inset stagger mt-6 divide-y divide-border/50 overflow-hidden">
              {examples.map((example) => (
                <li key={example}>
                  <button
                    onClick={() => submit(example)}
                    disabled={!ready}
                    className="group flex w-full items-center justify-between gap-16 px-16 py-3 text-left text-sm transition-colors hover:bg-accent/50 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <span className="text-muted-foreground group-hover:text-foreground">{example}</span>
                    <ArrowUpRight className="size-3.5 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-col gap-7 px-5 py-6 md:px-6">
            {messages.map((message, i) =>
              message.role === "user" ? (
                <UserMessage key={message.id} message={message} />
              ) : (
                <AssistantMessage
                  key={message.id}
                  message={message}
                  grounding={grounding[message.id]}
                  streaming={busy && i === messages.length - 1}
                  isLast={i === messages.length - 1}
                  onRetry={() => regenerate()}
                  onFollowUp={submit}
                  onLoadStrategy={onLoadStrategy}
                  loadedKey={loadedKey}
                  onLoadSpec={onLoadSpec}
                  loadedSpecHash={loadedSpecHash ?? null}
                  busy={busy}
                />
              ),
            )}

            {showLoader && (
              <div className="pl-9">
                <LoadingState
                  label={running ? `Running ${humanizeTool(getToolName(running))}` : "Thinking"}
                  variant={running ? "Drive" : "Dots"}
                />
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/[0.07] px-16 py-3 text-xs text-[var(--destructive)]">
                {error.message}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border/60 px-5 py-16 md:px-6">
        <PromptBar
          months={env.months}
          commands={commandsFor(months)}
          modelLabel={env.modelId}
          modelOk={env.modelOk}
          busy={busy}
          disabled={!ready}
          placeholder={ready ? "Describe a strategy, or ask about a backtest…" : "Start the quant engine to begin"}
          onSend={submit}
          onStop={stop}
        />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Every figure comes from the Python engine. Research only, not investment advice.
        </p>
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: UIMessage }) {
  const text = message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join("\n");
  return (
    <div className="flex justify-end pl-10" style={{ animation: "fade-up 300ms cubic-bezier(0.22,1,0.36,1) both" }}>
      <div className="max-w-full whitespace-pre-wrap rounded-2xl bg-secondary px-16 py-2.5 text-sm leading-6 text-foreground">
        {text}
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  grounding,
  streaming,
  isLast,
  onRetry,
  onFollowUp,
  onLoadStrategy,
  loadedKey,
  onLoadSpec,
  loadedSpecHash,
  busy,
}: {
  message: UIMessage;
  grounding?: GroundingReport;
  streaming: boolean;
  isLast: boolean;
  onRetry: () => void;
  onFollowUp: (text: string) => void;
  onLoadStrategy?: (proposal: ProposeStrategyOutput) => void;
  loadedKey: string | null;
  onLoadSpec?: (out: ProposeSpecOutput) => void;
  loadedSpecHash: string | null;
  busy: boolean;
}) {
  // Consecutive tool parts render as one group of steps; text renders as
  // prose; a strategy proposal renders as its card.
  type Block =
    | { kind: "text"; text: string }
    | { kind: "tools"; parts: AnyToolPart[] }
    | { kind: "proposal"; proposal: ProposeStrategyOutput }
    | { kind: "spec"; out: ProposeSpecOutput }
    | { kind: "clarify"; out: ClarificationOutput };
  const blocks: Block[] = [];
  for (const part of message.parts) {
    if (part.type === "text") {
      if (part.text.trim()) blocks.push({ kind: "text", text: part.text });
    } else if (isToolUIPart(part)) {
      const toolPart = part as AnyToolPart;
      if (
        getToolName(toolPart) === "propose_strategy" &&
        toolPart.state === "output-available" &&
        toolPart.output &&
        typeof toolPart.output === "object" &&
        "params" in toolPart.output
      ) {
        blocks.push({ kind: "proposal", proposal: toolPart.output as ProposeStrategyOutput });
        continue;
      }
      const name = getToolName(toolPart);
      if (
        (name === "propose_strategy_spec" || name === "ask_clarification") &&
        toolPart.state === "output-available" &&
        toolPart.output &&
        typeof toolPart.output === "object"
      ) {
        // The engine check stays visible as a tool step; the card follows.
        if (name === "propose_strategy_spec") {
          const prev = blocks[blocks.length - 1];
          if (prev?.kind === "tools") prev.parts.push(toolPart);
          else blocks.push({ kind: "tools", parts: [toolPart] });
        }
        if (name === "propose_strategy_spec") blocks.push({ kind: "spec", out: toolPart.output as ProposeSpecOutput });
        else blocks.push({ kind: "clarify", out: toolPart.output as ClarificationOutput });
        continue;
      }
      const prev = blocks[blocks.length - 1];
      if (prev?.kind === "tools") prev.parts.push(toolPart);
      else blocks.push({ kind: "tools", parts: [toolPart] });
    }
  }

  const text = blocks
    .filter((b): b is { kind: "text"; text: string } => b.kind === "text")
    .map((b) => b.text)
    .join("\n\n");
  const toolNames = message.parts.filter(isToolUIPart).map((p) => getToolName(p));
  const done = !streaming;

  return (
    <div className="flex gap-3" style={{ animation: "fade-up 300ms cubic-bezier(0.22,1,0.36,1) both" }}>
      <div className="pt-0.5">
        <EveAvatar size={24} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {blocks.map((block, i) =>
          block.kind === "tools" ? (
            <ToolSteps key={i} parts={block.parts} />
          ) : block.kind === "proposal" ? (
            <StrategyCard
              key={i}
              proposal={block.proposal}
              onLoad={onLoadStrategy ?? (() => {})}
              isLoaded={loadedKey === JSON.stringify(block.proposal.params)}
            />
          ) : block.kind === "spec" ? (
            <SpecCard
              key={i}
              out={block.out}
              onLoad={onLoadSpec}
              isLoaded={!!loadedSpecHash && loadedSpecHash === block.out.spec_hash}
            />
          ) : block.kind === "clarify" ? (
            <ClarifyCard
              key={i}
              out={block.out}
              disabled={!isLast || busy}
              onAnswer={onFollowUp}
            />
          ) : (
            <div
              key={i}
              className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-p:my-2 prose-p:leading-relaxed prose-headings:text-sm prose-headings:font-medium prose-table:my-3 prose-table:text-xs prose-th:font-medium prose-th:text-muted-foreground prose-td:py-1.5"
            >
              <Markdown remarkPlugins={[remarkGfm]}>{block.text}</Markdown>
            </div>
          ),
        )}

        {done && text && (
          <div className="-ml-1 flex flex-wrap items-center gap-1" style={{ animation: "fade-up 300ms ease both" }}>
            <CopyButton text={text} />
            {isLast && (
              <IconButton label="Retry" onClick={onRetry}>
                <RotateCcw className="size-3.5" />
              </IconButton>
            )}
            {grounding && (
              <div className="ml-1">
                <GroundingBadge report={grounding} />
              </div>
            )}
          </div>
        )}

        {done && isLast && text && (
          <div className="mt-1">
            <p className="label-mono">Follow-ups</p>
            <div className="mt-1.5 flex flex-col">
              {followUpsFor(toolNames).map((item, i) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onFollowUp(item)}
                  className="group -mx-2 flex items-center gap-2 rounded-lg border-b border-border/50 px-2 py-2 text-left text-sm text-muted-foreground transition-colors last:border-b-0 hover:bg-accent/50 hover:text-foreground"
                  style={{ animation: `fade-up 350ms cubic-bezier(0.22,1,0.36,1) ${i * 90}ms both` }}
                >
                  <CornerDownRight className="size-3.5 shrink-0" />
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <IconButton
      label={copied ? "Copied" : "Copy"}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => setCopied(true),
          () => {},
        );
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </IconButton>
  );
}
