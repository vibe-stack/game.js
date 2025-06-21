import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const materialTypes = [
  { value: 'basic', label: 'Basic', description: 'Unlit material with basic properties' },
  { value: 'lambert', label: 'Lambert', description: 'Diffuse lighting only' },
  { value: 'phong', label: 'Phong', description: 'Diffuse and specular lighting' },
  { value: 'standard', label: 'Standard', description: 'PBR material with metallic/roughness workflow' },
  { value: 'physical', label: 'Physical', description: 'Advanced PBR with additional properties' },
  { value: 'toon', label: 'Toon', description: 'Cartoon-style shading' },
];

interface MaterialTypeSelectorProps {
  selectedType: string;
  onChange: (type: string) => void;
}

export function MaterialTypeSelector({ selectedType, onChange }: MaterialTypeSelectorProps) {
  const selectedMaterialType = materialTypes.find(type => type.value === selectedType);

  return (
    <div className="space-y-2">
      <Select value={selectedType} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {selectedMaterialType ? (
              <div className="flex flex-col items-start">
                <span className="font-medium">{selectedMaterialType.label}</span>
                <span className="text-xs text-gray-400">{selectedMaterialType.description}</span>
              </div>
            ) : (
              "Select material type..."
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {materialTypes.map(type => (
            <SelectItem key={type.value} value={type.value}>
              <div className="flex flex-col items-start">
                <span className="font-medium">{type.label}</span>
                <span className="text-xs text-gray-400">{type.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 