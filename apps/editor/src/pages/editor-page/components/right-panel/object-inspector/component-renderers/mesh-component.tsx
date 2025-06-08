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
            <DragInput
              label="Width Segments"
              value={geometryProps.widthSegments || 1}
              onChange={(value) => updateGeometryProp('widthSegments', Math.round(value))}
              step={1}
              precision={0}
              min={1}
              max={20}
            />
            <DragInput
              label="Height Segments"
              value={geometryProps.heightSegments || 1}
              onChange={(value) => updateGeometryProp('heightSegments', Math.round(value))}
              step={1}
              precision={0}
              min={1}
              max={20}
            />
            <DragInput
              label="Depth Segments"
              value={geometryProps.depthSegments || 1}
              onChange={(value) => updateGeometryProp('depthSegments', Math.round(value))}
              step={1}
              precision={0}
              min={1}
              max={20}
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
            <DragInput
              label="Phi Start"
              value={geometryProps.phiStart || 0}
              onChange={(value) => updateGeometryProp('phiStart', value)}
              step={0.1}
              precision={2}
              min={0}
              max={Math.PI * 2}
            />
            <DragInput
              label="Phi Length"
              value={geometryProps.phiLength || Math.PI * 2}
              onChange={(value) => updateGeometryProp('phiLength', value)}
              step={0.1}
              precision={2}
              min={0}
              max={Math.PI * 2}
            />
            <DragInput
              label="Theta Start"
              value={geometryProps.thetaStart || 0}
              onChange={(value) => updateGeometryProp('thetaStart', value)}
              step={0.1}
              precision={2}
              min={0}
              max={Math.PI}
            />
            <DragInput
              label="Theta Length"
              value={geometryProps.thetaLength || Math.PI}
              onChange={(value) => updateGeometryProp('thetaLength', value)}
              step={0.1}
              precision={2}
              min={0}
              max={Math.PI}
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
            <DragInput
              label="Width Segments"
              value={geometryProps.widthSegments || 1}
              onChange={(value) => updateGeometryProp('widthSegments', Math.round(value))}
              step={1}
              precision={0}
              min={1}
              max={20}
            />
            <DragInput
              label="Height Segments"
              value={geometryProps.heightSegments || 1}
              onChange={(value) => updateGeometryProp('heightSegments', Math.round(value))}
              step={1}
              precision={0}
              min={1}
              max={20}
            />
          </div>
        );
      case 'cylinder':
        return (
          <div className="space-y-2">
            <DragInput
              label="Radius Top"
              value={geometryProps.radiusTop || 0.5}
              onChange={(value) => updateGeometryProp('radiusTop', value)}
              step={0.1}
              precision={2}
              min={0}
            />
            <DragInput
              label="Radius Bottom"
              value={geometryProps.radiusBottom || 0.5}
              onChange={(value) => updateGeometryProp('radiusBottom', value)}
              step={0.1}
              precision={2}
              min={0}
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
              label="Radial Segments"
              value={geometryProps.radialSegments || 32}
              onChange={(value) => updateGeometryProp('radialSegments', Math.round(value))}
              step={1}
              precision={0}
              min={3}
              max={64}
            />
            <DragInput
              label="Height Segments"
              value={geometryProps.heightSegments || 1}
              onChange={(value) => updateGeometryProp('heightSegments', Math.round(value))}
              step={1}
              precision={0}
              min={1}
              max={20}
            />
          </div>
        );
      case 'cone':
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
              label="Height"
              value={geometryProps.height || 1}
              onChange={(value) => updateGeometryProp('height', value)}
              step={0.1}
              precision={2}
              min={0.001}
            />
            <DragInput
              label="Radial Segments"
              value={geometryProps.radialSegments || 32}
              onChange={(value) => updateGeometryProp('radialSegments', Math.round(value))}
              step={1}
              precision={0}
              min={3}
              max={64}
            />
            <DragInput
              label="Height Segments"
              value={geometryProps.heightSegments || 1}
              onChange={(value) => updateGeometryProp('heightSegments', Math.round(value))}
              step={1}
              precision={0}
              min={1}
              max={20}
            />
          </div>
        );
      case 'torus':
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
              label="Tube"
              value={geometryProps.tube || 0.2}
              onChange={(value) => updateGeometryProp('tube', value)}
              step={0.01}
              precision={2}
              min={0.001}
            />
            <DragInput
              label="Radial Segments"
              value={geometryProps.radialSegments || 16}
              onChange={(value) => updateGeometryProp('radialSegments', Math.round(value))}
              step={1}
              precision={0}
              min={3}
              max={32}
            />
            <DragInput
              label="Tubular Segments"
              value={geometryProps.tubularSegments || 100}
              onChange={(value) => updateGeometryProp('tubularSegments', Math.round(value))}
              step={1}
              precision={0}
              min={3}
              max={200}
            />
            <DragInput
              label="Arc"
              value={geometryProps.arc || Math.PI * 2}
              onChange={(value) => updateGeometryProp('arc', value)}
              step={0.1}
              precision={2}
              min={0}
              max={Math.PI * 2}
            />
          </div>
        );
      case 'torusKnot':
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
              label="Tube"
              value={geometryProps.tube || 0.15}
              onChange={(value) => updateGeometryProp('tube', value)}
              step={0.01}
              precision={2}
              min={0.001}
            />
            <DragInput
              label="Tubular Segments"
              value={geometryProps.tubularSegments || 64}
              onChange={(value) => updateGeometryProp('tubularSegments', Math.round(value))}
              step={1}
              precision={0}
              min={3}
              max={200}
            />
            <DragInput
              label="Radial Segments"
              value={geometryProps.radialSegments || 8}
              onChange={(value) => updateGeometryProp('radialSegments', Math.round(value))}
              step={1}
              precision={0}
              min={3}
              max={32}
            />
            <DragInput
              label="P"
              value={geometryProps.p || 2}
              onChange={(value) => updateGeometryProp('p', Math.round(value))}
              step={1}
              precision={0}
              min={1}
              max={10}
            />
            <DragInput
              label="Q"
              value={geometryProps.q || 3}
              onChange={(value) => updateGeometryProp('q', Math.round(value))}
              step={1}
              precision={0}
              min={1}
              max={10}
            />
          </div>
        );
      case 'capsule':
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
              label="Length"
              value={geometryProps.length || 1}
              onChange={(value) => updateGeometryProp('length', value)}
              step={0.1}
              precision={2}
              min={0.001}
            />
            <DragInput
              label="Cap Segments"
              value={geometryProps.capSegments || 4}
              onChange={(value) => updateGeometryProp('capSegments', Math.round(value))}
              step={1}
              precision={0}
              min={1}
              max={16}
            />
            <DragInput
              label="Radial Segments"
              value={geometryProps.radialSegments || 8}
              onChange={(value) => updateGeometryProp('radialSegments', Math.round(value))}
              step={1}
              precision={0}
              min={3}
              max={32}
            />
          </div>
        );
      case 'circle':
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
              label="Segments"
              value={geometryProps.segments || 32}
              onChange={(value) => updateGeometryProp('segments', Math.round(value))}
              step={1}
              precision={0}
              min={3}
              max={64}
            />
            <DragInput
              label="Theta Start"
              value={geometryProps.thetaStart || 0}
              onChange={(value) => updateGeometryProp('thetaStart', value)}
              step={0.1}
              precision={2}
              min={0}
              max={Math.PI * 2}
            />
            <DragInput
              label="Theta Length"
              value={geometryProps.thetaLength || Math.PI * 2}
              onChange={(value) => updateGeometryProp('thetaLength', value)}
              step={0.1}
              precision={2}
              min={0}
              max={Math.PI * 2}
            />
          </div>
        );
      case 'ring':
        return (
          <div className="space-y-2">
            <DragInput
              label="Inner Radius"
              value={geometryProps.innerRadius || 0.3}
              onChange={(value) => updateGeometryProp('innerRadius', value)}
              step={0.1}
              precision={2}
              min={0}
            />
            <DragInput
              label="Outer Radius"
              value={geometryProps.outerRadius || 0.6}
              onChange={(value) => updateGeometryProp('outerRadius', value)}
              step={0.1}
              precision={2}
              min={0.001}
            />
            <DragInput
              label="Theta Segments"
              value={geometryProps.thetaSegments || 32}
              onChange={(value) => updateGeometryProp('thetaSegments', Math.round(value))}
              step={1}
              precision={0}
              min={3}
              max={64}
            />
            <DragInput
              label="Phi Segments"
              value={geometryProps.phiSegments || 1}
              onChange={(value) => updateGeometryProp('phiSegments', Math.round(value))}
              step={1}
              precision={0}
              min={1}
              max={10}
            />
            <DragInput
              label="Theta Start"
              value={geometryProps.thetaStart || 0}
              onChange={(value) => updateGeometryProp('thetaStart', value)}
              step={0.1}
              precision={2}
              min={0}
              max={Math.PI * 2}
            />
            <DragInput
              label="Theta Length"
              value={geometryProps.thetaLength || Math.PI * 2}
              onChange={(value) => updateGeometryProp('thetaLength', value)}
              step={0.1}
              precision={2}
              min={0}
              max={Math.PI * 2}
            />
          </div>
        );
      case 'dodecahedron':
      case 'icosahedron':
      case 'octahedron':
      case 'tetrahedron':
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
              label="Detail"
              value={geometryProps.detail || 0}
              onChange={(value) => updateGeometryProp('detail', Math.round(value))}
              step={1}
              precision={0}
              min={0}
              max={5}
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
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Geometry</Label>
          <Select
            value={props.geometry || 'box'}
            onValueChange={(value) => updateProperty('geometry', value)}
          >
            <SelectTrigger className="w-full h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="box">Box</SelectItem>
              <SelectItem value="sphere">Sphere</SelectItem>
              <SelectItem value="plane">Plane</SelectItem>
              <SelectItem value="cylinder">Cylinder</SelectItem>
              <SelectItem value="cone">Cone</SelectItem>
              <SelectItem value="torus">Torus</SelectItem>
              <SelectItem value="torusKnot">Torus Knot</SelectItem>
              <SelectItem value="capsule">Capsule</SelectItem>
              <SelectItem value="circle">Circle</SelectItem>
              <SelectItem value="ring">Ring</SelectItem>
              <SelectItem value="dodecahedron">Dodecahedron</SelectItem>
              <SelectItem value="icosahedron">Icosahedron</SelectItem>
              <SelectItem value="octahedron">Octahedron</SelectItem>
              <SelectItem value="tetrahedron">Tetrahedron</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {renderGeometryControls()}

        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Material</Label>
          
          <div className="space-y-2">
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