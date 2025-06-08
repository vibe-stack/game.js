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
          </div>
        );
      case 'DirectionalLight':
        return null; // DirectionalLight doesn't have additional properties
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
        <ColorInput
          label="Color"
          value={props.color || '#ffffff'}
          onChange={(value) => updateProperty('color', value)}
        />

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

        <div className="flex items-center space-x-2">
          <Switch
            id="castShadow"
            checked={props.castShadow || false}
            onCheckedChange={(value: boolean) => updateProperty('castShadow', value)}
          />
          <Label htmlFor="castShadow" className="text-xs">Cast Shadow</Label>
        </div>
      </div>
    </div>
  );
} 