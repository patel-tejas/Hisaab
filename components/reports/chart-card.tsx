
import { Maximize2, Minimize2 } from "lucide-react";
import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChartModal } from "./chart-modal";

interface ChartCardProps {
    title: string;
    children: ReactNode;
    height?: string;
    filters?: ReactNode;
}

export function ChartCard({ title, children, height = "h-[300px]", filters }: ChartCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <>
            <Card className="p-5 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{title}</h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsExpanded(true)}
                        title="Maximize Chart"
                        className="h-8 w-8 rounded-lg hover:bg-muted"
                    >
                        <Maximize2 className="h-5 w-5" />
                    </Button>
                </div>

                <div className={`w-full ${height} overflow-hidden`}>{isExpanded ? null : children}</div>
            </Card>

            <ChartModal
                title={title}
                isOpen={isExpanded}
                onClose={() => setIsExpanded(false)}
                filters={filters}
            >
                {children}
            </ChartModal>
        </>
    );
}
