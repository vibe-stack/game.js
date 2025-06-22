import React from "react";
import {
  Light,
  AmbientLight,
  DirectionalLight,
  PointLight,
  SpotLight,
} from "@/models/primitives/light";
import { DragInput } from "@/components/ui/drag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Vector3Input } from "./vector3-input";
import { useEntityState } from "@/hooks/use-entity-state";
import { Vector3 } from "three";

interface LightPropertiesProps {
  entity: Light;
}

export function LightProperties({ entity }: LightPropertiesProps) {
  useEntityState(entity);
  const handleColorChange = (value: string) => {
    entity.setColor(value);
  };

  const handleIntensityChange = (value: number) => {
    entity.setIntensity(value);
  };

  const handleShadowToggle = (checked: boolean) => {
    if ("castShadow" in entity.light) {
      (entity.light as any).castShadow = checked;
    }
  };

  const renderAmbientProperties = (light: AmbientLight) => (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-gray-400">Color</Label>
        <Input
          type="color"
          value={`#${light.light.color.getHexString()}`}
          onChange={(e) => handleColorChange(e.target.value)}
          className="h-8 w-full"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Intensity</Label>
        <DragInput
          value={light.light.intensity}
          onChange={handleIntensityChange}
          min={0}
          max={10}
          step={0.1}
          className="text-xs"
        />
      </div>
    </div>
  );

  const renderDirectionalProperties = (light: DirectionalLight) => (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-gray-400">Color</Label>
        <Input
          type="color"
          value={`#${light.directionalLight.color.getHexString()}`}
          onChange={(e) => handleColorChange(e.target.value)}
          className="h-8 w-full"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Intensity</Label>
        <DragInput
          value={light.directionalLight.intensity}
          onChange={handleIntensityChange}
          min={0}
          max={10}
          step={0.1}
          className="text-xs"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Target Position</Label>
        <Vector3Input
          value={light.getTarget()}
          onChange={(target) => {
            light.setTarget(target as Vector3);
          }}
          label="Target Position"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Shadow Camera Size</Label>
        <DragInput
          value={50}
          onChange={(size) => {
            light.setShadowCameraSize(size);
          }}
          min={1}
          max={200}
          step={1}
          className="text-xs"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          checked={light.directionalLight.castShadow}
          onCheckedChange={handleShadowToggle}
        />
        <Label className="text-xs text-gray-400">Cast Shadow</Label>
      </div>
    </div>
  );

  const renderPointProperties = (light: PointLight) => (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-gray-400">Color</Label>
        <Input
          type="color"
          value={`#${light.pointLight.color.getHexString()}`}
          onChange={(e) => handleColorChange(e.target.value)}
          className="h-8 w-full"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Intensity</Label>
        <DragInput
          value={light.pointLight.intensity}
          onChange={handleIntensityChange}
          min={0}
          max={10}
          step={0.1}
          className="text-xs"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Distance</Label>
        <DragInput
          value={light.getDistance()}
          onChange={(distance) => {
            light.setDistance(distance);
          }}
          min={0}
          max={1000}
          step={1}
          className="text-xs"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Decay</Label>
        <DragInput
          value={light.getDecay()}
          onChange={(decay) => {
            light.setDecay(decay);
          }}
          min={0.1}
          max={5}
          step={0.1}
          className="text-xs"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          checked={light.pointLight.castShadow}
          onCheckedChange={handleShadowToggle}
        />
        <Label className="text-xs text-gray-400">Cast Shadow</Label>
      </div>
    </div>
  );

  const renderSpotProperties = (light: SpotLight) => (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-gray-400">Color</Label>
        <Input
          type="color"
          value={`#${light.spotLight.color.getHexString()}`}
          onChange={(e) => handleColorChange(e.target.value)}
          className="h-8 w-full"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Intensity</Label>
        <DragInput
          value={light.spotLight.intensity}
          onChange={handleIntensityChange}
          min={0}
          max={10}
          step={0.1}
          className="text-xs"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Distance</Label>
        <DragInput
          value={light.getDistance()}
          onChange={(distance) => {
            light.setDistance(distance);
          }}
          min={0}
          max={1000}
          step={1}
          className="text-xs"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Angle (radians)</Label>
        <DragInput
          value={light.getAngle()}
          onChange={(angle) => {
            light.setAngle(angle);
          }}
          min={0}
          max={Math.PI / 2}
          step={0.01}
          className="text-xs"
        />
        <Label className="text-xs text-gray-500">
          Degrees: {((light.getAngle() * 180) / Math.PI).toFixed(1)}°
        </Label>
      </div>
      <div>
        <Label className="text-xs text-gray-400">Penumbra</Label>
        <DragInput
          value={light.getPenumbra()}
          onChange={(penumbra) => {
            light.setPenumbra(penumbra);
          }}
          min={0}
          max={1}
          step={0.01}
          className="text-xs"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Decay</Label>
        <DragInput
          value={light.getDecay()}
          onChange={(decay) => {
            light.setDecay(decay);
          }}
          min={0.1}
          max={5}
          step={0.1}
          className="text-xs"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Target Position</Label>
        <Vector3Input
          value={light.getTarget()}
          onChange={(target) => {
            light.setTarget(target as Vector3);
          }}
          label="Target Position"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          checked={light.spotLight.castShadow}
          onCheckedChange={handleShadowToggle}
        />
        <Label className="text-xs text-gray-400">Cast Shadow</Label>
      </div>
    </div>
  );

  const renderProperties = () => {
    if (entity instanceof AmbientLight) {
      return renderAmbientProperties(entity);
    } else if (entity instanceof DirectionalLight) {
      return renderDirectionalProperties(entity);
    } else if (entity instanceof PointLight) {
      return renderPointProperties(entity);
    } else if (entity instanceof SpotLight) {
      return renderSpotProperties(entity);
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <h3 className="border-b border-white/10 pb-1 text-sm font-medium text-yellow-300">
        {entity.lightType.charAt(0).toUpperCase() + entity.lightType.slice(1)}{" "}
        Light Properties
      </h3>

      {renderProperties()}
    </div>
  );
}
