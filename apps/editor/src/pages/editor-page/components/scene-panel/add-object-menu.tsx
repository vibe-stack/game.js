import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSub, 
  DropdownMenuSubContent, 
  DropdownMenuSubTrigger 
} from "@/components/ui/dropdown-menu";
import { Plus, Box, Circle, Cylinder, Square } from "lucide-react";
import { useSceneStore } from "../../stores/scene-store";
import { ObjectCreateOptions } from "../../types";

interface AddObjectMenuProps {
  scenePath: string;
}

const geometryOptions = [
  { type: 'BoxGeometry', label: 'Box', icon: Box, defaultProps: { width: 1, height: 1, depth: 1 } },
  { type: 'SphereGeometry', label: 'Sphere', icon: Circle, defaultProps: { radius: 1, widthSegments: 32, heightSegments: 16 } },
  { type: 'CylinderGeometry', label: 'Cylinder', icon: Cylinder, defaultProps: { radiusTop: 1, radiusBottom: 1, height: 1, radialSegments: 8 } },
  { type: 'PlaneGeometry', label: 'Plane', icon: Square, defaultProps: { width: 1, height: 1 } },
  { type: 'TorusGeometry', label: 'Torus', icon: Circle, defaultProps: { radius: 1, tube: 0.4, radialSegments: 8, tubularSegments: 6 } }
] as const;

const materialOptions = [
  { type: 'MeshBasicMaterial', label: 'Basic', defaultProps: { color: 0xffffff } },
  { type: 'MeshPhongMaterial', label: 'Phong', defaultProps: { color: 0xffffff, shininess: 100 } },
  { type: 'MeshStandardMaterial', label: 'Standard', defaultProps: { color: 0xffffff, roughness: 1, metalness: 0 } },
  { type: 'MeshLambertMaterial', label: 'Lambert', defaultProps: { color: 0xffffff } }
] as const;

export function AddObjectMenu({ scenePath }: AddObjectMenuProps) {
  const { addObject } = useSceneStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleAddObject = (geometryType: typeof geometryOptions[number], materialType: typeof materialOptions[number]) => {
    const objectOptions: ObjectCreateOptions = {
      type: 'Mesh',
      geometry: {
        type: geometryType.type,
        ...geometryType.defaultProps
      },
      material: {
        type: materialType.type,
        ...materialType.defaultProps
      },
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    };

    addObject(scenePath, objectOptions);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus size={14} className="mr-2" />
          Add Object
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {geometryOptions.map((geometry) => {
          const GeometryIcon = geometry.icon;
          return (
            <DropdownMenuSub key={geometry.type}>
              <DropdownMenuSubTrigger>
                <GeometryIcon size={14} className="mr-2" />
                {geometry.label}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {materialOptions.map((material) => (
                  <DropdownMenuItem
                    key={`${geometry.type}-${material.type}`}
                    onClick={() => handleAddObject(geometry, material)}
                  >
                    {material.label} Material
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 