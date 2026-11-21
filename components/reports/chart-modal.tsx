import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ReactNode } from "react";

interface ChartModalProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    filters?: ReactNode;
}

export function ChartModal({ title, isOpen, onClose, children, filters }: ChartModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-6xl sm:max-w-6xl h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="pl-6 pr-12 pt-5 pb-0 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
                        {filters && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {filters}
                            </div>
                        )}
                    </div>
                </DialogHeader>
                <div className="flex-1 w-full min-h-0 px-6 pb-6 pt-4">{children}</div>
            </DialogContent>
        </Dialog>
    );
}
