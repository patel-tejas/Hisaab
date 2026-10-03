"use client";

/**
 * The strategy form: every field of an `eve.strategy/1` spec, in the order a
 * trader thinks about it. Controlled; the builder owns the spec.
 *
 * Fields Eve filled in without being asked carry a "default" tag, and
 * errors from the local check or the engine sit under the field they name.
 */

import { Input } from "@/components/ui/input";
import {
  DIRECTIONS,
  DIRECTION_LABELS,
  MAX_LOTS,
  SLIPPAGE,
  STOP_MODES,
  TARGET_MODES,
  TIMEFRAMES,
  TIMEFRAME_LABELS,
  TRAIL_MODES,
  emptyGroup,
  sidesOf,
  type Direction,
  type SpecIssue,
  type StrategySpec,
} from "@/lib/eve/spec";
import { GroupEditor, issuesAt } from "./condition-editor";
import { Choice, Field, NumberInput, Section, TimeInput } from "./field";

const STOP_LABELS = { none: "No stop", pct: "% of entry", points: "Points", atr: "ATR multiple" };
const TARGET_LABELS = { ...STOP_LABELS, none: "No target", r_multiple: "R multiple" };
const TRAIL_LABELS = { none: "No trail", atr: "ATR trail", breakeven_then_atr: "Breakeven, then ATR" };
const SLIPPAGE_LABELS = { ideal: "Ideal", normal: "Normal", stress: "Stress" };

