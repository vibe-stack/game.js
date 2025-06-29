import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Code, 
  Play,
  GamepadIcon,
  Heart,
  Bot,
  Package,
  Sun,
  CheckCircle,
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
    if (script.path) return script.path;
    if (script.id.includes('rotation')) return 'Rotates entity continuously';
    if (script.id.includes('movement')) return 'Physics-based movement';
    if (script.id.includes('health')) return 'Health system with damage';
    if (script.id.includes('ai')) return 'Basic AI behavior';
    if (script.id.includes('collectible')) return 'Collectible item';
    if (script.id.includes('spawner')) return 'Entity spawner';
    if (script.id.includes('daynight')) return 'Day/night cycle';
    return 'Custom behavior';
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
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
        <Input
          placeholder="Search scripts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-7 pl-8 bg-gray-900/50 border-gray-800 text-gray-200 text-xs placeholder:text-gray-600"
        />
      </div>

      {/* Scripts by category */}
      <div className="space-y-3">
        {sortedCategories.map(([category, scripts]) => (
          <div key={category} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                {category}
              </h5>
              <Badge variant="secondary" className="text-xs bg-gray-800 text-gray-500 border-0">
                {scripts.length}
              </Badge>
            </div>
            
            <div className="space-y-1">
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
      </div>

      {filteredScripts.length === 0 && (
        <div className="flex flex-col items-center justify-center h-32 text-gray-500">
          <Search className="h-6 w-6 mb-2 opacity-50" />
          <p className="text-sm">No scripts found</p>
          <p className="text-xs opacity-60">Try a different search term</p>
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
    <div className={`group p-2.5 rounded-md transition-colors ${
      isAttached 
        ? 'bg-gray-800/30' 
        : 'bg-gray-900/50 hover:bg-gray-800/50'
    }`}>
      <div className="flex items-start gap-2">
        <div className={`flex-shrink-0 w-7 h-7 rounded flex items-center justify-center ${
          isFileScript ? 'bg-blue-500/10' : 'bg-green-500/10'
        }`}>
          <IconComponent className={`h-3.5 w-3.5 ${
            isFileScript ? 'text-blue-400' : 'text-green-400'
          }`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-medium text-gray-200 truncate">
              {script.name}
            </h4>
            {isAttached && (
              <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {description}
          </p>
          
          {/* Parameters preview */}
          {script.parameters && script.parameters.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {script.parameters.slice(0, 3).map((param: any, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs h-4 px-1 border-gray-700 text-gray-500">
                  {param.name}
                </Badge>
              ))}
              {script.parameters.length > 3 && (
                <Badge variant="outline" className="text-xs h-4 px-1 border-gray-700 text-gray-500">
                  +{script.parameters.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {/* Attach button */}
        <Button
          onClick={onAttach}
          disabled={isAttached}
          size="sm"
          className={`h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity ${
            isAttached 
              ? 'bg-green-600/20 text-green-400 cursor-not-allowed' 
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          }`}
        >
          {isAttached ? 'Attached' : 'Attach'}
        </Button>
      </div>
    </div>
  );
} 