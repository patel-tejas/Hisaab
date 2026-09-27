"use client";

/**
 * The tunable parameters.
 *
 * Changing one re-runs the backtest on the deterministic path — no chat turn,
 * no LLM. That is the difference between "ask the agent to try 21" and actually
 * exploring.
 */

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_PARAMS,
  PARAM_BOUNDS,
  PARAM_META,
  SIGNAL_MODES,
  SIGNAL_MODE_META,
  SLIPPAGE_MODES,
  TIMEFRAMES,
  normalizeParams,
  type NumericParam,
  type SignalMode,
  type SlippageMode,
  type StrategyParams,
  type Timeframe,
} from "@/lib/eve/strategy";

const NUMERIC: NumericParam[] = [
  "fast_ema",
  "slow_ema",
  "angle_threshold",
  "angle_lookback",
];

export function ParamSliders({
  params,
  months,
  onChange,
  disabled,
}: {
  params: StrategyParams;
  months: string[];
  onChange: (next: StrategyParams) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<StrategyParams>) =>
    onChange(normalizeParams({ ...params, ...patch }));

  const isDefault = NUMERIC.every((k) => params[k] === DEFAULT_PARAMS[k]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">
          Parameters you can tweak
        </p>
        {!isDefault && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
            disabled={disabled}
            onClick={() => set(DEFAULT_PARAMS)}
          >
            <RotateCcw className="h-3 w-3" /> Defaults
          </Button>
        )}
      </div>

      {NUMERIC.map((key) => {
        const meta = PARAM_META[key];
        const bounds = PARAM_BOUNDS[key];
        // The engine requires fast < slow; reflect that in the control rather
        // than repairing it after the fact.
        const min = key === "slow_ema" ? Math.max(bounds.min, params.fast_ema + 1) : bounds.min;
        const max = key === "fast_ema" ? Math.min(bounds.max, params.slow_ema - 1) : bounds.max;

        return (
          <div key={key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label className="text-xs font-medium">{meta.label}</Label>
              <span className="font-mono text-xs tabular-nums">
                {params[key]}
                {meta.unit === "°" ? "°" : meta.unit ? ` ${meta.unit}` : ""}
              </span>
            </div>
            <Slider
              value={[params[key]]}
              min={min}
              max={max}
              step={bounds.step}
              disabled={disabled}
              onValueChange={([v]) => set({ [key]: v } as Partial<StrategyParams>)}
            />
            <p className="text-[11px] leading-snug text-muted-foreground">{meta.hint}</p>
          </div>
        );
      })}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Signal rule</Label>
        <Select
          value={params.signal_mode}
          disabled={disabled}
          onValueChange={(v) => set({ signal_mode: v as SignalMode })}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SIGNAL_MODES.map((mode) => (
              <SelectItem key={mode} value={mode} className="text-xs">
                {SIGNAL_MODE_META[mode].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {SIGNAL_MODE_META[params.signal_mode].hint}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Month</Label>
          <Select
            value={params.month}
            disabled={disabled || months.length === 0}
            onValueChange={(v) => set({ month: v })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Candles</Label>
          <Select
            value={params.timeframe}
            disabled={disabled}
            onValueChange={(v) => set({ timeframe: v as Timeframe })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((tf) => (
                <SelectItem key={tf} value={tf} className="text-xs">
                  {tf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Slippage</Label>
          <Select
            value={params.slippage}
            disabled={disabled}
            onValueChange={(v) => set({ slippage: v as SlippageMode })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SLIPPAGE_MODES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
