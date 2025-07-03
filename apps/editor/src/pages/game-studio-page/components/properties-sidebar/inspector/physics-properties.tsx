import React from "react";
import { Entity } from "@/models";
import { useEntityProperties, useEntityState } from "@/hooks/use-entity-state";
import { DragInput } from "@/components/ui/drag-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdvancedPhysicsProperties } from "./advanced-physics-properties";
import { PhysicsMode } from "@/models/types";

interface PhysicsPropertiesProps {
  entity: Entity;
}

export function PhysicsProperties({ entity }: PhysicsPropertiesProps) {
  const { physicsType, physicsMass, physicsRestitution, physicsFriction } = useEntityProperties(entity) as any;

  // Read values directly from entity properties
  const hasPhysics = entity.physicsConfig !== null && entity.getRigidBodyId() !== null;
  const isAdvancedMode = entity.physicsConfig?.mode === PhysicsMode.Advanced;
  
  const handlePhysicsToggle = (enabled: boolean) => {
    if (enabled && !hasPhysics) {
      // Enable physics with default settings
      entity.enableDynamicPhysics();
    } else if (!enabled && hasPhysics) {
      // Disable physics
      entity.disablePhysics();
    }
  };

  const handlePhysicsTypeChange = (type: string) => {
    if (!hasPhysics) return;
    
    entity.updatePhysicsType(type as "static" | "dynamic" | "kinematic");
  };

  const handleMassChange = (mass: number) => {
    entity.updateMass(mass);
  };

  const handleRestitutionChange = (restitution: number) => {
    entity.updateRestitution(restitution);
  };

  const handleFrictionChange = (friction: number) => {
    entity.updateFriction(friction);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-orange-300 text-sm font-medium">
          Physics Settings
        </h3>
        <Switch
          checked={hasPhysics}
          onCheckedChange={handlePhysicsToggle}
          className="data-[state=checked]:bg-orange-500"
        />
      </div>
      
      {hasPhysics && entity.physicsConfig && (
        <>
          {/* Show simple physics properties only in simple mode */}
          {!isAdvancedMode && (
            <>
              {/* Physics Type */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Physics Type</Label>
                <Select value={physicsType || ''} onValueChange={handlePhysicsTypeChange}>
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
              {physicsType === 'dynamic' && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Mass</Label>
                  <DragInput 
                    value={physicsMass}
                    onChange={handleMassChange}
                    min={0.01}
                    max={1000}
                    step={0.1}
                    className="text-xs"
                  />
                </div>
              )}

              {/* Restitution (bounciness) */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Restitution (Bounciness)</Label>
                <DragInput
                  value={physicsRestitution}
                  onChange={handleRestitutionChange}
                  min={0}
                  max={1}
                  step={0.01}
                  className="text-xs"
                />
              </div>

              {/* Friction */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Friction</Label>
                <DragInput
                  value={physicsFriction}
                  onChange={handleFrictionChange}
                  min={0}
                  max={2}
                  step={0.01}
                  className="text-xs"
                />
              </div>
            </>
          )}

          {/* Advanced Physics Properties */}
          <AdvancedPhysicsProperties entity={entity} />

          {/* Physics Info */}
          <div className="text-xs text-gray-500 space-y-1 overflow-x-hidden">
            <p>Mode: {entity.physicsConfig.mode || PhysicsMode.Simple}</p>
            <p>Rigid Body ID: {entity.getRigidBodyId() || 'None'}</p>
            {isAdvancedMode ? (
              <p>Colliders: {entity.getColliderIds().length}</p>
            ) : (
              <p>Collider ID: {entity.getColliderId() || 'None'}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}