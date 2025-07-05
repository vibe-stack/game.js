import React from "react";
import { Cone } from "@/models/primitives/cone";
import { useEntityState } from "@/hooks/use-entity-state";
import { DragInput } from "@/components/ui/drag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ConePropertiesProps {
  entity: Cone;
}

export function ConeProperties({ entity }: ConePropertiesProps) {
  useEntityState(entity);

  const handleDimensionChange = (field: "radius" | "height", value: number) => {
    if (field === "radius") {
      entity.setDimensions(value, entity.height);
    } else {
      entity.setDimensions(entity.radius, value);
    }
  };

  const handleSegmentChange = (field: "radial" | "height", value: number) => {
    const intValue = Math.max(1, Math.round(value));
    if (field === "radial") {
      entity.setSegments(intValue, entity.heightSegments);
    } else {
      entity.setSegments(entity.radialSegments, intValue);
    }
  };

  const handleAngularChange = (
    field: "thetaStart" | "thetaLength",
    value: number,
  ) => {
    if (field === "thetaStart") {
      entity.setAngularConfig(value, entity.thetaLength);
    } else {
      entity.setAngularConfig(entity.thetaStart, value);
    }
  };

  const handleOpenEndedChange = (checked: boolean) => {
    entity.setOpenEnded(checked);
  };

  const handleShadowChange = (
    field: "cast" | "receive",
    checked: string | boolean,
  ) => {
    const boolValue =
      typeof checked === "boolean" ? checked : checked === "true";
    if (field === "cast") {
      entity.setShadowSettings(boolValue, entity.getMesh().receiveShadow);
    } else {
      entity.setShadowSettings(entity.getMesh().castShadow, boolValue);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="border-b border-white/10 pb-1 text-sm font-medium text-lime-300">
        Cone Properties
      </h3>

      {/* Dimensions */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-gray-300">Dimensions</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="cone-radius" className="text-xs text-gray-400">
              Radius
            </Label>
            <DragInput
              value={entity.radius}
              onChange={(value) => handleDimensionChange("radius", value)}
              min={0.01}
              step={0.1}
              className="text-xs"
            />
          </div>
          <div>
            <Label htmlFor="cone-height" className="text-xs text-gray-400">
              Height
            </Label>
            <DragInput
              value={entity.height}
              onChange={(value) => handleDimensionChange("height", value)}
              min={0.01}
              step={0.1}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Segments */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-gray-300">Segments</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label
              htmlFor="cone-radial-segments"
              className="text-xs text-gray-400"
            >
              Radial
            </Label>
            <DragInput
              value={entity.radialSegments}
              onChange={(value) => handleSegmentChange("radial", value)}
              min={3}
              max={64}
              step={1}
              className="text-xs"
            />
          </div>
          <div>
            <Label
              htmlFor="cone-height-segments"
              className="text-xs text-gray-400"
            >
              Height
            </Label>
            <DragInput
              value={entity.heightSegments}
              onChange={(value) => handleSegmentChange("height", value)}
              min={1}
              step={1}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Angular Configuration */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-gray-300">
          Angular Configuration
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="cone-theta-start" className="text-xs text-gray-400">
              Theta Start
            </Label>
            <DragInput
              value={entity.thetaStart}
              onChange={(value) => handleAngularChange("thetaStart", value)}
              min={0}
              max={Math.PI * 2}
              step={0.1}
              className="text-xs"
            />
          </div>
          <div>
            <Label
              htmlFor="cone-theta-length"
              className="text-xs text-gray-400"
            >
              Theta Length
            </Label>
            <DragInput
              value={entity.thetaLength}
              onChange={(value) => handleAngularChange("thetaLength", value)}
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
        <h4 className="text-xs font-medium text-gray-300">Options</h4>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="cone-open-ended"
            checked={entity.openEnded}
            onCheckedChange={handleOpenEndedChange}
          />
          <Label htmlFor="cone-open-ended" className="text-xs text-gray-400">
            Open Ended
          </Label>
        </div>
      </div>

      {/* Shadow Settings */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-gray-300">Shadows</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cone-cast-shadow"
              checked={entity.getMesh()?.castShadow ?? false}
              onCheckedChange={(checked) => handleShadowChange("cast", checked)}
            />
            <Label htmlFor="cone-cast-shadow" className="text-xs text-gray-400">
              Cast Shadow
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cone-receive-shadow"
              checked={entity.getMesh()?.receiveShadow ?? false}
              onCheckedChange={(checked) =>
                handleShadowChange("receive", checked)
              }
            />
            <Label
              htmlFor="cone-receive-shadow"
              className="text-xs text-gray-400"
            >
              Receive Shadow
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
