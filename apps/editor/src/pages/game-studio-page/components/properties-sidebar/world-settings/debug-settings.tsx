import React, { useState, useEffect } from "react";
import { GameWorldService } from "../../../services/game-world-service";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bug } from "lucide-react";

interface DebugSettingsProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
}

export function DebugSettings({ gameWorldService }: DebugSettingsProps) {
  const [physicsDebugEnabled, setPhysicsDebugEnabled] = useState(false);

  useEffect(() => {
    const updateDebugState = () => {
      const gameWorld = gameWorldService.current?.getGameWorld();
      if (gameWorld) {
        setPhysicsDebugEnabled(gameWorld.isPhysicsDebugRenderEnabled());
      }
    };

    // Update state when component mounts
    updateDebugState();

    // Set up an interval to check for changes (since we don't have direct state management)
    const interval = setInterval(updateDebugState, 500);

    return () => clearInterval(interval);
  }, [gameWorldService]);

  const handlePhysicsDebugToggle = (enabled: boolean) => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
      if (enabled) {
        gameWorld.enablePhysicsDebugRender();
      } else {
        gameWorld.disablePhysicsDebugRender();
      }
      setPhysicsDebugEnabled(enabled);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-white">
          <Bug className="h-4 w-4" />
          Debug Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="physics-debug" className="text-white/80">
            Physics Debug Rendering
          </Label>
          <Switch
            id="physics-debug"
            checked={physicsDebugEnabled}
            onCheckedChange={handlePhysicsDebugToggle}
          />
        </div>
        <div className="text-xs text-white/60">
          Shows physics collision shapes and debug wireframes
        </div>
      </CardContent>
    </Card>
  );
} 