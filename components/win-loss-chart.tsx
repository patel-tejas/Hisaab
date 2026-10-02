"use client"

import { Card } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

interface WinLossChartProps {
    winCount: number
    lossCount: number
    winRate: number
}

export function WinLossChart({ winCount, lossCount, winRate }: WinLossChartProps) {
    const data = [
        { name: "Wins", value: winCount, color: "#10b981" },
        { name: "Losses", value: lossCount, color: "#f43f5e" },
    ]

    const total = winCount + lossCount

    return (
        <Card className="p-6 glass-card h-full flex flex-col">
            <div className="mb-4">
                <h3 className="font-semibold text-foreground">Win / Loss</h3>
                <p className="text-xs text-muted-foreground">All-time distribution</p>
            </div>

            <div className="flex-1 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                            strokeWidth={0}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-foreground">{winRate}%</span>
                    <span className="label-mono text-muted-foreground">Win Rate</span>
                </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[var(--success)]"></div>
                    <span className="text-xs text-muted-foreground">Wins</span>
                    <span className="text-xs font-bold text-foreground">{winCount}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[var(--destructive)]"></div>
                    <span className="text-xs text-muted-foreground">Losses</span>
                    <span className="text-xs font-bold text-foreground">{lossCount}</span>
                </div>
            </div>
        </Card>
    )
}
