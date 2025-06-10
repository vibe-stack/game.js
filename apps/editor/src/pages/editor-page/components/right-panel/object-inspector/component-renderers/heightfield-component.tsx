import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import Vector2Controls from "../vector2-controls";
import useEditorStore from "@/stores/editor-store";

interface HeightfieldComponentProps {
  component: HeightfieldComponent;
  objectId: string;
}

export default function HeightfieldComponent({ component, objectId }: HeightfieldComponentProps) {
  const { updateHeightfieldComponent } = useEditorStore();
  const props = component.properties;

  const updateProperty = (key: keyof typeof props, value: any) => {
    updateHeightfieldComponent(objectId, component.id, { [key]: value });
  };

  const updateNoise = (key: keyof typeof props.noise, value: any) => {
    updateHeightfieldComponent(objectId, component.id, {
      noise: {
        ...props.noise,
        [key]: value,
      },
    });
  };

  const updateLOD = (key: keyof typeof props.lod, value: any) => {
    updateHeightfieldComponent(objectId, component.id, {
      lod: {
        ...props.lod,
        [key]: value,
      },
    });
  };

  const handleRegenerate = () => {
    updateHeightfieldComponent(objectId, component.id, { lastGenerated: new Date() });
  };

  const handleRandomSeed = () => {
    updateProperty('seed', Math.floor(Math.random() * 100000));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Dimensions</Label>
        <div className="space-y-2">
          <DragInput
            label="Width"
            value={props.width}
            onChange={(value) => updateProperty('width', value)}
            step={0.1}
            precision={2}
            min={0.1}
          />
          <DragInput
            label="Depth"
            value={props.depth}
            onChange={(value) => updateProperty('depth', value)}
            step={0.1}
            precision={2}
            min={0.1}
          />
          <DragInput
            label="Rows"
            value={props.rows}
            onChange={(value) => updateProperty('rows', Math.round(value))}
            step={1}
            precision={0}
            min={2}
            max={512}
          />
          <DragInput
            label="Columns"
            value={props.columns}
            onChange={(value) => updateProperty('columns', Math.round(value))}
            step={1}
            precision={0}
            min={2}
            max={512}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Elevation</Label>
        <div className="space-y-2">
          <DragInput
            label="Min Elevation"
            value={props.minElevation}
            onChange={(value) => updateProperty('minElevation', value)}
            step={0.1}
            precision={2}
          />
          <DragInput
            label="Max Elevation"
            value={props.maxElevation}
            onChange={(value) => updateProperty('maxElevation', value)}
            step={0.1}
            precision={2}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Generation</Label>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Algorithm</Label>
            <Select
              value={props.algorithm}
              onValueChange={(value: HeightfieldGenerationAlgorithm) => updateProperty('algorithm', value)}
            >
              <SelectTrigger className="w-full h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="perlin">Perlin Noise</SelectItem>
                <SelectItem value="simplex">Simplex Noise</SelectItem>
                <SelectItem value="ridged">Ridged Noise</SelectItem>
                <SelectItem value="fbm">Fractal Brownian Motion</SelectItem>
                <SelectItem value="voronoi">Voronoi</SelectItem>
                <SelectItem value="diamond-square">Diamond-Square</SelectItem>
                <SelectItem value="random">Random</SelectItem>
                <SelectItem value="flat">Flat</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <DragInput
              label="Seed"
              value={props.seed}
              onChange={(value) => updateProperty('seed', Math.round(value))}
              step={1}
              precision={0}
              min={0}
              max={999999}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRandomSeed}
              className="h-7 px-2"
              title="Random seed"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="autoRegenerate"
              checked={props.autoRegenerate}
              onCheckedChange={(value) => updateProperty('autoRegenerate', value)}
            />
            <Label htmlFor="autoRegenerate" className="text-xs">Auto Regenerate</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              className="h-6 px-2 ml-auto"
            >
              Generate
            </Button>
          </div>
        </div>
      </div>

      {props.algorithm !== 'flat' && props.algorithm !== 'custom' && (
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Noise Parameters</Label>
          <div className="space-y-2">
            <DragInput
              label="Frequency"
              value={props.noise.frequency}
              onChange={(value) => updateNoise('frequency', value)}
              step={0.01}
              precision={3}
              min={0.001}
              max={1}
            />
            <DragInput
              label="Amplitude"
              value={props.noise.amplitude}
              onChange={(value) => updateNoise('amplitude', value)}
              step={0.1}
              precision={2}
              min={0.1}
              max={10}
            />
            <DragInput
              label="Octaves"
              value={props.noise.octaves}
              onChange={(value) => updateNoise('octaves', Math.round(value))}
              step={1}
              precision={0}
              min={1}
              max={8}
            />
            <DragInput
              label="Persistence"
              value={props.noise.persistence}
              onChange={(value) => updateNoise('persistence', value)}
              step={0.01}
              precision={2}
              min={0.01}
              max={1}
            />
            <DragInput
              label="Lacunarity"
              value={props.noise.lacunarity}
              onChange={(value) => updateNoise('lacunarity', value)}
              step={0.1}
              precision={2}
              min={1}
              max={5}
            />

            {props.algorithm === 'ridged' && (
              <DragInput
                label="Ridge Offset"
                value={props.noise.ridgeOffset || 1.0}
                onChange={(value) => updateNoise('ridgeOffset', value)}
                step={0.1}
                precision={2}
                min={0.1}
                max={2}
              />
            )}

            {props.algorithm === 'voronoi' && (
              <>
                <DragInput
                  label="Voronoi Points"
                  value={props.noise.voronoiPoints || 16}
                  onChange={(value) => updateNoise('voronoiPoints', Math.round(value))}
                  step={1}
                  precision={0}
                  min={4}
                  max={64}
                />
                <DragInput
                  label="Randomness"
                  value={props.noise.voronoiRandomness || 1.0}
                  onChange={(value) => updateNoise('voronoiRandomness', value)}
                  step={0.01}
                  precision={2}
                  min={0}
                  max={1}
                />
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Visual Properties</Label>
        <div className="space-y-2">
          <DragInput
            label="Displacement Scale"
            value={props.displacementScale}
            onChange={(value) => updateProperty('displacementScale', value)}
            step={0.1}
            precision={2}
            min={0.1}
            max={5}
          />

          <Vector2Controls
            label="UV Scale"
            value={props.uvScale}
            onChange={(value: Vector2) => updateProperty('uvScale', value)}
            step={0.1}
            precision={2}
            min={0.1}
          />

          <div className="flex items-center space-x-2">
            <Switch
              id="smoothing"
              checked={props.smoothing}
              onCheckedChange={(value) => updateProperty('smoothing', value)}
            />
            <Label htmlFor="smoothing" className="text-xs">Smoothing</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="wireframe"
              checked={props.wireframe}
              onCheckedChange={(value) => updateProperty('wireframe', value)}
            />
            <Label htmlFor="wireframe" className="text-xs">Wireframe</Label>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Level of Detail</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="lodEnabled"
              checked={props.lod.enabled}
              onCheckedChange={(value) => updateLOD('enabled', value)}
            />
            <Label htmlFor="lodEnabled" className="text-xs">Enable LOD</Label>
          </div>

          {props.lod.enabled && (
            <>
              <DragInput
                label="LOD Levels"
                value={props.lod.levels}
                onChange={(value) => updateLOD('levels', Math.round(value))}
                step={1}
                precision={0}
                min={2}
                max={5}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
} 