import React, { useState, useCallback, useRef, useEffect } from "react";
import { 
  Search, 
  FileText, 
  Folder, 
  FolderOpen, 
  File, 
  Image, 
  Code, 
  Film,
  Music,
  Archive,
  Settings,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  Scissors,
  Edit3,
  Eye,
  ExternalLink,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as THREE from "three/webgpu";
import { GLTFLoader, GLTF } from "three/addons/loaders/GLTFLoader.js";
import { GameWorldService } from "../../services/game-world-service";
import { Mesh3D } from "@/models/primitives/mesh-3d";
import useGameStudioStore from "@/stores/game-studio-store";

interface FileBrowserProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
}

interface FileSystemNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  size?: number;
  modified?: Date;
  children?: FileSystemNode[];
  isExpanded?: boolean;
}

interface ClipboardItem {
  type: 'cut' | 'copy';
  items: FileSystemNode[];
}

const getFileIcon = (node: FileSystemNode) => {
  if (node.type === 'directory') {
    return node.isExpanded ? FolderOpen : Folder;
  }
  
  const ext = node.extension?.toLowerCase();
  switch (ext) {
    case '.glb':
    case '.gltf':
    case '.obj':
    case '.fbx':
    case '.dae':
    case '.blend':
      return Film;
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.webp':
    case '.svg':
    case '.bmp':
    case '.tiff':
    case '.ico':
      return Image;
    case '.js':
    case '.ts':
    case '.jsx':
    case '.tsx':
    case '.json':
    case '.css':
    case '.html':
    case '.xml':
    case '.yaml':
    case '.yml':
    case '.toml':
    case '.ini':
      return Code;
    case '.mp3':
    case '.wav':
    case '.ogg':
    case '.flac':
    case '.aac':
    case '.m4a':
      return Music;
    case '.zip':
    case '.rar':
    case '.7z':
    case '.tar':
    case '.gz':
      return Archive;
    case '.md':
    case '.txt':
    case '.log':
    case '.csv':
      return FileText;
    default:
      return File;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function FileBrowser({ gameWorldService }: FileBrowserProps) {
  const [fileTree, setFileTree] = useState<FileSystemNode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);
  const [renameDialog, setRenameDialog] = useState<{ item: FileSystemNode; newName: string } | null>(null);
  const [createDialog, setCreateDialog] = useState<{ type: 'file' | 'directory'; parentPath: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { currentProject } = useGameStudioStore();

  // Load file tree when project changes
  useEffect(() => {
    if (currentProject) {
      loadFileTree();
    }
  }, [currentProject]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if no input field is focused
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((event.metaKey || event.ctrlKey)) {
        switch (event.key.toLowerCase()) {
          case 'c':
            if (selectedItems.size > 0) {
              event.preventDefault();
              handleCopy();
            }
            break;
          case 'x':
            if (selectedItems.size > 0) {
              event.preventDefault();
              handleCut();
            }
            break;
          case 'v':
            if (clipboard && clipboard.items.length > 0) {
              event.preventDefault();
              handlePaste();
            }
            break;
        }
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedItems.size > 0) {
          event.preventDefault();
          handleDelete();
        }
      } else if (event.key === 'F2') {
        if (selectedItems.size === 1) {
          event.preventDefault();
          handleRename();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, clipboard]);

  const loadFileTree = async () => {
    if (!currentProject) return;
    
    try {
      setLoading(true);
      const items = await window.projectAPI.listDirectory(currentProject.path);
      const tree = await buildFileTree(items, currentProject.path);
      setFileTree(tree);
    } catch (error) {
      console.error("Failed to load file tree:", error);
      toast.error("Failed to load project files");
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop for file upload
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the component entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!currentProject) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    try {
      setLoading(true);
      for (const file of droppedFiles) {
        const arrayBuffer = await file.arrayBuffer();
        await window.projectAPI.importAssetFromData(
          currentProject.path,
          file.name,
          arrayBuffer
        );
      }
      
      toast.success(`Imported ${droppedFiles.length} file(s)`);
      await loadFileTree();
    } catch (error) {
      console.error("Failed to import files:", error);
      toast.error("Failed to import files");
    } finally {
      setLoading(false);
    }
  }, [currentProject, loadFileTree]);

  const buildFileTree = async (items: any[], basePath: string): Promise<FileSystemNode[]> => {
    const nodes: FileSystemNode[] = [];
    
    for (const item of items) {
      const node: FileSystemNode = {
        name: item.name,
        path: item.path,
        type: item.type,
        extension: item.extension,
        size: item.size,
        modified: item.modified ? new Date(item.modified) : undefined,
        isExpanded: false,
      };
      
      if (item.type === 'directory') {
        node.children = [];
      }
      
      nodes.push(node);
    }
    
    // Sort: directories first, then files, both alphabetically
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  };

  const expandDirectory = async (node: FileSystemNode) => {
    if (node.type !== 'directory' || !currentProject) return;
    
    try {
      const items = await window.projectAPI.listDirectory(node.path);
      const children = await buildFileTree(items, node.path);
      
      setFileTree(prev => updateNodeInTree(prev, node.path, { 
        ...node, 
        children, 
        isExpanded: true 
      }));
    } catch (error) {
      console.error("Failed to expand directory:", error);
      toast.error(`Failed to load contents of ${node.name}`);
    }
  };

  const updateNodeInTree = (tree: FileSystemNode[], targetPath: string, updatedNode: FileSystemNode): FileSystemNode[] => {
    return tree.map(node => {
      if (node.path === targetPath) {
        return updatedNode;
      }
      if (node.children) {
        return {
          ...node,
          children: updateNodeInTree(node.children, targetPath, updatedNode)
        };
      }
      return node;
    });
  };

  const toggleDirectory = async (node: FileSystemNode) => {
    if (node.type !== 'directory') return;
    
    if (!node.isExpanded) {
      await expandDirectory(node);
    } else {
      setFileTree(prev => updateNodeInTree(prev, node.path, { 
        ...node, 
        isExpanded: false 
      }));
    }
  };

  const handleItemClick = (node: FileSystemNode, isCtrlClick: boolean = false) => {
    if (isCtrlClick) {
      // Multi-select
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(node.path)) {
          newSet.delete(node.path);
        } else {
          newSet.add(node.path);
        }
        return newSet;
      });
    } else {
      // Single select
      setSelectedItems(new Set([node.path]));
    }
  };

  const handleItemDoubleClick = async (node: FileSystemNode) => {
    if (node.type === 'directory') {
      await toggleDirectory(node);
    } else {
      // Try to add 3D model to scene if it's a supported format
      if (node.extension?.toLowerCase() === '.glb') {
        await addModelToScene(node);
      }
    }
  };

  const addModelToScene = async (node: FileSystemNode) => {
    if (!gameWorldService.current || !currentProject) return;

    try {
      const gameWorld = gameWorldService.current.getGameWorld();
      if (!gameWorld) {
        throw new Error("Game world not initialized");
      }

      // Get the asset as data URL instead of HTTP URL to avoid CORS issues
      const assetDataUrl = await window.projectAPI.getAssetDataUrl(currentProject.path, node.path);
      if (!assetDataUrl) {
        throw new Error("Failed to get asset data");
      }

      // Convert data URL to blob URL for GLTFLoader
      const response = await fetch(assetDataUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Load the GLB file using the blob URL
      const loader = new GLTFLoader();
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        loader.load(blobUrl, resolve, undefined, reject);
      });

      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);

      // Find the first mesh in the loaded model
      let meshFound = false;
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh && !meshFound) {
          meshFound = true;
          
          // Create a Mesh3D entity
          const mesh = new Mesh3D({
            name: node.name.replace('.glb', ''),
            position: new THREE.Vector3(0, 2, 0),
            geometry: child.geometry,
            material: child.material,
            castShadow: true,
            receiveShadow: true,
            modelPath: node.path,
            modelUrl: assetDataUrl,
          });

          // Add physics configuration
          mesh.physicsConfig = {
            type: "dynamic",
            mass: 1,
            restitution: 0.5,
            friction: 0.5
          };

          // Add to game world
          gameWorld.createEntity(mesh);

          // Select the new entity
          const selectionManager = gameWorldService.current?.getSelectionManager();
          if (selectionManager) {
            selectionManager.onEntityAdded(mesh);
            selectionManager.selectEntity(mesh.entityId);
          }

          toast.success(`Added ${node.name} to scene`);
        }
      });

      if (!meshFound) {
        throw new Error("No mesh found in GLB file");
      }
    } catch (error) {
      console.error("Failed to add mesh to scene:", error);
      toast.error(`Failed to add ${node.name} to scene`);
    }
  };

  const handleCreateFile = () => {
    const selectedPaths = Array.from(selectedItems);
    let parentPath = currentProject?.path || '';
    
    if (selectedPaths.length === 1) {
      const selectedNode = findNodeByPath(fileTree, selectedPaths[0]);
      if (selectedNode?.type === 'directory') {
        parentPath = selectedNode.path;
      } else if (selectedNode) {
        // Get parent directory of selected file
        parentPath = selectedNode.path.substring(0, selectedNode.path.lastIndexOf('/'));
      }
    }
    
    setCreateDialog({ type: 'file', parentPath, name: '' });
  };

  const handleCreateFolder = () => {
    const selectedPaths = Array.from(selectedItems);
    let parentPath = currentProject?.path || '';
    
    if (selectedPaths.length === 1) {
      const selectedNode = findNodeByPath(fileTree, selectedPaths[0]);
      if (selectedNode?.type === 'directory') {
        parentPath = selectedNode.path;
      } else if (selectedNode) {
        // Get parent directory of selected file
        parentPath = selectedNode.path.substring(0, selectedNode.path.lastIndexOf('/'));
      }
    }
    
    setCreateDialog({ type: 'directory', parentPath, name: '' });
  };

  const findNodeByPath = (tree: FileSystemNode[], targetPath: string): FileSystemNode | null => {
    for (const node of tree) {
      if (node.path === targetPath) {
        return node;
      }
      if (node.children) {
        const found = findNodeByPath(node.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  const handleRename = () => {
    const selectedPaths = Array.from(selectedItems);
    if (selectedPaths.length !== 1) return;
    
    const node = findNodeByPath(fileTree, selectedPaths[0]);
    if (node) {
      setRenameDialog({ item: node, newName: node.name });
    }
  };

  const handleDelete = async () => {
    const selectedPaths = Array.from(selectedItems);
    if (selectedPaths.length === 0) return;
    
    try {
      for (const path of selectedPaths) {
        const node = findNodeByPath(fileTree, path);
        if (node) {
          if (node.type === 'directory') {
            await window.projectAPI.deleteDirectory(path);
          } else {
            await window.projectAPI.deleteFile(path);
          }
        }
      }
      
      toast.success(`Deleted ${selectedPaths.length} item(s)`);
      await loadFileTree();
      setSelectedItems(new Set());
    } catch (error) {
      console.error("Failed to delete items:", error);
      toast.error("Failed to delete selected items");
    }
  };

  const handleCopy = () => {
    const selectedPaths = Array.from(selectedItems);
    if (selectedPaths.length === 0) return;
    
    const items = selectedPaths.map(path => findNodeByPath(fileTree, path)).filter(Boolean) as FileSystemNode[];
    setClipboard({ type: 'copy', items });
    toast.success(`Copied ${items.length} item(s)`);
  };

  const handleCut = () => {
    const selectedPaths = Array.from(selectedItems);
    if (selectedPaths.length === 0) return;
    
    const items = selectedPaths.map(path => findNodeByPath(fileTree, path)).filter(Boolean) as FileSystemNode[];
    setClipboard({ type: 'cut', items });
    toast.success(`Cut ${items.length} item(s)`);
  };

  const handlePaste = async () => {
    if (!clipboard || clipboard.items.length === 0) return;
    
    const selectedPaths = Array.from(selectedItems);
    let targetPath = currentProject?.path || '';
    
    if (selectedPaths.length === 1) {
      const selectedNode = findNodeByPath(fileTree, selectedPaths[0]);
      if (selectedNode?.type === 'directory') {
        targetPath = selectedNode.path;
      } else if (selectedNode) {
        // Get parent directory of selected file
        targetPath = selectedNode.path.substring(0, selectedNode.path.lastIndexOf('/'));
      }
    }
    
    try {
      // Note: This is a simplified implementation
      // In a real app, you'd need proper file copy/move operations
      toast.info("Paste operation not fully implemented yet");
      setClipboard(null);
    } catch (error) {
      console.error("Failed to paste items:", error);
      toast.error("Failed to paste items");
    }
  };

  const handleShowInExplorer = async () => {
    const selectedPaths = Array.from(selectedItems);
    if (selectedPaths.length !== 1 || !currentProject) return;
    
    try {
      await window.projectAPI.openProjectFolder(selectedPaths[0]);
    } catch (error) {
      console.error("Failed to show in explorer:", error);
      toast.error("Failed to show in explorer");
    }
  };

  const confirmCreate = async () => {
    if (!createDialog || !createDialog.name.trim()) return;
    
    try {
      const fullPath = `${createDialog.parentPath}/${createDialog.name}`;
      
      if (createDialog.type === 'file') {
        await window.projectAPI.createFile(fullPath, '');
      } else {
        await window.projectAPI.createDirectory(fullPath);
      }
      
      toast.success(`Created ${createDialog.type}: ${createDialog.name}`);
      await loadFileTree();
      setCreateDialog(null);
    } catch (error) {
      console.error(`Failed to create ${createDialog.type}:`, error);
      toast.error(`Failed to create ${createDialog.type}`);
    }
  };

  const confirmRename = async () => {
    if (!renameDialog || !renameDialog.newName.trim()) return;
    
    try {
      const newPath = renameDialog.item.path.replace(
        renameDialog.item.name,
        renameDialog.newName
      );
      
      await window.projectAPI.renameItem(renameDialog.item.path, newPath);
      toast.success(`Renamed to ${renameDialog.newName}`);
      await loadFileTree();
      setRenameDialog(null);
    } catch (error) {
      console.error("Failed to rename item:", error);
      toast.error("Failed to rename item");
    }
  };

  const filterNodes = (nodes: FileSystemNode[], query: string): FileSystemNode[] => {
    if (!query.trim()) return nodes;
    
    return nodes.filter(node => {
      const matchesQuery = node.name.toLowerCase().includes(query.toLowerCase());
      if (node.type === 'directory' && node.children) {
        const filteredChildren = filterNodes(node.children, query);
        return matchesQuery || filteredChildren.length > 0;
      }
      return matchesQuery;
    }).map(node => {
      if (node.type === 'directory' && node.children) {
        return {
          ...node,
          children: filterNodes(node.children, query),
          isExpanded: query.trim() ? true : node.isExpanded
        };
      }
      return node;
    });
  };

  const renderFileNode = (node: FileSystemNode, level: number = 0) => {
    const Icon = getFileIcon(node);
    const isSelected = selectedItems.has(node.path);
    const isCut = clipboard?.type === 'cut' && clipboard.items.some(item => item.path === node.path);
    
    return (
      <div key={node.path}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-white/10 ${
                isSelected ? 'bg-lime-400/20' : ''
              } ${isCut ? 'opacity-50' : ''}`}
              style={{ paddingLeft: `${0.5 + level * 0.75}rem` }}
              onClick={(e) => handleItemClick(node, e.ctrlKey || e.metaKey)}
              onDoubleClick={() => handleItemDoubleClick(node)}
            >
              {node.type === 'directory' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDirectory(node);
                  }}
                  className="p-0.5 hover:bg-white/20 rounded"
                >
                  {node.isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              )}
              {node.type === 'file' && <div className="w-4" />}
              <Icon className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-white truncate flex-1">
                {node.name}
              </span>
              {node.type === 'file' && node.size && (
                <span className="text-xs text-gray-500">
                  {formatFileSize(node.size)}
                </span>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {node.extension?.toLowerCase() === '.glb' && (
              <>
                <ContextMenuItem onClick={() => addModelToScene(node)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Scene
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            <ContextMenuItem onClick={handleCreateFile}>
              <FileText className="h-4 w-4 mr-2" />
              New File
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCreateFolder}>
              <Folder className="h-4 w-4 mr-2" />
              New Folder
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCut}>
              <Scissors className="h-4 w-4 mr-2" />
              Cut
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={handlePaste}
              disabled={!clipboard || clipboard.items.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Paste
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleRename}>
              <Edit3 className="h-4 w-4 mr-2" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleShowInExplorer}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Show in Explorer
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        
        {node.type === 'directory' && node.isExpanded && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredTree = filterNodes(fileTree, searchQuery);

  return (
    <div 
      className={`flex flex-col h-full relative ${isDragOver ? 'bg-lime-400/10 border-lime-400' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Search */}
      <div className="p-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-white/20 bg-white/10 pl-9 text-white placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 pb-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleCreateFile}
          title="New File"
        >
          <FileText className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleCreateFolder}
          title="New Folder"
        >
          <Folder className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={loadFileTree}
          title="Refresh"
        >
          <Settings className="h-3 w-3" />
        </Button>
      </div>

             {/* File Tree */}
       <ScrollArea className="flex-1">
         <ContextMenu>
           <ContextMenuTrigger className="min-h-full w-full">
             {loading ? (
               <div className="p-4 text-center text-gray-400">
                 Loading files...
               </div>
             ) : filteredTree.length === 0 ? (
               <div className="p-4 text-center text-gray-400">
                 {searchQuery ? 'No files match your search' : 'No files found'}
               </div>
             ) : (
               <div className="pb-4">
                 {filteredTree.map(node => renderFileNode(node))}
               </div>
             )}
           </ContextMenuTrigger>
           <ContextMenuContent>
             <ContextMenuItem onClick={handleCreateFile}>
               <FileText className="h-4 w-4 mr-2" />
               New File
             </ContextMenuItem>
             <ContextMenuItem onClick={handleCreateFolder}>
               <Folder className="h-4 w-4 mr-2" />
               New Folder
             </ContextMenuItem>
             {clipboard && clipboard.items.length > 0 && (
               <>
                 <ContextMenuSeparator />
                 <ContextMenuItem onClick={handlePaste}>
                   <FileText className="h-4 w-4 mr-2" />
                   Paste
                 </ContextMenuItem>
               </>
             )}
           </ContextMenuContent>
         </ContextMenu>
       </ScrollArea>

             {/* Drag Overlay */}
       {isDragOver && (
         <div className="absolute inset-0 bg-lime-400/20 border-2 border-dashed border-lime-400 rounded-lg flex items-center justify-center z-50">
           <div className="text-center">
             <div className="text-lime-400 text-lg font-semibold">Drop files here</div>
             <div className="text-lime-300 text-sm">Files will be imported to the project</div>
           </div>
         </div>
       )}

       {/* Status Bar */}
       {selectedItems.size > 0 && (
         <div className="p-2 border-t border-white/10 text-xs text-gray-400">
           {selectedItems.size} item(s) selected
         </div>
       )}

      {/* Create Dialog */}
      <Dialog open={!!createDialog} onOpenChange={() => setCreateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create New {createDialog?.type === 'file' ? 'File' : 'Folder'}
            </DialogTitle>
            <DialogDescription>
              Enter a name for the new {createDialog?.type}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={createDialog?.name || ''}
            onChange={(e) => setCreateDialog(prev => prev ? { ...prev, name: e.target.value } : null)}
            placeholder={`${createDialog?.type === 'file' ? 'file' : 'folder'} name`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                confirmCreate();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(null)}>
              Cancel
            </Button>
            <Button onClick={confirmCreate}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameDialog} onOpenChange={() => setRenameDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>
              Enter a new name for {renameDialog?.item.name}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameDialog?.newName || ''}
            onChange={(e) => setRenameDialog(prev => prev ? { ...prev, newName: e.target.value } : null)}
            placeholder="New name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                confirmRename();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>
              Cancel
            </Button>
            <Button onClick={confirmRename}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 