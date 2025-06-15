import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FileText, 
  Plus, 
  FolderPlus,
  Trash2,
  Edit3
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useEditorStore from "@/stores/editor-store";

interface FileExplorerProps {
  onFileClick: (filePath: string) => void;
}

interface FileTreeNode extends FileSystemItem {
  children?: FileTreeNode[];
  depth: number;
}

interface DialogState {
  type: 'create-file' | 'create-folder' | 'rename' | 'delete' | null;
  targetPath?: string;
  targetName?: string;
  isDirectory?: boolean;
}

export default function FileExplorer({ onFileClick }: FileExplorerProps) {
  const { currentProject } = useEditorStore();
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [dialogState, setDialogState] = useState<DialogState>({ type: null });
  const [inputValue, setInputValue] = useState("");
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentProject) {
      loadProjectFiles();
    }
  }, [currentProject]);

  useEffect(() => {
    if (dialogState.type && inputRef.current) {
      inputRef.current.focus();
      if (dialogState.type === 'rename' && dialogState.targetName) {
        inputRef.current.select();
      }
    }
  }, [dialogState.type]);

  const loadProjectFiles = useCallback(async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      const rootFiles = await window.projectAPI.listDirectory(currentProject.path);
      const tree = buildFileTree(rootFiles, currentProject.path, 0);
      setFileTree(tree);
    } catch (error) {
      console.error("Failed to load project files:", error);
      setFileTree([]);
    } finally {
      setLoading(false);
    }
  }, [currentProject, expandedDirs]);

  const buildFileTree = (items: FileSystemItem[], basePath: string, depth: number): FileTreeNode[] => {
    return items.map(item => ({
      ...item,
      depth,
      children: item.type === 'directory' ? [] : undefined,
    }));
  };

  const loadDirectoryChildren = useCallback(async (dirPath: string): Promise<FileTreeNode[]> => {
    try {
      const items = await window.projectAPI.listDirectory(dirPath);
      return buildFileTree(items, dirPath, 0); // depth will be corrected when inserted
    } catch (error) {
      console.error(`Failed to load directory ${dirPath}:`, error);
      return [];
    }
  }, []);

  const toggleDirectory = useCallback(async (dirPath: string) => {
    const newExpandedDirs = new Set(expandedDirs);
    
    if (expandedDirs.has(dirPath)) {
      // Collapse directory
      newExpandedDirs.delete(dirPath);
      setExpandedDirs(newExpandedDirs);
      
      // Remove children from tree
      setFileTree(prevTree => {
        const updateTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
          return nodes.map(node => {
            if (node.path === dirPath && node.type === 'directory') {
              return { ...node, children: [] };
            }
            if (node.children) {
              return { ...node, children: updateTree(node.children) };
            }
            return node;
          });
        };
        return updateTree(prevTree);
      });
    } else {
      // Expand directory
      newExpandedDirs.add(dirPath);
      setExpandedDirs(newExpandedDirs);
      
      // Load and add children to tree
      const children = await loadDirectoryChildren(dirPath);
      setFileTree(prevTree => {
        const updateTree = (nodes: FileTreeNode[], parentDepth: number = 0): FileTreeNode[] => {
          return nodes.map(node => {
            if (node.path === dirPath && node.type === 'directory') {
              const adjustedChildren = children.map(child => ({
                ...child,
                depth: parentDepth + 1
              }));
              return { ...node, children: adjustedChildren };
            }
            if (node.children) {
              return { ...node, children: updateTree(node.children, node.depth) };
            }
            return node;
          });
        };
        return updateTree(prevTree);
      });
    }
  }, [expandedDirs, loadDirectoryChildren]);

  const handleFileClick = useCallback((item: FileTreeNode) => {
    if (item.type === 'directory') {
      toggleDirectory(item.path);
    } else if (item.extension === '.ts' || item.extension === '.js') {
      onFileClick(item.path);
    }
  }, [toggleDirectory, onFileClick]);

  const getFileIcon = useCallback((item: FileTreeNode) => {
    if (item.type === 'directory') {
      const isExpanded = expandedDirs.has(item.path);
      return (
        <div className="flex items-center gap-1">
          <Folder className="w-4 h-4 text-yellow-600" />
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </div>
      );
    }
    
    if (item.extension === '.ts' || item.extension === '.js') {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
    
    return <File className="w-4 h-4 text-gray-500" />;
  }, [expandedDirs]);

  const handleCreateFile = useCallback((parentPath: string) => {
    setDialogState({ 
      type: 'create-file', 
      targetPath: parentPath 
    });
    setInputValue("");
  }, []);

  const handleCreateFolder = useCallback((parentPath: string) => {
    setDialogState({ 
      type: 'create-folder', 
      targetPath: parentPath 
    });
    setInputValue("");
  }, []);

  const handleRename = useCallback((item: FileTreeNode) => {
    setDialogState({ 
      type: 'rename', 
      targetPath: item.path,
      targetName: item.name,
      isDirectory: item.type === 'directory'
    });
    setInputValue(item.name);
  }, []);

  const handleDelete = useCallback((item: FileTreeNode) => {
    setDialogState({ 
      type: 'delete', 
      targetPath: item.path,
      targetName: item.name,
      isDirectory: item.type === 'directory'
    });
  }, []);

  const executeAction = useCallback(async () => {
    if (!dialogState.type || !dialogState.targetPath) return;

    setProcessing(true);
    try {
      switch (dialogState.type) {
        case 'create-file': {
          const fileName = inputValue.trim();
          if (!fileName) return;
          
          const filePath = `${dialogState.targetPath}/${fileName}`;
          await window.projectAPI.createFile(filePath);
          break;
        }
        
        case 'create-folder': {
          const folderName = inputValue.trim();
          if (!folderName) return;
          
          const folderPath = `${dialogState.targetPath}/${folderName}`;
          await window.projectAPI.createDirectory(folderPath);
          break;
        }
        
        case 'rename': {
          const newName = inputValue.trim();
          if (!newName || newName === dialogState.targetName) return;
          
          const parentDir = dialogState.targetPath.substring(0, dialogState.targetPath.lastIndexOf('/'));
          const newPath = `${parentDir}/${newName}`;
          await window.projectAPI.renameItem(dialogState.targetPath, newPath);
          break;
        }
        
        case 'delete': {
          if (dialogState.isDirectory) {
            await window.projectAPI.deleteDirectory(dialogState.targetPath);
          } else {
            await window.projectAPI.deleteFile(dialogState.targetPath);
          }
          break;
        }
      }
      
      // Refresh the file tree
      await loadProjectFiles();
      
      // Close dialog
      setDialogState({ type: null });
      setInputValue("");
    } catch (error) {
      console.error(`Failed to ${dialogState.type}:`, error);
    } finally {
      setProcessing(false);
    }
  }, [dialogState, inputValue, loadProjectFiles]);

  const renderFileTree = useCallback((nodes: FileTreeNode[]): React.ReactNode => {
    return nodes.map((node) => {
      const isExpanded = node.type === 'directory' && expandedDirs.has(node.path);
      
      return (
        <div key={node.path}>
          <ContextMenu>
            <ContextMenuTrigger>
              <div
                className={`flex items-center gap-2 px-2 py-1 hover:bg-accent/50 cursor-pointer text-sm ${
                  node.type === 'directory' ? 'font-medium' : ''
                }`}
                style={{ paddingLeft: `${8 + node.depth * 16}px` }}
                onClick={() => handleFileClick(node)}
              >
                {getFileIcon(node)}
                <span className="truncate">{node.name}</span>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              {node.type === 'directory' && (
                <>
                  <ContextMenuItem onClick={() => handleCreateFile(node.path)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New File
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleCreateFolder(node.path)}>
                    <FolderPlus className="w-4 h-4 mr-2" />
                    New Folder
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                </>
              )}
              <ContextMenuItem onClick={() => handleRename(node)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Rename
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={() => handleDelete(node)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          
          {node.children && isExpanded && (
            <div>
              {renderFileTree(node.children.map(child => ({ ...child, depth: node.depth + 1 })))}
            </div>
          )}
        </div>
      );
    });
  }, [expandedDirs, getFileIcon, handleFileClick, handleCreateFile, handleCreateFolder, handleRename, handleDelete]);

  const getDialogTitle = () => {
    switch (dialogState.type) {
      case 'create-file': return 'Create New File';
      case 'create-folder': return 'Create New Folder';
      case 'rename': return `Rename ${dialogState.isDirectory ? 'Folder' : 'File'}`;
      case 'delete': return `Delete ${dialogState.isDirectory ? 'Folder' : 'File'}`;
      default: return '';
    }
  };

  const getDialogContent = () => {
    if (dialogState.type === 'delete') {
      return (
        <p>
          Are you sure you want to delete <strong>{dialogState.targetName}</strong>?
          {dialogState.isDirectory && ' This will delete all contents inside this folder.'}
          {' '}This action cannot be undone.
        </p>
      );
    }
    
    return (
      <div className="space-y-2">
        <Label htmlFor="name">
          {dialogState.type === 'create-file' ? 'File name' :
           dialogState.type === 'create-folder' ? 'Folder name' : 
           'New name'}
        </Label>
        <Input
          ref={inputRef}
          id="name"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && inputValue.trim()) {
              executeAction();
            }
          }}
          placeholder={
            dialogState.type === 'create-file' ? 'example.ts' :
            dialogState.type === 'create-folder' ? 'new-folder' :
            dialogState.targetName
          }
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Loading files...
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No project loaded
      </div>
    );
  }

  return (
    <>
      <div className="h-full overflow-y-auto select-none">
        <div className="p-2 border-b flex items-center justify-between">
          <h3 className="text-sm font-medium">Project Files</h3>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCreateFile(currentProject.path)}
              title="New File"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCreateFolder(currentProject.path)}
              title="New Folder"
            >
              <FolderPlus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="py-2">
          {fileTree.length > 0 ? (
            renderFileTree(fileTree)
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No files found
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogState.type !== null} onOpenChange={() => setDialogState({ type: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          
          {getDialogContent()}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogState({ type: null })}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={executeAction}
              disabled={processing || (dialogState.type !== 'delete' && !inputValue.trim())}
              variant={dialogState.type === 'delete' ? 'destructive' : 'default'}
            >
              {processing ? 'Processing...' : 
               dialogState.type === 'delete' ? 'Delete' : 
               dialogState.type === 'rename' ? 'Rename' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 