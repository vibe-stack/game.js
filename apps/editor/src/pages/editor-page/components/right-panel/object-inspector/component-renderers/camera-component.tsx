import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface CameraComponentProps {
  component: GameObjectComponent;
  onUpdate: (updates: Partial<GameObjectComponent>) => void;
}

export default function CameraComponent({ component, onUpdate }: CameraComponentProps) {
  const props = component.properties || {};

  const updateProperty = (key: string, value: any) => {
    onUpdate({
      properties: {
        ...props,
        [key]: value
      }
    });
  };

  return (
    <div className="p-3 border border-muted rounded-md space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Camera</div>
        <Switch
          checked={component.enabled}
          onCheckedChange={(enabled) => onUpdate({ enabled })}
        />
      </div>

      <div className="space-y-3">
        <DragInput
          label="FOV"
          value={props.fov || 75}
          onChange={(value) => updateProperty('fov', value)}
          step={1}
          precision={0}
          min={1}
          max={179}
          suffix="°"
        />

        <DragInput
          label="Near"
          value={props.near || 0.1}
          onChange={(value) => updateProperty('near', value)}
          step={0.01}
          precision={2}
          min={0.001}
        />

        <DragInput
          label="Far"
          value={props.far || 1000}
          onChange={(value) => updateProperty('far', value)}
          step={10}
          precision={0}
          min={1}
        />

        <div className="flex items-center space-x-2">
          <Switch
            id="isMain"
            checked={props.isMain || false}
            onCheckedChange={(value: boolean) => updateProperty('isMain', value)}
          />
          <Label htmlFor="isMain" className="text-xs">Main Camera</Label>
        </div>
      </div>
    </div>
  );
} 