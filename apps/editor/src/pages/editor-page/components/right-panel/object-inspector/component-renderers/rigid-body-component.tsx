import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RigidBodyComponentProps {
  component: RigidBodyComponent;
  onUpdate: (updates: Partial<RigidBodyComponent>) => void;
}

export default function RigidBodyComponent({ component, onUpdate }: RigidBodyComponentProps) {
  const props = component.properties;

  const updateProperty = (key: keyof typeof props, value: any) => {
    onUpdate({
      properties: {
        ...props,
        [key]: value
      }
    });
  };

  const updateLockTranslation = (axis: 'x' | 'y' | 'z', value: boolean) => {
    updateProperty('lockTranslations', {
      ...props.lockTranslations,
      [axis]: value
    });
  };

  const updateLockRotation = (axis: 'x' | 'y' | 'z', value: boolean) => {
    updateProperty('lockRotations', {
      ...props.lockRotations,
      [axis]: value
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Body Type</Label>
          <Select
            value={props.bodyType}
            onValueChange={(value: RigidBodyType) => updateProperty('bodyType', value)}
          >
            <SelectTrigger className="w-full h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dynamic">Dynamic</SelectItem>
              <SelectItem value="static">Static</SelectItem>
              <SelectItem value="kinematic">Kinematic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {props.bodyType === 'dynamic' && (
          <DragInput
            label="Mass"
            value={props.mass || 1}
            onChange={(value) => updateProperty('mass', value)}
            step={0.1}
            precision={2}
            min={0.01}
          />
        )}

        <DragInput
          label="Linear Damping"
          value={props.linearDamping}
          onChange={(value) => updateProperty('linearDamping', value)}
          step={0.01}
          precision={2}
          min={0}
          max={10}
        />

        <DragInput
          label="Angular Damping"
          value={props.angularDamping}
          onChange={(value) => updateProperty('angularDamping', value)}
          step={0.01}
          precision={2}
          min={0}
          max={10}
        />

        <DragInput
          label="Gravity Scale"
          value={props.gravityScale}
          onChange={(value) => updateProperty('gravityScale', value)}
          step={0.1}
          precision={2}
        />

        <DragInput
          label="Dominance Group"
          value={props.dominanceGroup}
          onChange={(value) => updateProperty('dominanceGroup', Math.round(value))}
          step={1}
          precision={0}
          min={-127}
          max={127}
        />

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="canSleep"
              checked={props.canSleep}
              onCheckedChange={(value) => updateProperty('canSleep', value)}
            />
            <Label htmlFor="canSleep" className="text-xs">Can Sleep</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="sleeping"
              checked={props.sleeping}
              onCheckedChange={(value) => updateProperty('sleeping', value)}
            />
            <Label htmlFor="sleeping" className="text-xs">Initially Sleeping</Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Lock Translations</Label>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="lockTransX"
                checked={props.lockTranslations.x}
                onCheckedChange={(value) => updateLockTranslation('x', value)}
              />
              <Label htmlFor="lockTransX" className="text-xs">X</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="lockTransY"
                checked={props.lockTranslations.y}
                onCheckedChange={(value) => updateLockTranslation('y', value)}
              />
              <Label htmlFor="lockTransY" className="text-xs">Y</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="lockTransZ"
                checked={props.lockTranslations.z}
                onCheckedChange={(value) => updateLockTranslation('z', value)}
              />
              <Label htmlFor="lockTransZ" className="text-xs">Z</Label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Lock Rotations</Label>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="lockRotX"
                checked={props.lockRotations.x}
                onCheckedChange={(value) => updateLockRotation('x', value)}
              />
              <Label htmlFor="lockRotX" className="text-xs">X</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="lockRotY"
                checked={props.lockRotations.y}
                onCheckedChange={(value) => updateLockRotation('y', value)}
              />
              <Label htmlFor="lockRotY" className="text-xs">Y</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="lockRotZ"
                checked={props.lockRotations.z}
                onCheckedChange={(value) => updateLockRotation('z', value)}
              />
              <Label htmlFor="lockRotZ" className="text-xs">Z</Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 