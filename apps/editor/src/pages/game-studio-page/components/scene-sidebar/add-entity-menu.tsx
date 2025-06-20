import React, { useState } from "react";
import { Plus, CircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

const ENTITY_TYPES: EntityType[] = [
  {
    id: "sphere",
    name: "Sphere",
    icon: <CircleIcon className="h-4 w-4" />,
    description: "A 3D sphere primitive",
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
      <DropdownMenuContent align="end" className="w-48 bg-black/90 border-white/20">
        {ENTITY_TYPES.map((entityType) => (
          <DropdownMenuItem
            key={entityType.id}
            onClick={() => handleCreateEntity(entityType)}
            className="flex items-center gap-2 text-white hover:bg-white/10 cursor-pointer"
            disabled={isCreating}
          >
            {entityType.icon}
            <div className="flex flex-col">
              <span className="text-sm font-medium">{entityType.name}</span>
              <span className="text-xs text-gray-400">{entityType.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 