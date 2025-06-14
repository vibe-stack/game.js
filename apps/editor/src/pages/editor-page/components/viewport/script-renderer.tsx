import React from "react";

interface ScriptRendererProps {
  component: ScriptComponent;
  children?: React.ReactNode;
  showHelpers?: boolean;
  objectId?: string;
}

export function ScriptRenderer({ children }: ScriptRendererProps) {
  // Script execution is handled by ScriptExecutor at the SceneObject level
  // This renderer just passes through the children
  return <>{children}</>;
} 