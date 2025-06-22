import React, { useState } from "react";
import { DragInput } from "@/components/ui/drag-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Entity } from "@/models";
import {
  CharacterControllerConfig,
  FPS_CHARACTER_CONFIG,
  THIRD_PERSON_CHARACTER_CONFIG,
  PLATFORMER_CHARACTER_CONFIG,
} from "@/models/character-controller";
import { useEntityState } from "@/hooks/use-entity-state";

interface CharacterControllerPropertiesProps {
  entity: Entity;
}

const PRESET_CONFIGS = {
  "first-person": FPS_CHARACTER_CONFIG,
  "third-person": THIRD_PERSON_CHARACTER_CONFIG,
  platformer: PLATFORMER_CHARACTER_CONFIG,
};

export function CharacterControllerProperties({
  entity,
}: CharacterControllerPropertiesProps) {
  useEntityState(entity);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  // Read config directly from entity
  const config = entity.characterControllerConfig;

  if (!config) {
    return null; // Don't render if no character controller config
  }

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const presetConfig = PRESET_CONFIGS[preset as keyof typeof PRESET_CONFIGS];
    if (presetConfig) {
      entity.updateCharacterControllerConfig(presetConfig);
    }
  };

  const handleConfigChange = (
    key: keyof CharacterControllerConfig,
    value: any,
  ) => {
    entity.updateCharacterControllerConfig({ [key]: value });
  };

  const radiansToDegrees = (radians: number) => (radians * 180) / Math.PI;
  const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-lime-300">
          Character Controller
        </h3>
      </div>

      {/* Preset Selection */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-300">Preset</h4>
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="h-8 w-full border-gray-700 bg-gray-800 text-xs">
            <SelectValue placeholder="Choose a preset..." />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-800">
            <SelectItem value="first-person" className="text-xs">
              First Person
            </SelectItem>
            <SelectItem value="third-person" className="text-xs">
              Third Person
            </SelectItem>
            <SelectItem value="platformer" className="text-xs">
              Platformer
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator className="bg-white/10" />

      {/* Movement Settings */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-gray-300">Movement</h4>
        <div className="grid grid-cols-2 gap-2">
          <DragInput
            label="Max Speed"
            value={config.maxSpeed}
            onChange={(value) => handleConfigChange("maxSpeed", value)}
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
            onChange={(value) => handleConfigChange("acceleration", value)}
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
            onChange={(value) => handleConfigChange("jumpForce", value)}
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
            onChange={(value) => handleConfigChange("sprintMultiplier", value)}
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
        <h4 className="text-xs font-medium text-gray-300">
          Physical Shape (Capsule)
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <DragInput
            label="Height"
            value={config.capsuleHalfHeight * 2}
            onChange={(value) =>
              handleConfigChange("capsuleHalfHeight", value / 2)
            }
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
            onChange={(value) => handleConfigChange("capsuleRadius", value)}
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
            onChange={(value) =>
              handleConfigChange("maxSlopeClimbAngle", degreesToRadians(value))
            }
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
            onChange={(value) => handleConfigChange("autoStepMaxHeight", value)}
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
        <h4 className="text-xs font-medium text-gray-300">Camera</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="min-w-[60px] text-xs text-gray-400">Mode</span>
            <Select
              value={config.cameraMode}
              onValueChange={(value: "first-person" | "third-person") =>
                handleConfigChange("cameraMode", value)
              }
            >
              <SelectTrigger className="h-6 flex-1 border-gray-700 bg-gray-800 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800">
                <SelectItem value="first-person" className="text-xs">
                  First Person
                </SelectItem>
                <SelectItem value="third-person" className="text-xs">
                  Third Person
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {config.cameraMode === "third-person" && (
              <DragInput
                label="Distance"
                value={Math.abs(config.cameraDistance)}
                onChange={(value) =>
                  handleConfigChange("cameraDistance", -Math.abs(value))
                }
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
              onChange={(value) => handleConfigChange("cameraHeight", value)}
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
              onChange={(value) =>
                handleConfigChange("cameraSensitivity", value / 1000)
              }
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
              onChange={(value) =>
                handleConfigChange("cameraUpLimit", degreesToRadians(value))
              }
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
              onChange={(value) =>
                handleConfigChange("cameraDownLimit", -degreesToRadians(value))
              }
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
        <h4 className="text-xs font-medium text-gray-300">Physics</h4>
        <div className="grid grid-cols-2 gap-2">
          <DragInput
            label="Gravity"
            value={config.gravityScale}
            onChange={(value) => handleConfigChange("gravityScale", value)}
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
            onChange={(value) =>
              handleConfigChange("maxFallSpeed", -Math.abs(value))
            }
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
            onChange={(value) =>
              handleConfigChange("snapToGroundDistance", value)
            }
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
            onChange={(value) => handleConfigChange("offset", value)}
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
