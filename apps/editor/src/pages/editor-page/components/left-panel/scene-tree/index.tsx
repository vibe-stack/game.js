import React from "react";
import { Plus, ChevronRight, EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useEditorStore from "@/stores/editor-store";
import { gameObjectTemplates } from "./game-object-templates";

interface SceneTreeProps {
  scene: GameScene | null;
  selectedObjects: string[];
  onSelectObject: (objectId: string) => void;
}

const menuCategories = [
  {
    id: "geometry",
    name: "Geometry",
    description: "Basic 3D shapes and meshes",
    color: "text-blue-500",
  },
  {
    id: "light",
    name: "Lighting",
    description: "Light sources for illumination",
    color: "text-yellow-500",
  },
  {
    id: "camera",
    name: "Cameras",
    description: "Viewpoint and perspective controls",
    color: "text-green-500",
  },
];

export default function SceneTree({
  scene,
  selectedObjects,
  onSelectObject,
}: SceneTreeProps) {
  const { addObject } = useEditorStore();

  const handleAddObject = (template: (typeof gameObjectTemplates)[0]) => {
    const newObject: GameObject = {
      id: `${template.id}-${Date.now()}`,
      name: template.name,
      children: [],
      ...template.template,
    };

    addObject(newObject);
  };

  if (!scene) {
    return (
      <div className="text-muted-foreground p-4 text-center">
        No scene loaded
      </div>
    );
  }

  return (
    <div className="space-y-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-muted-foreground text-sm font-medium">
          Scene Objects
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add object</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Add Object</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {menuCategories.map((category) => {
              const categoryTemplates = gameObjectTemplates.filter((t) =>
                t.template.tags.includes(category.id),
              );

              if (categoryTemplates.length === 0) return null;

              return (
                <DropdownMenuSub key={category.id}>
                  <DropdownMenuSubTrigger className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${category.color.replace("text-", "bg-")}`}
                    />
                    <span>{category.name}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-64 max-h-[300px] overflow-y-auto">
                    <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                      {category.description}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {categoryTemplates.map((template) => {
                      const Icon = template.icon;
                      return (
                        <DropdownMenuItem
                          key={template.id}
                          onClick={() => handleAddObject(template)}
                          className="flex cursor-pointer flex-col items-start gap-1 p-3"
                        >
                          <div className="flex w-full items-center gap-2">
                            <Icon className={`h-4 w-4 ${category.color}`} />
                            <span className="font-medium">{template.name}</span>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {template.description}
                          </span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {scene.objects.map((obj) => (
        <div
          key={obj.id}
          className={`cursor-pointer rounded-xl px-3 py-2 text-sm transition-colors ${
            selectedObjects.includes(obj.id)
              ? "bg-primary/20 text-white"
              : "hover:bg-muted"
          }`}
          onClick={() => onSelectObject(obj.id)}
        >
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {obj.visible ? (
                <EyeIcon className="h-4 w-4" />
              ) : (
                <EyeOffIcon className="h-4 w-4" />
              )}
            </span>
            <span>{obj.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
