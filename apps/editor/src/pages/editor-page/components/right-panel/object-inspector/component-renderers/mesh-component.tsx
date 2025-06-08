import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ColorInput from "../color-input";

interface MeshComponentProps {
  component: GameObjectComponent;
  onUpdate: (updates: Partial<GameObjectComponent>) => void;
}

export default function MeshComponent({ component, onUpdate }: MeshComponentProps) {
  const props = component.properties || {};
  const geometryProps = props.geometryProps || {};
  const materialProps = props.materialProps || {};

  const updateProperty = (key: string, value: any) => {
    onUpdate({
      properties: {
        ...props,
        [key]: value
      }
    });
  };

  const updateGeometryProp = (key: string, value: any) => {
    onUpdate({
      properties: {
        ...props,
        geometryProps: {
          ...geometryProps,
          [key]: value
        }
      }
    });
  };

  const updateMaterialProp = (key: string, value: any) => {
    onUpdate({
      properties: {
        ...props,
        materialProps: {
          ...materialProps,
          [key]: value
        }
      }
    });
  };

  const renderGeometryControls = () => {
    switch (props.geometry) {
      case 'box':
        return (
          <div className="space-y-2">
            <DragInput
              label="Width"
              value={geometryProps.width || 1}
              onChange={(value) => updateGeometryProp('width', value)}
              step={0.1}
              precision={2}
              min={0.001}
            />
            <DragInput
              label="Height"
              value={geometryProps.height || 1}
              onChange={(value) => updateGeometryProp('height', value)}
              step={0.1}
              precision={2}
              min={0.001}
            />
            <DragInput
              label="Depth"
              value={geometryProps.depth || 1}
              onChange={(value) => updateGeometryProp('depth', value)}
              step={0.1}
              precision={2}
              min={0.001}
            />
          </div>
        );
      case 'sphere':
        return (
          <div className="space-y-2">
            <DragInput
              label="Radius"
              value={geometryProps.radius || 0.5}
              onChange={(value) => updateGeometryProp('radius', value)}
              step={0.1}
              precision={2}
              min={0.001}
            />
            <DragInput
              label="Width Segments"
              value={geometryProps.widthSegments || 32}
              onChange={(value) => updateGeometryProp('widthSegments', Math.round(value))}
              step={1}
              precision={0}
              min={3}
              max={64}
            />
            <DragInput
              label="Height Segments"
              value={geometryProps.heightSegments || 16}
              onChange={(value) => updateGeometryProp('heightSegments', Math.round(value))}
              step={1}
              precision={0}
              min={2}
              max={32}
            />
          </div>
        );
      case 'plane':
        return (
          <div className="space-y-2">
            <DragInput
              label="Width"
              value={geometryProps.width || 2}
              onChange={(value) => updateGeometryProp('width', value)}
              step={0.1}
              precision={2}
              min={0.001}
            />
            <DragInput
              label="Height"
              value={geometryProps.height || 2}
              onChange={(value) => updateGeometryProp('height', value)}
              step={0.1}
              precision={2}
              min={0.001}
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
        <div className="text-sm font-medium">Mesh</div>
        <Switch
          checked={component.enabled}
          onCheckedChange={(enabled) => onUpdate({ enabled })}
        />
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Geometry</Label>
          <Select
            value={props.geometry || 'box'}
            onValueChange={(value) => updateProperty('geometry', value)}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="box">Box</SelectItem>
              <SelectItem value="sphere">Sphere</SelectItem>
              <SelectItem value="plane">Plane</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {renderGeometryControls()}

        <div className="space-y-2 max-w-full">
          <Label className="text-xs text-muted-foreground">Material</Label>
          
          <ColorInput
            label="Color"
            value={materialProps.color || '#ffffff'}
            onChange={(value) => updateMaterialProp('color', value)}
          />

          <DragInput
            label="Metalness"
            value={materialProps.metalness || 0}
            onChange={(value) => updateMaterialProp('metalness', value)}
            step={0.01}
            precision={2}
            min={0}
            max={1}
          />

          <DragInput
            label="Roughness"
            value={materialProps.roughness || 0.5}
            onChange={(value) => updateMaterialProp('roughness', value)}
            step={0.01}
            precision={2}
            min={0}
            max={1}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="castShadow"
              checked={props.castShadow || false}
              onCheckedChange={(value: boolean) => updateProperty('castShadow', value)}
            />
            <Label htmlFor="castShadow" className="text-xs">Cast Shadow</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="receiveShadow"
              checked={props.receiveShadow || false}
              onCheckedChange={(value: boolean) => updateProperty('receiveShadow', value)}
            />
            <Label htmlFor="receiveShadow" className="text-xs">Receive Shadow</Label>
          </div>
        </div>
      </div>
    </div>
  );
} 