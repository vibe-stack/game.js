import { Folder } from "lucide-react";

export const utilityTemplates = [
  {
    id: 'group',
    name: 'Group',
    description: 'Group - Organizational container for multiple objects',
    icon: Folder,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [],
      visible: true,
      tags: ['utility'],
      layer: 0
    }
  }
]; 