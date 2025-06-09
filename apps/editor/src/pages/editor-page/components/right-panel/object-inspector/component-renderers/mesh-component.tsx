import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Palette, Plus, AlertTriangle, ArrowUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ColorInput from "../color-input";
import BoxGeometry from "./geometry-controls/box-geometry";
import SphereGeometry from "./geometry-controls/sphere-geometry";
import PlaneGeometry from "./geometry-controls/plane-geometry";
import CylinderGeometry from "./geometry-controls/cylinder-geometry";
import ConeGeometry from "./geometry-controls/cone-geometry";
import TorusGeometry from "./geometry-controls/torus-geometry";
import TorusKnotGeometry from "./geometry-controls/torus-knot-geometry";
import CapsuleGeometry from "./geometry-controls/capsule-geometry";
import CircleGeometry from "./geometry-controls/circle-geometry";
import RingGeometry from "./geometry-controls/ring-geometry";
import PolyhedronGeometry from "./geometry-controls/polyhedron-geometry";
import useEditorStore from "@/stores/editor-store";
import {
  isLegacyMaterial,
  upgradeMaterialComponent,
  getMaterialDisplayName,
} from "@/pages/editor-page/components/viewport/material-compatibility";

interface MeshComponentProps {
  component: GameObjectComponent;
  objectId: string;
  onUpdate: (updates: Partial<GameObjectComponent>) => void;
}

export default function MeshComponent({
  component,
  objectId,
  onUpdate,
}: MeshComponentProps) {
  const { materials, openMaterialBrowser } = useEditorStore();
  const props = component.properties || {};
  const geometryProps = props.geometryProps || {};

  // Handle both legacy and new materials
  const isLegacy = isLegacyMaterial(component);
  const materialRef = isLegacy
    ? {
        type: "inline",
        properties: {
          type: props.material || "standard",
          ...props.materialProps,
        },
      }
    : props.materialRef || {
        type: "inline",
        properties: { type: "standard", color: "#ffffff" },
      };

  const updateProperty = (key: string, value: any) => {
    onUpdate({
      properties: {
        ...props,
        [key]: value,
      },
    });
  };

  const updateGeometryProp = (key: string, value: any) => {
    onUpdate({
      properties: {
        ...props,
        geometryProps: {
          ...geometryProps,
          [key]: value,
        },
      },
    });
  };

  const updateMaterialRef = (materialRef: any) => {
    if (isLegacy) {
      // When updating legacy materials, first upgrade to new format
      const upgraded = upgradeMaterialComponent(component);
      onUpdate({
        properties: {
          ...upgraded.properties,
          materialRef,
        },
      });
    } else {
      updateProperty("materialRef", materialRef);
    }
  };

  const handleUpgradeMaterial = () => {
    const upgraded = upgradeMaterialComponent(component);
    onUpdate(upgraded);
  };

  const getAssignedMaterial = () => {
    if (materialRef.type === "library" && materialRef.materialId) {
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
        color: "#ffffff",
        metalness: 0,
        roughness: 0.5,
      },
    });
  };

  const renderGeometryControls = () => {
    const controlProps = {
      geometryProps,
      onUpdate: updateGeometryProp,
    };

    switch (props.geometry) {
      case "box":
        return <BoxGeometry {...controlProps} />;
      case "sphere":
        return <SphereGeometry {...controlProps} />;
      case "plane":
        return <PlaneGeometry {...controlProps} />;
      case "cylinder":
        return <CylinderGeometry {...controlProps} />;
      case "cone":
        return <ConeGeometry {...controlProps} />;
      case "torus":
        return <TorusGeometry {...controlProps} />;
      case "torusKnot":
        return <TorusKnotGeometry {...controlProps} />;
      case "capsule":
        return <CapsuleGeometry {...controlProps} />;
      case "circle":
        return <CircleGeometry {...controlProps} />;
      case "ring":
        return <RingGeometry {...controlProps} />;
      case "dodecahedron":
      case "icosahedron":
      case "octahedron":
      case "tetrahedron":
        return <PolyhedronGeometry {...controlProps} />;
      default:
        return null;
    }
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
            value={materialRef.properties?.color || "#ffffff"}
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
                value={materialRef.properties?.roughness || 0.5}
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
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">Geometry</Label>
          <Select
            value={props.geometry || "box"}
            onValueChange={(value) => updateProperty("geometry", value)}
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="box">Box</SelectItem>
              <SelectItem value="sphere">Sphere</SelectItem>
              <SelectItem value="plane">Plane</SelectItem>
              <SelectItem value="cylinder">Cylinder</SelectItem>
              <SelectItem value="cone">Cone</SelectItem>
              <SelectItem value="torus">Torus</SelectItem>
              <SelectItem value="torusKnot">Torus Knot</SelectItem>
              <SelectItem value="capsule">Capsule</SelectItem>
              <SelectItem value="circle">Circle</SelectItem>
              <SelectItem value="ring">Ring</SelectItem>
              <SelectItem value="dodecahedron">Dodecahedron</SelectItem>
              <SelectItem value="icosahedron">Icosahedron</SelectItem>
              <SelectItem value="octahedron">Octahedron</SelectItem>
              <SelectItem value="tetrahedron">Tetrahedron</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {renderGeometryControls()}
      </div>

      <div className="space-y-3">
        <Label className="text-muted-foreground text-xs">Material</Label>

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
        <Label className="text-muted-foreground text-xs">Rendering</Label>
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
