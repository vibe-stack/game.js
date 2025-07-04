import React, { useEffect, useState } from "react";
import { GameWorldService } from "../../../services/game-world-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DragInput } from "@/components/ui/drag-input";
import { Button } from "@/components/ui/button";
import { Sparkles, TestTube } from "lucide-react";

interface PostProcessingSettingsProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
}

export function PostProcessingSettings({ gameWorldService }: PostProcessingSettingsProps) {
  const [bloomStrength, setBloomStrength] = useState(0.7);
  const [bloomRadius, setBloomRadius] = useState(0.5);
  const [exposure, setExposure] = useState(1.0);
  const [postProcessingStatus, setPostProcessingStatus] = useState("Unknown");

  // Sync with GameWorld every 2 seconds to reflect external changes (scene reload, etc.)
  useEffect(() => {
    const update = () => {
      const gameWorld = gameWorldService.current?.getGameWorld();
      if (!gameWorld) return;
      const bloom = gameWorld.getBloomSettings();
      setBloomStrength(bloom.strength);
      setBloomRadius(bloom.radius);
      setExposure(gameWorld.getToneMappingExposure());
      
      // Check post-processing status
      const isAvailable = gameWorld.isPostProcessingAvailable();
      const hasCamera = gameWorld.getCameraManager().getActiveCamera() !== null;
      
      if (isAvailable) {
        setPostProcessingStatus("Active");
      } else if (!hasCamera) {
        setPostProcessingStatus("No Camera");
      } else {
        setPostProcessingStatus("Not Initialized");
      }
    };
    update();
    const id = setInterval(update, 2000);
    return () => clearInterval(id);
  }, [gameWorldService]);

  const handleBloomStrengthChange = (value: number) => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
      gameWorld.setBloomSettings(value, bloomRadius);
      setBloomStrength(value);
    }
  };

  const handleBloomRadiusChange = (value: number) => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
      gameWorld.setBloomSettings(bloomStrength, value);
      setBloomRadius(value);
    }
  };

  const handleExposureChange = (value: number) => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
      gameWorld.setToneMappingExposure(value);
      setExposure(value);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-white">
          <Sparkles className="h-4 w-4" />
          Post-Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="space-y-1 pb-2">
          <Label className="text-xs text-white/60">Status</Label>
          <div className={`text-xs px-2 py-1 rounded ${
            postProcessingStatus === "Active" ? "bg-green-500/20 text-green-400" :
            postProcessingStatus === "No Camera" ? "bg-yellow-500/20 text-yellow-400" :
            "bg-red-500/20 text-red-400"
          }`}>
            {postProcessingStatus}
          </div>
        </div>

        {/* Bloom Strength */}
        <div className="space-y-1">
          <Label className="text-xs text-white/60">Bloom Strength</Label>
          <DragInput
            value={bloomStrength}
            onChange={handleBloomStrengthChange}
            step={0.05}
            min={0}
            max={5}
            className="text-xs"
          />
        </div>

        {/* Bloom Radius */}
        <div className="space-y-1">
          <Label className="text-xs text-white/60">Bloom Radius</Label>
          <DragInput
            value={bloomRadius}
            onChange={handleBloomRadiusChange}
            step={0.05}
            min={0}
            max={2}
            className="text-xs"
          />
        </div>

        {/* Tone Mapping Exposure */}
        <div className="space-y-1 pt-2">
          <Label className="text-xs text-white/60">Tone Mapping Exposure</Label>
          <DragInput
            value={exposure}
            onChange={handleExposureChange}
            step={0.1}
            min={0.1}
            max={5}
            className="text-xs"
          />
        </div>

        {/* Test Buttons */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          {postProcessingStatus !== "Active" && (
            <Button
              onClick={() => {
                const gameWorld = gameWorldService.current?.getGameWorld();
                if (gameWorld) {
                  gameWorld.ensurePostProcessingInitialized();
                }
              }}
              variant="outline"
              size="sm"
              className="w-full text-xs bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
            >
              <Sparkles className="h-3 w-3 mr-2" />
              Initialize Post-Processing
            </Button>
          )}
          
          <Button
            onClick={() => {
              const gameWorld = gameWorldService.current?.getGameWorld();
              if (gameWorld) {
                gameWorld.createTestGlowingObject();
              }
            }}
            variant="outline"
            size="sm"
            className="w-full text-xs bg-white/5 border-white/20 hover:bg-white/10"
          >
            <TestTube className="h-3 w-3 mr-2" />
            Create Test Glow Object
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 