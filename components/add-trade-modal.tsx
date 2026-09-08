import { useEffect, useState } from "react";
import { Info, Brain, RotateCcw, Save, Upload, X, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { emotionalStates, outcomes, mistakeOptions } from "@/lib/mock-data";
import { AddStrategyModal } from "./add-strategy-modal";
import { RichTextEditor } from "./rich-text-editor";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";

const defaultSymbols = ["NIFTY 50", "BANKNIFTY", "SENSEX", "BTC", "ETH", "GOLD", "SILVER"];

const defaultQuantities: Record<string, number> = {
  "NIFTY 50": 65,
  BANKNIFTY: 15,
  SENSEX: 20,
  BTC: 1,
  ETH: 10,
  GOLD: 1,
  SILVER: 30,
};

// Moved outside to prevent re-mounting on every render
const FieldGroup = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
      {label}{required && <span className="text-primary ml-0.5">*</span>}
    </Label>
    {children}
  </div>
);

export function AddTradeModal({
  open,
  onOpenChange,
  tradeToEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradeToEdit?: any;
}) {
  const [activeTab, setActiveTab] = useState<"general" | "psychology">("general");

  const [symbol, setSymbol] = useState("");
  const [date, setDate] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [entryTime, setEntryTime] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [quantity, setQuantity] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [target, setTarget] = useState("");

  const [direction, setDirection] = useState("long");
  const [notes, setNotes] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [entryConfidence, setEntryConfidence] = useState([8]);
  const [satisfaction, setSatisfaction] = useState([9]);
  const [selectedEmotional, setSelectedEmotional] = useState("Calm");
  const [selectedOutcome, setSelectedOutcome] = useState("Full Success");
  const [selectedMistakes, setSelectedMistakes] = useState(["No Mistakes"]);

  const [strategies, setStrategies] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/strategies")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.strategies)
            ? data.strategies
            : [];
        setStrategies(list);
      })
      .catch(() => setStrategies([]));
  }, [open]);

  useEffect(() => {
    if (open && tradeToEdit) {
      setSymbol(tradeToEdit.symbol);
      setDate(tradeToEdit.date.split("T")[0]);
      setEntryPrice(tradeToEdit.entryPrice);
      setExitPrice(tradeToEdit.exitPrice);
      setEntryTime(tradeToEdit.entryTime || "");
      setExitTime(tradeToEdit.exitTime || "");
      setQuantity(String(tradeToEdit.quantity));
      setStopLoss(tradeToEdit.stopLoss || "");
      setTarget(tradeToEdit.target || "");
      setNotes(tradeToEdit.notes || "");
      setLessonsLearned(tradeToEdit.lessonsLearned || "");
      setDirection(tradeToEdit.type || "long");
      setSelectedStrategy(tradeToEdit.strategy || "");
      setEntryConfidence([tradeToEdit.entryConfidence || 8]);
      setSatisfaction([tradeToEdit.satisfaction || 9]);
      setSelectedEmotional(tradeToEdit.emotionalState || "Calm");
      setSelectedOutcome(tradeToEdit.outcome || "Full Success");
      setSelectedMistakes(tradeToEdit.mistakes || ["No Mistakes"]);
      setImages(tradeToEdit.images || []);
    } else if (open && !tradeToEdit) {
      handleReset();
    }
  }, [open, tradeToEdit]);

  const handleReset = () => {
    setSymbol("");
    setDate("");
    setEntryPrice("");
    setExitPrice("");
    setEntryTime("");
    setExitTime("");
    setQuantity("");
    setStopLoss("");
    setTarget("");
    setNotes("");
    setLessonsLearned("");
    setImages([]);
    setDirection("long");
    setSelectedStrategy("");
    setEntryConfidence([8]);
    setSatisfaction([9]);
    setSelectedMistakes(["No Mistakes"]);
  };

  const toggleMistake = (m: string) => {
    if (m === "No Mistakes") return setSelectedMistakes(["No Mistakes"]);
    setSelectedMistakes((prev) => {
      const f = prev.filter((x) => x !== "No Mistakes");
      return f.includes(m) ? f.filter((x) => x !== m) : [...f, m];
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('trades')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('trades')
        .getPublicUrl(filePath);

      setImages((prev) => [...prev, data.publicUrl]);
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleSaveTrade() {
    if (!symbol) return toast.error("Please select a symbol");
    if (!date) return toast.error("Please select a date");
    if (!entryPrice) return toast.error("Please enter an entry price");
    if (!exitPrice) return toast.error("Please enter an exit price");
    if (!quantity) return toast.error("Please enter a quantity");
    if (!selectedStrategy) return toast.error("Please select a strategy");

    setSaving(true);

    const pnl = (Number(exitPrice) - Number(entryPrice)) * Number(quantity);
    const pnlPercent = ((Number(exitPrice) - Number(entryPrice)) / Number(entryPrice)) * 100;

    const trade = {
      symbol,
      date,
      type: direction,
      quantity: Number(quantity),
      entryPrice: Number(entryPrice),
      exitPrice: Number(exitPrice),
      entryTime,
      exitTime,
      totalAmount: Number(entryPrice) * Number(quantity),
      pnl,
      pnlPercent,
      stopLoss: Number(stopLoss),
      target: Number(target),
      strategy: selectedStrategy,
      outcome: selectedOutcome,
      entryConfidence: entryConfidence[0],
      satisfaction: satisfaction[0],
      emotionalState: selectedEmotional,
      mistakes: selectedMistakes,
      notes,
      lessonsLearned,
      images,
    };

    try {
      const res = await fetch("/api/trades", {
        method: tradeToEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tradeToEdit ? { ...trade, _id: tradeToEdit._id } : trade),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save trade");
      }

      toast.success(tradeToEdit ? "Trade updated successfully" : "Trade saved successfully");
      onOpenChange(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong while saving the trade");
    } finally {
      setSaving(false);
    }
  }



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[90vw] max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl font-bold text-foreground">
            {tradeToEdit ? "Edit Trade" : "Add New Trade"}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-2">
          <button
            onClick={() => setActiveTab("general")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "general"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Info className="h-5 w-5" />
            General
          </button>
          <button
            onClick={() => setActiveTab("psychology")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "psychology"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Brain className="h-5 w-5" />
            Psychology
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* ──────── GENERAL TAB ──────── */}
          {activeTab === "general" && (
            <div className="space-y-5 pt-4">

              {/* Row 1: Symbol + Direction + Date */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4">
                  <FieldGroup label="Symbol" required>
                    <Select
                      value={symbol}
                      onValueChange={(v) => {
                        setSymbol(v);
                        if (defaultQuantities[v]) setQuantity(String(defaultQuantities[v]));
                      }}
                    >
                      <SelectTrigger className="rounded-lg bg-secondary/30 border-border h-10">
                        <SelectValue placeholder="Select symbol" />
                      </SelectTrigger>
                      <SelectContent>
                        {defaultSymbols.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="mt-1.5 rounded-lg bg-secondary/30 border-border h-10"
                      placeholder="Or type custom symbol"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                    />
                  </FieldGroup>
                </div>

                <div className="col-span-4">
                  <FieldGroup label="Direction" required>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDirection("long")}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold transition-all border",
                          direction === "long"
                            ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-500 dark:text-indigo-400"
                            : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <ArrowUpRight className="h-5 w-5" /> Long
                      </button>
                      <button
                        type="button"
                        onClick={() => setDirection("short")}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold transition-all border",
                          direction === "short"
                            ? "bg-orange-500/15 border-orange-500/40 text-orange-500 dark:text-orange-400"
                            : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <ArrowDownRight className="h-5 w-5" /> Short
                      </button>
                    </div>
                  </FieldGroup>
                </div>

                <div className="col-span-4">
                  <FieldGroup label="Date" required>
                    <Input value={date} type="date" onChange={(e) => setDate(e.target.value)} className="rounded-lg bg-secondary/30 border-border h-10" />
                  </FieldGroup>
                </div>
              </div>

              {/* Row 2: Entry Price, Exit Price, Quantity, Entry Time, Exit Time */}
              <div className="grid grid-cols-5 gap-4">
                <FieldGroup label="Entry Price" required>
                  <Input value={entryPrice} type="number" onChange={(e) => setEntryPrice(e.target.value)} className="rounded-lg bg-secondary/30 border-border h-10" placeholder="0.00" />
                </FieldGroup>
                <FieldGroup label="Exit Price" required>
                  <Input value={exitPrice} type="number" onChange={(e) => setExitPrice(e.target.value)} className="rounded-lg bg-secondary/30 border-border h-10" placeholder="0.00" />
                </FieldGroup>
                <FieldGroup label="Quantity" required>
                  <Input value={quantity} type="number" onChange={(e) => setQuantity(e.target.value)} className="rounded-lg bg-secondary/30 border-border h-10" placeholder="0" />
                </FieldGroup>
                <FieldGroup label="Entry Time">
                  <Input value={entryTime} type="time" onChange={(e) => setEntryTime(e.target.value)} className="rounded-lg bg-secondary/30 border-border h-10" />
                </FieldGroup>
                <FieldGroup label="Exit Time">
                  <Input value={exitTime} type="time" onChange={(e) => setExitTime(e.target.value)} className="rounded-lg bg-secondary/30 border-border h-10" />
                </FieldGroup>
              </div>

              {/* Row 3: Stop Loss, Target, Strategy, Outcome */}
              <div className="grid grid-cols-4 gap-4">
                <FieldGroup label="Stop Loss">
                  <Input value={stopLoss} type="number" onChange={(e) => setStopLoss(e.target.value)} className="rounded-lg bg-secondary/30 border-border h-10" placeholder="0.00" />
                </FieldGroup>
                <FieldGroup label="Target">
                  <Input value={target} type="number" onChange={(e) => setTarget(e.target.value)} className="rounded-lg bg-secondary/30 border-border h-10" placeholder="0.00" />
                </FieldGroup>
                <FieldGroup label="Strategy" required>
                  <Select
                    value={selectedStrategy}
                    onValueChange={(v) => {
                      if (v === "__add__") return setStrategyModalOpen(true);
                      setSelectedStrategy(v);
                    }}
                  >
                    <SelectTrigger className="rounded-lg bg-secondary/30 border-border h-10">
                      <SelectValue placeholder="Choose strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(strategies) ? strategies : []).map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                      <div className="border-t my-1" />
                      <SelectItem value="__add__">➕ Add New Strategy</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>
                <FieldGroup label="Outcome" required>
                  <Select value={selectedOutcome} onValueChange={setSelectedOutcome}>
                    <SelectTrigger className="rounded-lg bg-secondary/30 border-border h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {outcomes.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>

              {/* Row 4: Screenshots + Trade Analysis side by side */}
              <div className="grid grid-cols-2 gap-6">
                <FieldGroup label="Chart Screenshots">
                  <div className="flex flex-wrap gap-3 mt-1">
                    {images.map((img, index) => (
                      <div key={index} className="relative w-20 h-20 border border-border rounded-lg overflow-hidden group">
                        <img src={img} alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 hover:border-primary/40 transition-all">
                      <Upload className="h-5 w-5 text-muted-foreground mb-0.5" />
                      <span className="text-[10px] text-muted-foreground font-medium">{uploading ? "Uploading..." : "Upload"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </FieldGroup>

                <FieldGroup label="Trade Analysis" required>
                  <RichTextEditor content={notes} onChange={setNotes} />
                </FieldGroup>
              </div>
            </div>
          )}

          {/* ──────── PSYCHOLOGY TAB ──────── */}
          {activeTab === "psychology" && (
            <div className="pt-4">
              <div className="grid grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <FieldGroup label="Entry Confidence">
                    <div className="flex items-center gap-4">
                      <Slider value={entryConfidence} onValueChange={setEntryConfidence} max={10} min={1} className="flex-1" />
                      <span className="text-xl font-bold text-foreground w-8 text-center">{entryConfidence[0]}</span>
                    </div>
                  </FieldGroup>

                  <FieldGroup label="Satisfaction">
                    <div className="flex items-center gap-4">
                      <Slider value={satisfaction} onValueChange={setSatisfaction} max={10} min={1} className="flex-1" />
                      <span className="text-xl font-bold text-foreground w-8 text-center">{satisfaction[0]}</span>
                    </div>
                  </FieldGroup>

                  <FieldGroup label="Emotional State" required>
                    <Select value={selectedEmotional} onValueChange={setSelectedEmotional}>
                      <SelectTrigger className="rounded-lg bg-secondary/30 border-border h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {emotionalStates.map((em) => (
                          <SelectItem key={em} value={em}>{em}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <FieldGroup label="Mistakes" required>
                    <div className="grid grid-cols-2 gap-2">
                      {mistakeOptions.map((m) => (
                        <label key={m} className="flex items-center gap-2 text-sm text-foreground cursor-pointer hover:text-primary transition-colors">
                          <Checkbox
                            checked={selectedMistakes.includes(m)}
                            onCheckedChange={() => toggleMistake(m)}
                          />
                          {m}
                        </label>
                      ))}
                    </div>
                  </FieldGroup>

                  <FieldGroup label="Lessons Learned">
                    <Textarea
                      className="rounded-lg bg-secondary/30 border-border min-h-[100px] resize-none"
                      placeholder="What did you learn from this trade?"
                      value={lessonsLearned}
                      onChange={(e) => setLessonsLearned(e.target.value)}
                    />
                  </FieldGroup>
                </div>
              </div>
            </div>
          )}

          {/* ──────── FOOTER ──────── */}
          <div className="flex items-center justify-between pt-5 mt-5 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleReset}
              disabled={saving}
              className="text-muted-foreground hover:text-foreground rounded-lg"
            >
              <RotateCcw className="mr-2 h-5 w-5" /> Reset
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTrade}
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 px-6 transition-all hover:scale-[1.02]"
              >
                {saving ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving…</>
                ) : (
                  <><Save className="mr-2 h-5 w-5" /> {tradeToEdit ? "Update Trade" : "Save Trade"}</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* STRATEGY ADD MODAL */}
        <AddStrategyModal
          open={strategyModalOpen}
          onOpenChange={setStrategyModalOpen}
          onAdded={(name: string) => {
            setStrategies((prev: string[]) => [...prev, name]);
            setSelectedStrategy(name);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
