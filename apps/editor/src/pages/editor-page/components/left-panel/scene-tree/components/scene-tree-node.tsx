import React from "react";
import { EyeIcon, EyeOffIcon, ChevronRight, ChevronDown } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SceneObjectContextMenu from "./scene-object-context-menu";

interface Projection {
  depth: number;
  maxDepth: number;
  minDepth: number;
  parentId: string | null;
}

interface SceneTreeNodeProps {
  id: string;
  object: GameObject;
  depth: number;
  selectedObjects: string[];
  onSelectObject: (objectId: string) => void;
  onToggleVisibility: (objectId: string) => void;
  onDuplicate: (object: GameObject) => void;
  onCopy: (object: GameObject) => void;
  onCut: (object: GameObject) => void;
  onPaste: () => void;
  onDelete: (objectId: string) => void;
  onToggleLock: (objectId: string) => void;
  onFocusCamera: (objectId: string) => void;
  onCollapse: (objectId: string) => void;
  canPaste?: boolean;
  isLocked?: boolean;
  isDragging?: boolean;
  isCollapsed?: boolean;
  indentationWidth: number;
  projected?: Projection | null;
  isOverParent?: boolean | null;
}

export default function SceneTreeNode({
  id,
  object,
  depth,
  selectedObjects,
  onSelectObject,
  onToggleVisibility,
  onDuplicate,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onToggleLock,
  onFocusCamera,
  onCollapse,
  canPaste = false,
  isLocked = false,
  isDragging = false,
  isCollapsed = false,
  indentationWidth,
  isOverParent = false,
}: SceneTreeNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({
    id,
    data: {
      type: "gameObject",
      object,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasChildren = object.children && object.children.length > 0;
  const isSelected = selectedObjects.includes(id);
  const actualIsDragging = isDragging || sortableIsDragging;

  const handleToggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCollapse(id);
  };

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleVisibility(id);
  };

  const handleSelect = () => {
    // Only select if we're not in the middle of a drag operation
    if (!actualIsDragging) {
      onSelectObject(id);
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <SceneObjectContextMenu
        object={object}
        onDuplicate={onDuplicate}
        onCopy={onCopy}
        onCut={onCut}
        onPaste={onPaste}
        onDelete={onDelete}
        onToggleLock={onToggleLock}
        onFocusCamera={onFocusCamera}
        canPaste={canPaste}
        isLocked={isLocked}
      >
        <div
          className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm transition-colors border ${
            isSelected
              ? "bg-primary/20 text-white border-primary/30"
              : "hover:bg-muted border-transparent"
          } ${actualIsDragging ? "opacity-50" : ""} ${
            isOverParent ? "bg-blue-500/20 border-blue-500/50" : ""
          }`}
          style={{ paddingLeft: `${12 + depth * indentationWidth}px` }}
          onClick={handleSelect}
          {...listeners}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={handleToggleExpanded}
                className="p-0.5 hover:bg-muted-hover rounded transition-colors"
              >
                {!isCollapsed ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            ) : (
              <div className="w-4" />
            )}
            
            <button
              onClick={handleToggleVisibility}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {object.visible ? (
                <EyeIcon className="h-4 w-4" />
              ) : (
                <EyeOffIcon className="h-4 w-4" />
              )}
            </button>
            
            <span className={`flex-1 truncate ${isLocked ? "opacity-50" : ""}`}>
              {object.name}
            </span>

            {isOverParent && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse">
              </span>
            )}
          </div>
        </div>
      </SceneObjectContextMenu>
    </div>
  );
} 