"use client"

import { Calculator } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CompoundingCalculator } from "@/components/tools/compounding"
import { LotCalculator } from "@/components/tools/lot-calculator"
import { PositionSizeCalculator } from "@/components/tools/position-size"
import { RiskRewardCalculator } from "@/components/tools/risk-reward"

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Calculator />}
        eyebrow="Tools"
        title="Trading calculators"
        description="Size a trade before you take it. Everything runs in your browser and nothing is saved."
      />

      <Tabs defaultValue="position" className="gap-6">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="position">Position size</TabsTrigger>
          <TabsTrigger value="rr">Risk to reward</TabsTrigger>
          <TabsTrigger value="lots">F&O lots</TabsTrigger>
          <TabsTrigger value="compounding">Compounding</TabsTrigger>
        </TabsList>

        <TabsContent value="position">
          <PositionSizeCalculator />
        </TabsContent>
        <TabsContent value="rr">
          <RiskRewardCalculator />
        </TabsContent>
        <TabsContent value="lots">
          <LotCalculator />
        </TabsContent>
        <TabsContent value="compounding">
          <CompoundingCalculator />
        </TabsContent>
      </Tabs>
    </div>
  )
}
