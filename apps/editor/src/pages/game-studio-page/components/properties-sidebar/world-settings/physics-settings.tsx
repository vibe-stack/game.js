import React, { useState, useEffect } from "react";
import { GameWorldService } from "../../../services/game-world-service";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DragInput } from "@/components/ui/drag-input";
import { Zap } from "lucide-react";
import * as THREE from "three/webgpu";

interface PhysicsSettingsProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
}

export function PhysicsSettings({ gameWorldService }: PhysicsSettingsProps) {
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [gravity, setGravity] = useState({ x: 0, y: -9.81, z: 0 });

  useEffect(() => {
    const updatePhysicsState = () => {
      const gameWorld = gameWorldService.current?.getGameWorld();
      if (gameWorld) {
        const physicsManager = gameWorld.getPhysicsManager();
        setPhysicsEnabled(physicsManager.isEnabled());
        
        const currentGravity = physicsManager.getGravity();
        setGravity({
          x: currentGravity.x,
          y: currentGravity.y,
          z: currentGravity.z,
        });
      }
    };

    updatePhysicsState();
    const interval = setInterval(updatePhysicsState, 1000);
    return () => clearInterval(interval);
  }, [gameWorldService]);

  const handleGravityChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newGravity = { ...gravity, [axis]: value };
    setGravity(newGravity);
    
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
      const physicsManager = gameWorld.getPhysicsManager();
      physicsManager.setGravity(new THREE.Vector3(newGravity.x, newGravity.y, newGravity.z));
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-white">
          <Zap className="h-4 w-4" />
          Physics Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="physics-enabled" className="text-white/80">
            Physics Enabled
          </Label>
          <Switch
            id="physics-enabled"
            checked={physicsEnabled}
            disabled={true} // Physics enable/disable requires world restart
          />
        </div>
        
        {physicsEnabled && (
          <>
            <div className="space-y-3">
              <Label className="text-white/80">Gravity</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-white/60">X</Label>
                  <DragInput
                    value={gravity.x}
                    onChange={(value) => handleGravityChange('x', value)}
                    step={0.1}
                    min={-50}
                    max={50}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-white/60">Y</Label>
                  <DragInput
                    value={gravity.y}
                    onChange={(value) => handleGravityChange('y', value)}
                    step={0.1}
                    min={-50}
                    max={50}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-white/60">Z</Label>
                  <DragInput
                    value={gravity.z}
                    onChange={(value) => handleGravityChange('z', value)}
                    step={0.1}
                    min={-50}
                    max={50}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 