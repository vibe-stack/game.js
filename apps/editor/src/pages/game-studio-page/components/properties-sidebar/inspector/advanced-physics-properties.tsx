import React, { useState } from "react";
import { Entity } from "@/models";
import { PhysicsMode, CollisionGroupPresets, ColliderShape, ColliderConfig } from "@/models/types";
import { useEntityState } from "@/hooks/use-entity-state";
import { DragInput } from "@/components/ui/drag-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import * as THREE from "three/webgpu";

interface AdvancedPhysicsPropertiesProps {
  entity: Entity;
}

interface ColliderEditorProps {
  collider: ColliderConfig;
  index: number;
  onUpdate: (index: number, collider: ColliderConfig) => void;
  onRemove: (index: number) => void;
}

function ColliderEditor({ collider, index, onUpdate, onRemove }: ColliderEditorProps) {
  const [expanded, setExpanded] = useState(false);
  
  const handleShapeChange = (newShapeType: string) => {
    let newShape: ColliderShape;
    
    switch (newShapeType) {
      case "ball":
        newShape = { type: "ball", radius: 0.5 };
        break;
      case "cuboid":
        newShape = { type: "cuboid", halfExtents: new THREE.Vector3(0.5, 0.5, 0.5) };
        break;
      case "capsule":
        newShape = { type: "capsule", halfHeight: 0.5, radius: 0.25 };
        break;
      case "cylinder":
        newShape = { type: "cylinder", halfHeight: 0.5, radius: 0.5 };
        break;
      case "cone":
        newShape = { type: "cone", halfHeight: 0.5, radius: 0.5 };
        break;
      default:
        return;
    }
    
    onUpdate(index, { ...collider, shape: newShape });
  };
  
  const renderShapeProperties = () => {
    const shape = collider.shape;
    
    switch (shape.type) {
      case "ball":
        return (
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Radius</Label>
            <DragInput
              value={shape.radius}
              onChange={(value) => onUpdate(index, { ...collider, shape: { ...shape, radius: value } })}
              min={0.01}
              max={10}
              step={0.01}
              className="text-xs"
            />
          </div>
        );
        
      case "cuboid":
        return (
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Half Extents</Label>
            <div className="grid grid-cols-3 gap-2">
              <DragInput
                value={shape.halfExtents.x}
                onChange={(value) => onUpdate(index, { 
                  ...collider, 
                  shape: { ...shape, halfExtents: new THREE.Vector3(value, shape.halfExtents.y, shape.halfExtents.z) } 
                })}
                min={0.01}
                max={10}
                step={0.01}
                className="text-xs"
              />
              <DragInput
                value={shape.halfExtents.y}
                onChange={(value) => onUpdate(index, { 
                  ...collider, 
                  shape: { ...shape, halfExtents: new THREE.Vector3(shape.halfExtents.x, value, shape.halfExtents.z) } 
                })}
                min={0.01}
                max={10}
                step={0.01}
                className="text-xs"
              />
              <DragInput
                value={shape.halfExtents.z}
                onChange={(value) => onUpdate(index, { 
                  ...collider, 
                  shape: { ...shape, halfExtents: new THREE.Vector3(shape.halfExtents.x, shape.halfExtents.y, value) } 
                })}
                min={0.01}
                max={10}
                step={0.01}
                className="text-xs"
              />
            </div>
          </div>
        );
        
      case "capsule":
      case "cylinder":
      case "cone":
        return (
          <>
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Half Height</Label>
              <DragInput
                value={shape.halfHeight}
                onChange={(value) => onUpdate(index, { ...collider, shape: { ...shape, halfHeight: value } })}
                min={0.01}
                max={10}
                step={0.01}
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Radius</Label>
              <DragInput
                value={shape.radius}
                onChange={(value) => onUpdate(index, { ...collider, shape: { ...shape, radius: value } })}
                min={0.01}
                max={10}
                step={0.01}
                className="text-xs"
              />
            </div>
          </>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-gray-300 hover:text-white transition-colors"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Collider {index + 1} ({collider.shape.type})
        </button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onRemove(index)}
          className="h-6 w-6 p-0"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      {expanded && (
        <div className="space-y-3 ml-4">
          {/* Shape Type */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Shape</Label>
            <Select value={collider.shape.type} onValueChange={handleShapeChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ball">Ball</SelectItem>
                <SelectItem value="cuboid">Cuboid</SelectItem>
                <SelectItem value="capsule">Capsule</SelectItem>
                <SelectItem value="cylinder">Cylinder</SelectItem>
                <SelectItem value="cone">Cone</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Shape-specific properties */}
          {renderShapeProperties()}
          
          {/* Collider Offset */}
          {collider.offset && (
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Offset</Label>
              <div className="grid grid-cols-3 gap-2">
                <DragInput
                  value={collider.offset.x}
                  onChange={(value) => onUpdate(index, { 
                    ...collider, 
                    offset: new THREE.Vector3(value, collider.offset!.y, collider.offset!.z) 
                  })}
                  min={-10}
                  max={10}
                  step={0.01}
                  className="text-xs"
                />
                <DragInput
                  value={collider.offset.y}
                  onChange={(value) => onUpdate(index, { 
                    ...collider, 
                    offset: new THREE.Vector3(collider.offset!.x, value, collider.offset!.z) 
                  })}
                  min={-10}
                  max={10}
                  step={0.01}
                  className="text-xs"
                />
                <DragInput
                  value={collider.offset.z}
                  onChange={(value) => onUpdate(index, { 
                    ...collider, 
                    offset: new THREE.Vector3(collider.offset!.x, collider.offset!.y, value) 
                  })}
                  min={-10}
                  max={10}
                  step={0.01}
                  className="text-xs"
                />
              </div>
            </div>
          )}
          
          {/* Physics Properties */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Friction</Label>
            <DragInput
              value={collider.friction ?? 0.7}
              onChange={(value) => onUpdate(index, { ...collider, friction: value })}
              min={0}
              max={2}
              step={0.01}
              className="text-xs"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Restitution</Label>
            <DragInput
              value={collider.restitution ?? 0.5}
              onChange={(value) => onUpdate(index, { ...collider, restitution: value })}
              min={0}
              max={1}
              step={0.01}
              className="text-xs"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Density</Label>
            <DragInput
              value={collider.density ?? 1.0}
              onChange={(value) => onUpdate(index, { ...collider, density: value })}
              min={0.01}
              max={100}
              step={0.1}
              className="text-xs"
            />
          </div>
          
          {/* Sensor */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-gray-400">Is Sensor</Label>
            <Switch
              checked={collider.isSensor ?? false}
              onCheckedChange={(checked) => onUpdate(index, { ...collider, isSensor: checked })}
              className="data-[state=checked]:bg-orange-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function AdvancedPhysicsProperties({ entity }: AdvancedPhysicsPropertiesProps) {
  // Subscribe to entity changes - this will trigger re-renders when the entity changes
  useEntityState(entity);
  
  // Read values directly from the entity (not from a cached reference)
  const hasPhysics = entity.hasPhysics();
  const physicsConfig = entity.getPhysicsConfig();
  const isAdvancedMode = physicsConfig?.mode === PhysicsMode.Advanced;
  
  const handleModeToggle = (checked: boolean) => {
    if (checked && !isAdvancedMode) {
      // Switch to advanced mode
      entity.enableAdvancedPhysics({
        ...physicsConfig,
        mode: PhysicsMode.Advanced,
        colliders: [
          {
            shape: { type: "cuboid", halfExtents: new THREE.Vector3(0.5, 0.5, 0.5) },
            friction: physicsConfig?.friction ?? 0.7,
            restitution: physicsConfig?.restitution ?? 0.5,
          }
        ]
      });
    } else if (!checked && isAdvancedMode) {
      // Switch back to simple mode
      entity.updatePhysicsConfig({
        ...physicsConfig,
        mode: PhysicsMode.Simple,
        colliders: undefined
      });
    }
  };
  
  const handleAddCollider = () => {
    if (!entity || !physicsConfig) return;
    
    const newCollider: ColliderConfig = {
      shape: { type: "cuboid", halfExtents: new THREE.Vector3(0.5, 0.5, 0.5) },
      friction: 0.7,
      restitution: 0.5,
    };
    
    // Update the entire physics config to ensure proper change detection
    const updatedColliders = [...(physicsConfig.colliders || []), newCollider];
    entity.updatePhysicsConfig({
      ...physicsConfig,
      colliders: updatedColliders
    });
  };
  
  const handleUpdateCollider = (index: number, collider: ColliderConfig) => {
    if (!entity || !physicsConfig?.colliders) return;
    
    // Use the new method that doesn't recreate all physics bodies
    entity.updateColliderConfig(index, collider);
  };
  
  const handleRemoveCollider = (index: number) => {
    if (!entity || !physicsConfig?.colliders) return;
    
    // Remove the collider at the specified index
    const updatedColliders = physicsConfig.colliders.filter((_, i) => i !== index);
    
    // Update the entire physics config to trigger proper change detection
    entity.updatePhysicsConfig({
      ...physicsConfig,
      colliders: updatedColliders
    });
  };

  const handlePhysicsTypeChange = (type: string) => {
    if (!entity || !physicsConfig) return;
    
    entity.updatePhysicsType(type as "static" | "dynamic" | "kinematic");
  };
  
  if (!hasPhysics || !physicsConfig) {
    return (
      <div className="text-xs text-gray-500 text-center py-4">
        Enable physics to configure advanced settings
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-400">Advanced Mode</Label>
        <Switch
          checked={isAdvancedMode}
          onCheckedChange={handleModeToggle}
          className="data-[state=checked]:bg-orange-500"
        />
      </div>
      
      {isAdvancedMode && (
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
            <TabsTrigger value="colliders" className="text-xs">Colliders</TabsTrigger>
            <TabsTrigger value="dynamics" className="text-xs">Dynamics</TabsTrigger>
            <TabsTrigger value="constraints" className="text-xs">Constraints</TabsTrigger>
            <TabsTrigger value="collision" className="text-xs">Collision</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-3">
            {/* Rigid Body Type */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Rigid Body Type</Label>
              <Select value={physicsConfig.type || 'dynamic'} onValueChange={handlePhysicsTypeChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dynamic">Dynamic</SelectItem>
                  <SelectItem value="static">Static</SelectItem>
                  <SelectItem value="kinematic">Kinematic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mass (only for dynamic bodies) */}
            {physicsConfig.type === 'dynamic' && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Mass</Label>
                <DragInput 
                  value={physicsConfig.mass ?? 1}
                  onChange={(value) => entity.updateMass(value)}
                  min={0.01}
                  max={1000}
                  step={0.1}
                  className="text-xs"
                />
              </div>
            )}

            {/* Global Restitution */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Default Restitution</Label>
              <DragInput
                value={physicsConfig.restitution ?? 0.5}
                onChange={(value) => entity.updateRestitution(value)}
                min={0}
                max={1}
                step={0.01}
                className="text-xs"
              />
            </div>

            {/* Global Friction */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Default Friction</Label>
              <DragInput
                value={physicsConfig.friction ?? 0.7}
                onChange={(value) => entity.updateFriction(value)}
                min={0}
                max={2}
                step={0.01}
                className="text-xs"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="colliders" className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-orange-300">Colliders</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddCollider}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Collider
              </Button>
            </div>
            
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {physicsConfig.colliders?.map((collider, index) => (
                  <ColliderEditor
                    key={index}
                    collider={collider}
                    index={index}
                    onUpdate={handleUpdateCollider}
                    onRemove={handleRemoveCollider}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="dynamics" className="space-y-3">
            {/* Linear Damping */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Linear Damping</Label>
              <DragInput
                value={physicsConfig.linearDamping ?? 0}
                onChange={(value) => entity.updateAdvancedPhysicsProperty('linearDamping', value)}
                min={0}
                max={10}
                step={0.01}
                className="text-xs"
              />
            </div>
            
            {/* Angular Damping */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Angular Damping</Label>
              <DragInput
                value={physicsConfig.angularDamping ?? 0}
                onChange={(value) => entity.updateAdvancedPhysicsProperty('angularDamping', value)}
                min={0}
                max={10}
                step={0.01}
                className="text-xs"
              />
            </div>
            
            {/* Gravity Scale */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Gravity Scale</Label>
              <DragInput
                value={physicsConfig.gravityScale ?? 1}
                onChange={(value) => entity.updateAdvancedPhysicsProperty('gravityScale', value)}
                min={-2}
                max={2}
                step={0.01}
                className="text-xs"
              />
            </div>
            
            {/* Continuous Collision Detection */}
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Continuous Collision Detection</Label>
              <Switch
                checked={physicsConfig.ccd ?? false}
                onCheckedChange={(checked) => entity.updateAdvancedPhysicsProperty('ccd', checked)}
                className="data-[state=checked]:bg-orange-500"
              />
            </div>
            
            {/* Can Sleep */}
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Can Sleep</Label>
              <Switch
                checked={physicsConfig.canSleep ?? true}
                onCheckedChange={(checked) => entity.updateAdvancedPhysicsProperty('canSleep', checked)}
                className="data-[state=checked]:bg-orange-500"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="constraints" className="space-y-3">
            <Label className="text-sm text-orange-300">Translation Locks</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-400">Lock X</Label>
                <Switch
                  checked={physicsConfig.lockTranslationX ?? false}
                  onCheckedChange={(checked) => entity.updateAdvancedPhysicsProperty('lockTranslationX', checked)}
                  className="data-[state=checked]:bg-orange-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-400">Lock Y</Label>
                <Switch
                  checked={physicsConfig.lockTranslationY ?? false}
                  onCheckedChange={(checked) => entity.updateAdvancedPhysicsProperty('lockTranslationY', checked)}
                  className="data-[state=checked]:bg-orange-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-400">Lock Z</Label>
                <Switch
                  checked={physicsConfig.lockTranslationZ ?? false}
                  onCheckedChange={(checked) => entity.updateAdvancedPhysicsProperty('lockTranslationZ', checked)}
                  className="data-[state=checked]:bg-orange-500"
                />
              </div>
            </div>
            
            <Separator />
            
            <Label className="text-sm text-orange-300">Rotation Locks</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-400">Lock X</Label>
                <Switch
                  checked={physicsConfig.lockRotationX ?? false}
                  onCheckedChange={(checked) => entity.updateAdvancedPhysicsProperty('lockRotationX', checked)}
                  className="data-[state=checked]:bg-orange-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-400">Lock Y</Label>
                <Switch
                  checked={physicsConfig.lockRotationY ?? false}
                  onCheckedChange={(checked) => entity.updateAdvancedPhysicsProperty('lockRotationY', checked)}
                  className="data-[state=checked]:bg-orange-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-400">Lock Z</Label>
                <Switch
                  checked={physicsConfig.lockRotationZ ?? false}
                  onCheckedChange={(checked) => entity.updateAdvancedPhysicsProperty('lockRotationZ', checked)}
                  className="data-[state=checked]:bg-orange-500"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="collision" className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Collision Group Preset</Label>
              <Select defaultValue="Default">
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Default">Default</SelectItem>
                  <SelectItem value="Static">Static</SelectItem>
                  <SelectItem value="Dynamic">Dynamic</SelectItem>
                  <SelectItem value="Player">Player</SelectItem>
                  <SelectItem value="Enemy">Enemy</SelectItem>
                  <SelectItem value="Projectile">Projectile</SelectItem>
                  <SelectItem value="Trigger">Trigger</SelectItem>
                  <SelectItem value="NoCollision">No Collision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Dominance Group</Label>
              <DragInput
                value={physicsConfig.dominanceGroup ?? 0}
                onChange={(value) => entity.updateAdvancedPhysicsProperty('dominanceGroup', Math.floor(value))}
                min={-127}
                max={127}
                step={1}
                className="text-xs"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Additional Solver Iterations</Label>
              <DragInput
                value={physicsConfig.additionalSolverIterations ?? 0}
                onChange={(value) => entity.updateAdvancedPhysicsProperty('additionalSolverIterations', Math.floor(value))}
                min={0}
                max={16}
                step={1}
                className="text-xs"
              />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 