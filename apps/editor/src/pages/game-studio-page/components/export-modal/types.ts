export type ExportType = 'gamejs' | 'threejs' | 'glb';

export interface ExportOptions {
  includeAssets: boolean;
  includeScripts: boolean;
  includeTextures: boolean;
  includeMaterials: boolean;
  includeDebugElements: boolean;
  includeHelpers: boolean;
}

import { LucideIcon } from 'lucide-react';

export interface ExportTypeInfo {
  id: ExportType;
  title: string;
  description: string;
  icon: LucideIcon;
  fileExtension: string;
} 