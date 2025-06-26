import React, { useState } from "react";
import { DragInput } from "@/components/ui/drag-input";
import { Vector3Input } from "./vector3-input";
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
  CS_SURF_CHARACTER_CONFIG,
} from "@/models/character-controller";
import { useEntityState } from "@/hooks/use-entity-state";

interface CharacterControllerPropertiesProps {
  entity: Entity;
}

const PRESET_CONFIGS = {
  "first-person": FPS_CHARACTER_CONFIG,
  "third-person": THIRD_PERSON_CHARACTER_CONFIG,
  platformer: PLATFORMER_CHARACTER_CONFIG,
  "cs-surf": CS_SURF_CHARACTER_CONFIG,
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
            <SelectItem value="cs-surf" className="text-xs">
              CS Surf
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
        
        {/* Collider Offset */}
        <div className="space-y-2">
          <Vector3Input
            label="Collider Offset"
            value={config.colliderOffset}
            onChange={(value) => handleConfigChange("colliderOffset", value)}
            step={0.1}
            precision={2}
            min={-5}
            max={5}
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

      {/* Animation Settings */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-gray-300">Animations</h4>
        <div className="space-y-2 text-xs">
          {/* Get available animations from the entity if it's a Mesh3D */}
          {(() => {
            const mesh3d = entity as any;
            const animations = mesh3d.getAnimationNames ? mesh3d.getAnimationNames() : [];
            
            if (animations.length === 0) {
              return (
                <p className="text-xs text-gray-500 italic">
                  No animations available. Load a model with animations.
                </p>
              );
            }
            
            return (
              <>
                {/* Idle Animation */}
                <div className="flex items-center gap-2">
                  <span className="min-w-[60px] text-xs text-gray-400">Idle</span>
                  <Select
                    value={config.idleAnimation || "-"}
                    onValueChange={(value) => handleConfigChange("idleAnimation", value || undefined)}
                  >
                    <SelectTrigger className="h-6 flex-1 border-gray-700 bg-gray-800 text-xs">
                      <SelectValue placeholder="Select idle animation..." />
                    </SelectTrigger>
                    <SelectContent className="border-gray-700 bg-gray-800">
                      <SelectItem value="0" className="text-xs">None</SelectItem>
                      {animations.map((anim: string) => (
                        <SelectItem key={anim} value={anim} className="text-xs">
                          {anim}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Walk Animation */}
                <div className="flex items-center gap-2">
                  <span className="min-w-[60px] text-xs text-gray-400">Walk</span>
                  <Select
                    value={config.walkAnimation || "-"}
                    onValueChange={(value) => handleConfigChange("walkAnimation", value || undefined)}
                  >
                    <SelectTrigger className="h-6 flex-1 border-gray-700 bg-gray-800 text-xs">
                      <SelectValue placeholder="Select walk animation..." />
                    </SelectTrigger>
                    <SelectContent className="border-gray-700 bg-gray-800">
                      <SelectItem value="0" className="text-xs">None</SelectItem>
                      {animations.map((anim: string) => (
                        <SelectItem key={anim} value={anim} className="text-xs">
                          {anim}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Sprint Animation */}
                <div className="flex items-center gap-2">
                  <span className="min-w-[60px] text-xs text-gray-400">Sprint</span>
                  <Select
                    value={config.sprintAnimation || "-"}
                    onValueChange={(value) => handleConfigChange("sprintAnimation", value || undefined)}
                  >
                    <SelectTrigger className="h-6 flex-1 border-gray-700 bg-gray-800 text-xs">
                      <SelectValue placeholder="Select sprint animation..." />
                    </SelectTrigger>
                    <SelectContent className="border-gray-700 bg-gray-800">
                      <SelectItem value="0" className="text-xs">None</SelectItem>
                      {animations.map((anim: string) => (
                        <SelectItem key={anim} value={anim} className="text-xs">
                          {anim}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Jump Animation */}
                <div className="flex items-center gap-2">
                  <span className="min-w-[60px] text-xs text-gray-400">Jump</span>
                  <Select
                    value={config.jumpAnimation || "-"}
                    onValueChange={(value) => handleConfigChange("jumpAnimation", value || undefined)}
                  >
                    <SelectTrigger className="h-6 flex-1 border-gray-700 bg-gray-800 text-xs">
                      <SelectValue placeholder="Select jump animation..." />
                    </SelectTrigger>
                    <SelectContent className="border-gray-700 bg-gray-800">
                      <SelectItem value="0" className="text-xs">None</SelectItem>
                      {animations.map((anim: string) => (
                        <SelectItem key={anim} value={anim} className="text-xs">
                          {anim}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Fall Animation */}
                <div className="flex items-center gap-2">
                  <span className="min-w-[60px] text-xs text-gray-400">Fall</span>
                  <Select
                    value={config.fallAnimation || "-"}
                    onValueChange={(value) => handleConfigChange("fallAnimation", value || undefined)}
                  >
                    <SelectTrigger className="h-6 flex-1 border-gray-700 bg-gray-800 text-xs">
                      <SelectValue placeholder="Select fall animation..." />
                    </SelectTrigger>
                    <SelectContent className="border-gray-700 bg-gray-800">
                      <SelectItem value="0" className="text-xs">None</SelectItem>
                      {animations.map((anim: string) => (
                        <SelectItem key={anim} value={anim} className="text-xs">
                          {anim}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Crouch Animation */}
                <div className="flex items-center gap-2">
                  <span className="min-w-[60px] text-xs text-gray-400">Crouch</span>
                  <Select
                    value={config.crouchAnimation || "-"}
                    onValueChange={(value) => handleConfigChange("crouchAnimation", value || undefined)}
                  >
                    <SelectTrigger className="h-6 flex-1 border-gray-700 bg-gray-800 text-xs">
                      <SelectValue placeholder="Select crouch animation..." />
                    </SelectTrigger>
                    <SelectContent className="border-gray-700 bg-gray-800">
                      <SelectItem value="0" className="text-xs">None</SelectItem>
                      {animations.map((anim: string) => (
                        <SelectItem key={anim} value={anim} className="text-xs">
                          {anim}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Slide Animation */}
                <div className="flex items-center gap-2">
                  <span className="min-w-[60px] text-xs text-gray-400">Slide</span>
                  <Select
                    value={config.slideAnimation || "-"}
                    onValueChange={(value) => handleConfigChange("slideAnimation", value || undefined)}
                  >
                    <SelectTrigger className="h-6 flex-1 border-gray-700 bg-gray-800 text-xs">
                      <SelectValue placeholder="Select slide animation..." />
                    </SelectTrigger>
                    <SelectContent className="border-gray-700 bg-gray-800">
                      <SelectItem value="0" className="text-xs">None</SelectItem>
                      {animations.map((anim: string) => (
                        <SelectItem key={anim} value={anim} className="text-xs">
                          {anim}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Advanced Movement - Air Strafing */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-cyan-300">Air Strafing</h4>
        <div className="grid grid-cols-2 gap-2">
          <DragInput
            label="Air Accel"
            value={config.airAcceleration}
            onChange={(value) => handleConfigChange("airAcceleration", value)}
            step={1}
            precision={1}
            min={1}
            max={100}
            compact
            className="text-xs"
          />
          <DragInput
            label="Air Max Speed"
            value={config.airMaxSpeed}
            onChange={(value) => handleConfigChange("airMaxSpeed", value)}
            step={1}
            precision={1}
            min={5}
            max={100}
            compact
            className="text-xs"
          />
          <DragInput
            label="Strafe Response"
            value={config.strafeResponseiveness}
            onChange={(value) => handleConfigChange("strafeResponseiveness", value)}
            step={0.1}
            precision={1}
            min={0.1}
            max={3}
            compact
            className="text-xs"
          />
          <DragInput
            label="Air Friction"
            value={config.airFriction}
            onChange={(value) => handleConfigChange("airFriction", value)}
            step={0.01}
            precision={2}
            min={0}
            max={1}
            compact
            className="text-xs"
          />
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Ground Movement */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-orange-300">Ground Movement</h4>
        <div className="grid grid-cols-2 gap-2">
          <DragInput
            label="Ground Friction"
            value={config.groundFriction}
            onChange={(value) => handleConfigChange("groundFriction", value)}
            step={0.5}
            precision={1}
            min={0}
            max={20}
            compact
            className="text-xs"
          />
          <DragInput
            label="Stop Speed"
            value={config.stopSpeed}
            onChange={(value) => handleConfigChange("stopSpeed", value)}
            step={0.1}
            precision={1}
            min={0.1}
            max={5}
            compact
            className="text-xs"
          />
          <DragInput
            label="Slope Friction"
            value={config.slopeFriction}
            onChange={(value) => handleConfigChange("slopeFriction", value)}
            step={0.1}
            precision={1}
            min={0}
            max={10}
            compact
            className="text-xs"
          />
          <DragInput
            label="Slide Threshold"
            value={radiansToDegrees(config.slideThreshold)}
            onChange={(value) =>
              handleConfigChange("slideThreshold", degreesToRadians(value))
            }
            step={1}
            precision={0}
            min={15}
            max={60}
            suffix="°"
            compact
            className="text-xs"
          />
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Velocity & Physics */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-purple-300">Velocity & Physics</h4>
        <div className="grid grid-cols-2 gap-2">
          <DragInput
            label="Max Velocity"
            value={config.maxVelocity}
            onChange={(value) => handleConfigChange("maxVelocity", value)}
            step={1}
            precision={1}
            min={10}
            max={200}
            compact
            className="text-xs"
          />
          <DragInput
            label="Velocity Damping"
            value={config.velocityDamping}
            onChange={(value) => handleConfigChange("velocityDamping", value)}
            step={0.001}
            precision={3}
            min={0.9}
            max={1}
            compact
            className="text-xs"
          />
          <DragInput
            label="Momentum Keep"
            value={config.momentumPreservation}
            onChange={(value) => handleConfigChange("momentumPreservation", value)}
            step={0.01}
            precision={2}
            min={0.5}
            max={1}
            compact
            className="text-xs"
          />
          <DragInput
            label="Bounce Retention"
            value={config.bounceVelocityRetention}
            onChange={(value) => handleConfigChange("bounceVelocityRetention", value)}
            step={0.05}
            precision={2}
            min={0}
            max={1}
            compact
            className="text-xs"
          />
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Crouch & Slide Mechanics */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-green-300">Crouch & Slide</h4>
        <div className="grid grid-cols-2 gap-2">
          <DragInput
            label="Crouch Speed"
            value={config.crouchSpeedMultiplier}
            onChange={(value) => handleConfigChange("crouchSpeedMultiplier", value)}
            step={0.05}
            precision={2}
            min={0.1}
            max={1}
            compact
            className="text-xs"
          />
          <DragInput
            label="Slide Speed"
            value={config.slideSpeedMultiplier}
            onChange={(value) => handleConfigChange("slideSpeedMultiplier", value)}
            step={0.1}
            precision={1}
            min={1}
            max={3}
            compact
            className="text-xs"
          />
          <DragInput
            label="Slide Duration"
            value={config.slideDuration}
            onChange={(value) => handleConfigChange("slideDuration", value)}
            step={0.1}
            precision={1}
            min={0.5}
            max={3}
            suffix="s"
            compact
            className="text-xs"
          />
          <DragInput
            label="Slide Decel"
            value={config.slideDeceleration}
            onChange={(value) => handleConfigChange("slideDeceleration", value)}
            step={0.1}
            precision={1}
            min={0.1}
            max={2}
            compact
            className="text-xs"
          />
          <DragInput
            label="Height Reduction"
            value={config.crouchHeightReduction}
            onChange={(value) => handleConfigChange("crouchHeightReduction", value)}
            step={0.05}
            precision={2}
            min={0.1}
            max={0.8}
            compact
            className="text-xs"
          />
          <DragInput
            label="Slide Min Speed"
            value={config.slideMinSpeed}
            onChange={(value) => handleConfigChange("slideMinSpeed", value)}
            step={0.5}
            precision={1}
            min={1}
            max={15}
            compact
            className="text-xs"
          />
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Jump Mechanics */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-yellow-300">Jump Mechanics</h4>
        <div className="grid grid-cols-2 gap-2">
          <DragInput
            label="Pre-Speed Boost"
            value={config.preSpeedBoost}
            onChange={(value) => handleConfigChange("preSpeedBoost", value)}
            step={0.1}
            precision={1}
            min={1}
            max={2}
            compact
            className="text-xs"
          />
          <DragInput
            label="Bunny Hop Time"
            value={config.bunnyHopTolerance}
            onChange={(value) => handleConfigChange("bunnyHopTolerance", value)}
            step={0.01}
            precision={2}
            min={0.05}
            max={2}
            suffix="s"
            compact
            className="text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="min-w-[60px] text-xs text-gray-400">Jump on Slopes</span>
          <div 
            className={`flex h-6 w-10 items-center rounded-full px-1 transition-colors cursor-pointer ${
              config.jumpWhileSliding ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
            onClick={() => handleConfigChange("jumpWhileSliding", !config.jumpWhileSliding)}
          >
            <div 
              className={`h-4 w-4 rounded-full bg-white transition-transform ${
                config.jumpWhileSliding ? 'translate-x-4' : 'translate-x-0'
              }`}
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
