import React from "react";
import { Cone } from "@/models/primitives/cone";
import { DragInput } from "@/components/ui/drag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ConePropertiesProps {
  entity: Cone;
  onUpdate: () => void;
}

export function ConeProperties({ entity, onUpdate }: ConePropertiesProps) {
  const handleDimensionChange = (field: 'radius' | 'height', value: number) => {
    if (field === 'radius') {
      entity.setDimensions(value, entity.height);
    } else {
      entity.setDimensions(entity.radius, value);
    }
    onUpdate();
  };

  const handleSegmentChange = (field: 'radial' | 'height', value: number) => {
    const intValue = Math.max(1, Math.round(value));
    if (field === 'radial') {
      entity.setSegments(intValue, entity.segmentConfig.height);
    } else {
      entity.setSegments(entity.segmentConfig.radial, intValue);
    }
    onUpdate();
  };

  const handleAngularChange = (field: 'thetaStart' | 'thetaLength', value: number) => {
    if (field === 'thetaStart') {
      entity.setAngularConfig(value, entity.segmentConfig.thetaLength);
    } else {
      entity.setAngularConfig(entity.segmentConfig.thetaStart, value);
    }
    onUpdate();
  };

  const handleOpenEndedChange = (checked: boolean) => {
    entity.setOpenEnded(checked);
    onUpdate();
  };

  const handleShadowChange = (field: 'cast' | 'receive', checked: string | boolean) => {
    const boolValue = typeof checked === 'boolean' ? checked : checked === 'true';
    if (field === 'cast') {
      entity.setShadowSettings(boolValue, entity.getMesh().receiveShadow);
    } else {
      entity.setShadowSettings(entity.getMesh().castShadow, boolValue);
    }
    onUpdate();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lime-300 text-sm font-medium border-b border-white/10 pb-1">
        Cone Properties
      </h3>
      
      {/* Dimensions */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Dimensions</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="cone-radius" className="text-xs text-gray-400">Radius</Label>
                         <DragInput
               value={entity.radius}
               onChange={(value) => handleDimensionChange('radius', value)}
               min={0.01}
               step={0.1}
               className="text-xs"
             />
          </div>
          <div>
            <Label htmlFor="cone-height" className="text-xs text-gray-400">Height</Label>
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
            <Label htmlFor="cone-radial-segments" className="text-xs text-gray-400">Radial</Label>
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
             <Label htmlFor="cone-height-segments" className="text-xs text-gray-400">Height</Label>
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
             <Label htmlFor="cone-theta-start" className="text-xs text-gray-400">Theta Start</Label>
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
             <Label htmlFor="cone-theta-length" className="text-xs text-gray-400">Theta Length</Label>
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
            id="cone-open-ended"
            checked={entity.segmentConfig.openEnded}
            onCheckedChange={handleOpenEndedChange}
          />
          <Label htmlFor="cone-open-ended" className="text-xs text-gray-400">Open Ended</Label>
        </div>
      </div>

      {/* Shadow Settings */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Shadows</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cone-cast-shadow"
              checked={entity.getMesh().castShadow}
              onCheckedChange={(checked) => handleShadowChange('cast', checked)}
            />
            <Label htmlFor="cone-cast-shadow" className="text-xs text-gray-400">Cast Shadow</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cone-receive-shadow"
              checked={entity.getMesh().receiveShadow}
              onCheckedChange={(checked) => handleShadowChange('receive', checked)}
            />
            <Label htmlFor="cone-receive-shadow" className="text-xs text-gray-400">Receive Shadow</Label>
          </div>
        </div>
      </div>
    </div>
  );
} 