import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Search, 
  Code, 
  Zap, 
  Play,
  GamepadIcon,
  Heart,
  Bot,
  Package,
  Sun,
  CheckCircle,
  File,
  FileCode,
  FolderOpen
} from "lucide-react";
import { ScriptManager, EXAMPLE_SCRIPTS, getExampleScriptIds } from "@/models";
import { ScriptLoaderService } from "@/services/script-loader-service";
import useGameStudioStore from "@/stores/game-studio-store";

interface ScriptLibraryProps {
  scriptManager: ScriptManager;
  attachedScripts: string[];
  onAttachScript: (scriptId: string) => void;
}

// Icon mapping for different script types
const getScriptIcon = (scriptId: string) => {
  // File-based scripts use file icon
  if (scriptId.startsWith('file:')) return FileCode;
  
  // Example scripts
  if (scriptId.includes('rotation')) return Play;
  if (scriptId.includes('movement') || scriptId.includes('input')) return GamepadIcon;
  if (scriptId.includes('health')) return Heart;
  if (scriptId.includes('ai')) return Bot;
  if (scriptId.includes('collectible')) return Package;
  if (scriptId.includes('spawner')) return Plus;
  if (scriptId.includes('daynight')) return Sun;
  return Code;
};

export function ScriptLibrary({
  scriptManager,
  attachedScripts,
  onAttachScript
}: ScriptLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { currentProject } = useGameStudioStore();
  const scriptLoaderService = ScriptLoaderService.getInstance();
  
  // Poll for script updates every 2 seconds
  useEffect(() => {
    if (!currentProject) return;
    
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [currentProject]);
  
  // Get file-based scripts (refresh when trigger changes)
  const fileScripts = useMemo(() => {
    if (!currentProject) return [];
    // Force refresh by including refreshTrigger in dependency
    return scriptLoaderService.getLoadedScripts(currentProject.path);
  }, [currentProject, refreshTrigger]);
  
  // Get all available example scripts
  const exampleScriptIds = getExampleScriptIds();
  
  // Helper function to get category from script name/id
  const getScriptCategory = (script: any) => {
    if (script.id?.startsWith('file:')) return 'Project Scripts';
    if (script.id.includes('movement') || script.id.includes('physics')) return 'Movement';
    if (script.id.includes('health') || script.id.includes('damage')) return 'Combat';
    if (script.id.includes('ai') || script.id.includes('behavior')) return 'AI';
    if (script.id.includes('collectible') || script.id.includes('spawner')) return 'Gameplay';
    if (script.id.includes('daynight') || script.id.includes('environment')) return 'Environment';
    if (script.id.includes('rotation') || script.id.includes('animation')) return 'Animation';
    return 'Utility';
  };

  // Helper function to get description from script name/id
  const getScriptDescription = (script: any) => {
    if (script.path) return `Located at: ${script.path}`;
    if (script.id.includes('rotation')) return 'Continuously rotates the entity around its Y axis';
    if (script.id.includes('movement')) return 'Physics-based movement with keyboard input';
    if (script.id.includes('health')) return 'Health system with damage and healing capabilities';
    if (script.id.includes('ai')) return 'Basic AI behavior with chase and attack states';
    if (script.id.includes('collectible')) return 'Makes entity collectible with interaction effects';
    if (script.id.includes('spawner')) return 'Spawns entities at regular intervals';
    if (script.id.includes('daynight')) return 'Day/night cycle with dynamic lighting';
    return 'Custom behavior script';
  };

  // Combine file scripts and example scripts for filtering
  const allScripts = [
    ...fileScripts.map(fs => ({ ...fs.config, path: fs.path })),
    ...exampleScriptIds.map(scriptKey => {
      const script = EXAMPLE_SCRIPTS[scriptKey as keyof typeof EXAMPLE_SCRIPTS];
      return { ...script, path: undefined };
    })
  ];

  // Filter scripts based on search query
  const filteredScripts = allScripts.filter(script => {
    const query = searchQuery.toLowerCase();
    const category = getScriptCategory(script);
    const description = getScriptDescription(script);
    
    return (
      script.name.toLowerCase().includes(query) ||
      description.toLowerCase().includes(query) ||
      category.toLowerCase().includes(query) ||
      (script.path && script.path.toLowerCase().includes(query))
    );
  });

  // Group scripts by category
  const scriptsByCategory = filteredScripts.reduce((acc, script) => {
    const category = getScriptCategory(script);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(script);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort categories to show Project Scripts first
  const sortedCategories = Object.entries(scriptsByCategory).sort(([a], [b]) => {
    if (a === 'Project Scripts') return -1;
    if (b === 'Project Scripts') return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search scripts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
        />
      </div>

      {/* Scripts by category */}
      {sortedCategories.map(([category, scripts], index) => (
        <div key={category} className="space-y-2">
          {index > 0 && <Separator className="bg-white/10" />}
          
          <div className="flex items-center gap-2">
            {category === 'Project Scripts' && <FolderOpen className="h-4 w-4 text-lime-300" />}
            <h4 className="text-sm font-medium text-lime-300 uppercase tracking-wide">
              {category}
            </h4>
            <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-lime-500/20 text-lime-300">
              {scripts.length}
            </Badge>
          </div>
          
          <div className="space-y-2">
            {scripts.map((script) => {
              const isAttached = attachedScripts.includes(script.id);
              const IconComponent = getScriptIcon(script.id);
              
              return (
                <ScriptLibraryCard
                  key={script.id}
                  script={script}
                  description={getScriptDescription(script)}
                  icon={IconComponent}
                  isAttached={isAttached}
                  isFileScript={script.id?.startsWith('file:')}
                  scriptPath={script.path}
                  onAttach={() => onAttachScript(script.id)}
                />
              );
            })}
          </div>
        </div>
      ))}

      {filteredScripts.length === 0 && (
        <div className="flex flex-col items-center justify-center h-32 text-gray-400">
          <Search className="h-6 w-6 mb-2" />
          <p className="text-sm">No scripts found</p>
          <p className="text-xs text-gray-500">Try a different search term</p>
        </div>
      )}
    </div>
  );
}

interface ScriptLibraryCardProps {
  script: any; // ScriptConfig type
  description: string;
  icon: React.ComponentType<any>;
  isAttached: boolean;
  isFileScript?: boolean;
  scriptPath?: string;
  onAttach: () => void;
}

function ScriptLibraryCard({ 
  script, 
  description,
  icon: IconComponent, 
  isAttached,
  isFileScript,
  scriptPath,
  onAttach 
}: ScriptLibraryCardProps) {
  
  return (
    <Card className="bg-white/5 hover:bg-white/10 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              isFileScript ? 'bg-blue-500/20' : 'bg-lime-500/20'
            }`}>
              <IconComponent className={`h-4 w-4 ${
                isFileScript ? 'text-blue-400' : 'text-lime-400'
              }`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm text-white truncate">
                {script.name}
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                {isFileScript ? 'File Script' : `Priority: ${script.priority}`}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isAttached && (
              <Badge variant="secondary" className="text-xs px-2 py-0 bg-green-500/20 text-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Attached
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-xs text-gray-300 mb-3 line-clamp-2">
          {description}
        </p>
        
        {!isFileScript && (
          /* Lifecycle badges for example scripts */
          <div className="mb-3 flex flex-wrap gap-1">
            {script.lifecycle?.init && (
              <Badge variant="outline" className="text-xs px-1 py-0 border-blue-400/30 text-blue-300">
                init
              </Badge>
            )}
            {script.lifecycle?.update && (
              <Badge variant="outline" className="text-xs px-1 py-0 border-green-400/30 text-green-300">
                update
              </Badge>
            )}
            {script.lifecycle?.fixedUpdate && (
              <Badge variant="outline" className="text-xs px-1 py-0 border-yellow-400/30 text-yellow-300">
                fixedUpdate
              </Badge>
            )}
            {script.lifecycle?.destroy && (
              <Badge variant="outline" className="text-xs px-1 py-0 border-red-400/30 text-red-300">
                destroy
              </Badge>
            )}
          </div>
        )}
        
        {/* Script parameters */}
        {script.parameters && script.parameters.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-1">Parameters:</p>
            <div className="flex flex-wrap gap-1">
              {script.parameters.map((param: any, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs px-1 py-0 border-purple-400/30 text-purple-300">
                  {param.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Attach button */}
        <Button
          onClick={onAttach}
          disabled={isAttached}
          size="sm"
          className={`w-full text-xs ${
            isAttached 
              ? 'bg-green-500/20 text-green-300 cursor-not-allowed' 
              : isFileScript
                ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                : 'bg-lime-500/20 text-lime-300 hover:bg-lime-500/30'
          }`}
        >
          {isAttached ? (
            <>
              <CheckCircle className="h-3 w-3 mr-1" />
              Already Attached
            </>
          ) : (
            <>
              <Plus className="h-3 w-3 mr-1" />
              Attach Script
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
} 