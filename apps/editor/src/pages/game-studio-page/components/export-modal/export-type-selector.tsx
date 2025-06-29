import React from 'react';
import { FileJson, Box, FileText } from 'lucide-react';
import { cn } from '@/utils/tailwind';
import { ExportType, ExportTypeInfo } from './types';

const exportTypes: ExportTypeInfo[] = [
  {
    id: 'gamejs',
    title: 'GameJS Scene',
    description: 'Full scene with physics, scripts, and materials',
    icon: FileJson,
    fileExtension: '.json',
  },
  {
    id: 'threejs',
    title: 'Three.js Scene',
    description: 'Standard Three.js scene format',
    icon: FileText,
    fileExtension: '.json',
  },
  {
    id: 'glb',
    title: 'GLB Binary',
    description: '3D model in binary glTF format',
    icon: Box,
    fileExtension: '.glb',
  },
];

interface ExportTypeSelectorProps {
  selectedType: ExportType;
  onTypeChange: (type: ExportType) => void;
}

export function ExportTypeSelector({ selectedType, onTypeChange }: ExportTypeSelectorProps) {
  return (
    <div className="p-4 space-y-2">
      {exportTypes.map((type) => {
        const Icon = type.icon;
        const isSelected = selectedType === type.id;

        return (
          <button
            key={type.id}
            onClick={() => onTypeChange(type.id)}
            className={cn(
              'w-full text-left p-3 rounded-lg transition-colors',
              'hover:bg-accent/50',
              isSelected && 'bg-accent text-accent-foreground'
            )}
          >
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{type.title}</div>
                <div className="text-sm text-muted-foreground">{type.description}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
} 