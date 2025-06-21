import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Save,
  FolderOpen,
  Loader2Icon,
  Settings,
  Download,
  FileText,
  Box,
  Layers,
  Play,
} from "lucide-react";
import useGameStudioStore from "@/stores/game-studio-store";
import GameControlsToolbar from "./physics-controls-toolbar";
import { SettingsDialog } from "@/components/settings-dialog";

interface MainControlsToolbarProps {
  isSaving: boolean;
  onSave: () => void;
  onOpenFolder: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onResume: () => void;
}

export default function MainControlsToolbar({
  isSaving,
  onSave,
  onOpenFolder,
  onPlay,
  onPause,
  onStop,
  onResume,
}: MainControlsToolbarProps) {
  const { gameState, isExporting, setExporting, loadScene, loadDefaultScene, currentProject, currentSceneName } = useGameStudioStore();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave]);

  const handleExport = async (format: "json" | "threejs" | "glb") => {
    setExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 p-1 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg transition-all duration-300 ease-in-out ${gameState === 'playing' ? 'pointer-events-none -translate-x-5 opacity-0' : 'translate-x-0 opacity-100'}`}>
          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)} className="h-8 gap-2" title="Project Settings"><Settings size={16} /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-2" disabled={isExporting} title="Export Scene">
                {isExporting ? <Loader2Icon size={16} className="animate-spin" /> : <Download size={16} />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent><DropdownMenuLabel>Export Format</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleExport("json")}><FileText className="mr-2 h-4 w-4" /><span>GameJS Scene (.json)</span></DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={onOpenFolder} className="h-8 gap-2" title="Open Project Folder"><FolderOpen size={16} /></Button>
          <Button size="sm" onClick={onSave} disabled={isSaving} className="h-8 gap-2" title="Save Scene (Ctrl+S)">{isSaving ? <Loader2Icon size={16} className="animate-spin" /> : <Save size={16} />}</Button>
        </div>
        <GameControlsToolbar physicsState={gameState} onPlay={onPlay} onPause={onPause} onStop={onStop} onResume={onResume} />
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}