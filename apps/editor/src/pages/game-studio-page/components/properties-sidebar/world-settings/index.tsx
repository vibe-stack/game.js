import React from "react";
import { GameWorldService } from "../../../services/game-world-service";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PhysicsSettings } from "./physics-settings";
import { RenderSettings } from "./render-settings";
import { DebugSettings } from "./debug-settings";

interface WorldSettingsProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
}

export function WorldSettings({ gameWorldService }: WorldSettingsProps) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-2">
        <div className="text-sm text-white/60">
          Configure world and physics settings
        </div>
        
        <DebugSettings gameWorldService={gameWorldService} />
        <Separator className="bg-white/10" />
        
        <PhysicsSettings gameWorldService={gameWorldService} />
        <Separator className="bg-white/10" />
        
        <RenderSettings gameWorldService={gameWorldService} />
      </div>
    </ScrollArea>
  );
} 