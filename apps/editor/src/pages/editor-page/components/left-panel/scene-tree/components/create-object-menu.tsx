import React from "react";
import { Plus } from "lucide-react";
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
import { gameObjectTemplates } from "../templates";

interface CreateObjectMenuProps {
  onAddObject: (template: (typeof gameObjectTemplates)[0]) => void;
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
  {
    id: "utility",
    name: "Utilities",
    description: "Empty objects, groups, and helpers",
    color: "text-purple-500",
  },
];

export default function CreateObjectMenu({ onAddObject }: CreateObjectMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Plus className="h-6 w-6" />
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
              <DropdownMenuSubContent className="w-64 max-h-[450px] overflow-y-auto">
                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                  {category.description}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {categoryTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <DropdownMenuItem
                      key={template.id}
                      onClick={() => onAddObject(template)}
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
  );
} 