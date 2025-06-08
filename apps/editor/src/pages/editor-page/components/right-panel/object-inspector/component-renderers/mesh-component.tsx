import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ColorInput from "../color-input";
import BoxGeometry from "./geometry-controls/box-geometry";
import SphereGeometry from "./geometry-controls/sphere-geometry";
import PlaneGeometry from "./geometry-controls/plane-geometry";
import CylinderGeometry from "./geometry-controls/cylinder-geometry";
import ConeGeometry from "./geometry-controls/cone-geometry";
import TorusGeometry from "./geometry-controls/torus-geometry";
import TorusKnotGeometry from "./geometry-controls/torus-knot-geometry";
import CapsuleGeometry from "./geometry-controls/capsule-geometry";
import CircleGeometry from "./geometry-controls/circle-geometry";
import RingGeometry from "./geometry-controls/ring-geometry";
import PolyhedronGeometry from "./geometry-controls/polyhedron-geometry";

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
    const controlProps = {
      geometryProps,
      onUpdate: updateGeometryProp
    };

    switch (props.geometry) {
      case 'box':
        return <BoxGeometry {...controlProps} />;
      case 'sphere':
        return <SphereGeometry {...controlProps} />;
      case 'plane':
        return <PlaneGeometry {...controlProps} />;
      case 'cylinder':
        return <CylinderGeometry {...controlProps} />;
      case 'cone':
        return <ConeGeometry {...controlProps} />;
      case 'torus':
        return <TorusGeometry {...controlProps} />;
      case 'torusKnot':
        return <TorusKnotGeometry {...controlProps} />;
      case 'capsule':
        return <CapsuleGeometry {...controlProps} />;
      case 'circle':
        return <CircleGeometry {...controlProps} />;
      case 'ring':
        return <RingGeometry {...controlProps} />;
      case 'dodecahedron':
      case 'icosahedron':
      case 'octahedron':
      case 'tetrahedron':
        return <PolyhedronGeometry {...controlProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-0 mt-2 rounded-md space-y-4">
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

            <div className="space-y-1">
              <Label className="text-xs">Side</Label>
              <Select
                value={String(materialProps.side ?? 0)}
                onValueChange={(value) => updateMaterialProp('side', parseInt(value))}
              >
                <SelectTrigger className="w-full h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Front</SelectItem>
                  <SelectItem value="1">Back</SelectItem>
                  <SelectItem value="2">Double Side</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="wireframe"
                checked={materialProps.wireframe || false}
                onCheckedChange={(value: boolean) => updateMaterialProp('wireframe', value)}
              />
              <Label htmlFor="wireframe" className="text-xs">Wireframe</Label>
            </div>

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