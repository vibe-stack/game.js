import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  Plus, 
  Trash2, 
  Download,
  Loader2
} from "lucide-react";
import useEditorStore from "@/stores/editor-store";

interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  keywords?: string[];
  author?: string;
  license?: string;
  repository?: {
    type: string;
    url: string;
  };
  bugs?: {
    url: string;
  };
  homepage?: string;
}

export default function PackageJsonPanel() {
  const { currentProject } = useEditorStore();
  const [packageJson, setPackageJson] = useState<PackageJson>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [newDependency, setNewDependency] = useState({ name: "", version: "", isDev: false });
  const [packageManager, setPackageManager] = useState<string>("pnpm");

  useEffect(() => {
    loadPackageJson();
    detectPackageManager();
  }, [currentProject]);

  const loadPackageJson = async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      const packagePath = `${currentProject.path}/package.json`;
      const loadedPackage = await window.configAPI.readConfigFile(packagePath);
      setPackageJson(loadedPackage);
    } catch {
      // File doesn't exist, use empty object
      setPackageJson({});
    } finally {
      setLoading(false);
    }
  };

  const detectPackageManager = async () => {
    if (!currentProject) return;

    try {
      // First, try to read from GameJS config
      try {
        const gameJSConfigPath = `${currentProject.path}/gamejs.config.json`;
        const gameJSConfig = await window.configAPI.readConfigFile(gameJSConfigPath);
        if (gameJSConfig.packageManager) {
          setPackageManager(gameJSConfig.packageManager);
          return;
        }
      } catch {
        // GameJS config doesn't exist or doesn't have packageManager, continue to detection
      }

      // Fall back to lock file detection
      const info = await window.configAPI.getPackageInfo(currentProject.path);
      setPackageManager(info.suggestedPackageManager);
    } catch {
      setPackageManager("pnpm");
    }
  };

  const savePackageJson = async () => {
    if (!currentProject) return;

    setSaving(true);
    try {
      const packagePath = `${currentProject.path}/package.json`;
      await window.configAPI.writeConfigFile(packagePath, packageJson);
      console.log("package.json saved successfully");
    } catch {
      console.error("Failed to save package.json");
    } finally {
      setSaving(false);
    }
  };

  const updatePackageJson = (path: string, value: any) => {
    setPackageJson(prev => {
      const newPackage = { ...prev };
      const keys = path.split('.');
      let current: any = newPackage;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newPackage;
    });
  };

  const addDependency = () => {
    if (!newDependency.name) return;

    const depType = newDependency.isDev ? 'devDependencies' : 'dependencies';
    const version = newDependency.version || 'latest';
    
    updatePackageJson(`${depType}.${newDependency.name}`, version);
    setNewDependency({ name: "", version: "", isDev: false });
  };

  const removeDependency = (name: string, isDev: boolean) => {
    const depType = isDev ? 'devDependencies' : 'dependencies';
    const deps = { ...(packageJson[depType as keyof PackageJson] as Record<string, string>) };
    delete deps[name];
    updatePackageJson(depType, deps);
  };

  const installPackages = async () => {
    if (!currentProject) return;

    setInstalling(true);
    try {
      await window.configAPI.installPackages(currentProject.path, packageManager);
      console.log("Packages installed successfully");
    } catch {
      console.error("Failed to install packages");
    } finally {
      setInstalling(false);
    }
  };

  const addKeyword = (keyword: string) => {
    if (!keyword.trim()) return;
    const currentKeywords = packageJson.keywords || [];
    if (!currentKeywords.includes(keyword.trim())) {
      updatePackageJson('keywords', [...currentKeywords, keyword.trim()]);
    }
  };

  const removeKeyword = (keyword: string) => {
    const currentKeywords = packageJson.keywords || [];
    updatePackageJson('keywords', currentKeywords.filter(k => k !== keyword));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-muted-foreground">Loading package.json...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Package Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage dependencies and package.json settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={installPackages}
            disabled={installing}
          >
            {installing ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Download size={16} className="mr-2" />
            )}
            {installing ? "Installing..." : `Install (${packageManager})`}
          </Button>
          <Button size="sm" onClick={savePackageJson} disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Basic Package Info */}
      <div className="space-y-4">
        <h3 className="text-md font-medium">Package Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pkg-name">Package Name</Label>
            <Input
              id="pkg-name"
              value={packageJson.name || ""}
              onChange={(e) => updatePackageJson('name', e.target.value)}
              placeholder="my-game-project"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pkg-version">Version</Label>
            <Input
              id="pkg-version"
              value={packageJson.version || ""}
              onChange={(e) => updatePackageJson('version', e.target.value)}
              placeholder="1.0.0"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pkg-description">Description</Label>
          <Input
            id="pkg-description"
            value={packageJson.description || ""}
            onChange={(e) => updatePackageJson('description', e.target.value)}
            placeholder="A brief description of your project"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pkg-author">Author</Label>
            <Input
              id="pkg-author"
              value={packageJson.author || ""}
              onChange={(e) => updatePackageJson('author', e.target.value)}
              placeholder="Your Name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pkg-license">License</Label>
            <Input
              id="pkg-license"
              value={packageJson.license || ""}
              onChange={(e) => updatePackageJson('license', e.target.value)}
              placeholder="MIT"
            />
          </div>
        </div>
      </div>

      {/* Keywords */}
      <div className="space-y-4">
        <h3 className="text-md font-medium">Keywords</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {(packageJson.keywords || []).map((keyword, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {keyword}
              <button 
                onClick={() => removeKeyword(keyword)}
                className="ml-1 hover:text-destructive"
              >
                <Trash2 size={12} />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a keyword"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addKeyword(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
        </div>
      </div>

      {/* Dependencies */}
      <div className="space-y-4">
        <h3 className="text-md font-medium">Dependencies</h3>
        
        {/* Add New Dependency */}
        <div className="p-4 border rounded-lg space-y-3">
          <h4 className="text-sm font-medium">Add New Dependency</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Package name (e.g., three)"
              value={newDependency.name}
              onChange={(e) => setNewDependency(prev => ({ ...prev, name: e.target.value }))}
              className="flex-1"
            />
            <Input
              placeholder="Version (optional)"
              value={newDependency.version}
              onChange={(e) => setNewDependency(prev => ({ ...prev, version: e.target.value }))}
              className="w-32"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newDependency.isDev}
                onChange={(e) => setNewDependency(prev => ({ ...prev, isDev: e.target.checked }))}
              />
              Dev
            </label>
            <Button size="sm" onClick={addDependency}>
              <Plus size={16} />
            </Button>
          </div>
        </div>

        {/* Production Dependencies */}
        {packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Production Dependencies</h4>
            <div className="space-y-2">
              {Object.entries(packageJson.dependencies).map(([name, version]) => (
                <div key={name} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{name}</span>
                    <Badge variant="outline" className="text-xs">{version}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeDependency(name, false)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dev Dependencies */}
        {packageJson.devDependencies && Object.keys(packageJson.devDependencies).length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Development Dependencies</h4>
            <div className="space-y-2">
              {Object.entries(packageJson.devDependencies).map(([name, version]) => (
                <div key={name} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{name}</span>
                    <Badge variant="outline" className="text-xs">{version}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeDependency(name, true)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scripts */}
      <div className="space-y-4">
        <h3 className="text-md font-medium">Scripts</h3>
        <div className="space-y-2">
          {packageJson.scripts && Object.entries(packageJson.scripts).map(([name, command]) => (
            <div key={name} className="grid grid-cols-3 gap-2">
              <Input
                value={name}
                onChange={(e) => {
                  const newScripts = { ...packageJson.scripts };
                  delete newScripts[name];
                  newScripts[e.target.value] = command;
                  updatePackageJson('scripts', newScripts);
                }}
                placeholder="Script name"
              />
              <Input
                value={command}
                onChange={(e) => updatePackageJson(`scripts.${name}`, e.target.value)}
                placeholder="Command"
                className="col-span-2"
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const scripts = packageJson.scripts || {};
              scripts[`script${Object.keys(scripts).length + 1}`] = '';
              updatePackageJson('scripts', scripts);
            }}
          >
            <Plus size={16} className="mr-2" />
            Add Script
          </Button>
        </div>
      </div>
    </div>
  );
} 