import React, { useState } from "react";
import useEditorStore from "@/stores/editor-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SceneTree from "./scene-tree";
import AssetsPanel from "./assets-panel";
import FileExplorer from "./file-explorer";
import CodeEditor from "@/components/code-editor";

interface LeftPanelProps {
  scene: GameScene | null;
  selectedObjects: string[];
  onSelectObject: (objectId: string, event?: React.MouseEvent) => void;
}

export default function LeftPanel({ scene, selectedObjects, onSelectObject }: LeftPanelProps) {
  const { physicsState } = useEditorStore();
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
  const [initialFile, setInitialFile] = useState<string | undefined>();

  const handleFileClick = (filePath: string) => {
    setInitialFile(filePath);
    setIsCodeEditorOpen(true);
  };

  const handleCloseCodeEditor = () => {
    setIsCodeEditorOpen(false);
    setInitialFile(undefined);
  };

  return (
    <>
      <div 
        className={`absolute left-4 top-20 z-10 w-80 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg transition-all duration-300 ease-in-out ${
          physicsState === 'playing' 
            ? 'opacity-0 -translate-x-5 pointer-events-none' 
            : 'opacity-100 translate-x-0'
        }`}
      >
        <Tabs defaultValue="hierarchy" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-b-none h-12">
            <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="hierarchy" className="p-0 m-0 max-h-[calc(100vh-10rem)] overflow-y-auto">
            <SceneTree 
              scene={scene}
              selectedObjects={selectedObjects}
              onSelectObject={onSelectObject}
            />
          </TabsContent>

          <TabsContent value="assets" className="p-0 m-0">
            <AssetsPanel scene={scene} />
          </TabsContent>

          <TabsContent value="files" className="p-0 m-0 max-h-[calc(100vh-10rem)] overflow-y-auto">
            <FileExplorer onFileClick={handleFileClick} />
          </TabsContent>
        </Tabs>
      </div>

      <CodeEditor
        isOpen={isCodeEditorOpen}
        onClose={handleCloseCodeEditor}
        initialFile={initialFile}
      />
    </>
  );
} 