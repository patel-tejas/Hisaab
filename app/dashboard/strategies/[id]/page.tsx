import { StrategyDetail } from "@/components/strategy-builder/strategy-detail";

export const metadata = { title: "Strategy · Hisaab" };

export default async function StrategyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StrategyDetail id={id} />;
}
