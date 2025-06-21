import React from "react";
import { Entity } from "@/models";
import { Box } from "@/models/primitives/box";
import { Sphere } from "@/models/primitives/sphere";
import { BoxProperties } from "./box-properties";
import { SphereProperties } from "./sphere-properties";
import { MaterialsSection } from "./materials-section";

interface EntityPropertiesRegistryProps {
  entity: Entity;
  onUpdate: () => void;
}

export function EntityPropertiesRegistry({ entity, onUpdate }: EntityPropertiesRegistryProps) {
  const renderEntitySpecificProperties = () => {
    if (entity instanceof Box) {
      return <BoxProperties entity={entity} onUpdate={onUpdate} />;
    }
    
    if (entity instanceof Sphere) {
      return <SphereProperties entity={entity} onUpdate={onUpdate} />;
    }

    // For entities without specific property components, show a generic message
    const entityType = entity.metadata.type;
    
    return (
      <div className="space-y-3">
        <h3 className="text-lime-300 text-sm font-medium border-b border-white/10 pb-1">
          {entityType.charAt(0).toUpperCase() + entityType.slice(1)} Properties
        </h3>
        <div className="space-y-2">
          <p className="text-xs text-gray-400">
            No specific properties available for {entityType} entities yet.
          </p>
          <p className="text-xs text-gray-500">
            Property components can be added for this entity type in the future.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderEntitySpecificProperties()}
      <MaterialsSection entity={entity} />
    </div>
  );

} 