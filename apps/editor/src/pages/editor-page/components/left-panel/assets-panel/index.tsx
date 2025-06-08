import React from "react";

interface AssetsPanelProps {
  scene: GameScene | null;
}

export default function AssetsPanel({ scene: _scene }: AssetsPanelProps) {
  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Project Assets</h3>
      <div className="text-center text-muted-foreground text-sm">
        Asset browser will be implemented here
      </div>
    </div>
  );
} 