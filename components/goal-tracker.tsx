"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Target, Pencil, Check, X } from "lucide-react"
import { useState, useEffect } from "react"

interface GoalTrackerProps {
    currentPnl: number
}

export function GoalTracker({ currentPnl }: GoalTrackerProps) {
    const [goal, setGoal] = useState<number>(0)
    const [isEditing, setIsEditing] = useState(false)
    const [inputValue, setInputValue] = useState("")

    const storageKey = `pnl-goal-${new Date().getFullYear()}-${new Date().getMonth()}`

    useEffect(() => {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
            setGoal(Number(saved))
        }
    }, [storageKey])

    const handleSave = () => {
        const val = parseFloat(inputValue)
        if (!isNaN(val) && val > 0) {
            setGoal(val)
            localStorage.setItem(storageKey, val.toString())
        }
        setIsEditing(false)
        setInputValue("")
    }

    const progress = goal > 0 ? Math.min(Math.round((currentPnl / goal) * 100), 100) : 0
    const isAchieved = goal > 0 && currentPnl >= goal
    const remaining = goal - currentPnl
    const monthName = new Date().toLocaleString("en-IN", { month: "long" })

    return (
        <Card className="p-5 glass-card relative overflow-hidden">
            <div
                className={cn(
                    "absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-10",
                    isAchieved ? "bg-emerald-500" : "bg-amber-500"
                )}
            />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div
                        className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center",
                            isAchieved ? "bg-emerald-500/10" : "bg-amber-500/10"
                        )}
                    >
                        <Target className={cn("h-5 w-5", isAchieved ? "text-emerald-500" : "text-amber-500")} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">{monthName} Goal</h3>
                        <p className="text-xs text-muted-foreground">Monthly P&L target</p>
                    </div>
                </div>

                {!isEditing && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                            setInputValue(goal > 0 ? goal.toString() : "")
                            setIsEditing(true)
                        }}
                    >
                        <Pencil className="h-5 w-5" />
                    </Button>
                )}
            </div>

            <div className="relative z-10 space-y-3">
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            placeholder="Target amount e.g. 50000"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="h-9 text-sm"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && handleSave()}
                        />
                        <Button size="sm" className="h-9 w-9 p-0" onClick={handleSave}>
                            <Check className="h-5 w-5" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 p-0"
                            onClick={() => setIsEditing(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                ) : goal === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-2">Set a monthly P&L target</p>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditing(true)}
                            className="text-xs"
                        >
                            <Target className="h-5 w-5 mr-1" /> Set Goal
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Progress Bar */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs text-muted-foreground">Progress</span>
                                <span
                                    className={cn(
                                        "text-xs font-bold",
                                        isAchieved ? "text-emerald-500" : progress >= 75 ? "text-amber-500" : "text-foreground"
                                    )}
                                >
                                    {progress}%
                                </span>
                            </div>
                            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-700 ease-out",
                                        isAchieved
                                            ? "bg-emerald-500"
                                            : progress >= 75
                                                ? "bg-amber-500"
                                                : "bg-indigo-500"
                                    )}
                                    style={{ width: `${Math.max(progress, 2)}%` }}
                                />
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between pt-1">
                            <div>
                                <p className="text-xs text-muted-foreground">Current</p>
                                <p
                                    className={cn(
                                        "text-sm font-bold",
                                        currentPnl >= 0 ? "text-emerald-500" : "text-rose-500"
                                    )}
                                >
                                    {currentPnl >= 0 ? "+" : ""}₹{currentPnl.toLocaleString("en-IN")}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground">Target</p>
                                <p className="text-sm font-bold text-foreground">
                                    ₹{goal.toLocaleString("en-IN")}
                                </p>
                            </div>
                        </div>

                        {/* Status Message */}
                        {isAchieved ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs font-semibold text-emerald-500">
                                    🎉 Goal achieved! +₹{(currentPnl - goal).toLocaleString("en-IN")} over target
                                </p>
                            </div>
                        ) : remaining > 0 ? (
                            <p className="text-xs text-muted-foreground text-center">
                                ₹{remaining.toLocaleString("en-IN")} to go
                            </p>
                        ) : null}
                    </>
                )}
            </div>
        </Card>
    )
}
