import { useEffect, useState, useCallback } from "react";
import { ScriptManager } from "@/models";

/**
 * Custom hook to synchronize React state with ScriptManager changes.
 * This hook subscribes to script manager changes and forces React to re-render
 * when scripts are attached, detached, enabled/disabled, or parameters change.
 */
export function useScriptManagerState(scriptManager: ScriptManager | null) {
  const [updateCounter, setUpdateCounter] = useState(0);
  
  // Function to force a re-render
  const triggerUpdate = useCallback(() => {
    setUpdateCounter(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!scriptManager) return;

    // Subscribe to script manager changes
    scriptManager.addChangeListener(triggerUpdate);

    // Cleanup subscription on unmount or script manager change
    return () => {
      scriptManager.removeChangeListener(triggerUpdate);
    };
  }, [scriptManager, triggerUpdate]);

  // Return the script manager for convenience, but the main purpose is the side effect
  return scriptManager;
} 