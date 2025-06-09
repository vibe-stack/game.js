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

  const renderCameraSpecificControls = () => {
    switch (component.type) {
      case 'PerspectiveCamera':
        return (
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
              label="Aspect"
              value={props.aspect || 16/9}
              onChange={(value) => updateProperty('aspect', value)}
              step={0.1}
              precision={2}
              min={0.1}
            />
          </div>
        );
      case 'OrthographicCamera':
        return (
          <div className="space-y-3">
            <DragInput
              label="Left"
              value={props.left || -10}
              onChange={(value) => updateProperty('left', value)}
              step={1}
              precision={0}
            />
            <DragInput
              label="Right"
              value={props.right || 10}
              onChange={(value) => updateProperty('right', value)}
              step={1}
              precision={0}
            />
            <DragInput
              label="Top"
              value={props.top || 10}
              onChange={(value) => updateProperty('top', value)}
              step={1}
              precision={0}
            />
            <DragInput
              label="Bottom"
              value={props.bottom || -10}
              onChange={(value) => updateProperty('bottom', value)}
              step={1}
              precision={0}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {renderCameraSpecificControls()}

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
  );
} 