import { Suspense } from "react";

import { EditStrategy } from "@/components/strategy-builder/edit-strategy";

export const metadata = { title: "Edit strategy · Hisaab" };

export default async function EditStrategyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <EditStrategy id={id} />
    </Suspense>
  );
}
