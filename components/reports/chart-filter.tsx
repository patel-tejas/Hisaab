"use client";

import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export interface FilterOption {
    label: string;
    value: string;
}

interface ChartFilterProps {
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
}

export function ChartFilter({ label, options, value, onChange }: ChartFilterProps) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{label}:</span>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="h-8 rounded-lg text-xs w-auto min-w-[100px] bg-muted/50 border-border">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

// Pill-style toggle filter 
interface PillFilterProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
}

export function PillFilter({ options, value, onChange }: PillFilterProps) {
    return (
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            {options.map((opt) => (
                <button
                    key={opt}
                    onClick={() => onChange(opt)}
                    className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all",
                        value === opt
                            ? "bg-background text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {opt}
                </button>
            ))}
        </div>
    );
}
