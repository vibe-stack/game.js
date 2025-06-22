import React from "react";
import { ScriptManager } from "@/models";

interface ScriptEditorProps {
  scriptManager: ScriptManager;
  onScriptCreated: (scriptId: string) => void;
}

export function ScriptEditor({ scriptManager, onScriptCreated }: ScriptEditorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-gray-400">
      <p>Script Editor</p>
      <p className="text-sm">Coming soon...</p>
    </div>
  );
} 