import React from 'react';
import { Input } from '@/components/ui/input';
import { SceneObject } from '../../../types';

interface ObjectInfoSectionProps {
  object: SceneObject;
  onNameChange: (name: string) => void;
  onIdChange: (id: string) => void;
}

export function ObjectInfoSection({ object, onNameChange, onIdChange }: ObjectInfoSectionProps) {
  return (
    <div className="space-y-4">
      {/* Object Identity */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wide">Object</h3>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Name</label>
            <Input
              value={object.name}
              onChange={(e) => onNameChange(e.target.value)}
              className="h-8 text-xs bg-gray-800/30 border-gray-700/50 text-gray-300"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">ID</label>
            <Input
              value={object.id}
              onChange={(e) => onIdChange(e.target.value)}
              className="h-8 text-xs bg-gray-800/30 border-gray-700/50 text-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Object Info */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wide">Info</h3>
        <div className="text-xs text-gray-400 space-y-1">
          <div>Type: <span className="text-gray-300">{object.type}</span></div>
          <div>Visible: <span className="text-gray-300">{object.visible ? 'Yes' : 'No'}</span></div>
          {object.children && (
            <div>Children: <span className="text-gray-300">{object.children.length}</span></div>
          )}
        </div>
      </div>
    </div>
  );
} 