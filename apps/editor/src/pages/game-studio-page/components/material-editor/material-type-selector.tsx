import React from "react";

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
  return (
    <div className="space-y-2">
      {materialTypes.map(type => (
        <label
          key={type.value}
          className={`flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors ${
            selectedType === type.value
              ? 'bg-blue-600/20 border border-blue-500'
              : 'hover:bg-gray-700/50 border border-transparent'
          }`}
        >
          <input
            type="radio"
            name="materialType"
            value={type.value}
            checked={selectedType === type.value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-white">{type.label}</div>
            <div className="text-xs text-gray-400 mt-1">{type.description}</div>
          </div>
        </label>
      ))}
    </div>
  );
} 