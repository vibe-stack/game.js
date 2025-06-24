import React, { useState } from "react";
import { 
  Plus, 
  Box, 
  Circle, 
  Triangle, 
  Cylinder as CylinderIcon,
  Mountain,
  Lightbulb,
  Shapes,
  ChevronRight,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GameWorldService } from "../../services/game-world-service";
import { EntityCreator } from "./entity-creator";

interface AddEntityMenuProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
  onEntityAdded?: () => void;
}

interface EntityType {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

interface EntityCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  entities: EntityType[];
}

const ENTITY_CATEGORIES: EntityCategory[] = [
  {
    id: "basic",
    name: "Basic Shapes",
    icon: <Shapes className="h-4 w-4" />,
    entities: [
      {
        id: "sphere",
        name: "Sphere",
        icon: <Circle className="h-4 w-4" />,
        description: "A 3D sphere primitive",
      },
      {
        id: "box",
        name: "Box",
        icon: <Box className="h-4 w-4" />,
        description: "A 3D box primitive",
      },
      {
        id: "plane",
        name: "Plane",
        icon: <Box className="h-3 w-4" />,
        description: "A flat plane surface",
      },
    ],
  },
  {
    id: "geometric",
    name: "Geometric Shapes",
    icon: <Triangle className="h-4 w-4" />,
    entities: [
      {
        id: "cylinder",
        name: "Cylinder",
        icon: <CylinderIcon className="h-4 w-4" />,
        description: "A cylindrical primitive",
      },
      {
        id: "cone",
        name: "Cone",
        icon: <Triangle className="h-4 w-4" />,
        description: "A conical primitive",
      },
      {
        id: "torus",
        name: "Torus",
        icon: <Circle className="h-4 w-4" />,
        description: "A donut-shaped primitive",
      },
      {
        id: "capsule",
        name: "Capsule",
        icon: <Circle className="h-4 w-4" />,
        description: "A capsule-shaped primitive",
      },
      {
        id: "ring",
        name: "Ring",
        icon: <Circle className="h-4 w-4" />,
        description: "A ring-shaped primitive",
      },
    ],
  },
  {
    id: "polyhedron",
    name: "Polyhedrons",
    icon: <Shapes className="h-4 w-4" />,
    entities: [
      {
        id: "tetrahedron",
        name: "Tetrahedron",
        icon: <Triangle className="h-4 w-4" />,
        description: "A 4-sided polyhedron",
      },
      {
        id: "octahedron",
        name: "Octahedron",
        icon: <Shapes className="h-4 w-4" />,
        description: "An 8-sided polyhedron",
      },
      {
        id: "dodecahedron",
        name: "Dodecahedron",
        icon: <Shapes className="h-4 w-4" />,
        description: "A 12-sided polyhedron",
      },
      {
        id: "icosahedron",
        name: "Icosahedron",
        icon: <Shapes className="h-4 w-4" />,
        description: "A 20-sided polyhedron",
      },
    ],
  },
  {
    id: "models",
    name: "3D Models",
    icon: <Package className="h-4 w-4" />,
    entities: [
      {
        id: "mesh-3d",
        name: "3D Mesh",
        icon: <Package className="h-4 w-4" />,
        description: "Empty mesh for GLB models",
      },
    ],
  },
  {
    id: "terrain",
    name: "Terrain & Landscape",
    icon: <Mountain className="h-4 w-4" />,
    entities: [
      {
        id: "heightfield",
        name: "Heightfield",
        icon: <Mountain className="h-4 w-4" />,
        description: "A terrain heightfield",
      },
      {
        id: "custom-heightfield",
        name: "Custom Heightfield",
        icon: <Mountain className="h-4 w-4" />,
        description: "A customizable terrain heightfield",
      },
    ],
  },
  {
    id: "lighting",
    name: "Lighting",
    icon: <Lightbulb className="h-4 w-4" />,
    entities: [
      {
        id: "ambient-light",
        name: "Ambient Light",
        icon: <Lightbulb className="h-4 w-4" />,
        description: "Global ambient lighting",
      },
      {
        id: "directional-light",
        name: "Directional Light",
        icon: <Lightbulb className="h-4 w-4" />,
        description: "Sun-like directional lighting",
      },
      {
        id: "point-light",
        name: "Point Light",
        icon: <Lightbulb className="h-4 w-4" />,
        description: "Omnidirectional point light",
      },
      {
        id: "spot-light",
        name: "Spot Light",
        icon: <Lightbulb className="h-4 w-4" />,
        description: "Focused spotlight",
      },
    ],
  },
];

export default function AddEntityMenu({ gameWorldService, onEntityAdded }: AddEntityMenuProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateEntity = async (entityType: EntityType) => {
    if (!gameWorldService.current) return;
    
    setIsCreating(true);
    try {
      await EntityCreator.createEntity(entityType.id, gameWorldService.current);
      onEntityAdded?.();
    } catch (error) {
      console.error(`Failed to create ${entityType.name}:`, error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 bg-white/10 hover:bg-white/20 border border-white/20"
          disabled={isCreating}
        >
          <Plus className="h-4 w-4 text-white" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-black/90 border-white/20">
        {ENTITY_CATEGORIES.map((category) => (
          <DropdownMenuSub key={category.id}>
            <DropdownMenuSubTrigger className="flex items-center gap-2 text-white hover:bg-white/10 cursor-pointer">
              {category.icon}
              <span className="text-sm font-medium">{category.name}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56 bg-black/90 border-white/20">
              {category.entities.map((entityType) => (
                <DropdownMenuItem
                  key={entityType.id}
                  onClick={() => handleCreateEntity(entityType)}
                  className="flex items-center gap-2 text-white hover:bg-white/10 cursor-pointer p-3"
                  disabled={isCreating}
                >
                  {entityType.icon}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{entityType.name}</span>
                    <span className="text-xs text-gray-400">{entityType.description}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 