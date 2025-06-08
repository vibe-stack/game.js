import React from "react";
import { Label } from "@/components/ui/label";

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground w-12 flex-shrink-0">{label}</Label>
      <div className="flex items-center gap-2 flex-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-6 rounded border border-muted cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-6 px-2 text-xs border rounded bg-black/20 border-zinc-700/50 text-zinc-300 focus:border-emerald-500/50 focus:outline-none"
          placeholder="#ffffff"
        />
      </div>
    </div>
  );
} 