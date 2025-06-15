import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, File, Folder, FileText } from "lucide-react";
import useEditorStore from "@/stores/editor-store";

interface FileExplorerProps {
  onFileClick: (filePath: string) => void;
}

interface FileTreeNode extends FileSystemItem {
  children?: FileTreeNode[];
  isExpanded?: boolean;
}

export default function FileExplorer({ onFileClick }: FileExplorerProps) {
  const { currentProject } = useEditorStore();
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentProject) {
      loadProjectFiles();
    }
  }, [currentProject]);

  const loadProjectFiles = async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      const rootFiles = await window.projectAPI.listDirectory(currentProject.path);
      const tree = await buildFileTree(rootFiles, currentProject.path);
      setFileTree(tree);
    } catch (error) {
      console.error("Failed to load project files:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildFileTree = async (items: FileSystemItem[], basePath: string): Promise<FileTreeNode[]> => {
    const tree: FileTreeNode[] = [];

    for (const item of items) {
      const node: FileTreeNode = {
        ...item,
        children: item.type === 'directory' ? [] : undefined,
        isExpanded: expandedDirs.has(item.path),
      };

      if (item.type === 'directory' && expandedDirs.has(item.path)) {
        try {
          const childItems = await window.projectAPI.listDirectory(item.path);
          node.children = await buildFileTree(childItems, basePath);
        } catch (error) {
          console.error(`Failed to load directory ${item.path}:`, error);
        }
      }

      tree.push(node);
    }

    return tree;
  };

  const toggleDirectory = async (dirPath: string) => {
    const newExpandedDirs = new Set(expandedDirs);
    
    if (expandedDirs.has(dirPath)) {
      newExpandedDirs.delete(dirPath);
    } else {
      newExpandedDirs.add(dirPath);
    }
    
    setExpandedDirs(newExpandedDirs);
    
    // Reload the file tree to show/hide children
    if (currentProject) {
      const rootFiles = await window.projectAPI.listDirectory(currentProject.path);
      const tree = await buildFileTree(rootFiles, currentProject.path);
      setFileTree(tree);
    }
  };

  const handleFileClick = (item: FileTreeNode) => {
    if (item.type === 'directory') {
      toggleDirectory(item.path);
    } else if (item.extension === '.ts' || item.extension === '.js') {
      onFileClick(item.path);
    }
  };

  const getFileIcon = (item: FileTreeNode) => {
    if (item.type === 'directory') {
      return item.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />;
    }
    
    if (item.extension === '.ts' || item.extension === '.js') {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
    
    return <File className="w-4 h-4 text-gray-500" />;
  };

  const renderFileTree = (nodes: FileTreeNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 px-2 py-1 hover:bg-accent/50 cursor-pointer text-sm ${
            node.type === 'directory' ? 'font-medium' : ''
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => handleFileClick(node)}
        >
          {node.type === 'directory' ? (
            <>
              <Folder className="w-4 h-4 text-yellow-600" />
              {node.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </>
          ) : (
            getFileIcon(node)
          )}
          <span className="truncate">{node.name}</span>
        </div>
        
        {node.children && node.isExpanded && (
          <div>
            {renderFileTree(node.children, depth + 1)}
          </div>
        )}
      </div>
    ));
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
    <div className="h-full overflow-y-auto">
      <div className="p-2 border-b">
        <h3 className="text-sm font-medium">Project Files</h3>
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
  );
} 