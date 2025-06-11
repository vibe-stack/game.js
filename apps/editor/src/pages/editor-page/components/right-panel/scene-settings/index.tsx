import React from "react";
import { Settings, Eye, Zap, Palette, AlertTriangle } from "lucide-react";
import { DragInput } from "@/components/ui/drag-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useEditorStore from "@/stores/editor-store";
import { sceneHasLegacyMaterials, getLegacyMaterialStats, upgradeSceneMaterials } from "@/pages/editor-page/components/viewport/scene-migration";

interface SceneSettingsProps {
  scene: GameScene | null;
}

export default function SceneSettings({ scene }: SceneSettingsProps) {
  const { updateSceneEditorConfig, updateSceneRuntimeConfig, setCurrentScene } = useEditorStore();

  if (!scene) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No scene selected
      </div>
    );
  }

  const hasLegacyMaterials = sceneHasLegacyMaterials(scene);
  const materialStats = getLegacyMaterialStats(scene);

  const handleUpgradeScene = async () => {
    const upgradedScene = upgradeSceneMaterials(scene);
    setCurrentScene(upgradedScene);
    
    // Save the upgraded scene
    const { currentProject } = useEditorStore.getState();
    if (currentProject) {
      try {
        await window.projectAPI.saveScene(currentProject.path, upgradedScene);
      } catch (error) {
        console.error('Failed to save upgraded scene:', error);
      }
    }
  };

  const handleEditorConfigChange = (key: keyof SceneEditorConfig, value: any) => {
    updateSceneEditorConfig({ [key]: value });
  };

  const handleRuntimeConfigChange = (key: keyof SceneRuntimeConfig, value: any) => {
    updateSceneRuntimeConfig({ [key]: value });
  };

  return (
    <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
        <Settings size={16} />
        Scene Settings
      </h3>

      {/* Editor Viewport Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <Eye size={14} />
          Editor Viewport
        </div>
        
        <div className="space-y-3 pl-4">
          {/* Background Color */}
          <div className="flex items-center justify-between">
            <Label htmlFor="editor-bg" className="text-xs text-zinc-300">Background</Label>
            <div className="flex items-center gap-2">
              <input
                id="editor-bg"
                type="color"
                value={scene.editorConfig.backgroundColor}
                onChange={(e) => handleEditorConfigChange('backgroundColor', e.target.value)}
                className="w-6 h-6 rounded border border-zinc-600 bg-transparent cursor-pointer"
              />
              <span className="text-xs text-zinc-400 font-mono">
                {scene.editorConfig.backgroundColor}
              </span>
            </div>
          </div>

          {/* Grid Settings */}
          <div className="flex items-center justify-between">
            <Label htmlFor="show-grid" className="text-xs text-zinc-300">Show Grid</Label>
            <Switch
              id="show-grid"
              checked={scene.editorConfig.showHelperGrid}
              onCheckedChange={(checked) => handleEditorConfigChange('showHelperGrid', checked)}
            />
          </div>

          {scene.editorConfig.showHelperGrid && (
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-300">Grid Size</Label>
              <DragInput
                value={scene.editorConfig.gridSize}
                onChange={(value) => handleEditorConfigChange('gridSize', value)}
                min={0.1}
                max={100}
                step={0.5}
                precision={1}
                className="w-16"
              />
            </div>
          )}

          {/* Render Type */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Render Mode</Label>
            <Select
              value={scene.editorConfig.renderType}
              onValueChange={(value) => handleEditorConfigChange('renderType', value)}
            >
              <SelectTrigger className="w-32 h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="wireframe">Wireframe</SelectItem>
                <SelectItem value="normals">Normals</SelectItem>
                <SelectItem value="realistic">Realistic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show Helpers */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Show Lights</Label>
            <Switch
              checked={scene.editorConfig.showLights}
              onCheckedChange={(checked) => handleEditorConfigChange('showLights', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Show Cameras</Label>
            <Switch
              checked={scene.editorConfig.showCameras}
              onCheckedChange={(checked) => handleEditorConfigChange('showCameras', checked)}
            />
          </div>

          {/* Fog Settings */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Enable Fog</Label>
            <Switch
              checked={scene.editorConfig.enableFog}
              onCheckedChange={(checked) => handleEditorConfigChange('enableFog', checked)}
            />
          </div>

          {scene.editorConfig.enableFog && (
            <div className="space-y-2 pl-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-300">Fog Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={scene.editorConfig.fogColor}
                    onChange={(e) => handleEditorConfigChange('fogColor', e.target.value)}
                    className="w-5 h-5 rounded border border-zinc-600 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-300">Fog Near</Label>
                <DragInput
                  value={scene.editorConfig.fogNear}
                  onChange={(value) => handleEditorConfigChange('fogNear', value)}
                  min={0.1}
                  max={100}
                  step={0.1}
                  precision={1}
                  className="w-16"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-300">Fog Far</Label>
                <DragInput
                  value={scene.editorConfig.fogFar}
                  onChange={(value) => handleEditorConfigChange('fogFar', value)}
                  min={1}
                  max={1000}
                  step={1}
                  precision={0}
                  className="w-16"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Runtime Rendering Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <Zap size={14} />
          Runtime Rendering
        </div>
        
        <div className="space-y-3 pl-4">
          {/* Runtime Background Color */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Background</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={scene.runtimeConfig.backgroundColor}
                onChange={(e) => handleRuntimeConfigChange('backgroundColor', e.target.value)}
                className="w-6 h-6 rounded border border-zinc-600 bg-transparent cursor-pointer"
              />
              <span className="text-xs text-zinc-400 font-mono">
                {scene.runtimeConfig.backgroundColor}
              </span>
            </div>
          </div>

          {/* Environment */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Environment</Label>
            <Select
              value={scene.runtimeConfig.environment}
              onValueChange={(value) => handleRuntimeConfigChange('environment', value)}
            >
              <SelectTrigger className="w-24 h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="sunset">Sunset</SelectItem>
                <SelectItem value="dawn">Dawn</SelectItem>
                <SelectItem value="night">Night</SelectItem>
                <SelectItem value="forest">Forest</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="studio">Studio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shadows */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Shadows</Label>
            <Switch
              checked={scene.runtimeConfig.shadowsEnabled}
              onCheckedChange={(checked) => handleRuntimeConfigChange('shadowsEnabled', checked)}
            />
          </div>

          {scene.runtimeConfig.shadowsEnabled && (
            <div className="flex items-center justify-between pl-4">
              <Label className="text-xs text-zinc-300">Shadow Type</Label>
              <Select
                value={scene.runtimeConfig.shadowType}
                onValueChange={(value) => handleRuntimeConfigChange('shadowType', value)}
              >
                <SelectTrigger className="w-24 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pcf">PCF</SelectItem>
                  <SelectItem value="pcfsoft">PCF Soft</SelectItem>
                  <SelectItem value="vsm">VSM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Antialiasing */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Antialiasing</Label>
            <Switch
              checked={scene.runtimeConfig.antialias}
              onCheckedChange={(checked) => handleRuntimeConfigChange('antialias', checked)}
            />
          </div>

          {/* Physically Correct Lights */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Physically Correct Lights</Label>
            <Switch
              checked={scene.runtimeConfig.physicallyCorrectLights}
              onCheckedChange={(checked) => handleRuntimeConfigChange('physicallyCorrectLights', checked)}
            />
          </div>

          {/* Tone Mapping */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Tone Mapping</Label>
            <Select
              value={scene.runtimeConfig.toneMapping}
              onValueChange={(value) => handleRuntimeConfigChange('toneMapping', value)}
            >
              <SelectTrigger className="w-24 h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="reinhard">Reinhard</SelectItem>
                <SelectItem value="cineon">Cineon</SelectItem>
                <SelectItem value="aces">ACES</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Exposure */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Exposure</Label>
            <DragInput
              value={scene.runtimeConfig.exposure}
              onChange={(value) => handleRuntimeConfigChange('exposure', value)}
              min={0.1}
              max={3}
              step={0.1}
              precision={1}
              className="w-16"
            />
          </div>
        </div>
      </div>

      {/* Scene Metadata */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <Palette size={14} />
          Scene Info
        </div>
        
        <div className="space-y-2 pl-4 text-xs text-zinc-400">
          <div className="flex justify-between">
            <span>Scene ID:</span>
            <span className="font-mono">{scene.id}</span>
          </div>
          <div className="flex justify-between">
            <span>Name:</span>
            <span>{scene.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Objects:</span>
            <span>{scene.objects.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Version:</span>
            <span>{scene.metadata.version}</span>
          </div>
          <div className="flex justify-between">
            <span>Created:</span>
            <span>{new Date(scene.metadata.created).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Modified:</span>
            <span>{new Date(scene.metadata.modified).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Legacy Material Detection and Upgrade */}
      {hasLegacyMaterials && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-red-400">
            <AlertTriangle size={14} />
            Legacy Materials Detected
          </div>
          
          <div className="p-3 bg-red-950/20 border border-red-800 rounded-lg">
            <AlertDescription className="text-xs text-red-200 mb-3">
              This scene contains {materialStats.legacyMeshComponents} legacy material{materialStats.legacyMeshComponents !== 1 ? 's' : ''} out of {materialStats.totalMeshComponents} total mesh components. 
              Legacy materials use an older format and should be upgraded for better performance and new features.
            </AlertDescription>
            
            <Button
              onClick={handleUpgradeScene}
              size="sm"
              variant="outline"
              className="w-full text-xs border-red-700 text-red-200 hover:bg-red-800/20"
            >
              Upgrade All Legacy Materials
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 