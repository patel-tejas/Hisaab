"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function AddStrategyModal({ open, onOpenChange, onAdded }: any) {
  const [name, setName] = useState("");

  async function handleAdd() {
    const res = await fetch("/api/strategies", {
      method: "POST",
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      onAdded(name);
      onOpenChange(false);
      setName("");
    } else {
      alert("Strategy already exists");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Strategy</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label htmlFor="strategy-name" className="label-mono text-muted-foreground">
              Name
            </Label>
            <Input
              id="strategy-name"
              className="h-10 rounded-lg bg-secondary/30 border-border"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Breakout, Pullback..."
            />
          </div>

          <Button className="w-full" onClick={handleAdd} disabled={!name.trim()}>
            Save Strategy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
