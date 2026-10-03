"use client";

/**
 * The kill switch, everywhere trading state is shown. Engaging stops every
 * paper run at once; releasing is a separate, deliberate click and does not
 * restart anything. Eve can engage it from chat but never release it.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, OctagonX, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { controlsApi, type Controls } from "./api";

export function useControls() {
  const [controls, setControls] = useState<Controls | null>(null);
  const refresh = useCallback(() => {
    controlsApi.get().then(setControls).catch(() => setControls(null));
  }, []);
  useEffect(refresh, [refresh]);
  return { controls, setControls, refresh };
}

export function KillSwitch({
  controls,
  onChange,
  className,
}: {
  controls: Controls | null;
  onChange: (c: Controls) => void;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  if (!controls) return null;
  const engaged = controls.engaged;
  const globalOnly = controls.global.engaged && !controls.own.engaged;

  async function toggle() {
    if (engaged) {
      if (globalOnly) return;
      if (!window.confirm("Release your kill switch? Stopped paper runs stay stopped until you start them again.")) return;
    } else if (!window.confirm("Stop all trading? Every paper-trading strategy stops now.")) {
      return;
    }
    setBusy(true);
    try {
      const next = await controlsApi.set(!engaged, engaged ? "" : "stopped from Hisaab");
      onChange(next);
      if (!engaged) {
        const n = next.stopped_paper_runs?.length ?? 0;
        toast.success("Kill switch engaged", { description: `${n} paper run${n === 1 ? "" : "s"} stopped.` });
      } else {
        toast.success("Kill switch released");
      }
    } catch (err) {
      toast.error("Could not change the kill switch", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  const reason = controls.own.reason ?? controls.global.reason;
  return (
    <Button
      variant="outline"
      onClick={() => void toggle()}
      disabled={busy || globalOnly}
      title={engaged ? (reason ?? "Kill switch engaged") : "Stop every paper-trading strategy now"}
      className={cn(
        "h-32 gap-1.5 rounded-lg px-3 text-xs",
        engaged
          ? "border-[var(--destructive)]/50 bg-[var(--destructive)]/10 text-[var(--destructive)]"
          : "hover:border-[var(--destructive)]/50 hover:text-[var(--destructive)]",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : engaged ? (
        <OctagonX className="size-3.5" />
      ) : (
        <ShieldCheck className="size-3.5" />
      )}
      {engaged ? (globalOnly ? "Trading halted by admin" : "Trading stopped · Release") : "Stop all trading"}
    </Button>
  );
}
