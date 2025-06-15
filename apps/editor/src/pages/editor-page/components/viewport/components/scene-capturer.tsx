import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { useGameWorld } from "@/services/game-world-context";

export function SceneCapturer() {
  const { scene, gl, camera } = useThree();
  const gameWorld = useGameWorld();

  useEffect(() => {
    // Pass Three.js references to GameWorld
    gameWorld.setThreeScene(scene);
    gameWorld.setThreeRenderer(gl);
    gameWorld.setThreeCamera(camera);
  }, [scene, gl, camera, gameWorld]);

  return null;
} 