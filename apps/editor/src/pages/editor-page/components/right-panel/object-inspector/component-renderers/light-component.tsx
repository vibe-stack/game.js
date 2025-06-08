import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ColorInput from "../color-input";

interface LightComponentProps {
  component: GameObjectComponent;
  onUpdate: (updates: Partial<GameObjectComponent>) => void;
}

export default function LightComponent({ component, onUpdate }: LightComponentProps) {
  const props = component.properties || {};

  const updateProperty = (key: string, value: any) => {
    onUpdate({
      properties: {
        ...props,
        [key]: value
      }
    });
  };

  const renderLightSpecificControls = () => {
    switch (component.type) {
      case 'AmbientLight':
        return null; // AmbientLight only has color and intensity
      
      case 'PointLight':
        return (
          <div className="space-y-2">
            <DragInput
              label="Distance"
              value={props.distance || 0}
              onChange={(value) => updateProperty('distance', value)}
              step={1}
              precision={0}
              min={0}
            />
            <DragInput
              label="Decay"
              value={props.decay || 2}
              onChange={(value) => updateProperty('decay', value)}
              step={0.1}
              precision={1}
              min={0}
              max={10}
            />
            <DragInput
              label="Shadow Map Size"
              value={props.shadowMapSize || 512}
              onChange={(value) => updateProperty('shadowMapSize', Math.round(value))}
              step={128}
              precision={0}
              min={64}
              max={4096}
            />
          </div>
        );
      
      case 'DirectionalLight':
        return (
          <div className="space-y-2">
            <DragInput
              label="Shadow Map Size"
              value={props.shadowMapSize || 1024}
              onChange={(value) => updateProperty('shadowMapSize', Math.round(value))}
              step={128}
              precision={0}
              min={64}
              max={4096}
            />
            <DragInput
              label="Shadow Camera Near"
              value={props.shadowCameraNear || 0.5}
              onChange={(value) => updateProperty('shadowCameraNear', value)}
              step={0.1}
              precision={1}
              min={0.1}
            />
            <DragInput
              label="Shadow Camera Far"
              value={props.shadowCameraFar || 50}
              onChange={(value) => updateProperty('shadowCameraFar', value)}
              step={1}
              precision={0}
              min={1}
            />
            <DragInput
              label="Shadow Camera Left"
              value={props.shadowCameraLeft || -10}
              onChange={(value) => updateProperty('shadowCameraLeft', value)}
              step={1}
              precision={0}
            />
            <DragInput
              label="Shadow Camera Right"
              value={props.shadowCameraRight || 10}
              onChange={(value) => updateProperty('shadowCameraRight', value)}
              step={1}
              precision={0}
            />
            <DragInput
              label="Shadow Camera Top"
              value={props.shadowCameraTop || 10}
              onChange={(value) => updateProperty('shadowCameraTop', value)}
              step={1}
              precision={0}
            />
            <DragInput
              label="Shadow Camera Bottom"
              value={props.shadowCameraBottom || -10}
              onChange={(value) => updateProperty('shadowCameraBottom', value)}
              step={1}
              precision={0}
            />
          </div>
        );
      
      case 'SpotLight':
        return (
          <div className="space-y-2">
            <DragInput
              label="Distance"
              value={props.distance || 100}
              onChange={(value) => updateProperty('distance', value)}
              step={1}
              precision={0}
              min={0}
            />
            <DragInput
              label="Angle"
              value={props.angle || Math.PI / 3}
              onChange={(value) => updateProperty('angle', value)}
              step={0.1}
              precision={2}
              min={0}
              max={Math.PI / 2}
              suffix="rad"
            />
            <DragInput
              label="Penumbra"
              value={props.penumbra || 0}
              onChange={(value) => updateProperty('penumbra', value)}
              step={0.1}
              precision={1}
              min={0}
              max={1}
            />
            <DragInput
              label="Decay"
              value={props.decay || 2}
              onChange={(value) => updateProperty('decay', value)}
              step={0.1}
              precision={1}
              min={0}
              max={10}
            />
            <DragInput
              label="Shadow Map Size"
              value={props.shadowMapSize || 1024}
              onChange={(value) => updateProperty('shadowMapSize', Math.round(value))}
              step={128}
              precision={0}
              min={64}
              max={4096}
            />
          </div>
        );
      
      case 'HemisphereLight':
        return (
          <div className="space-y-2">
            <ColorInput
              label="Ground Color"
              value={props.groundColor || '#444444'}
              onChange={(value) => updateProperty('groundColor', value)}
            />
          </div>
        );
      
      case 'RectAreaLight':
        return (
          <div className="space-y-2">
            <DragInput
              label="Width"
              value={props.width || 10}
              onChange={(value) => updateProperty('width', value)}
              step={1}
              precision={0}
              min={0.1}
            />
            <DragInput
              label="Height"
              value={props.height || 10}
              onChange={(value) => updateProperty('height', value)}
              step={1}
              precision={0}
              min={0.1}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="p-3 border border-muted rounded-md space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{component.type}</div>
        <Switch
          checked={component.enabled}
          onCheckedChange={(enabled) => onUpdate({ enabled })}
        />
      </div>

      <div className="space-y-3">
        {component.type === 'HemisphereLight' ? (
          <ColorInput
            label="Sky Color"
            value={props.skyColor || '#ffffff'}
            onChange={(value) => updateProperty('skyColor', value)}
          />
        ) : (
          <ColorInput
            label="Color"
            value={props.color || '#ffffff'}
            onChange={(value) => updateProperty('color', value)}
          />
        )}

        <DragInput
          label="Intensity"
          value={props.intensity || 1}
          onChange={(value) => updateProperty('intensity', value)}
          step={0.1}
          precision={1}
          min={0}
          max={10}
        />

        {renderLightSpecificControls()}

        {component.type !== 'AmbientLight' && component.type !== 'HemisphereLight' && component.type !== 'RectAreaLight' && (
          <div className="flex items-center space-x-2">
            <Switch
              id="castShadow"
              checked={props.castShadow || false}
              onCheckedChange={(value: boolean) => updateProperty('castShadow', value)}
            />
            <Label htmlFor="castShadow" className="text-xs">Cast Shadow</Label>
          </div>
        )}
      </div>
    </div>
  );
} 