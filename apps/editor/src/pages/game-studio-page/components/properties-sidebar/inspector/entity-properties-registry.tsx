import React from "react";
import { Entity } from "@/models";
import { Box } from "@/models/primitives/box";
import { Sphere } from "@/models/primitives/sphere";
import { Cone } from "@/models/primitives/cone";
import { Cylinder } from "@/models/primitives/cylinder";
import { Plane } from "@/models/primitives/plane";
import { Capsule } from "@/models/primitives/capsule";
import { Torus } from "@/models/primitives/torus";
import { Ring } from "@/models/primitives/ring";
import { Light } from "@/models/primitives/light";
import { Heightfield } from "@/models/primitives/heightfield";
import { Mesh3D } from "@/models/primitives/mesh-3d";
import { BoxProperties } from "./box-properties";
import { SphereProperties } from "./sphere-properties";
import { ConeProperties } from "./cone-properties";
import { CylinderProperties } from "./cylinder-properties";
import { PlaneProperties } from "./plane-properties";
import { CapsuleProperties } from "./capsule-properties";
import { TorusProperties } from "./torus-properties";
import { RingProperties } from "./ring-properties";
import { LightProperties } from "./light-properties";
import { HeightfieldProperties } from "./heightfield-properties";
import { Mesh3DProperties } from "./mesh-3d-properties";
import { PhysicsProperties } from "./physics-properties";
import { MaterialsSection } from "./materials-section";
import { CharacterControllerSection } from "./character-controller-section";

interface EntityPropertiesRegistryProps {
  entity: Entity;
}

export function EntityPropertiesRegistry({ entity }: EntityPropertiesRegistryProps) {
  const renderEntitySpecificProperties = () => {
    if (entity instanceof Box) {
      return <BoxProperties entity={entity} />;
    }
    
    if (entity instanceof Sphere) {
      return <SphereProperties entity={entity} />;
    }

    if (entity instanceof Cone) {
      return <ConeProperties entity={entity} />;
    }

    if (entity instanceof Cylinder) {
      return <CylinderProperties entity={entity} />;
    }

    if (entity instanceof Plane) {
      return <PlaneProperties entity={entity} />;
    }

    if (entity instanceof Capsule) {
      return <CapsuleProperties entity={entity} />;
    }

    if (entity instanceof Torus) {
      return <TorusProperties entity={entity} />;
    }

    if (entity instanceof Ring) {
      return <RingProperties entity={entity} />;
    }

    if (entity instanceof Light) {
      return <LightProperties entity={entity} />;
    }

    if (entity instanceof Heightfield) {
      return <HeightfieldProperties entity={entity} />;
    }

    if (entity instanceof Mesh3D) {
      return <Mesh3DProperties entity={entity} />;
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
      
      {/* Character Controller Section */}
      <CharacterControllerSection entity={entity} />
      
      <PhysicsProperties entity={entity} />
      <MaterialsSection entity={entity} />
    </div>
  );
} 