import React from "react";
import { Cylinder } from "@/models/primitives/cylinder";
import { useEntityState } from "@/hooks/use-entity-state";
import { DragInput } from "@/components/ui/drag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CylinderPropertiesProps {
  entity: Cylinder;
}

export function CylinderProperties({ entity }: CylinderPropertiesProps) {
  useEntityState(entity);

  const handleDimensionChange = (field: 'radiusTop' | 'radiusBottom' | 'height', value: number) => {
    if (field === 'radiusTop') {
      entity.setDimensions(value, entity.radiusBottom, entity.dimensions.height);
    } else if (field === 'radiusBottom') {
      entity.setDimensions(entity.radiusTop, value, entity.dimensions.height);
    } else {
      entity.setDimensions(entity.radiusTop, entity.radiusBottom, value);
    }
  };

  const handleSegmentChange = (field: 'radial' | 'height', value: number) => {
    const intValue = Math.max(1, Math.round(value));
    if (field === 'radial') {
      entity.setSegments(intValue, entity.segmentConfig.height);
    } else {
      entity.setSegments(entity.segmentConfig.radial, intValue);
    }
  };

  const handleAngularChange = (field: 'thetaStart' | 'thetaLength', value: number) => {
    if (field === 'thetaStart') {
      entity.setAngularConfig(value, entity.segmentConfig.thetaLength);
    } else {
      entity.setAngularConfig(entity.segmentConfig.thetaStart, value);
    }
  };

  const handleOpenEndedChange = (checked: boolean) => {
    entity.setOpenEnded(checked);
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
        Cylinder Properties
      </h3>
      
      {/* Dimensions */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Dimensions</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label htmlFor="cylinder-radius-top" className="text-xs text-gray-400">Top Radius</Label>
                         <DragInput
               value={entity.radiusTop}
               onChange={(value) => handleDimensionChange('radiusTop', value)}
               min={0.01}
               step={0.1}
               className="text-xs"
             />
           </div>
           <div>
             <Label htmlFor="cylinder-radius-bottom" className="text-xs text-gray-400">Bottom Radius</Label>
             <DragInput
               value={entity.radiusBottom}
               onChange={(value) => handleDimensionChange('radiusBottom', value)}
               min={0.01}
               step={0.1}
               className="text-xs"
             />
           </div>
           <div>
             <Label htmlFor="cylinder-height" className="text-xs text-gray-400">Height</Label>
             <DragInput
               value={entity.dimensions.height}
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
            <Label htmlFor="cylinder-radial-segments" className="text-xs text-gray-400">Radial</Label>
                         <DragInput
               value={entity.segmentConfig.radial}
               onChange={(value) => handleSegmentChange('radial', value)}
               min={3}
               max={64}
               step={1}
               className="text-xs"
             />
           </div>
           <div>
             <Label htmlFor="cylinder-height-segments" className="text-xs text-gray-400">Height</Label>
             <DragInput
               value={entity.segmentConfig.height}
               onChange={(value) => handleSegmentChange('height', value)}
               min={1}
               step={1}
               className="text-xs"
             />
           </div>
         </div>
       </div>

       {/* Angular Configuration */}
       <div className="space-y-3">
         <h4 className="text-xs text-gray-300 font-medium">Angular Configuration</h4>
         <div className="grid grid-cols-2 gap-2">
           <div>
             <Label htmlFor="cylinder-theta-start" className="text-xs text-gray-400">Theta Start</Label>
             <DragInput
               value={entity.segmentConfig.thetaStart}
               onChange={(value) => handleAngularChange('thetaStart', value)}
               min={0}
               max={Math.PI * 2}
               step={0.1}
               className="text-xs"
             />
           </div>
           <div>
             <Label htmlFor="cylinder-theta-length" className="text-xs text-gray-400">Theta Length</Label>
             <DragInput
               value={entity.segmentConfig.thetaLength}
               onChange={(value) => handleAngularChange('thetaLength', value)}
               min={0.1}
               max={Math.PI * 2}
               step={0.1}
               className="text-xs"
             />
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Options</h4>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="cylinder-open-ended"
            checked={entity.segmentConfig.openEnded}
            onCheckedChange={handleOpenEndedChange}
          />
          <Label htmlFor="cylinder-open-ended" className="text-xs text-gray-400">Open Ended</Label>
        </div>
      </div>

      {/* Shadow Settings */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Shadows</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cylinder-cast-shadow"
              checked={entity.getMesh().castShadow}
              onCheckedChange={(checked) => handleShadowChange('cast', checked)}
            />
            <Label htmlFor="cylinder-cast-shadow" className="text-xs text-gray-400">Cast Shadow</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cylinder-receive-shadow"
              checked={entity.getMesh().receiveShadow}
              onCheckedChange={(checked) => handleShadowChange('receive', checked)}
            />
            <Label htmlFor="cylinder-receive-shadow" className="text-xs text-gray-400">Receive Shadow</Label>
          </div>
        </div>
      </div>
    </div>
  );
} 