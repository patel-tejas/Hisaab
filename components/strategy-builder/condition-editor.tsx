"use client";

/**
 * Editing conditions: a group is an "all of" list and an "any of" list, each
 * a column of rows that read like a sentence ("Close crosses above EMA(20)").
 */

import { Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CHANGE_REFS,
  CHANGE_REF_LABELS,
  COMPARATORS,
  COMPARATOR_LABELS,
  INDICATORS,
  INDICATOR_NAMES,
  LEVEL_LABELS,
  LEVEL_NAMES,
  MAX_CONDITIONS_PER_LIST,
  MAX_OFFSET,
  OPERAND_KIND_LABELS,
  PRICE_FIELDS,
  PRICE_FIELD_LABELS,
  defaultCondition,
  defaultOperand,
  type Comparator,
  type Condition,
  type ConditionGroup,
  type IndicatorName,
  type Operand,
  type SpecIssue,
} from "@/lib/eve/spec";
import { Choice, NumberInput } from "./field";

const KINDS = ["indicator", "price", "level", "const", "change_pct"] as const;
const INDICATOR_LABELS = Object.fromEntries(
  INDICATOR_NAMES.map((n) => [n, INDICATORS[n].label]),
) as Record<IndicatorName, string>;

/** Issues at or under `path`. */
export function issuesAt(issues: SpecIssue[], path: string): SpecIssue[] {
  return issues.filter((i) => i.path === path || i.path.startsWith(path + "/"));
}

export function GroupEditor({
  group,
  path,
  issues,
  defaulted,
  onChange,
}: {
  group: ConditionGroup;
  path: string;
  issues: SpecIssue[];
  defaulted: string[];
  onChange: (g: ConditionGroup) => void;
}) {
  return (
    <div className="space-y-16">
      <ConditionList
        title="All of these"
        hint="every one must be true"
        list={group.all}
        path={`${path}/all`}
        issues={issues}
        defaulted={defaulted}
        onChange={(all) => onChange({ ...group, all })}
      />
      <ConditionList
        title="Any of these"
        hint="at least one must be true"
        list={group.any}
        path={`${path}/any`}
        issues={issues}
        defaulted={defaulted}
        onChange={(any) => onChange({ ...group, any })}
      />
    </div>
  );
}

function ConditionList({
  title,
  hint,
  list,
  path,
  issues,
  defaulted,
  onChange,
}: {
  title: string;
  hint: string;
  list: Condition[];
  path: string;
  issues: SpecIssue[];
  defaulted: string[];
  onChange: (l: Condition[]) => void;
}) {
  const full = list.length >= MAX_CONDITIONS_PER_LIST;
  return (
    <div className="space-y-8">
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{title}</span> · {hint}
      </p>
      {list.map((c, i) => (
        <ConditionRow
          key={i}
          condition={c}
          path={`${path}/${i}`}
          issues={issuesAt(issues, `${path}/${i}`)}
          defaulted={defaulted.some((d) => d === `${path}/${i}` || d.startsWith(`${path}/${i}/`))}
          onChange={(next) => onChange(list.map((x, j) => (j === i ? next : x)))}
          onRemove={() => onChange(list.filter((_, j) => j !== i))}
        />
      ))}
      <button
        type="button"
        disabled={full}
        onClick={() => onChange([...list, defaultCondition()])}
        className="interactive flex h-32 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <Plus className="size-3.5" /> {full ? `Up to ${MAX_CONDITIONS_PER_LIST} conditions` : "Add condition"}
      </button>
    </div>
  );
}

