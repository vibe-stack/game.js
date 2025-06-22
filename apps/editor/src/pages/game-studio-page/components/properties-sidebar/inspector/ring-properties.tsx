import React from "react";
import { Ring } from "@/models/primitives/ring";
import { DragInput } from "@/components/ui/drag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useEntityState } from "@/hooks/use-entity-state";

interface RingPropertiesProps {
  entity: Ring;
}

export function RingProperties({ entity }: RingPropertiesProps) {
  useEntityState(entity);
  const handleDimensionChange = (field: 'inner' | 'outer', value: number) => {
    if (field === 'inner') {
      entity.setDimensions(value, entity.outerRadius);
    } else {
      entity.setDimensions(entity.innerRadius, value);
    }
  };

  const handleSegmentChange = (field: 'theta' | 'phi', value: number) => {
    const intValue = Math.max(1, Math.round(value));
    if (field === 'theta') {
      entity.setSegments(intValue, entity.segmentConfig.phi);
    } else {
      entity.setSegments(entity.segmentConfig.theta, intValue);
    }
  };

  const handleAngularChange = (field: 'thetaStart' | 'thetaLength', value: number) => {
    if (field === 'thetaStart') {
      entity.setAngularConfig(value, entity.segmentConfig.thetaLength);
    } else {
      entity.setAngularConfig(entity.segmentConfig.thetaStart, value);
    }
  };

  const handleShadowChange = (field: 'cast' | 'receive', checked: boolean) => {
    if (field === 'cast') {
      entity.setShadowSettings(checked, entity.getMesh().receiveShadow);
    } else {
      entity.setShadowSettings(entity.getMesh().castShadow, checked);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lime-300 text-sm font-medium border-b border-white/10 pb-1">
        Ring Properties
      </h3>
      
      {/* Dimensions */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Dimensions</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="ring-inner-radius" className="text-xs text-gray-400">Inner Radius</Label>
            <DragInput
              id="ring-inner-radius"
              value={entity.innerRadius}
              onChange={(value) => handleDimensionChange('inner', value)}
              min={0}
              step={0.1}
              className="text-xs"
            />
          </div>
          <div>
            <Label htmlFor="ring-outer-radius" className="text-xs text-gray-400">Outer Radius</Label>
            <DragInput
              id="ring-outer-radius"
              value={entity.outerRadius}
              onChange={(value) => handleDimensionChange('outer', value)}
              min={0.01}
              step={0.1}
              className="text-xs"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-gray-500">
              Thickness: {entity.thickness.toFixed(2)}
            </Label>
          </div>
          <div>
            <Label className="text-xs text-gray-500">
              Center: {entity.centerRadius.toFixed(2)}
            </Label>
          </div>
        </div>
      </div>

      {/* Segments */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Segments</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="ring-theta-segments" className="text-xs text-gray-400">Theta Segments</Label>
            <DragInput
              id="ring-theta-segments"
              value={entity.segmentConfig.theta}
              onChange={(value) => handleSegmentChange('theta', value)}
              min={3}
              max={128}
              step={1}
              className="text-xs"
            />
          </div>
          <div>
            <Label htmlFor="ring-phi-segments" className="text-xs text-gray-400">Phi Segments</Label>
            <DragInput
              id="ring-phi-segments"
              value={entity.segmentConfig.phi}
              onChange={(value) => handleSegmentChange('phi', value)}
              min={1}
              max={64}
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
            <Label htmlFor="ring-theta-start" className="text-xs text-gray-400">Theta Start</Label>
            <DragInput
              id="ring-theta-start"
              value={entity.segmentConfig.thetaStart}
              onChange={(value) => handleAngularChange('thetaStart', value)}
              min={0}
              max={Math.PI * 2}
              step={0.1}
              className="text-xs"
            />
          </div>
          <div>
            <Label htmlFor="ring-theta-length" className="text-xs text-gray-400">Theta Length</Label>
            <DragInput
              id="ring-theta-length"
              value={entity.segmentConfig.thetaLength}
              onChange={(value) => handleAngularChange('thetaLength', value)}
              min={0.1}
              max={Math.PI * 2}
              step={0.1}
              className="text-xs"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-gray-500">
            Arc: {(entity.segmentConfig.thetaLength * 180 / Math.PI).toFixed(1)}°
          </Label>
        </div>
      </div>

      {/* Shadow Settings */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Shadows</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="ring-cast-shadow"
              checked={entity.getMesh().castShadow}
              onCheckedChange={(checked) => handleShadowChange('cast', checked as boolean)}
            />
            <Label htmlFor="ring-cast-shadow" className="text-xs text-gray-400">Cast Shadow</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="ring-receive-shadow"
              checked={entity.getMesh().receiveShadow}
              onCheckedChange={(checked) => handleShadowChange('receive', checked as boolean)}
            />
            <Label htmlFor="ring-receive-shadow" className="text-xs text-gray-400">Receive Shadow</Label>
          </div>
        </div>
      </div>
    </div>
  );
} 