import React from "react";
import { Settings } from "lucide-react";

interface SceneSettingsProps {
  scene: GameScene | null;
}

export default function SceneSettings({ scene: _scene }: SceneSettingsProps) {
  return (
    <div className="p-4">
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
        <Settings size={16} />
        Scene Settings
      </h3>
      <div className="text-center text-muted-foreground text-sm">
        Scene configuration options will be here
      </div>
    </div>
  );
} 