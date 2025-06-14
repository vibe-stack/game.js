import { useEffect } from "react";
import { useScriptExecution } from "../hooks/use-script-execution";

interface ScriptExecutorProps {
  entity: GameObject;
  scene: GameScene;
}

export function ScriptExecutor({ entity, scene }: ScriptExecutorProps) {
  const { cleanup } = useScriptExecution(entity, scene);

  // Ensure cleanup is called when the component unmounts
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return null; // This component does not render anything
} 