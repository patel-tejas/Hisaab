"use client";

/**
 * The Strategy Card: what Eve understood, what it cannot test, and a button to
 * run it.
 *
 * Eve proposes; the card runs. The backtest goes through the deterministic
 * route, so the numbers never pass through the model and a re-run costs no LLM
 * turn.
 */

import { AlertTriangle, Play, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ProposeStrategyOutput } from "@/lib/eve/tools";
import {
  PARAM_META,
  SIGNAL_MODE_META,
  describeStrategy,
  type NumericParam,
} from "@/lib/eve/strategy";

export function StrategyCard({
  proposal,
  onLoad,
  isLoaded,
}: {
  proposal: ProposeStrategyOutput;
  onLoad: (proposal: ProposeStrategyOutput) => void;
  isLoaded: boolean;
}) {
  const { params, unsupported, tweakable, adjusted } = proposal;
  const numeric: NumericParam[] = ["fast_ema", "slow_ema", "angle_threshold", "angle_lookback"];

  return (
    <Card className="space-y-4 rounded-xl border-border bg-secondary/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="label-mono text-muted-foreground">
            Strategy understood
          </p>
          {proposal.plain_english && (
            <p className="text-sm italic text-muted-foreground">
              &ldquo;{proposal.plain_english}&rdquo;
            </p>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => onLoad(proposal)}
          className="shrink-0 gap-1.5"
          variant={isLoaded ? "outline" : "default"}
        >
          {isLoaded ? (
            <>
              <SlidersHorizontal className="h-3.5 w-3.5" /> Loaded
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" /> Backtest this
            </>
          )}
        </Button>
      </div>

      {/* The plain-English rule is a template over the params, so it always
          matches what will actually run. */}
      <p className="text-sm leading-relaxed">{describeStrategy(params)}</p>

      <div className="flex flex-wrap gap-1.5">
        {numeric.map((key) => (
          <Badge key={key} variant="secondary" className="font-normal" title={PARAM_META[key].hint}>
            {PARAM_META[key].label}{" "}
            <span className="ml-1 font-mono font-medium">
              {params[key]}
              {PARAM_META[key].unit === "°" ? "°" : ""}
            </span>
          </Badge>
        ))}
        <Badge variant="secondary" className="font-normal" title={SIGNAL_MODE_META[params.signal_mode].hint}>
          {SIGNAL_MODE_META[params.signal_mode].label}
        </Badge>
        <Badge variant="secondary" className="font-normal">
          {params.month} · {params.timeframe}
        </Badge>
      </div>

      {adjusted && (
        <p className="text-xs text-[var(--warning)]">{adjusted}</p>
      )}

      {unsupported.length > 0 && (
        <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/[0.07] p-3.5 text-xs">
          <p className="flex items-center gap-1.5 font-medium text-[var(--warning)]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Not testable by this engine
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-muted-foreground">
            {unsupported.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p className="mt-2 text-muted-foreground">
            The engine only tests EMA crossovers with a steepness gate. Everything above was
            left out of the test — not applied silently.
          </p>
        </div>
      )}

      {tweakable.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Worth varying:{" "}
          {tweakable
            .map((t) => PARAM_META[t as NumericParam]?.label ?? t)
            .join(", ")}
        </p>
      )}
    </Card>
  );
}
