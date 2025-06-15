import { useEffect, useRef, useCallback, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useScriptManager } from "../../script-manager";
import useEditorStore from "@/stores/editor-store";
import { useGameWorld } from "@/services/game-world-context";
import { ScriptLifecycle } from "../utils/script-lifecycle";

interface ScriptContext {
  deltaTime?: number;
  totalTime?: number;
  [key: string]: any;
}

export function useScriptExecution(entity: GameObject, scene: GameScene) {
  const { physicsState } = useEditorStore();
  const scriptManager = useScriptManager();
  const gameWorld = useGameWorld();
  const lifecycleRef = useRef<ScriptLifecycle | null>(null);
  const startTimeRef = useRef(Date.now());

  // Use refs to hold the latest entity and scene to prevent callbacks from becoming stale
  const entityRef = useRef(entity);
  const sceneRef = useRef(scene);
  useEffect(() => {
    entityRef.current = entity;
    sceneRef.current = scene;
  }, [entity, scene]);

  // Create a stable key representing the script components to avoid re-running effects
  const scriptComponentKey = useMemo(() =>
    JSON.stringify(
      entity.components
        .filter((c) => c.type === 'script')
        .map((c) => ({ id: c.id, enabled: c.enabled, scriptPath: (c.properties as ScriptComponent['properties']).scriptPath }))
        .sort((a, b) => a.id.localeCompare(b.id))
    ),
    [entity.components]
  );

  const buildExecutionContext = useCallback(
    (scriptComponent: ScriptComponent, context: ScriptContext) => ({
      entity: entityRef.current,
      scene: sceneRef.current,
      deltaTime: context.deltaTime || 0,
      totalTime:
        context.totalTime || (Date.now() - startTimeRef.current) / 1000,
      parameters: scriptComponent.properties.parameters,
      timeScale: scriptComponent.properties.timeScale,
      debugMode: scriptComponent.properties.debugMode,
      // Add GameWorld API for proper transform updates
      updateTransform: (transform: Partial<Transform>) => {
        gameWorld.updateObjectTransform(entityRef.current.id, transform);
      },
      // Add physics control methods
      applyForce: (force: Vector3, point?: Vector3) => {
        gameWorld.applyForce(entityRef.current.id, force, point);
      },
      applyImpulse: (impulse: Vector3, point?: Vector3) => {
        gameWorld.applyImpulse(entityRef.current.id, impulse, point);
      },
      setVelocity: (velocity: Vector3) => {
        gameWorld.setVelocity(entityRef.current.id, velocity);
      },
      setAngularVelocity: (angularVelocity: Vector3) => {
        gameWorld.setAngularVelocity(entityRef.current.id, angularVelocity);
      },
      getVelocity: () => {
        return gameWorld.getVelocity(entityRef.current.id);
      },
      getAngularVelocity: () => {
        return gameWorld.getAngularVelocity(entityRef.current.id);
      },
      ...context,
    }),
    [gameWorld] // Added gameWorld as dependency
  );

  const executeScript = useCallback(
    async (
      scriptComponent: ScriptComponent,
      method: keyof ScriptComponent["properties"]["eventHandlers"],
      context: ScriptContext
    ) => {
      if (
        !scriptComponent.enabled ||
        !scriptComponent.properties.eventHandlers[method] ||
        !scriptComponent.properties.scriptPath
      ) {
        return;
      }

      try {
        const executionContext = buildExecutionContext(scriptComponent, context);
        await scriptManager.executeScript(
          scriptComponent.properties.scriptPath,
          method,
          executionContext
        );
      } catch (error) {
        if (scriptComponent.properties.debugMode) {
          console.error(
            `Script execution error in ${scriptComponent.properties.scriptPath}.${method}:`,
            error
          );
        }
      }
    },
    [scriptManager, buildExecutionContext] // Stable, as its dependencies are stable
  );

  useEffect(() => {
    if (!lifecycleRef.current) {
      lifecycleRef.current = new ScriptLifecycle(executeScript);
    }
    const lifecycle = lifecycleRef.current;

    // Get the fresh components from the ref to avoid stale closure
    const currentScriptComponents = entityRef.current.components.filter(
      (comp): comp is ScriptComponent => comp.type === "script"
    );
    lifecycle.updateComponents(currentScriptComponents);
  }, [scriptComponentKey, executeScript]); // Depend on the stable key

  useEffect(() => {
    if (!lifecycleRef.current) return;

    const lifecycle = lifecycleRef.current;
    if (physicsState === "playing") {
      startTimeRef.current = Date.now();
      lifecycle.initializeScripts();
    } else if (physicsState === "stopped") {
      lifecycle.destroyScripts();
    }

    // Cleanup on unmount.
    return () => {
      if (lifecycleRef.current) {
        lifecycleRef.current.destroyScripts();
      }
    };
  }, [physicsState]);

  useFrame((state, deltaTime) => {
    if (
      physicsState !== "playing" ||
      !lifecycleRef.current ||
      !gameWorld.isRunning()
    ) return;

    const totalTime = (Date.now() - startTimeRef.current) / 1000;
    try {
      lifecycleRef.current.processFrame(deltaTime, totalTime);
    } catch (error) {
      console.error("Error in processFrame:", error);
    }
  });

  const cleanup = useCallback(() => {
    if (lifecycleRef.current) {
      lifecycleRef.current.destroyScripts();
    }
  }, []);

  return { cleanup };
}