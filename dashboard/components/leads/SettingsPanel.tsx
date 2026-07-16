"use client";

import React, { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Loader2, Sliders, AlertCircle } from "lucide-react";
import { getLeadThreshold, updateLeadThreshold } from "@/services/firebase/leads.service";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (newThreshold: number) => void;
}

export default function SettingsPanel({ isOpen, onClose, onSaveSuccess }: SettingsPanelProps) {
  const { toast } = useToast();
  const [threshold, setThreshold] = useState<number>(90);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadSettings = async () => {
        try {
          setLoading(true);
          const currentThreshold = await getLeadThreshold();
          setThreshold(currentThreshold);
        } catch (err) {
          toast("Failed to load threshold settings.", "error");
        } finally {
          setLoading(false);
        }
      };
      loadSettings();
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (threshold < 0 || threshold > 100) {
      toast("Threshold must be between 0 and 100.", "error");
      return;
    }

    try {
      setSaving(true);
      await updateLeadThreshold(threshold);
      toast("Lead threshold settings saved!", "success");
      if (onSaveSuccess) {
        onSaveSuccess(threshold);
      }
      onClose();
    } catch (err) {
      toast("Failed to save settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Lead Intelligence Settings"
      description="Configure the threshold for automatic Gmail draft generation."
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="threshold-range" className="font-semibold text-muted-foreground">Auto-Draft Lead Score Threshold</label>
              <span className="font-mono font-bold text-foreground bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-xs">
                {threshold}
              </span>
            </div>

            <div className="flex gap-4 items-center">
              <input
                id="threshold-range"
                type="range"
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <Input
                type="number"
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-16 bg-zinc-900/30 text-center font-mono text-xs"
              />
            </div>
            
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Leads scoring at or above this threshold will automatically create a Gmail Draft. Leads below this threshold will be saved in Firestore and marked as "Pending" for your manual draft review.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border/40 bg-zinc-900/10 flex items-start gap-2 text-[10px] leading-normal text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
            <span>Setting the threshold lower increases automatic draft generation frequency, while higher values ensure draft creation is reserved only for top-tier leads.</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving} className="text-xs">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="text-xs gap-1.5">
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
