import { gameWorld } from "@/services/game-world";
import useEditorStore from "@/stores/editor-store";
import { useFrame } from "@react-three/fiber";
import { useEffect } from "react";

export function GameWorldUpdater() {
  const { setGameWorld } = useEditorStore();

  useEffect(() => {
    // Initialize GameWorld integration
    setGameWorld(gameWorld);

    return () => {
      gameWorld.dispose();
    };
  }, [setGameWorld]);

  // High-frequency game loop
  useFrame((state) => {
    gameWorld.update(state.clock.elapsedTime * 1000);
  });

  return null;
}
