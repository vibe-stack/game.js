import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save, RotateCcw } from "lucide-react";
import useEditorStore from "@/stores/editor-store";

interface GameJSConfig {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  license?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  viewport?: {
    width?: number;
    height?: number;
    resizable?: boolean;
  };
  physics?: {
    enabled?: boolean;
    gravity?: { x: number; y: number; z: number };
  };
  rendering?: {
    shadows?: boolean;
    antialias?: boolean;
    pixelRatio?: number;
  };
}

const defaultConfig: GameJSConfig = {
  name: "",
  version: "1.0.0",
  description: "",
  author: "",
  license: "MIT",
  packageManager: "pnpm",
  viewport: {
    width: 800,
    height: 600,
    resizable: true
  },
  physics: {
    enabled: true,
    gravity: { x: 0, y: -9.81, z: 0 }
  },
  rendering: {
    shadows: true,
    antialias: true,
    pixelRatio: 1
  }
};

export default function GameJSConfigPanel() {
  const { currentProject } = useEditorStore();
  const [config, setConfig] = useState<GameJSConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [currentProject]);

  const loadConfig = async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      const configPath = `${currentProject.path}/gamejs.config.json`;
      const loadedConfig = await window.configAPI.readConfigFile(configPath);
      setConfig({ ...defaultConfig, ...loadedConfig });
    } catch {
      // File doesn't exist, use defaults
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!currentProject) return;

    setSaving(true);
    try {
      const configPath = `${currentProject.path}/gamejs.config.json`;
      await window.configAPI.writeConfigFile(configPath, config);
      console.log("GameJS configuration saved successfully");
    } catch {
      console.error("Failed to save GameJS configuration");
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = () => {
    setConfig(defaultConfig);
  };

  const updateConfig = (path: string, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current: any = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-muted-foreground">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">GameJS Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Configure your game project settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetConfig}>
            <RotateCcw size={16} className="mr-2" />
            Reset
          </Button>
          <Button size="sm" onClick={saveConfig} disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-md font-medium">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Game Name</Label>
            <Input
              id="name"
              value={config.name || ""}
              onChange={(e) => updateConfig('name', e.target.value)}
              placeholder="My Awesome Game"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              value={config.version || ""}
              onChange={(e) => updateConfig('version', e.target.value)}
              placeholder="1.0.0"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={config.description || ""}
            onChange={(e) => updateConfig('description', e.target.value)}
            placeholder="A brief description of your game"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={config.author || ""}
              onChange={(e) => updateConfig('author', e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="license">License</Label>
            <Select value={config.license || "MIT"} onValueChange={(value) => updateConfig('license', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MIT">MIT</SelectItem>
                <SelectItem value="Apache-2.0">Apache-2.0</SelectItem>
                <SelectItem value="GPL-3.0">GPL-3.0</SelectItem>
                <SelectItem value="BSD-3-Clause">BSD-3-Clause</SelectItem>
                <SelectItem value="ISC">ISC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="packageManager">Package Manager</Label>
          <Select 
            value={config.packageManager || "pnpm"} 
            onValueChange={(value) => updateConfig('packageManager', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pnpm">pnpm</SelectItem>
              <SelectItem value="npm">npm</SelectItem>
              <SelectItem value="yarn">yarn</SelectItem>
              <SelectItem value="bun">bun</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Viewport Settings */}
      <div className="space-y-4">
        <h3 className="text-md font-medium">Viewport Settings</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="viewport-width">Width</Label>
            <Input
              id="viewport-width"
              type="number"
              value={config.viewport?.width || 800}
              onChange={(e) => updateConfig('viewport.width', parseInt(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="viewport-height">Height</Label>
            <Input
              id="viewport-height"
              type="number"
              value={config.viewport?.height || 600}
              onChange={(e) => updateConfig('viewport.height', parseInt(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="viewport-resizable">Resizable</Label>
            <div className="flex items-center space-x-2 h-10">
              <Switch
                id="viewport-resizable"
                checked={config.viewport?.resizable ?? true}
                onCheckedChange={(checked) => updateConfig('viewport.resizable', checked)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Physics Settings */}
      <div className="space-y-4">
        <h3 className="text-md font-medium">Physics Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="physics-enabled"
              checked={config.physics?.enabled ?? true}
              onCheckedChange={(checked) => updateConfig('physics.enabled', checked)}
            />
            <Label htmlFor="physics-enabled">Enable Physics</Label>
          </div>
          {config.physics?.enabled && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gravity-x">Gravity X</Label>
                <Input
                  id="gravity-x"
                  type="number"
                  step="0.1"
                  value={config.physics?.gravity?.x || 0}
                  onChange={(e) => updateConfig('physics.gravity.x', parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gravity-y">Gravity Y</Label>
                <Input
                  id="gravity-y"
                  type="number"
                  step="0.1"
                  value={config.physics?.gravity?.y || -9.81}
                  onChange={(e) => updateConfig('physics.gravity.y', parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gravity-z">Gravity Z</Label>
                <Input
                  id="gravity-z"
                  type="number"
                  step="0.1"
                  value={config.physics?.gravity?.z || 0}
                  onChange={(e) => updateConfig('physics.gravity.z', parseFloat(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rendering Settings */}
      <div className="space-y-4">
        <h3 className="text-md font-medium">Rendering Settings</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="shadows"
                checked={config.rendering?.shadows ?? true}
                onCheckedChange={(checked) => updateConfig('rendering.shadows', checked)}
              />
              <Label htmlFor="shadows">Enable Shadows</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="antialias"
                checked={config.rendering?.antialias ?? true}
                onCheckedChange={(checked) => updateConfig('rendering.antialias', checked)}
              />
              <Label htmlFor="antialias">Enable Antialiasing</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pixel-ratio">Pixel Ratio</Label>
            <Input
              id="pixel-ratio"
              type="number"
              step="0.1"
              min="0.1"
              max="3.0"
              value={config.rendering?.pixelRatio || 1}
              onChange={(e) => updateConfig('rendering.pixelRatio', parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 