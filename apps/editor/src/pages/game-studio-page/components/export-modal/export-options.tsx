import React from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ExportType, ExportOptions as ExportOptionsType } from './types';

interface ExportOptionsProps {
  exportType: ExportType;
  options: ExportOptionsType;
  onOptionsChange: (options: ExportOptionsType) => void;
}

export function ExportOptions({ exportType, options, onOptionsChange }: ExportOptionsProps) {
  const handleOptionChange = (key: keyof ExportOptionsType, value: boolean) => {
    onOptionsChange({ ...options, [key]: value });
  };

  if (exportType === 'gamejs') {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Export Options</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="includeAssets" className="flex-1">
                <div>Include Assets</div>
                <div className="text-sm text-muted-foreground font-normal">
                  Export as ZIP with all referenced assets
                </div>
              </Label>
              <Switch
                id="includeAssets"
                checked={options.includeAssets}
                onCheckedChange={(checked) => handleOptionChange('includeAssets', checked)}
              />
            </div>

            {options.includeAssets && (
              <>
                <div className="pl-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="includeScripts" className="flex-1">
                      <div>Include Scripts</div>
                      <div className="text-sm text-muted-foreground font-normal">
                        Export all entity scripts
                      </div>
                    </Label>
                    <Switch
                      id="includeScripts"
                      checked={options.includeScripts}
                      onCheckedChange={(checked) => handleOptionChange('includeScripts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="includeTextures" className="flex-1">
                      <div>Include Textures</div>
                      <div className="text-sm text-muted-foreground font-normal">
                        Export all texture files
                      </div>
                    </Label>
                    <Switch
                      id="includeTextures"
                      checked={options.includeTextures}
                      onCheckedChange={(checked) => handleOptionChange('includeTextures', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="includeMaterials" className="flex-1">
                      <div>Include Materials</div>
                      <div className="text-sm text-muted-foreground font-normal">
                        Export material definitions
                      </div>
                    </Label>
                    <Switch
                      id="includeMaterials"
                      checked={options.includeMaterials}
                      onCheckedChange={(checked) => handleOptionChange('includeMaterials', checked)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Full Compatibility</AlertTitle>
          <AlertDescription>
            GameJS format preserves all features including physics, scripts, and materials.
            You can re-import this file later without any data loss.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // For ThreeJS and GLB exports
  return (
    <div className="p-6 space-y-6">
      <Alert className="border-yellow-600/50 text-yellow-600 dark:border-yellow-500/50 dark:text-yellow-500">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Limited Export Format</AlertTitle>
        <AlertDescription>
          {exportType === 'threejs' ? (
            <>
              Three.js format does not support GameJS-specific features like physics bodies,
              character controllers, or custom scripts. Only visual elements will be exported.
            </>
          ) : (
            <>
              GLB format only supports 3D models, materials, and animations. GameJS-specific
              features like physics, scripts, and interactions will not be exported.
            </>
          )}
        </AlertDescription>
      </Alert>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Export Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="includeDebugElements" className="flex-1">
              <div>Include Debug Elements</div>
              <div className="text-sm text-muted-foreground font-normal">
                Export physics debug renderers and collision shapes
              </div>
            </Label>
            <Switch
              id="includeDebugElements"
              checked={options.includeDebugElements}
              onCheckedChange={(checked) => handleOptionChange('includeDebugElements', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="includeHelpers" className="flex-1">
              <div>Include Editor Helpers</div>
              <div className="text-sm text-muted-foreground font-normal">
                Export light helpers, AABB boxes, and other visual aids
              </div>
            </Label>
            <Switch
              id="includeHelpers"
              checked={options.includeHelpers}
              onCheckedChange={(checked) => handleOptionChange('includeHelpers', checked)}
            />
          </div>
        </div>
      </div>

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Cannot Re-import</AlertTitle>
        <AlertDescription>
          Files exported in {exportType === 'threejs' ? 'Three.js' : 'GLB'} format cannot be
          imported back into GameJS Editor. Use GameJS format if you need to preserve your project.
        </AlertDescription>
      </Alert>
    </div>
  );
} 