function ConditionRow({
  condition,
  path,
  issues,
  defaulted,
  onChange,
  onRemove,
}: {
  condition: Condition;
  path: string;
  issues: SpecIssue[];
  defaulted: boolean;
  onChange: (c: Condition) => void;
  onRemove: () => void;
}) {
  const trend = condition.cmp === "rising" || condition.cmp === "falling";
  const errors = issues.filter((i) => i.severity === "error");

  function setCmp(cmp: Comparator) {
    const toTrend = cmp === "rising" || cmp === "falling";
    onChange({
      ...condition,
      cmp,
      rhs: toTrend ? null : (condition.rhs ?? defaultOperand("const")),
      bars: toTrend ? (condition.bars ?? 1) : null,
    });
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-secondary/20 p-12",
        errors.length ? "border-[var(--destructive)]/50" : defaulted ? "border-[var(--warning)]/50" : "border-border/60",
      )}
    >
      <div className="flex items-start gap-8">
        <div className="grid min-w-0 flex-1 gap-8 sm:grid-cols-[minmax(0,1fr)_9.5rem_minmax(0,1fr)]">
          <OperandPicker operand={condition.lhs} onChange={(lhs) => onChange({ ...condition, lhs })} />
          <Choice
            ariaLabel="Comparison"
            value={condition.cmp}
            options={COMPARATORS}
            labels={COMPARATOR_LABELS}
            onChange={setCmp}
          />
          {trend ? (
            <div className="flex items-center gap-8 text-xs text-muted-foreground">
              <span className="shrink-0">over</span>
              <NumberInput
                ariaLabel="Bars"
                value={condition.bars ?? 1}
                min={1}
                max={MAX_OFFSET}
                step={1}
                onChange={(v) => onChange({ ...condition, bars: Math.max(1, Math.round(v ?? 1)) })}
                className="w-[4.5rem]"
              />
              <span className="shrink-0">bar{(condition.bars ?? 1) === 1 ? "" : "s"}</span>
            </div>
          ) : (
            <OperandPicker
              operand={condition.rhs ?? defaultOperand("const")}
              onChange={(rhs) => onChange({ ...condition, rhs })}
            />
          )}
        </div>
        <button
          type="button"
          aria-label="Remove condition"
          onClick={onRemove}
          className="interactive mt-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
      {errors.length > 0 && (
        <ul className="mt-8 space-y-0.5 text-[11px] text-[var(--destructive)]">
          {errors.map((e, n) => (
            <li key={n}>
              <span className="font-mono opacity-70">{e.path.slice(path.length) || "/"}</span> {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OperandPicker({ operand, onChange }: { operand: Operand; onChange: (o: Operand) => void }) {
  const offset = "offset" in operand ? operand.offset : 0;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-1.5">
        <Choice
          ariaLabel="Operand type"
          value={operand.kind}
          options={KINDS}
          labels={OPERAND_KIND_LABELS}
          onChange={(k) => k !== operand.kind && onChange(defaultOperand(k))}
        />
        {operand.kind === "indicator" && (
          <Choice
            ariaLabel="Indicator"
            value={operand.name}
            options={INDICATOR_NAMES}
            labels={INDICATOR_LABELS}
            onChange={(name) =>
              onChange({
                ...operand,
                name,
                params: Object.fromEntries(
                  Object.entries(INDICATORS[name].params).map(([k, p]) => [k, p.default]),
                ),
                output: INDICATORS[name].outputs?.[0] ?? null,
              })
            }
          />
        )}
        {operand.kind === "price" && (
          <Choice
            ariaLabel="Price field"
            value={operand.field}
            options={PRICE_FIELDS}
            labels={PRICE_FIELD_LABELS}
            onChange={(field) => onChange({ ...operand, field })}
          />
        )}
        {operand.kind === "level" && (
          <Choice
            ariaLabel="Level"
            value={operand.name}
            options={LEVEL_NAMES}
            labels={LEVEL_LABELS}
            onChange={(name) => onChange({ ...operand, name })}
          />
        )}
        {operand.kind === "change_pct" && (
          <Choice
            ariaLabel="Change reference"
            value={operand.ref}
            options={CHANGE_REFS}
            labels={CHANGE_REF_LABELS}
            onChange={(ref) => onChange({ ...operand, ref })}
          />
        )}
        {operand.kind === "const" && (
          <NumberInput
            ariaLabel="Value"
            value={operand.value}
            onChange={(v) => onChange({ ...operand, value: v ?? 0 })}
          />
        )}
      </div>

      {operand.kind === "indicator" && <IndicatorParams operand={operand} onChange={onChange} />}

      {operand.kind !== "const" && (
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <NumberInput
            ariaLabel="Bars ago"
            value={offset}
            min={0}
            max={MAX_OFFSET}
            step={1}
            onChange={(v) => onChange({ ...operand, offset: Math.max(0, Math.round(v ?? 0)) } as Operand)}
            className="h-7 w-14"
          />
          bars ago
        </label>
      )}
    </div>
  );
}

function IndicatorParams({
  operand,
  onChange,
}: {
  operand: Extract<Operand, { kind: "indicator" }>;
  onChange: (o: Operand) => void;
}) {
  const def = INDICATORS[operand.name];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {Object.entries(def.params).map(([key, p]) => (
        <label key={key} className="flex items-center gap-1 text-[11px] text-muted-foreground" title={p.description}>
          {key}
          <NumberInput
            ariaLabel={`${def.label} ${key}`}
            value={operand.params[key] ?? p.default}
            min={p.min}
            max={p.max}
            step={p.type === "int" ? 1 : 0.1}
            invalid={(operand.params[key] ?? p.default) < p.min || (operand.params[key] ?? p.default) > p.max}
            onChange={(v) => onChange({ ...operand, params: { ...operand.params, [key]: v ?? p.default } })}
            className="h-7 w-[4.5rem]"
          />
        </label>
      ))}
      {def.outputs && (
        <Choice
          ariaLabel={`${def.label} output`}
          value={operand.output ?? def.outputs[0]}
          options={def.outputs}
          onChange={(output) => onChange({ ...operand, output })}
          className="w-[6rem] data-[size=default]:h-7"
        />
      )}
    </div>
  );
}
