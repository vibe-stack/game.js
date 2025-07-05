import React from "react";
import { Plane } from "@/models/primitives/plane";
import { DragInput } from "@/components/ui/drag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useEntityState } from "@/hooks/use-entity-state";

interface PlanePropertiesProps {
  entity: Plane;
}

export function PlaneProperties({ entity }: PlanePropertiesProps) {
  useEntityState(entity);
  const handleDimensionChange = (field: 'width' | 'height', value: number) => {
    if (field === 'width') {
      entity.setDimensions(value, entity.height);
    } else {
      entity.setDimensions(entity.width, value);
    }
  };

  const handleSegmentChange = (field: 'width' | 'height', value: number) => {
    const intValue = Math.max(1, Math.round(value));
    if (field === 'width') {
      entity.setSegments(intValue, entity.heightSegments);
    } else {
      entity.setSegments(entity.widthSegments, intValue);
    }
  };

  const handleShadowChange = (field: 'cast' | 'receive', checked: string | boolean) => {
    const boolValue = typeof checked === 'boolean' ? checked : checked === 'true';
    if (field === 'cast') {
      entity.setShadowSettings(boolValue, entity.getMesh().receiveShadow);
    } else {
      entity.setShadowSettings(entity.getMesh().castShadow, boolValue);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lime-300 text-sm font-medium border-b border-white/10 pb-1">
        Plane Properties
      </h3>
      
      {/* Dimensions */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Dimensions</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="plane-width" className="text-xs text-gray-400">Width</Label>
                         <DragInput
               value={entity.width}
               onChange={(value) => handleDimensionChange('width', value)}
               min={0.01}
               step={0.1}
               className="text-xs"
             />
           </div>
           <div>
             <Label htmlFor="plane-height" className="text-xs text-gray-400">Height</Label>
             <DragInput
               value={entity.height}
               onChange={(value) => handleDimensionChange('height', value)}
               min={0.01}
               step={0.1}
               className="text-xs"
             />
           </div>
         </div>
       </div>

       {/* Segments */}
       <div className="space-y-3">
         <h4 className="text-xs text-gray-300 font-medium">Segments</h4>
         <div className="grid grid-cols-2 gap-2">
           <div>
             <Label htmlFor="plane-width-segments" className="text-xs text-gray-400">Width Segments</Label>
             <DragInput
               value={entity.widthSegments}
               onChange={(value) => handleSegmentChange('width', value)}
               min={1}
               max={200}
               step={1}
               className="text-xs"
             />
           </div>
           <div>
             <Label htmlFor="plane-height-segments" className="text-xs text-gray-400">Height Segments</Label>
             <DragInput
              value={entity.heightSegments}
               onChange={(value) => handleSegmentChange('height', value)}
               min={1}
               max={200}
               step={1}
               className="text-xs"
             />
          </div>
        </div>
      </div>

      {/* Shadow Settings */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Shadows</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="plane-cast-shadow"
              checked={entity.getMesh()?.castShadow ?? false}
              onCheckedChange={(checked) => handleShadowChange('cast', checked as boolean)}
            />
            <Label htmlFor="plane-cast-shadow" className="text-xs text-gray-400">Cast Shadow</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="plane-receive-shadow"
              checked={entity.getMesh()?.receiveShadow ?? false}
              onCheckedChange={(checked) => handleShadowChange('receive', checked as boolean)}
            />
            <Label htmlFor="plane-receive-shadow" className="text-xs text-gray-400">Receive Shadow</Label>
          </div>
        </div>
      </div>
    </div>
  );
} 