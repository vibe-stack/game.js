import React, { useState, useEffect } from "react";
import { GameWorldService } from "../../../services/game-world-service";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DragInput } from "@/components/ui/drag-input";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as THREE from "three/webgpu";

interface RenderSettingsProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
}

const COMMON_RESOLUTIONS = [
  { width: 1920, height: 1080, name: "1080p" },
  { width: 2560, height: 1440, name: "1440p" },
  { width: 3840, height: 2160, name: "4K" },
  { width: 1280, height: 720, name: "720p" },
  { width: 1366, height: 768, name: "768p" },
  { width: 1600, height: 900, name: "900p" },
];

export function RenderSettings({ gameWorldService }: RenderSettingsProps) {
  const [shadowsEnabled, setShadowsEnabled] = useState(true);
  const [targetResolution, setTargetResolution] = useState({ width: 1920, height: 1080 });
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [currentPixelRatio, setCurrentPixelRatio] = useState(1.0);
  const [backgroundColor, setBackgroundColor] = useState("#2a2a2a");

  useEffect(() => {
    const updateRenderState = () => {
      const gameWorld = gameWorldService.current?.getGameWorld();
      if (gameWorld) {
        const renderer = gameWorld.getRenderer();
        const canvas = gameWorld.getCanvas();
        
        // Get current render settings
        setShadowsEnabled(renderer.shadowMap.enabled);
        setCurrentPixelRatio(renderer.getPixelRatio());
        setCanvasSize({
          width: canvas.width,
          height: canvas.height
        });
        
        // Get target resolution
        const targetRes = gameWorld.getTargetResolution();
        setTargetResolution({ width: targetRes.width, height: targetRes.height });
        setMaintainAspectRatio(targetRes.maintainAspectRatio);
        
        // Get background color
        const currentBg = gameWorld.scene.background;
        if (currentBg instanceof THREE.Color) {
          setBackgroundColor('#' + currentBg.getHexString());
        }
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

  const handleTargetResolutionChange = (width: number, height: number) => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
      gameWorld.setTargetResolution(width, height, maintainAspectRatio);
      setTargetResolution({ width, height });
    }
  };

  const handleMaintainAspectRatioChange = (enabled: boolean) => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
      gameWorld.setTargetResolution(targetResolution.width, targetResolution.height, enabled);
      setMaintainAspectRatio(enabled);
    }
  };

  const handlePresetResolution = (width: number, height: number) => {
    handleTargetResolutionChange(width, height);
  };

  const handleBackgroundColorChange = (color: string) => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
      gameWorld.scene.background = new THREE.Color(color);
      setBackgroundColor(color);
    }
  };

  const getEffectiveResolution = () => {
    const effectiveWidth = Math.round(canvasSize.width * currentPixelRatio);
    const effectiveHeight = Math.round(canvasSize.height * currentPixelRatio);
    return { width: effectiveWidth, height: effectiveHeight };
  };

  const effectiveRes = getEffectiveResolution();

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

        <div className="space-y-3">
          <Label className="text-white/80">Target Resolution</Label>
          
          {/* Resolution Presets */}
          <div className="grid grid-cols-3 gap-1">
            {COMMON_RESOLUTIONS.map(({ width, height, name }) => (
              <Button
                key={name}
                variant={targetResolution.width === width && targetResolution.height === height ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetResolution(width, height)}
                className="text-xs h-7"
              >
                {name}
              </Button>
            ))}
          </div>

          {/* Custom Resolution */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-white/60">Width</Label>
              <DragInput
                value={targetResolution.width}
                onChange={(value) => handleTargetResolutionChange(value, targetResolution.height)}
                step={32}
                min={320}
                max={7680}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-white/60">Height</Label>
              <DragInput
                value={targetResolution.height}
                onChange={(value) => handleTargetResolutionChange(targetResolution.width, value)}
                step={32}
                min={240}
                max={4320}
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="maintain-aspect-ratio" className="text-xs text-white/60">
              Maintain Aspect Ratio
            </Label>
            <Switch
              id="maintain-aspect-ratio"
              checked={maintainAspectRatio}
              onCheckedChange={handleMaintainAspectRatioChange}
            />
          </div>

          <div className="text-xs text-white/60 space-y-1">
            <div>Target: {targetResolution.width}×{targetResolution.height}</div>
            <div>Effective: {effectiveRes.width}×{effectiveRes.height}</div>
            <div>Pixel Ratio: {currentPixelRatio.toFixed(2)}</div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-white/80">Background Color</Label>
          
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => handleBackgroundColorChange(e.target.value)}
              className="w-10 h-8 rounded border-0 bg-transparent cursor-pointer"
            />
            <div className="text-xs text-white/60 font-mono">
              {backgroundColor.toUpperCase()}
            </div>
          </div>
          
          {/* Common background presets */}
          <div className="grid grid-cols-4 gap-1">
            {[
              { color: "#2a2a2a", name: "Dark Gray" },
              { color: "#000000", name: "Black" },
              { color: "#ffffff", name: "White" },
              { color: "#87CEEB", name: "Sky Blue" },
              { color: "#222222", name: "Charcoal" },
              { color: "#1a1a1a", name: "Dark" },
              { color: "#f0f0f0", name: "Light Gray" },
              { color: "#4a4a4a", name: "Gray" },
            ].map(({ color, name }) => (
              <Button
                key={color}
                variant={backgroundColor === color ? "default" : "outline"}
                size="sm"
                onClick={() => handleBackgroundColorChange(color)}
                className="text-xs h-7 px-2"
                style={{ 
                  backgroundColor: backgroundColor === color ? undefined : color + "20",
                  borderColor: color + "60"
                }}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-white/80">Canvas Size</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-white/60">Width</Label>
              <div className="text-xs text-white/80 px-2 py-1 bg-white/5 rounded">
                {canvasSize.width}px
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-white/60">Height</Label>
              <div className="text-xs text-white/80 px-2 py-1 bg-white/5 rounded">
                {canvasSize.height}px
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