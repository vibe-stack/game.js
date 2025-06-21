import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, RotateCcw, AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import useGameStudioStore from "@/stores/game-studio-store";

export default function AdvancedPanel() {
  const { currentProject } = useGameStudioStore();
  const [gameJSConfig, setGameJSConfig] = useState("");
  const [packageJson, setPackageJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeFile, setActiveFile] = useState<"gamejs" | "package">("gamejs");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadConfigs();
  }, [currentProject]);

  const loadConfigs = async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      // Load GameJS config
      try {
        const gameJSConfigPath = `${currentProject.path}/gamejs.config.json`;
        const gameJSData = await window.configAPI.readConfigFile(gameJSConfigPath);
        setGameJSConfig(JSON.stringify(gameJSData, null, 2));
      } catch {
        setGameJSConfig("{}");
      }

      // Load package.json
      try {
        const packagePath = `${currentProject.path}/package.json`;
        const packageData = await window.configAPI.readConfigFile(packagePath);
        setPackageJson(JSON.stringify(packageData, null, 2));
      } catch {
        setPackageJson("{}");
      }
    } finally {
      setLoading(false);
    }
  };

  const validateJson = (jsonString: string, fileName: string): boolean => {
    try {
      JSON.parse(jsonString);
      setValidationErrors(prev => ({
        ...prev,
        [fileName]: ""
      }));
      return true;
    } catch (error) {
      setValidationErrors(prev => ({
        ...prev,
        [fileName]: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
      return false;
    }
  };

  const saveConfig = async (configType: "gamejs" | "package") => {
    if (!currentProject) return;

    const content = configType === "gamejs" ? gameJSConfig : packageJson;
    const fileName = configType === "gamejs" ? "gamejs.config.json" : "package.json";
    
    if (!validateJson(content, configType)) {
      return;
    }

    setSaving(true);
    try {
      const filePath = `${currentProject.path}/${fileName}`;
      const parsedContent = JSON.parse(content);
      await window.configAPI.writeConfigFile(filePath, parsedContent);
    } catch {
      console.error(`Failed to save ${fileName}`);
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = (configType: "gamejs" | "package") => {
    if (configType === "gamejs") {
      setGameJSConfig("{}");
    } else {
      setPackageJson("{}");
    }
    setValidationErrors(prev => ({
      ...prev,
      [configType]: ""
    }));
  };

  const formatJson = (configType: "gamejs" | "package") => {
    const content = configType === "gamejs" ? gameJSConfig : packageJson;
    try {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      
      if (configType === "gamejs") {
        setGameJSConfig(formatted);
      } else {
        setPackageJson(formatted);
      }
      
      setValidationErrors(prev => ({
        ...prev,
        [configType]: ""
      }));
    } catch (error) {
      setValidationErrors(prev => ({
        ...prev,
        [configType]: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  };

  const renderConfigEditor = (
    configType: "gamejs" | "package",
    content: string,
    setContent: (value: string) => void,
    fileName: string
  ) => {
    const hasError = !!validationErrors[configType];
    const isValid = content && !hasError;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-md font-medium">{fileName}</h3>
            <p className="text-sm text-muted-foreground">
              Edit the raw JSON configuration file
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isValid && (
              <CheckCircle size={16} className="text-green-500" />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => formatJson(configType)}
            >
              Format
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetConfig(configType)}
            >
              <RotateCcw size={16} className="mr-2" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={() => saveConfig(configType)}
              disabled={saving || hasError}
            >
              <Save size={16} className="mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {hasError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {validationErrors[configType]}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor={`${configType}-editor`}>JSON Content</Label>
          <Textarea
            id={`${configType}-editor`}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              validateJson(e.target.value, configType);
            }}
            className={`font-mono text-sm min-h-[400px] ${hasError ? 'border-destructive' : ''}`}
            placeholder={`Enter ${fileName} content...`}
          />
        </div>

        <div className="text-xs text-muted-foreground">
          <p>⚠️ <strong>Warning:</strong> Editing raw JSON can break your project if not done correctly.</p>
          <p>Make sure to validate your JSON before saving. Use the Format button to pretty-print your JSON.</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-muted-foreground">Loading configuration files...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Advanced Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Edit raw JSON configuration files directly
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This section allows direct editing of configuration files. Only edit these files if you know what you're doing.
          Invalid JSON will prevent your project from working correctly.
        </AlertDescription>
      </Alert>

      <Tabs value={activeFile} onValueChange={(value) => setActiveFile(value as "gamejs" | "package")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gamejs">gamejs.config.json</TabsTrigger>
          <TabsTrigger value="package">package.json</TabsTrigger>
        </TabsList>
        
        <TabsContent value="gamejs" className="mt-6">
          {renderConfigEditor("gamejs", gameJSConfig, setGameJSConfig, "gamejs.config.json")}
        </TabsContent>
        
        <TabsContent value="package" className="mt-6">
          {renderConfigEditor("package", packageJson, setPackageJson, "package.json")}
        </TabsContent>
      </Tabs>
    </div>
  );
} 