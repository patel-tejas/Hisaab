import { Suspense } from "react";

import { StrategyBuilder } from "@/components/strategy-builder/builder";

export const metadata = { title: "New strategy · Hisaab" };

export default function NewStrategyPage() {
  // useSearchParams (the chat hand-off) needs a Suspense boundary.
  return (
    <Suspense>
      <StrategyBuilder />
    </Suspense>
  );
}