export function SpecForm({
  spec,
  issues,
  onChange,
}: {
  spec: StrategySpec;
  issues: SpecIssue[];
  onChange: (s: StrategySpec) => void;
}) {
  const defaulted = spec.meta.defaulted;
  const isDefault = (p: string) => defaulted.some((d) => d === p || d.startsWith(p + "/"));
  const errorAt = (p: string) => issues.find((i) => i.severity === "error" && i.path === p)?.message;
  const sides = sidesOf(spec.direction);

  /** Editing a field the user now owns clears its "Eve chose this" mark. */
  function set(next: StrategySpec, touched: string) {
    const kept = next.meta.defaulted.filter((d) => !(d === touched || d.startsWith(touched + "/")));
    onChange({ ...next, meta: { ...next.meta, defaulted: kept } });
  }

  function setDirection(direction: Direction) {
    const want = sidesOf(direction);
    const entry = { ...spec.entry };
    const exit = { ...spec.exit };
    for (const side of ["long", "short"] as const) {
      if (want.includes(side)) {
        entry[side] = entry[side] ?? emptyGroup();
        exit[side] = exit[side] ?? emptyGroup();
      } else {
        entry[side] = null;
        exit[side] = null;
      }
    }
    set({ ...spec, direction, entry, exit }, "/direction");
  }

  const r = spec.risk;
  const s = spec.session;

  return (
    <div>
      <Section title="Basics">
        <div className="grid gap-12 sm:grid-cols-3">
          <Field label="Name" error={errorAt("/name")} className="sm:col-span-3">
            <Input
              value={spec.name}
              maxLength={80}
              onChange={(e) => set({ ...spec, name: e.target.value }, "/name")}
              className="h-32 text-sm"
            />
          </Field>
          <Field label="Bars" defaulted={isDefault("/timeframe")}>
            <Choice
              value={spec.timeframe}
              options={TIMEFRAMES}
              labels={TIMEFRAME_LABELS}
              onChange={(timeframe) => set({ ...spec, timeframe }, "/timeframe")}
            />
          </Field>
          <Field label="Direction" defaulted={isDefault("/direction")}>
            <Choice value={spec.direction} options={DIRECTIONS} labels={DIRECTION_LABELS} onChange={setDirection} />
          </Field>
          <Field label="Instrument" hint="One position at a time">
            <div className="flex h-32 items-center rounded-md border border-border/60 px-2.5 text-xs text-muted-foreground">
              NIFTY near-month futures
            </div>
          </Field>
        </div>
      </Section>

      {sides.map((side) => (
        <Section
          key={`entry-${side}`}
          title={side === "long" ? "Buy when" : "Sell short when"}
          description="Checked at each bar's close; filled at the next bar's open."
        >
          <GroupEditor
            group={spec.entry[side] ?? emptyGroup()}
            path={`/entry/${side}`}
            issues={issuesAt(issues, `/entry/${side}`)}
            defaulted={defaulted}
            onChange={(g) => set({ ...spec, entry: { ...spec.entry, [side]: g } }, `/entry/${side}`)}
          />
          {errorAt(`/entry/${side}`) && (
            <p className="text-[11px] text-[var(--destructive)]">{errorAt(`/entry/${side}`)}</p>
          )}
        </Section>
      ))}

      {sides.map((side) => (
        <Section
          key={`exit-${side}`}
          title={side === "long" ? "Exit the long when" : "Cover the short when"}
          description={
            spec.direction === "both"
              ? "Optional. The opposite entry also closes the position."
              : "Optional if a stop, target or square-off closes the trade."
          }
        >
          <GroupEditor
            group={spec.exit[side] ?? emptyGroup()}
            path={`/exit/${side}`}
            issues={issuesAt(issues, `/exit/${side}`)}
            defaulted={defaulted}
            onChange={(g) => set({ ...spec, exit: { ...spec.exit, [side]: g } }, `/exit/${side}`)}
          />
          {errorAt(`/exit/${side}`) && (
            <p className="text-[11px] text-[var(--destructive)]">{errorAt(`/exit/${side}`)}</p>
          )}
        </Section>
      ))}

      <Section title="Risk" description="Checked on every bar while a trade is open.">
        <div className="grid gap-12 sm:grid-cols-2">
          <Field label="Stop-loss" defaulted={isDefault("/risk/stop")} error={errorAt("/risk/stop/value")}>
            <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-1.5">
              <Choice
                value={r.stop.mode}
                options={STOP_MODES}
                labels={STOP_LABELS}
                onChange={(mode) =>
                  set({ ...spec, risk: { ...r, stop: { mode, value: mode === "none" ? null : (r.stop.value ?? 1) } } }, "/risk/stop")
                }
              />
              <NumberInput
                ariaLabel="Stop value"
                value={r.stop.value}
                allowEmpty
                invalid={!!errorAt("/risk/stop/value")}
                onChange={(value) => set({ ...spec, risk: { ...r, stop: { ...r.stop, value } } }, "/risk/stop")}
              />
            </div>
          </Field>
          <Field
            label="Target"
            defaulted={isDefault("/risk/target")}
            error={errorAt("/risk/target/value") ?? errorAt("/risk/target")}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-1.5">
              <Choice
                value={r.target.mode}
                options={TARGET_MODES}
                labels={TARGET_LABELS}
                onChange={(mode) =>
                  set({ ...spec, risk: { ...r, target: { mode, value: mode === "none" ? null : (r.target.value ?? 2) } } }, "/risk/target")
                }
              />
              <NumberInput
                ariaLabel="Target value"
                value={r.target.value}
                allowEmpty
                onChange={(value) => set({ ...spec, risk: { ...r, target: { ...r.target, value } } }, "/risk/target")}
              />
            </div>
          </Field>
          <Field label="Trailing stop" defaulted={isDefault("/risk/trail")} error={errorAt("/risk/trail/value")}>
            <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-1.5">
              <Choice
                value={r.trail.mode}
                options={TRAIL_MODES}
                labels={TRAIL_LABELS}
                onChange={(mode) =>
                  set({ ...spec, risk: { ...r, trail: { mode, value: mode === "none" ? null : (r.trail.value ?? 2) } } }, "/risk/trail")
                }
              />
              <NumberInput
                ariaLabel="Trail ATR multiple"
                value={r.trail.value}
                allowEmpty
                onChange={(value) => set({ ...spec, risk: { ...r, trail: { ...r.trail, value } } }, "/risk/trail")}
              />
            </div>
          </Field>
          <Field label="Time stop" hint="Exit after this many bars; empty for none" defaulted={isDefault("/risk/time_stop_bars")}>
            <NumberInput
              ariaLabel="Time stop bars"
              value={r.time_stop_bars}
              min={1}
              max={500}
              step={1}
              allowEmpty
              onChange={(v) =>
                set({ ...spec, risk: { ...r, time_stop_bars: v == null ? null : Math.max(1, Math.round(v)) } }, "/risk/time_stop_bars")
              }
            />
          </Field>
        </div>
      </Section>

      <Section title="Session" description="NSE hours are 09:15 to 15:30.">
        <div className="grid gap-12 sm:grid-cols-3">
          <Field label="First entry" defaulted={isDefault("/session/entry_start")} error={errorAt("/session")}>
            <TimeInput value={s.entry_start} onChange={(entry_start) => set({ ...spec, session: { ...s, entry_start } }, "/session/entry_start")} />
          </Field>
          <Field label="Last entry" defaulted={isDefault("/session/entry_end")} error={errorAt("/session/entry_end")}>
            <TimeInput value={s.entry_end} onChange={(entry_end) => set({ ...spec, session: { ...s, entry_end } }, "/session/entry_end")} />
          </Field>
          <Field
            label="Square off at"
            defaulted={isDefault("/session/squareoff_time") || isDefault("/session/eod_squareoff")}
            hint={s.eod_squareoff ? undefined : "Off: positions are held overnight"}
          >
            <div className="flex items-center gap-8">
              <input
                type="checkbox"
                aria-label="Square off at end of day"
                checked={s.eod_squareoff}
                onChange={(e) => set({ ...spec, session: { ...s, eod_squareoff: e.target.checked } }, "/session/eod_squareoff")}
                className="h-16 w-16 shrink-0 accent-[var(--foreground)]"
              />
              <TimeInput
                value={s.squareoff_time}
                onChange={(squareoff_time) => set({ ...spec, session: { ...s, squareoff_time } }, "/session/squareoff_time")}
              />
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Size and costs">
        <div className="grid gap-12 sm:grid-cols-2">
          <Field label="Lots" hint="NIFTY lot = 65 units" defaulted={isDefault("/sizing")}>
            <NumberInput
              ariaLabel="Lots"
              value={spec.sizing.lots}
              min={1}
              max={MAX_LOTS}
              step={1}
              onChange={(v) => set({ ...spec, sizing: { lots: Math.min(MAX_LOTS, Math.max(1, Math.round(v ?? 1))) } }, "/sizing")}
            />
          </Field>
          <Field label="Slippage" hint="Ideal 0, normal 1, stress 3 ticks a side" defaulted={isDefault("/execution")}>
            <Choice
              value={spec.execution.slippage}
              options={SLIPPAGE}
              labels={SLIPPAGE_LABELS}
              onChange={(slippage) => set({ ...spec, execution: { slippage } }, "/execution")}
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}
