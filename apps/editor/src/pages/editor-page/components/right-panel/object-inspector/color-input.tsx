import React from "react";

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="text-xs text-muted-foreground min-w-[40px] flex-shrink-0">{label}</div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded border border-muted cursor-pointer flex-shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-6 px-2 text-xs border rounded bg-black/20 border-zinc-700/50 text-zinc-300 focus:border-emerald-500/50 focus:outline-none min-w-0"
          placeholder="#ffffff"
        />
      </div>
    </div>
  );
} 