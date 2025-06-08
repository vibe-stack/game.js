import React from "react";
import {
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  Lock,
  Unlock,
  MoreHorizontal,
  Files,
  Focus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface SceneObjectContextMenuProps {
  children: React.ReactNode;
  object: GameObject;
  onDuplicate: (object: GameObject) => void;
  onCopy: (object: GameObject) => void;
  onCut: (object: GameObject) => void;
  onPaste: () => void;
  onDelete: (objectId: string) => void;
  onToggleLock: (objectId: string) => void;
  onFocusCamera: (objectId: string) => void;
  canPaste?: boolean;
  isLocked?: boolean;
  trigger?: "hover" | "context" | "both";
}

export default function SceneObjectContextMenu({
  children,
  object,
  onDuplicate,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onToggleLock,
  onFocusCamera,
  canPaste = false,
  isLocked = false,
  trigger = "both",
}: SceneObjectContextMenuProps) {
  const menuItems = (
    <>
      <DropdownMenuItem onClick={() => onDuplicate(object)} className="flex items-center gap-2">
        <Files className="h-4 w-4" />
        Duplicate
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onCopy(object)} className="flex items-center gap-2">
        <Copy className="h-4 w-4" />
        Copy
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onCut(object)} className="flex items-center gap-2">
        <Scissors className="h-4 w-4" />
        Cut
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={onPaste}
        disabled={!canPaste}
        className="flex items-center gap-2"
      >
        <Clipboard className="h-4 w-4" />
        Paste
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => onToggleLock(object.id)}
        className="flex items-center gap-2"
      >
        {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        {isLocked ? "Unlock" : "Lock"}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onFocusCamera(object.id)}
        className="flex items-center gap-2"
      >
        <Focus className="h-4 w-4" />
        Focus Camera
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => onDelete(object.id)}
        className="flex items-center gap-2 text-destructive focus:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </DropdownMenuItem>
    </>
  );

  const contextMenuItems = (
    <>
      <ContextMenuItem onClick={() => onDuplicate(object)} className="flex items-center gap-2">
        <Files className="h-4 w-4" />
        Duplicate
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => onCopy(object)} className="flex items-center gap-2">
        <Copy className="h-4 w-4" />
        Copy
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onCut(object)} className="flex items-center gap-2">
        <Scissors className="h-4 w-4" />
        Cut
      </ContextMenuItem>
      <ContextMenuItem
        onClick={onPaste}
        disabled={!canPaste}
        className="flex items-center gap-2"
      >
        <Clipboard className="h-4 w-4" />
        Paste
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => onToggleLock(object.id)}
        className="flex items-center gap-2"
      >
        {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        {isLocked ? "Unlock" : "Lock"}
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => onFocusCamera(object.id)}
        className="flex items-center gap-2"
      >
        <Focus className="h-4 w-4" />
        Focus Camera
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => onDelete(object.id)}
        className="flex items-center gap-2 text-destructive focus:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </ContextMenuItem>
    </>
  );

  if (trigger === "context") {
    return (
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent>{contextMenuItems}</ContextMenuContent>
      </ContextMenu>
    );
  }

  if (trigger === "hover") {
    return (
      <div className="group relative">
        {children}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Object actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">{menuItems}</DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className="group relative">
          {children}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Object actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">{menuItems}</DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>{contextMenuItems}</ContextMenuContent>
    </ContextMenu>
  );
} 