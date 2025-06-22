import React from "react";
import { Entity } from "@/models";
import { DragInput } from "@/components/ui/drag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PhysicsPropertiesProps {
  entity: Entity;
  onUpdate: () => void;
}

export function PhysicsProperties({ entity, onUpdate }: PhysicsPropertiesProps) {
  const physicsConfig = entity.getPhysicsConfig();
  const hasPhysics = entity.hasPhysics();

  const handlePhysicsToggle = (enabled: string | boolean) => {
    const isEnabled = typeof enabled === 'boolean' ? enabled : enabled === 'true';
    
    if (isEnabled && !hasPhysics) {
      // Enable physics with default settings
      entity.enableDynamicPhysics();
    } else if (!isEnabled && hasPhysics) {
      // Disable physics
      entity.disablePhysics();
    }
    onUpdate();
  };

  const handlePhysicsTypeChange = (type: string) => {
    if (!hasPhysics) return;
    
    const currentConfig = entity.getPhysicsConfig();
    if (!currentConfig) return;

    // Disable and re-enable with new type
    entity.disablePhysics();
    
    if (type === 'dynamic') {
      entity.enableDynamicPhysics(
        currentConfig.mass || 1,
        currentConfig.restitution || 0.5,
        currentConfig.friction || 0.7
      );
    } else if (type === 'static') {
      entity.enableStaticPhysics(
        currentConfig.restitution || 0.5,
        currentConfig.friction || 0.7
      );
    } else if (type === 'kinematic') {
      entity.enableKinematicPhysics();
    }
    
    onUpdate();
  };

  const handleMassChange = (mass: number) => {
    if (!hasPhysics || !physicsConfig) return;
    
    // Re-enable physics with new mass
    entity.disablePhysics();
    entity.enableDynamicPhysics(
      mass,
      physicsConfig.restitution || 0.5,
      physicsConfig.friction || 0.7
    );
    onUpdate();
  };

  const handleRestitutionChange = (restitution: number) => {
    if (!hasPhysics || !physicsConfig) return;
    
    const currentType = physicsConfig.type || 'dynamic';
    entity.disablePhysics();
    
    if (currentType === 'dynamic') {
      entity.enableDynamicPhysics(
        physicsConfig.mass || 1,
        restitution,
        physicsConfig.friction || 0.7
      );
    } else if (currentType === 'static') {
      entity.enableStaticPhysics(
        restitution,
        physicsConfig.friction || 0.7
      );
    } else if (currentType === 'kinematic') {
      entity.enableKinematicPhysics();
    }
    
    onUpdate();
  };

  const handleFrictionChange = (friction: number) => {
    if (!hasPhysics || !physicsConfig) return;
    
    const currentType = physicsConfig.type || 'dynamic';
    entity.disablePhysics();
    
    if (currentType === 'dynamic') {
      entity.enableDynamicPhysics(
        physicsConfig.mass || 1,
        physicsConfig.restitution || 0.5,
        friction
      );
    } else if (currentType === 'static') {
      entity.enableStaticPhysics(
        physicsConfig.restitution || 0.5,
        friction
      );
    } else if (currentType === 'kinematic') {
      entity.enableKinematicPhysics();
    }
    
    onUpdate();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-orange-300 text-sm font-medium border-b border-white/10 pb-1">
        Physics Settings
      </h3>
      
      {/* Physics Toggle */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="physics-enabled"
          checked={hasPhysics}
          onCheckedChange={handlePhysicsToggle}
        />
        <Label htmlFor="physics-enabled" className="text-xs text-gray-400">Enable Physics</Label>
      </div>

      {hasPhysics && physicsConfig && (
        <>
          {/* Physics Type */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Physics Type</Label>
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
                value={physicsConfig.mass || 1}
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
              value={physicsConfig.restitution || 0.5}
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
              value={physicsConfig.friction || 0.7}
              onChange={handleFrictionChange}
              min={0}
              max={2}
              step={0.01}
              className="text-xs"
            />
          </div>

          {/* Physics Info */}
          <div className="text-xs text-gray-500 space-y-1 overflow-x-hidden">
            <p>Rigid Body ID: {entity.getRigidBodyId() || 'None'}</p>
            <p>Collider ID: {entity.getColliderId() || 'None'}</p>
          </div>
        </>
      )}
    </div>
  );
} 