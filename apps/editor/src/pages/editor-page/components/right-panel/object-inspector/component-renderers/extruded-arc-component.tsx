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

interface ExtrudedArcComponentProps {
  component: ExtrudedArcComponent;
  objectId: string;
}

export default function ExtrudedArcComponent({ component, objectId }: ExtrudedArcComponentProps) {
  const { updateExtrudedArcComponent, materials, openMaterialBrowser } = useEditorStore();
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
        properties: { type: "standard", color: "#666666" }, // Default arc color
      };

  const updateProperty = (key: keyof typeof props, value: any) => {
    updateExtrudedArcComponent(objectId, component.id, { [key]: value });
  };

  const updateMaterialRef = (materialRef: any) => {
    if (isLegacy) {
      // When updating legacy materials, first upgrade to new format
      const upgraded = upgradeMaterialComponent(component as any);
      updateExtrudedArcComponent(objectId, component.id, {
        ...upgraded.properties,
        materialRef,
      });
    } else {
      updateProperty("materialRef", materialRef);
    }
  };

  const handleUpgradeMaterial = () => {
    const upgraded = upgradeMaterialComponent(component as any);
    updateExtrudedArcComponent(objectId, component.id, upgraded.properties);
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
        color: "#666666",
        metalness: 0,
        roughness: 0.7,
      },
    });
  };

  const handleRegenerate = () => {
    updateExtrudedArcComponent(objectId, component.id, { lastGenerated: new Date() });
  };

  const renderMaterialControls = () => {
    if (isLegacy) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
            <ArrowUp className="h-3 w-3 text-orange-600" />
            <span className="text-orange-800">Legacy material detected</span>
            <Button
              onClick={handleUpgradeMaterial}
              size="sm"
              variant="outline"
              className="h-5 text-xs"
            >
              Upgrade
            </Button>
          </div>
        </div>
      );
    }

    const assignedMaterial = getAssignedMaterial();

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Material</Label>
          <div className="flex gap-1">
            <Button
              onClick={handleOpenMaterialBrowser}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
            >
              <Palette className="h-3 w-3" />
            </Button>
            {materialRef.type === "library" && (
              <Button
                onClick={handleSwitchToInlineMaterial}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {materialRef.type === "library" && assignedMaterial ? (
          <div className="p-2 bg-muted/50 rounded text-xs">
            <div className="font-medium">{assignedMaterial.name}</div>
            <div className="text-muted-foreground">{assignedMaterial.description}</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">Material Type</Label>
              <Select
                value={materialRef.properties?.type || "standard"}
                onValueChange={(value) =>
                  updateMaterialRef({
                    ...materialRef,
                    properties: { ...materialRef.properties, type: value },
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
              value={materialRef.properties?.color || "#666666"}
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
                  value={materialRef.properties?.roughness || 0.7}
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
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Arc Geometry</Label>
          <Button
            onClick={handleRegenerate}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        <div className="space-y-2">
          <DragInput
            label="Arc Radius"
            value={props.arcRadius}
            onChange={(value) => updateProperty('arcRadius', value)}
            step={0.1}
            precision={2}
            min={0.1}
          />
          <DragInput
            label="Width"
            value={props.width}
            onChange={(value) => updateProperty('width', value)}
            step={0.1}
            precision={2}
            min={0.1}
          />
          <DragInput
            label="Height"
            value={props.height}
            onChange={(value) => updateProperty('height', value)}
            step={0.1}
            precision={2}
            min={0.01}
          />
          <DragInput
            label="Angle (radians)"
            value={props.angle}
            onChange={(value) => updateProperty('angle', value)}
            step={0.1}
            precision={2}
            min={0.1}
            max={Math.PI * 2}
          />
          <DragInput
            label="Pitch"
            value={props.pitch}
            onChange={(value) => updateProperty('pitch', value)}
            step={0.1}
            precision={2}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Segments</Label>
        <div className="space-y-2">
          <DragInput
            label="Path Segments"
            value={props.segments}
            onChange={(value) => updateProperty('segments', Math.round(value))}
            step={1}
            precision={0}
            min={3}
            max={128}
          />
          <DragInput
            label="Cross Section Segments"
            value={props.crossSectionSegments}
            onChange={(value) => updateProperty('crossSectionSegments', Math.round(value))}
            step={1}
            precision={0}
            min={1}
            max={16}
          />
          <DragInput
            label="Extrusion Segments"
            value={props.extrusionSegments}
            onChange={(value) => updateProperty('extrusionSegments', Math.round(value))}
            step={1}
            precision={0}
            min={1}
            max={8}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">UV Mapping</Label>
        <div className="space-y-2">
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
              id="flipUVs"
              checked={props.flipUVs}
              onCheckedChange={(value) => updateProperty('flipUVs', value)}
            />
            <Label htmlFor="flipUVs" className="text-xs">Flip UVs</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="closed"
              checked={props.closed}
              onCheckedChange={(value) => updateProperty('closed', value)}
            />
            <Label htmlFor="closed" className="text-xs">Closed Loop</Label>
          </div>
        </div>
      </div>

      {renderMaterialControls()}

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

          <div className="flex items-center space-x-2">
            <Switch
              id="autoRegenerate"
              checked={props.autoRegenerate}
              onCheckedChange={(value) => updateProperty('autoRegenerate', value)}
            />
            <Label htmlFor="autoRegenerate" className="text-xs">Auto Regenerate</Label>
          </div>
        </div>
      </div>
    </div>
  );
} 