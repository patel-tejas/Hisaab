import { Calculator, TrendingUp, Target, DollarSign } from "lucide-react"
import { Card } from "@/components/ui/card"

const tools = [
  {
    icon: Calculator,
    title: "Position Size Calculator",
    description: "Calculate optimal position size based on your risk tolerance and account size.",
  },
  {
    icon: TrendingUp,
    title: "Risk/Reward Calculator",
    description: "Determine potential profit and loss ratios before entering a trade.",
  },
  {
    icon: Target,
    title: "Stop Loss Calculator",
    description: "Find the ideal stop loss level based on volatility and position size.",
  },
  {
    icon: DollarSign,
    title: "Profit Target Calculator",
    description: "Set realistic profit targets based on historical price movements.",
  },
]

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight text-foreground">Trading Tools</h1>
        <p className="text-muted-foreground mt-1">Calculators and utilities to help with your trading decisions.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {tools.map((tool) => (
          <Card
            key={tool.title}
            className="p-6 cursor-pointer transition-all hover:shadow-md hover:border-primary/20 group"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <tool.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{tool.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
