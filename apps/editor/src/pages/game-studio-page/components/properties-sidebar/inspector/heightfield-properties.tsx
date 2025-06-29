import React from "react";
import { Heightfield } from "@/models/primitives/heightfield";
import { DragInput } from "@/components/ui/drag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useEntityState } from "@/hooks/use-entity-state";

interface HeightfieldPropertiesProps {
  entity: Heightfield;
}

export function HeightfieldProperties({ entity }: HeightfieldPropertiesProps) {
  useEntityState(entity);

  const handleDimensionChange = (
    field: "width" | "depth" | "rows" | "columns",
    value: number,
  ) => {
    const intValue = ["rows", "columns"].includes(field)
      ? Math.max(3, Math.round(value))
      : value;

    if (field === "width") {
      entity.setDimensions(
        intValue,
        entity.dimensions.depth,
        entity.dimensions.rows,
        entity.dimensions.columns,
      );
    } else if (field === "depth") {
      entity.setDimensions(
        entity.dimensions.width,
        intValue,
        entity.dimensions.rows,
        entity.dimensions.columns,
      );
    } else if (field === "rows") {
      entity.setDimensions(
        entity.dimensions.width,
        entity.dimensions.depth,
        intValue,
        entity.dimensions.columns,
      );
    } else if (field === "columns") {
      entity.setDimensions(
        entity.dimensions.width,
        entity.dimensions.depth,
        entity.dimensions.rows,
        intValue,
      );
    }
  };

  const handleElevationChange = (field: "min" | "max", value: number) => {
    if (field === "min") {
      entity.setElevationRange(value, entity.elevationRange.max);
    } else {
      entity.setElevationRange(entity.elevationRange.min, value);
    }
  };

  const handleAlgorithmChange = (algorithm: string) => {
    entity.setAlgorithm(algorithm as any);
  };

  const handleSeedChange = (seed: number) => {
    entity.setSeed(Math.round(seed));
  };

  const handleNoiseSettingChange = (
    field: keyof typeof entity.noiseSettings,
    value: number,
  ) => {
    entity.setNoiseSettings({ [field]: value });
  };

  const handleDisplacementScaleChange = (scale: number) => {
    entity.setDisplacementScale(scale);
  };

  const handleUVScaleChange = (axis: "x" | "y", value: number) => {
    if (axis === "x") {
      entity.setUVScale(value, entity.uvScale.y);
    } else {
      entity.setUVScale(entity.uvScale.x, value);
    }
  };

  const handleShadowChange = (field: "cast" | "receive", checked: boolean) => {
    if (field === "cast") {
      entity.setShadowSettings(checked, entity.getMesh().receiveShadow);
    } else {
      entity.setShadowSettings(entity.getMesh().castShadow, checked);
    }
  };

  const handleRegenerate = () => {
    entity.regenerateHeightfield();
  };

  const renderNoiseSettings = () => {
    const needsFrequency = !["flat", "random"].includes(entity.algorithm);
    const needsOctaves = ["perlin", "simplex", "fbm"].includes(
      entity.algorithm,
    );
    const needsRidgeOffset = entity.algorithm === "ridged";
    const needsVoronoi = entity.algorithm === "voronoi";

    return (
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-gray-300">Noise Settings</h4>

        {needsFrequency && (
          <div>
            <Label className="text-xs text-gray-400">Frequency</Label>
            <DragInput
              value={entity.noiseSettings.frequency}
              onChange={(value) => handleNoiseSettingChange("frequency", value)}
              min={0.001}
              max={1}
              step={0.001}
              className="text-xs"
            />
          </div>
        )}

        <div>
          <Label className="text-xs text-gray-400">Amplitude</Label>
          <DragInput
            value={entity.noiseSettings.amplitude}
            onChange={(value) => handleNoiseSettingChange("amplitude", value)}
            min={0.1}
            max={5}
            step={0.1}
            className="text-xs"
          />
        </div>

        {needsOctaves && (
          <>
            <div>
              <Label className="text-xs text-gray-400">Octaves</Label>
              <DragInput
                value={entity.noiseSettings.octaves}
                onChange={(value) =>
                  handleNoiseSettingChange("octaves", Math.round(value))
                }
                min={1}
                max={8}
                step={1}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Persistence</Label>
              <DragInput
                value={entity.noiseSettings.persistence}
                onChange={(value) =>
                  handleNoiseSettingChange("persistence", value)
                }
                min={0.1}
                max={1}
                step={0.01}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Lacunarity</Label>
              <DragInput
                value={entity.noiseSettings.lacunarity}
                onChange={(value) =>
                  handleNoiseSettingChange("lacunarity", value)
                }
                min={1}
                max={4}
                step={0.1}
                className="text-xs"
              />
            </div>
          </>
        )}

        {needsRidgeOffset && entity.noiseSettings.ridgeOffset !== undefined && (
          <div>
            <Label className="text-xs text-gray-400">Ridge Offset</Label>
            <DragInput
              value={entity.noiseSettings.ridgeOffset}
              onChange={(value) =>
                handleNoiseSettingChange("ridgeOffset", value)
              }
              min={0}
              max={2}
              step={0.01}
              className="text-xs"
            />
          </div>
        )}

        {needsVoronoi && (
          <>
            {entity.noiseSettings.voronoiPoints !== undefined && (
              <div>
                <Label className="text-xs text-gray-400">Voronoi Points</Label>
                <DragInput
                  value={entity.noiseSettings.voronoiPoints}
                  onChange={(value) =>
                    handleNoiseSettingChange("voronoiPoints", Math.round(value))
                  }
                  min={3}
                  max={50}
                  step={1}
                  className="text-xs"
                />
              </div>
            )}
            {entity.noiseSettings.voronoiRandomness !== undefined && (
              <div>
                <Label className="text-xs text-gray-400">
                  Voronoi Randomness
                </Label>
                <DragInput
                  value={entity.noiseSettings.voronoiRandomness}
                  onChange={(value) =>
                    handleNoiseSettingChange("voronoiRandomness", value)
                  }
                  min={0}
                  max={1}
                  step={0.01}
                  className="text-xs"
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="border-b border-white/10 pb-1 text-sm font-medium text-green-300">
        Heightfield Properties
      </h3>

      {/* Dimensions */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-gray-300">Dimensions</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-gray-400">Width</Label>
            <DragInput
              value={entity.dimensions.width}
              onChange={(value) => handleDimensionChange("width", value)}
              min={1}
              max={1000}
              step={1}
              className="text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-400">Depth</Label>
            <DragInput
              value={entity.dimensions.depth}
              onChange={(value) => handleDimensionChange("depth", value)}
              min={1}
              max={1000}
              step={1}
              className="text-xs"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-gray-400">Rows</Label>
            <DragInput
              value={entity.dimensions.rows}
              onChange={(value) => handleDimensionChange("rows", value)}
              min={3}
              max={512}
              step={1}
              className="text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-400">Columns</Label>
            <DragInput
              value={entity.dimensions.columns}
              onChange={(value) => handleDimensionChange("columns", value)}
              min={3}
              max={512}
              step={1}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Elevation Range */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-gray-300">Elevation Range</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-gray-400">Min</Label>
            <DragInput
              value={entity.elevationRange.min}
              onChange={(value) => handleElevationChange("min", value)}
              min={-100}
              max={entity.elevationRange.max - 0.1}
              step={0.1}
              className="text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-400">Max</Label>
            <DragInput
              value={entity.elevationRange.max}
              onChange={(value) => handleElevationChange("max", value)}
              min={entity.elevationRange.min + 0.1}
              max={100}
              step={0.1}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Algorithm */}
      <div className="space-y-2">
        <Label className="text-xs text-gray-400">Generation Algorithm</Label>
        <Select value={entity.algorithm} onValueChange={handleAlgorithmChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="perlin">Perlin Noise</SelectItem>
            <SelectItem value="simplex">Simplex Noise</SelectItem>
            <SelectItem value="ridged">Ridged Noise</SelectItem>
            <SelectItem value="fbm">Fractal Brownian Motion</SelectItem>
            <SelectItem value="voronoi">Voronoi</SelectItem>
            <SelectItem value="diamond-square">Diamond Square</SelectItem>
            <SelectItem value="random">Random</SelectItem>
            <SelectItem value="flat">Flat</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Seed */}
      <div>
        <Label className="text-xs text-gray-400">Seed</Label>
        <DragInput
          value={entity.seed}
          onChange={handleSeedChange}
          min={0}
          max={1000000}
          step={1}
          className="text-xs"
        />
      </div>

      {/* Noise Settings */}
      {renderNoiseSettings()}

      {/* Displacement Scale */}
      <div>
        <Label className="text-xs text-gray-400">Displacement Scale</Label>
        <DragInput
          value={entity.displacementScale}
          onChange={handleDisplacementScaleChange}
          min={0.1}
          max={10}
          step={0.1}
          className="text-xs"
        />
      </div>

      {/* UV Scale */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-gray-300">UV Scale</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-gray-400">X</Label>
            <DragInput
              value={entity.uvScale.x}
              onChange={(value) => handleUVScaleChange("x", value)}
              min={0.1}
              max={10}
              step={0.1}
              className="text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-400">Y</Label>
            <DragInput
              value={entity.uvScale.y}
              onChange={(value) => handleUVScaleChange("y", value)}
              min={0.1}
              max={10}
              step={0.1}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Shadow Settings */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-gray-300">Shadows</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={entity.getMesh().castShadow}
              onCheckedChange={(checked) =>
                handleShadowChange("cast", checked as boolean)
              }
            />
            <Label className="text-xs text-gray-400">Cast Shadow</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={entity.getMesh().receiveShadow}
              onCheckedChange={(checked) =>
                handleShadowChange("receive", checked as boolean)
              }
            />
            <Label className="text-xs text-gray-400">Receive Shadow</Label>
          </div>
        </div>
      </div>

      {/* Regenerate Button */}
      <div className="pt-2">
        <Button
          onClick={handleRegenerate}
          variant="outline"
          size="sm"
          className="w-full text-xs"
        >
          Regenerate Terrain
        </Button>
      </div>
    </div>
  );
}
