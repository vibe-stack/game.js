import React, { useState, useEffect } from "react";
import { GameWorldService } from "../../../services/game-world-service";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DragInput } from "@/components/ui/drag-input";
import { Bug, Eye, Grid3X3 } from "lucide-react";

interface DebugSettingsProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
}

export function DebugSettings({ gameWorldService }: DebugSettingsProps) {
  const [physicsDebugEnabled, setPhysicsDebugEnabled] = useState(false);
  const [helpersEnabled, setHelpersEnabled] = useState(true);
  
  // Grid state
  const [gridEnabled, setGridEnabled] = useState(true);
  const [gridSize, setGridSize] = useState(1);
  const [gridDivisions, setGridDivisions] = useState(10);
  const [gridColor, setGridColor] = useState("#888888");
  const [gridOpacity, setGridOpacity] = useState(0.5);
  const [gridInfinite, setGridInfinite] = useState(false);

  useEffect(() => {
    const updateDebugState = () => {
      const gameWorld = gameWorldService.current?.getGameWorld();
      const helperManager = gameWorldService.current?.getHelperManager();
      if (gameWorld) {
        setPhysicsDebugEnabled(gameWorld.isPhysicsDebugRenderEnabled());
      }
      if (helperManager) {
        setHelpersEnabled(helperManager.isHelpersEnabled());
      }
      
      // Update grid settings
      if (gameWorldService.current) {
        const gridSettings = gameWorldService.current.getGridSettings();
        setGridEnabled(gridSettings.showGrid);
        setGridSize(gridSettings.gridSize);
        setGridDivisions(gridSettings.gridDivisions);
        setGridColor(gridSettings.gridColor);
        setGridOpacity(gridSettings.gridOpacity);
        setGridInfinite(gridSettings.gridInfinite);
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

  const handleHelpersToggle = (enabled: boolean) => {
    const helperManager = gameWorldService.current?.getHelperManager();
    if (helperManager) {
      helperManager.setEnabled(enabled);
      setHelpersEnabled(enabled);
    }
  };

  // Grid handlers
  const handleGridToggle = (enabled: boolean) => {
    if (gameWorldService.current) {
      gameWorldService.current.setGridVisible(enabled);
      setGridEnabled(enabled);
    }
  };

  const handleGridSizeChange = (size: number) => {
    if (gameWorldService.current) {
      gameWorldService.current.setGridSize(size);
      setGridSize(size);
    }
  };

  const handleGridDivisionsChange = (divisions: number) => {
    if (gameWorldService.current) {
      gameWorldService.current.setGridDivisions(divisions);
      setGridDivisions(divisions);
    }
  };

  const handleGridColorChange = (color: string) => {
    if (gameWorldService.current) {
      gameWorldService.current.setGridColor(color);
      setGridColor(color);
    }
  };

  const handleGridOpacityChange = (opacity: number) => {
    if (gameWorldService.current) {
      gameWorldService.current.setGridOpacity(opacity);
      setGridOpacity(opacity);
    }
  };

  const handleGridInfiniteToggle = (infinite: boolean) => {
    if (gameWorldService.current) {
      gameWorldService.current.setGridInfinite(infinite);
      setGridInfinite(infinite);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-white">
            <Bug className="h-4 w-4" />
            Debug Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="object-helpers" className="text-white/80">
            Show Object Helpers
          </Label>
          <Switch
            id="object-helpers"
            checked={helpersEnabled}
            onCheckedChange={handleHelpersToggle}
          />
        </div>
        <div className="text-xs text-white/60">
          Shows camera and light helpers in the editor
        </div>
        
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

    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-white">
          <Grid3X3 className="h-4 w-4" />
          Grid Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="show-grid" className="text-white/80">
            Show Grid
          </Label>
          <Switch
            id="show-grid"
            checked={gridEnabled}
            onCheckedChange={handleGridToggle}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="grid-size" className="text-white/80 text-xs">
              Cell Size
            </Label>
            <DragInput
              id="grid-size"
              value={gridSize}
              onChange={handleGridSizeChange}
              min={0.1}
              max={10}
              step={0.1}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="grid-divisions" className="text-white/80 text-xs">
              Divisions
            </Label>
            <DragInput
              id="grid-divisions"
              value={gridDivisions}
              onChange={handleGridDivisionsChange}
              min={1}
              max={100}
              step={1}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="grid-color" className="text-white/80 text-xs">
              Color
            </Label>
            <input
              id="grid-color"
              type="color"
              value={gridColor}
              onChange={(e) => handleGridColorChange(e.target.value)}
              className="mt-1 w-full h-8 rounded border border-white/20 bg-transparent cursor-pointer"
            />
          </div>
          
          <div>
            <Label htmlFor="grid-opacity" className="text-white/80 text-xs">
              Opacity
            </Label>
            <DragInput
              id="grid-opacity"
              value={gridOpacity}
              onChange={handleGridOpacityChange}
              min={0.1}
              max={1}
              step={0.1}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="grid-infinite" className="text-white/80">
            Infinite Grid
          </Label>
          <Switch
            id="grid-infinite"
            checked={gridInfinite}
            onCheckedChange={handleGridInfiniteToggle}
          />
        </div>
        <div className="text-xs text-white/60">
          Creates a larger grid that appears infinite
        </div>
      </CardContent>
    </Card>
    </div>
  );
} 