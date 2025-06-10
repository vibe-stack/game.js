import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, Palette, Plus, ArrowUp } from "lucide-react";
import Vector2Controls from "../vector2-controls";
import ColorInput from "../color-input";
import useEditorStore from "@/stores/editor-store";
import {
  isLegacyMaterial,
  upgradeMaterialComponent
} from "@/pages/editor-page/components/viewport/material-compatibility";

interface HeightfieldComponentProps {
  component: HeightfieldComponent;
  objectId: string;
}

export default function HeightfieldComponent({ component, objectId }: HeightfieldComponentProps) {
  const { updateHeightfieldComponent, materials, openMaterialBrowser } = useEditorStore();
  const props = component.properties;

  // Handle both legacy and new materials (similar to mesh component)
  const isLegacy = isLegacyMaterial(component as any);
  const materialRef = isLegacy
    ? {
        type: "inline" as const,
        properties: {
          type: props.material || "standard",
          ...props.materialProps,
        },
      }
    : props.materialRef || {
        type: "inline" as const,
        properties: { type: "standard", color: "#8b7355" }, // Default terrain color
      };

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

  const updateMaterialRef = (materialRef: any) => {
    if (isLegacy) {
      // When updating legacy materials, first upgrade to new format
      const upgraded = upgradeMaterialComponent(component as any);
      updateHeightfieldComponent(objectId, component.id, {
        ...upgraded.properties,
        materialRef,
      });
    } else {
      updateProperty("materialRef", materialRef);
    }
  };

  const handleUpgradeMaterial = () => {
    const upgraded = upgradeMaterialComponent(component as any);
    updateHeightfieldComponent(objectId, component.id, upgraded.properties);
  };

  const getAssignedMaterial = () => {
    if (materialRef.type === "library" && "materialId" in materialRef && materialRef.materialId) {
      return materials.find((m) => m.id === materialRef.materialId);
    }
    return null;
  };

  const handleOpenMaterialBrowser = () => {
    openMaterialBrowser(objectId);
  };

  const handleSwitchToInlineMaterial = () => {
    updateMaterialRef({
      type: "inline",
      properties: {
        type: "standard",
        color: "#8b7355",
        metalness: 0,
        roughness: 0.8,
      },
    });
  };

  const handleRegenerate = () => {
    updateHeightfieldComponent(objectId, component.id, { lastGenerated: new Date() });
  };

  const handleRandomSeed = () => {
    updateProperty('seed', Math.floor(Math.random() * 100000));
  };

  const renderMaterialControls = () => {
    if (materialRef.type === "library") {
      const assignedMaterial = getAssignedMaterial();

      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenMaterialBrowser}
              className="flex-1"
            >
              <Palette className="mr-2 h-3 w-3" />
              {assignedMaterial ? assignedMaterial.name : "Select Material"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwitchToInlineMaterial}
              title="Switch to inline material"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {assignedMaterial && (
            <div className="bg-muted/30 rounded p-2 text-xs">
              <div className="font-medium">{assignedMaterial.name}</div>
              <div className="text-muted-foreground">
                Type: {assignedMaterial.properties.type}
              </div>
              <div className="text-muted-foreground">
                Category: {assignedMaterial.metadata.category}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Inline material controls
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenMaterialBrowser}
            className="flex-1"
          >
            <Palette className="mr-2 h-3 w-3" />
            Browse Materials
          </Button>
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Material Type</Label>
            <Select
              value={materialRef.properties?.type || "standard"}
              onValueChange={(type) =>
                updateMaterialRef({
                  ...materialRef,
                  properties: { ...materialRef.properties, type },
                })
              }
            >
              <SelectTrigger className="h-7 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="lambert">Lambert</SelectItem>
                <SelectItem value="phong">Phong</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="toon">Toon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ColorInput
            label="Color"
            value={materialRef.properties?.color || "#8b7355"}
            onChange={(value) =>
              updateMaterialRef({
                ...materialRef,
                properties: { ...materialRef.properties, color: value },
              })
            }
          />

          {(materialRef.properties?.type === "standard" ||
            materialRef.properties?.type === "physical") && (
            <>
              <DragInput
                label="Metalness"
                value={materialRef.properties?.metalness || 0}
                onChange={(value) =>
                  updateMaterialRef({
                    ...materialRef,
                    properties: { ...materialRef.properties, metalness: value },
                  })
                }
                step={0.01}
                precision={2}
                min={0}
                max={1}
              />

              <DragInput
                label="Roughness"
                value={materialRef.properties?.roughness || 0.8}
                onChange={(value) =>
                  updateMaterialRef({
                    ...materialRef,
                    properties: { ...materialRef.properties, roughness: value },
                  })
                }
                step={0.01}
                precision={2}
                min={0}
                max={1}
              />
            </>
          )}

          {materialRef.properties?.type === "physical" && (
            <>
              <DragInput
                label="Transmission"
                value={materialRef.properties?.transmission || 0}
                onChange={(value) =>
                  updateMaterialRef({
                    ...materialRef,
                    properties: {
                      ...materialRef.properties,
                      transmission: value,
                    },
                  })
                }
                step={0.01}
                precision={2}
                min={0}
                max={1}
              />

              <DragInput
                label="Thickness"
                value={materialRef.properties?.thickness || 0}
                onChange={(value) =>
                  updateMaterialRef({
                    ...materialRef,
                    properties: { ...materialRef.properties, thickness: value },
                  })
                }
                step={0.01}
                precision={2}
                min={0}
                max={5}
              />

              <DragInput
                label="IOR"
                value={materialRef.properties?.ior || 1.5}
                onChange={(value) =>
                  updateMaterialRef({
                    ...materialRef,
                    properties: { ...materialRef.properties, ior: value },
                  })
                }
                step={0.01}
                precision={2}
                min={1}
                max={3}
              />
            </>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Side</Label>
            <Select
              value={String(materialRef.properties?.side ?? 0)}
              onValueChange={(value) =>
                updateMaterialRef({
                  ...materialRef,
                  properties: {
                    ...materialRef.properties,
                    side: parseInt(value),
                  },
                })
              }
            >
              <SelectTrigger className="h-7 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Front</SelectItem>
                <SelectItem value="1">Back</SelectItem>
                <SelectItem value="2">Double Side</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="wireframe"
              checked={materialRef.properties?.wireframe || false}
              onCheckedChange={(value: boolean) =>
                updateMaterialRef({
                  ...materialRef,
                  properties: { ...materialRef.properties, wireframe: value },
                })
              }
            />
            <Label htmlFor="wireframe" className="text-xs">
              Wireframe
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="transparent"
              checked={materialRef.properties?.transparent || false}
              onCheckedChange={(value: boolean) =>
                updateMaterialRef({
                  ...materialRef,
                  properties: { ...materialRef.properties, transparent: value },
                })
              }
            />
            <Label htmlFor="transparent" className="text-xs">
              Transparent
            </Label>
          </div>

          {materialRef.properties?.transparent && (
            <DragInput
              label="Opacity"
              value={materialRef.properties?.opacity || 1}
              onChange={(value) =>
                updateMaterialRef({
                  ...materialRef,
                  properties: { ...materialRef.properties, opacity: value },
                })
              }
              step={0.01}
              precision={2}
              min={0}
              max={1}
            />
          )}
        </div>
      </div>
    );
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
              step={0.1}
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
        <Label className="text-xs text-muted-foreground">Material</Label>

        {/* Legacy Material Warning */}
        {isLegacy && (
          <Button
            variant="link"
            size="sm"
            onClick={handleUpgradeMaterial}
            className="ml-1 h-auto p-0 text-xs text-amber-800 underline dark:text-amber-200"
          >
            <ArrowUp className="mr-1 h-3 w-3" />
            Upgrade to new materials
          </Button>
        )}

        {renderMaterialControls()}
      </div>

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

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Rendering</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="castShadow"
              checked={props.castShadow || false}
              onCheckedChange={(value: boolean) =>
                updateProperty("castShadow", value)
              }
            />
            <Label htmlFor="castShadow" className="text-xs">
              Cast Shadow
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="receiveShadow"
              checked={props.receiveShadow || false}
              onCheckedChange={(value: boolean) =>
                updateProperty("receiveShadow", value)
              }
            />
            <Label htmlFor="receiveShadow" className="text-xs">
              Receive Shadow
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
} 