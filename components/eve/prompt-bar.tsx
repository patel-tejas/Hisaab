"use client";

/* ─────────────────────────────────────────────────────────
 * PROMPT BAR
 * Eve's composer. Type @ to tag a processed month, / for a
 * research command; ↑↓ + Enter to pick, Esc to dismiss.
 * Enter sends, Shift+Enter adds a line. While Eve works the
 * send button becomes Stop.
 * ───────────────────────────────────────────────────────── */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, CalendarDays, Plus, Square, Wand2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type PromptCommand = { key: string; name: string; desc: string; prompt: string };

type Row = { key: string; name: string; desc: string; kind: "month" | "command" };

/* the last @word or /word being typed, if any */
function parseToken(draft: string): { kind: "at" | "slash"; query: string; start: number } | null {
  const match = /(^|\s)([@/])([\w-]*)$/.exec(draft);
  if (!match) return null;
  return {
    kind: match[2] === "@" ? "at" : "slash",
    query: match[3].toLowerCase(),
    start: match.index + match[1].length,
  };
}

export function PromptBar({
  months,
  commands,
  modelLabel,
  modelOk,
  busy,
  disabled = false,
  placeholder = "Describe a strategy, or ask about a backtest…",
  onSend,
  onStop,
}: {
  /** processed months, offered in the @ menu: { "2026-07": { "1m": 8000, … } } */
  months: Record<string, Record<string, number>>;
  /** research shortcuts offered in the / menu */
  commands: PromptCommand[];
  modelLabel: string;
  modelOk: boolean;
  busy: boolean;
  disabled?: boolean;
  placeholder?: string;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [rowBox, setRowBox] = useState<{ top: number; height: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const token = dismissed ? null : parseToken(draft);
  const menu: "at" | "slash" | null = plusOpen ? "slash" : (token?.kind ?? null);
  const query = plusOpen ? "" : (token?.query ?? "");

  // A new menu or query starts the highlight back at the top row.
  const menuKey = `${menu}:${query}`;
  const [prevMenuKey, setPrevMenuKey] = useState(menuKey);
  if (prevMenuKey !== menuKey) {
    setPrevMenuKey(menuKey);
    setActive(0);
  }

  const monthRows: Row[] = Object.entries(months)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, tfs]) => ({
      key: month,
      name: month,
      desc: Object.keys(tfs).join(" · ") || "no timeframes",
      kind: "month",
    }));

  const rows: Row[] =
    menu === "at"
      ? monthRows.filter((r) => r.name.includes(query))
      : menu === "slash"
        ? commands
            .filter((c) => c.name.slice(1).startsWith(query))
            .map((c) => ({ key: c.key, name: c.name, desc: c.desc, kind: "command" }))
        : [];

  /* a single highlight glides to the active row */
  useLayoutEffect(() => {
    const target = rowRefs.current[active];
    if (target) setRowBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [menu, query, active, rows.length]);

  /* grow with the text up to a compact maximum, then scroll */
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "0px";
    const h = input.scrollHeight;
    input.style.height = `${Math.min(Math.max(h, 24), 160)}px`;
    input.style.overflowY = h > 160 ? "auto" : "hidden";
  }, [draft]);

  /* clicking outside the composer closes the menu */
  useEffect(() => {
    if (!plusOpen) return;
    const close = (event: PointerEvent) => {
      if (!(event.target as Element).closest("[data-promptbar]")) setPlusOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [plusOpen]);

  const pick = (row: Row) => {
    const before = token ? draft.slice(0, token.start) : draft;
    if (row.kind === "month") {
      setDraft(`${before}${row.name} `);
    } else {
      // a command expands into its full prompt so it can be edited before sending
      const command = commands.find((c) => c.key === row.key);
      setDraft(command ? command.prompt : `${before}${row.name} `);
    }
    setPlusOpen(false);
    setDismissed(false);
    inputRef.current?.focus();
  };

  const canSend = draft.trim().length > 0 && !busy && !disabled;
  const send = () => {
    if (!canSend) return;
    onSend(draft.trim());
    setDraft("");
    setPlusOpen(false);
  };

  return (
    <div data-promptbar className="relative w-full">
      {/* ── @ / slash menu, growing up from the composer ── */}
      {menu && !disabled && (
        <div
          className="absolute inset-x-0 bottom-full z-20 mb-2 rounded-xl border border-border bg-popover p-1 shadow-origin-lg"
          style={{ animation: "pop-in 180ms cubic-bezier(0.22,1,0.36,1) both", transformOrigin: "bottom center" }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-1 rounded-lg bg-accent/60"
            style={{
              top: rowBox?.top ?? 0,
              height: rowBox?.height ?? 0,
              opacity: rowBox && rows.length > 0 ? 1 : 0,
              transition:
                "top 220ms cubic-bezier(0.22,1,0.36,1), height 220ms cubic-bezier(0.22,1,0.36,1), opacity 150ms ease",
            }}
          />
          {rows.map((row, i) => (
            <button
              key={row.key}
              type="button"
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(row)}
              className="relative z-10 flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left"
            >
              {row.kind === "month" ? (
                <CalendarDays className="size-16 text-muted-foreground" />
              ) : (
                <Wand2 className="size-16 text-muted-foreground" />
              )}
              <span className={cn("shrink-0 text-[13px] font-medium text-foreground", row.kind === "month" && "font-mono")}>
                {row.name}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{row.desc}</span>
            </button>
          ))}
          {rows.length === 0 && (
            <div className="flex h-9 items-center px-2.5 text-xs text-muted-foreground">
              {menu === "at" && monthRows.length === 0
                ? "No processed months yet."
                : `No matches for “${query}”`}
            </div>
          )}
          <div className="label-mono mt-1 border-t border-border/60 px-2.5 pt-2 pb-1 !text-[10px]">
            {menu === "at" ? "Tag a processed month" : "Pick a command, then edit before sending"}
          </div>
        </div>
      )}

      {/* ── composer ───────────────────────────────────── */}
      <div
        role="presentation"
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "panel-inset flex cursor-text flex-col gap-2 p-2 transition-colors focus-within:border-border",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          disabled={disabled}
          onChange={(event) => {
            setDraft(event.target.value);
            setDismissed(false);
            setPlusOpen(false);
          }}
          onKeyDown={(event) => {
            if (menu && rows.length > 0) {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setActive((current) => (current + (event.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length);
                return;
              }
              if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") {
                event.preventDefault();
                pick(rows[active]);
                return;
              }
            }
            if (event.key === "Escape") {
              setDismissed(true);
              setPlusOpen(false);
              return;
            }
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
          placeholder={placeholder}
          aria-label="Message Eve"
          className="w-full min-w-0 resize-none bg-transparent px-2 pt-1 text-sm leading-6 text-foreground outline-none [overflow-wrap:anywhere] placeholder:text-muted-foreground focus-visible:outline-none"
        />

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Research commands"
            aria-expanded={plusOpen}
            onClick={(event) => {
              event.stopPropagation();
              setPlusOpen((current) => !current);
              inputRef.current?.focus();
            }}
            className={cn(
              "flex size-32 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground",
              plusOpen && "bg-accent/60 text-foreground",
            )}
          >
            <Plus className="size-16" />
          </button>

          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <kbd className="rounded-[4px] bg-secondary px-1 font-mono text-[11px] text-foreground">@</kbd> month
            <kbd className="ml-1.5 rounded-[4px] bg-secondary px-1 font-mono text-[11px] text-foreground">/</kbd> command
          </span>

          <span
            title={modelOk ? "Model ready" : "Model not ready. See the Agent tab."}
            className="label-mono ml-auto flex h-32 min-w-0 items-center gap-1.5 px-2 !normal-case !tracking-normal"
          >
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                modelOk ? "bg-[var(--success)]" : "bg-[var(--destructive)]",
              )}
            />
            <span className="truncate">{modelLabel}</span>
          </span>

          {busy ? (
            <button
              type="button"
              aria-label="Stop"
              onClick={(event) => {
                event.stopPropagation();
                onStop();
              }}
              className="flex size-32 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform active:scale-95"
            >
              <Square className="size-3 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Send"
              disabled={!canSend}
              onClick={(event) => {
                event.stopPropagation();
                send();
              }}
              className={cn(
                "flex size-32 shrink-0 items-center justify-center rounded-lg transition-[background-color,color,transform] duration-200 enabled:active:scale-95",
                canSend ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
              )}
            >
              <ArrowUp className="size-16" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
