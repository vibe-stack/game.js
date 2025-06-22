import React, { useState, useEffect } from "react";
import { GameWorldService } from "../../../services/game-world-service";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DragInput } from "@/components/ui/drag-input";
import { Monitor } from "lucide-react";

interface RenderSettingsProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
}

export function RenderSettings({ gameWorldService }: RenderSettingsProps) {
  const [shadowsEnabled, setShadowsEnabled] = useState(true);
  const [pixelRatio, setPixelRatio] = useState(1.0);
  const [renderSize, setRenderSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateRenderState = () => {
      const gameWorld = gameWorldService.current?.getGameWorld();
      if (gameWorld) {
        const renderer = gameWorld.getRenderer();
        const canvas = gameWorld.getCanvas();
        
        // Get current render settings
        setShadowsEnabled(renderer.shadowMap.enabled);
        setPixelRatio(renderer.getPixelRatio());
        setRenderSize({
          width: canvas.width,
          height: canvas.height
        });
      }
    };

    updateRenderState();
    const interval = setInterval(updateRenderState, 2000);
    return () => clearInterval(interval);
  }, [gameWorldService]);

  const handleShadowsToggle = (enabled: boolean) => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
      const renderer = gameWorld.getRenderer();
      renderer.shadowMap.enabled = enabled;
      setShadowsEnabled(enabled);
    }
  };

  const handlePixelRatioChange = (value: number) => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
      const renderer = gameWorld.getRenderer();
      renderer.setPixelRatio(value);
      setPixelRatio(value);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-white">
          <Monitor className="h-4 w-4" />
          Render Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="shadows-enabled" className="text-white/80">
            Shadow Mapping
          </Label>
          <Switch
            id="shadows-enabled"
            checked={shadowsEnabled}
            onCheckedChange={handleShadowsToggle}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-white/80">Pixel Ratio</Label>
          <DragInput
            value={pixelRatio}
            onChange={handlePixelRatioChange}
            step={0.1}
            min={0.5}
            max={3.0}
            className="text-xs"
          />
          <div className="text-xs text-white/60">
            Higher values improve quality but reduce performance
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-white/80">Canvas Size</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-white/60">Width</Label>
              <div className="text-xs text-white/80 px-2 py-1 bg-white/5 rounded">
                {renderSize.width}px
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-white/60">Height</Label>
              <div className="text-xs text-white/80 px-2 py-1 bg-white/5 rounded">
                {renderSize.height}px
              </div>
            </div>
          </div>
          <div className="text-xs text-white/60">
            Canvas size is controlled by the parent container
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 