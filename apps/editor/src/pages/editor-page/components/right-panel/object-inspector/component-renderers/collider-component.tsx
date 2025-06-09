import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Vector3Controls from "../vector3-controls";
import CollisionGroupsGrid from "./collision-groups-grid";

interface ColliderComponentProps {
  component: ColliderComponent;
  onUpdate: (updates: Partial<ColliderComponent>) => void;
}

export default function ColliderComponent({ component, onUpdate }: ColliderComponentProps) {
  const props = component.properties;

  const updateProperty = (key: keyof typeof props, value: any) => {
    onUpdate({
      properties: {
        ...props,
        [key]: value
      }
    });
  };

  const updateMaterial = (key: keyof typeof props.material, value: any) => {
    updateProperty('material', {
      ...props.material,
      [key]: value
    });
  };

  const updateShape = (updates: Partial<ColliderShape>) => {
    updateProperty('shape', {
      ...props.shape,
      ...updates
    });
  };

  const updateActiveCollisionTypes = (key: keyof typeof props.activeCollisionTypes, value: boolean) => {
    updateProperty('activeCollisionTypes', {
      ...props.activeCollisionTypes,
      [key]: value
    });
  };

  const updateActiveEvents = (key: keyof typeof props.activeEvents, value: boolean) => {
    updateProperty('activeEvents', {
      ...props.activeEvents,
      [key]: value
    });
  };

  const renderShapeControls = () => {
    const shape = props.shape;
    
    switch (shape.type) {
      case 'box':
        return (
          <Vector3Controls
            label="Half Extents"
            value={shape.halfExtents}
            onChange={(value) => updateShape({ halfExtents: value })}
            step={0.1}
            precision={2}
            min={0.01}
          />
        );
      case 'sphere':
        return (
          <DragInput
            label="Radius"
            value={shape.radius}
            onChange={(value) => updateShape({ radius: value })}
            step={0.1}
            precision={2}
            min={0.01}
          />
        );
      case 'capsule':
        return (
          <div className="space-y-2">
            <DragInput
              label="Half Height"
              value={shape.halfHeight}
              onChange={(value) => updateShape({ halfHeight: value })}
              step={0.1}
              precision={2}
              min={0.01}
            />
            <DragInput
              label="Radius"
              value={shape.radius}
              onChange={(value) => updateShape({ radius: value })}
              step={0.1}
              precision={2}
              min={0.01}
            />
          </div>
        );
      case 'cylinder':
        return (
          <div className="space-y-2">
            <DragInput
              label="Height"
              value={shape.height}
              onChange={(value) => updateShape({ height: value })}
              step={0.1}
              precision={2}
              min={0.01}
            />
            <DragInput
              label="Radius"
              value={shape.radius}
              onChange={(value) => updateShape({ radius: value })}
              step={0.1}
              precision={2}
              min={0.01}
            />
          </div>
        );
      case 'cone':
        return (
          <div className="space-y-2">
            <DragInput
              label="Height"
              value={shape.height}
              onChange={(value) => updateShape({ height: value })}
              step={0.1}
              precision={2}
              min={0.01}
            />
            <DragInput
              label="Radius"
              value={shape.radius}
              onChange={(value) => updateShape({ radius: value })}
              step={0.1}
              precision={2}
              min={0.01}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Shape</Label>
          <Select
            value={props.shape.type}
            onValueChange={(type) => {
              // Reset shape with default values for new type
              const defaultShapes: Record<string, ColliderShape> = {
                box: { type: 'box', halfExtents: { x: 0.5, y: 0.5, z: 0.5 } },
                sphere: { type: 'sphere', radius: 0.5 },
                capsule: { type: 'capsule', halfHeight: 0.5, radius: 0.5 },
                cylinder: { type: 'cylinder', height: 1, radius: 0.5 },
                cone: { type: 'cone', height: 1, radius: 0.5 },
                convexHull: { type: 'convexHull', vertices: [] },
                trimesh: { type: 'trimesh', vertices: [], indices: [] },
                heightfield: { type: 'heightfield', heights: [[]], scale: { x: 1, y: 1, z: 1 } }
              };
              updateProperty('shape', defaultShapes[type]);
            }}
          >
            <SelectTrigger className="w-full h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="box">Box</SelectItem>
              <SelectItem value="sphere">Sphere</SelectItem>
              <SelectItem value="capsule">Capsule</SelectItem>
              <SelectItem value="cylinder">Cylinder</SelectItem>
              <SelectItem value="cone">Cone</SelectItem>
              <SelectItem value="convexHull">Convex Hull</SelectItem>
              <SelectItem value="trimesh">Triangle Mesh</SelectItem>
              <SelectItem value="heightfield">Heightfield</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {renderShapeControls()}
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Properties</Label>
        <div className="flex items-center space-x-2">
          <Switch
            id="isSensor"
            checked={props.isSensor}
            onCheckedChange={(value) => updateProperty('isSensor', value)}
          />
          <Label htmlFor="isSensor" className="text-xs">Is Sensor</Label>
        </div>

        {!props.isSensor && (
          <DragInput
            label="Density"
            value={props.density || 1}
            onChange={(value) => updateProperty('density', value)}
            step={0.1}
            precision={2}
            min={0.01}
          />
        )}
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Physics Material</Label>
        <div className="space-y-2">
          <DragInput
            label="Friction"
            value={props.material.friction}
            onChange={(value) => updateMaterial('friction', value)}
            step={0.01}
            precision={2}
            min={0}
            max={2}
          />

          <DragInput
            label="Restitution"
            value={props.material.restitution}
            onChange={(value) => updateMaterial('restitution', value)}
            step={0.01}
            precision={2}
            min={0}
            max={1}
          />

          <div className="space-y-1">
            <Label className="text-xs">Friction Combine Rule</Label>
            <Select
              value={props.material.frictionCombineRule}
              onValueChange={(value) => updateMaterial('frictionCombineRule', value)}
            >
              <SelectTrigger className="w-full h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="average">Average</SelectItem>
                <SelectItem value="min">Minimum</SelectItem>
                <SelectItem value="multiply">Multiply</SelectItem>
                <SelectItem value="max">Maximum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Restitution Combine Rule</Label>
            <Select
              value={props.material.restitutionCombineRule}
              onValueChange={(value) => updateMaterial('restitutionCombineRule', value)}
            >
              <SelectTrigger className="w-full h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="average">Average</SelectItem>
                <SelectItem value="min">Minimum</SelectItem>
                <SelectItem value="multiply">Multiply</SelectItem>
                <SelectItem value="max">Maximum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Collision Groups</Label>
        <CollisionGroupsGrid
          label="Collision Groups"
          value={props.collisionGroups}
          onChange={(groups) => updateProperty('collisionGroups', groups)}
        />

        <CollisionGroupsGrid
          label="Solver Groups"
          value={props.solverGroups}
          onChange={(groups) => updateProperty('solverGroups', groups)}
        />
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Events & Collision Types</Label>
        <div className="space-y-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Active Collision Types</Label>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Switch
                  id="activeDefault"
                  checked={props.activeCollisionTypes.default}
                  onCheckedChange={(value) => updateActiveCollisionTypes('default', value)}
                />
                <Label htmlFor="activeDefault" className="text-xs">Default</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="activeKinematic"
                  checked={props.activeCollisionTypes.kinematic}
                  onCheckedChange={(value) => updateActiveCollisionTypes('kinematic', value)}
                />
                <Label htmlFor="activeKinematic" className="text-xs">Kinematic</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="activeSensor"
                  checked={props.activeCollisionTypes.sensor}
                  onCheckedChange={(value) => updateActiveCollisionTypes('sensor', value)}
                />
                <Label htmlFor="activeSensor" className="text-xs">Sensor</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Active Events</Label>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Switch
                  id="collisionEvents"
                  checked={props.activeEvents.collisionEvents}
                  onCheckedChange={(value) => updateActiveEvents('collisionEvents', value)}
                />
                <Label htmlFor="collisionEvents" className="text-xs">Collision Events</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="contactForceEvents"
                  checked={props.activeEvents.contactForceEvents}
                  onCheckedChange={(value) => updateActiveEvents('contactForceEvents', value)}
                />
                <Label htmlFor="contactForceEvents" className="text-xs">Contact Force Events</Label>
              </div>
            </div>
          </div>

          {props.activeEvents.contactForceEvents && (
            <DragInput
              label="Contact Force Threshold"
              value={props.contactForceEventThreshold}
              onChange={(value) => updateProperty('contactForceEventThreshold', value)}
              step={0.1}
              precision={2}
              min={0}
            />
          )}
        </div>
      </div>
    </div>
  );
} 