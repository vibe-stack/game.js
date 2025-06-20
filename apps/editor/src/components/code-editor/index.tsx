import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { X, Save, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useGameStudioStore from "@/stores/game-studio-store";
import { configureMonaco } from "./monaco-config";

// Configure Monaco to load locally instead of from CDN
loader.config({ monaco });

interface CodeFile {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  language: string;
}

interface CodeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: string;
}

export default function CodeEditor({ isOpen, onClose, initialFile }: CodeEditorProps) {
  const { currentProject } = useGameStudioStore();
  const [openFiles, setOpenFiles] = useState<CodeFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [monacoConfigured, setMonacoConfigured] = useState(false);
  
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialFile && isOpen) {
      openFile(initialFile);
    }
  }, [initialFile, isOpen]);

  const saveFile = useCallback(async (filePath: string) => {
    const file = openFiles.find(f => f.path === filePath);
    if (!file || !currentProject) return;

    try {
      await window.projectAPI.writeFile(filePath, file.content);
      setOpenFiles(prev => 
        prev.map(f => f.path === filePath ? { ...f, isDirty: false } : f)
      );
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  }, [openFiles, currentProject]);

  const handleEditorChange = (value: string | undefined, filePath: string) => {
    if (value === undefined) return;

    setOpenFiles(prev => 
      prev.map(f => 
        f.path === filePath 
          ? { ...f, content: value, isDirty: f.content !== value }
          : f
      )
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (activeFile) {
          saveFile(activeFile);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, activeFile, saveFile]);

  const handleEditorWillMount = (monacoInstance: any) => {
    if (!monacoConfigured) {
      configureMonaco(monacoInstance);
      setMonacoConfigured(true);
    }
  };

  const getLanguageFromPath = (filePath: string): string => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'ts':
        return 'typescript';
      case 'js':
        return 'javascript';
      case 'json':
        return 'json';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'md':
        return 'markdown';
      default:
        return 'plaintext';
    }
  };

  const openFile = async (filePath: string) => {
    if (!currentProject) return;

    // Check if file is already open
    const existingFile = openFiles.find(f => f.path === filePath);
    if (existingFile) {
      setActiveFile(filePath);
      return;
    }

    try {
      const content = await window.projectAPI.readFile(filePath);
      const fileName = filePath.split('/').pop() || filePath;
      const language = getLanguageFromPath(filePath);

      const newFile: CodeFile = {
        path: filePath,
        name: fileName,
        content,
        isDirty: false,
        language,
      };

      setOpenFiles(prev => [...prev, newFile]);
      setActiveFile(filePath);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const closeFile = (filePath: string) => {
    const file = openFiles.find(f => f.path === filePath);
    if (file?.isDirty) {
      const shouldClose = confirm(`${file.name} has unsaved changes. Close anyway?`);
      if (!shouldClose) return;
    }

    setOpenFiles(prev => prev.filter(f => f.path !== filePath));
    
    if (activeFile === filePath) {
      const remainingFiles = openFiles.filter(f => f.path !== filePath);
      setActiveFile(remainingFiles.length > 0 ? remainingFiles[0].path : null);
    }

    if (openFiles.length === 1) {
      onClose();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else if (isResizing) {
      const newWidth = Math.max(400, resizeStart.width + (e.clientX - resizeStart.x));
      const newHeight = Math.max(300, resizeStart.height + (e.clientY - resizeStart.y));
      setSize({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, dragStart, resizeStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    });
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  if (!isOpen || openFiles.length === 0) {
    return null;
  }

  const activeFileData = openFiles.find(f => f.path === activeFile);

  const containerStyle = isMaximized
    ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000,
      }
    : {
        position: 'fixed' as const,
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: 1000,
      };

  return (
    <div
      ref={containerRef}
      className="bg-background/50 backdrop-blur-lg border rounded-lg shadow-2xl overflow-hidden"
      style={containerStyle}
    >
      {/* Title Bar */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Code Editor</span>
          {activeFileData?.isDirty && (
            <span className="text-xs text-orange-500">●</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => activeFile && saveFile(activeFile)}
            disabled={!activeFileData?.isDirty}
          >
            <Save className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMaximize}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* File Tabs */}
      <Tabs value={activeFile || undefined} onValueChange={setActiveFile} className="flex-1 flex flex-col h-full pb-20">
        <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 h-10">
          {openFiles.map((file) => (
            <TabsTrigger
              key={file.path}
              value={file.path}
              className="relative group data-[state=active]:bg-background"
            >
              <span className="truncate max-w-32">{file.name}</span>
              {file.isDirty && <span className="ml-1 text-orange-500">●</span>}
              <span
                className="ml-2 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 cursor-pointer hover:bg-muted rounded flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.path);
                }}
              >
                <X className="w-3 h-3" />
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Editor Content */}
        {openFiles.map((file) => (
          <TabsContent
            key={file.path}
            value={file.path}
            className="flex-1 m-0 p-0"
          >
            <div className="h-full relative">
              <Editor
                height="100%"
                language={file.language}
                value={file.content}
                beforeMount={handleEditorWillMount}
                onChange={(value) => handleEditorChange(value, file.path)}
                onMount={(editor) => {
                  editorRef.current = editor;
                }}
                theme="gamejs-dark"
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  insertSpaces: true,
                  wordWrap: 'on',
                }}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Resize Handle */}
      {!isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-muted/50 hover:bg-muted"
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  );
} 