import React, { useState } from "react";
import { DragInput } from "@/components/ui/drag-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Entity } from "@/models";
import { 
  CharacterControllerConfig, 
  FPS_CHARACTER_CONFIG, 
  THIRD_PERSON_CHARACTER_CONFIG, 
  PLATFORMER_CHARACTER_CONFIG 
} from "@/models/character-controller";

interface CharacterControllerPropertiesProps {
  entity: Entity;
  config: CharacterControllerConfig;
  onConfigChange: (newConfig: Partial<CharacterControllerConfig>) => void;
  onUpdate: () => void;
}

const PRESET_CONFIGS = {
  "first-person": FPS_CHARACTER_CONFIG,
  "third-person": THIRD_PERSON_CHARACTER_CONFIG,
  "platformer": PLATFORMER_CHARACTER_CONFIG,
};

export function CharacterControllerProperties({ 
  entity, 
  config, 
  onConfigChange, 
  onUpdate 
}: CharacterControllerPropertiesProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const presetConfig = PRESET_CONFIGS[preset as keyof typeof PRESET_CONFIGS];
    if (presetConfig) {
      onConfigChange(presetConfig);
      onUpdate();
    }
  };

  const handleConfigChange = (key: keyof CharacterControllerConfig, value: any) => {
    onConfigChange({ [key]: value });
    onUpdate();
  };

  const radiansToDegrees = (radians: number) => (radians * 180) / Math.PI;
  const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lime-300 text-sm font-medium">Character Controller</h3>
      </div>

      {/* Preset Selection */}
      <div className="space-y-2">
        <h4 className="text-gray-300 text-xs font-medium">Preset</h4>
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full h-8 text-xs bg-gray-800 border-gray-700">
            <SelectValue placeholder="Choose a preset..." />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="first-person" className="text-xs">First Person</SelectItem>
            <SelectItem value="third-person" className="text-xs">Third Person</SelectItem>
            <SelectItem value="platformer" className="text-xs">Platformer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator className="bg-white/10" />

      {/* Movement Settings */}
      <div className="space-y-3">
        <h4 className="text-gray-300 text-xs font-medium">Movement</h4>
        <div className="grid grid-cols-2 gap-2">
          <DragInput
            label="Max Speed"
            value={config.maxSpeed}
            onChange={(value) => handleConfigChange('maxSpeed', value)}
            step={0.1}
            precision={1}
            min={0.1}
            max={50}
            compact
            className="text-xs"
          />
          <DragInput
            label="Acceleration"
            value={config.acceleration}
            onChange={(value) => handleConfigChange('acceleration', value)}
            step={1}
            precision={1}
            min={1}
            max={200}
            compact
            className="text-xs"
          />
          <DragInput
            label="Jump Force"
            value={config.jumpForce}
            onChange={(value) => handleConfigChange('jumpForce', value)}
            step={0.5}
            precision={1}
            min={1}
            max={50}
            compact
            className="text-xs"
          />
          <DragInput
            label="Sprint Mult"
            value={config.sprintMultiplier}
            onChange={(value) => handleConfigChange('sprintMultiplier', value)}
            step={0.1}
            precision={1}
            min={1}
            max={5}
            compact
            className="text-xs"
          />
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Physical Shape */}
      <div className="space-y-3">
        <h4 className="text-gray-300 text-xs font-medium">Physical Shape (Capsule)</h4>
        <div className="grid grid-cols-2 gap-2">
          <DragInput
            label="Height"
            value={config.capsuleHalfHeight * 2}
            onChange={(value) => handleConfigChange('capsuleHalfHeight', value / 2)}
            step={0.1}
            precision={2}
            min={0.5}
            max={5}
            compact
            className="text-xs"
          />
          <DragInput
            label="Radius"
            value={config.capsuleRadius}
            onChange={(value) => handleConfigChange('capsuleRadius', value)}
            step={0.05}
            precision={2}
            min={0.1}
            max={2}
            compact
            className="text-xs"
          />
          <DragInput
            label="Max Slope"
            value={radiansToDegrees(config.maxSlopeClimbAngle)}
            onChange={(value) => handleConfigChange('maxSlopeClimbAngle', degreesToRadians(value))}
            step={1}
            precision={0}
            min={0}
            max={89}
            suffix="°"
            compact
            className="text-xs"
          />
          <DragInput
            label="Step Height"
            value={config.autoStepMaxHeight}
            onChange={(value) => handleConfigChange('autoStepMaxHeight', value)}
            step={0.05}
            precision={2}
            min={0}
            max={2}
            compact
            className="text-xs"
          />
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Camera Settings */}
      <div className="space-y-3">
        <h4 className="text-gray-300 text-xs font-medium">Camera</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 min-w-[60px]">Mode</span>
            <Select 
              value={config.cameraMode} 
              onValueChange={(value: "first-person" | "third-person") => handleConfigChange('cameraMode', value)}
            >
              <SelectTrigger className="flex-1 h-6 text-xs bg-gray-800 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="first-person" className="text-xs">First Person</SelectItem>
                <SelectItem value="third-person" className="text-xs">Third Person</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {config.cameraMode === "third-person" && (
              <DragInput
                label="Distance"
                value={Math.abs(config.cameraDistance)}
                onChange={(value) => handleConfigChange('cameraDistance', -Math.abs(value))}
                step={0.5}
                precision={1}
                min={1}
                max={20}
                compact
                className="text-xs"
              />
            )}
            <DragInput
              label="Height"
              value={config.cameraHeight}
              onChange={(value) => handleConfigChange('cameraHeight', value)}
              step={0.1}
              precision={1}
              min={0.5}
              max={5}
              compact
              className="text-xs"
            />
            <DragInput
              label="Sensitivity"
              value={config.cameraSensitivity * 1000}
              onChange={(value) => handleConfigChange('cameraSensitivity', value / 1000)}
              step={0.1}
              precision={1}
              min={0.1}
              max={10}
              compact
              className="text-xs"
            />
            <DragInput
              label="Up Limit"
              value={radiansToDegrees(config.cameraUpLimit)}
              onChange={(value) => handleConfigChange('cameraUpLimit', degreesToRadians(value))}
              step={1}
              precision={0}
              min={0}
              max={89}
              suffix="°"
              compact
              className="text-xs"
            />
            <DragInput
              label="Down Limit"
              value={radiansToDegrees(Math.abs(config.cameraDownLimit))}
              onChange={(value) => handleConfigChange('cameraDownLimit', -degreesToRadians(value))}
              step={1}
              precision={0}
              min={0}
              max={89}
              suffix="°"
              compact
              className="text-xs"
            />
          </div>
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Physics Forces */}
      <div className="space-y-3">
        <h4 className="text-gray-300 text-xs font-medium">Physics</h4>
        <div className="grid grid-cols-2 gap-2">
          <DragInput
            label="Gravity"
            value={config.gravityScale}
            onChange={(value) => handleConfigChange('gravityScale', value)}
            step={1}
            precision={1}
            min={0}
            max={50}
            compact
            className="text-xs"
          />
          <DragInput
            label="Max Fall"
            value={Math.abs(config.maxFallSpeed)}
            onChange={(value) => handleConfigChange('maxFallSpeed', -Math.abs(value))}
            step={1}
            precision={1}
            min={1}
            max={100}
            compact
            className="text-xs"
          />
          <DragInput
            label="Ground Snap"
            value={config.snapToGroundDistance}
            onChange={(value) => handleConfigChange('snapToGroundDistance', value)}
            step={0.05}
            precision={2}
            min={0}
            max={1}
            compact
            className="text-xs"
          />
          <DragInput
            label="Offset"
            value={config.offset}
            onChange={(value) => handleConfigChange('offset', value)}
            step={0.001}
            precision={3}
            min={0}
            max={0.1}
            compact
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
} 