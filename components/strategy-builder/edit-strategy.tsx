"use client";

/** Loads a saved strategy's current version into the builder. Saving revises it. */

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { parseSpec } from "@/lib/eve/spec";
import { strategiesApi } from "./api";
import { StrategyBuilder, type BuilderInitial } from "./builder";

export function EditStrategy({ id }: { id: string }) {
  const [initial, setInitial] = useState<BuilderInitial | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    strategiesApi
      .get(id)
      .then((d) => {
        const { spec, issues } = parseSpec(d.version.spec);
        if (!spec) throw new Error(issues[0]?.message ?? "saved spec could not be read");
        setInitial({
          id: d.strategy.id,
          version: d.version.version,
          spec,
          status: d.strategy.status,
          trialCount: d.strategy.trial_count,
        });
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  if (error)
    return (
      <Card className="panel-p text-sm">
        <p className="font-medium">Could not open this strategy</p>
        <p className="mt-1 text-muted-foreground">{error}</p>
      </Card>
    );
  if (!initial) return <Skeleton className="h-[30rem] rounded-xl" />;
  return <StrategyBuilder initial={initial} />;
}
