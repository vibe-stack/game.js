import React from "react";
import { MaterialDefinition } from "@/types/project";
import { BasicMaterialProperties } from "./properties/basic-material-properties";
import { StandardMaterialProperties } from "./properties/standard-material-properties";
import { PhysicalMaterialProperties } from "./properties/physical-material-properties";
import { LambertMaterialProperties } from "./properties/lambert-material-properties";
import { PhongMaterialProperties } from "./properties/phong-material-properties";
import { ToonMaterialProperties } from "./properties/toon-material-properties";
import { MaterialTypeSelector } from "./material-type-selector";

interface MaterialPropertiesProps {
  material: MaterialDefinition;
  onChange: (material: MaterialDefinition) => void;
}

export function MaterialProperties({ material, onChange }: MaterialPropertiesProps) {
  const handleTypeChange = (newType: string) => {
    const updatedMaterial: MaterialDefinition = {
      ...material,
      type: newType as any,
      properties: {
        ...material.properties,
        type: newType
      }
    };
    onChange(updatedMaterial);
  };

  const handlePropertiesChange = (newProperties: any) => {
    const updatedMaterial: MaterialDefinition = {
      ...material,
      properties: {
        ...material.properties,
        ...newProperties
      }
    };
    onChange(updatedMaterial);
  };

  const renderMaterialProperties = () => {
    switch (material.type) {
      case 'basic':
        return (
          <BasicMaterialProperties
            properties={material.properties}
            onChange={handlePropertiesChange}
          />
        );
      case 'lambert':
        return (
          <LambertMaterialProperties
            properties={material.properties}
            onChange={handlePropertiesChange}
          />
        );
      case 'phong':
        return (
          <PhongMaterialProperties
            properties={material.properties}
            onChange={handlePropertiesChange}
          />
        );
      case 'standard':
        return (
          <StandardMaterialProperties
            properties={material.properties}
            onChange={handlePropertiesChange}
          />
        );
      case 'physical':
        return (
          <PhysicalMaterialProperties
            properties={material.properties}
            onChange={handlePropertiesChange}
          />
        );
      case 'toon':
        return (
          <ToonMaterialProperties
            properties={material.properties}
            onChange={handlePropertiesChange}
          />
        );
      default:
        return (
          <div className="p-4 text-center text-gray-400">
            Unsupported material type: {material.type}
          </div>
        );
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Material Type</h3>
        <MaterialTypeSelector
          selectedType={material.type}
          onChange={handleTypeChange}
        />
      </div>

      {renderMaterialProperties()}
    </div>
  );
} 