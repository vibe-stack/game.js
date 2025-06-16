import { useEffect, useRef, useState } from "react";
import { GameWorld } from "../../models";
import { createGameExample, useGameState } from "../../models/example";

export default function DemoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    game: GameWorld;
    switchToCamera: (cameraId: string, enableTransition?: boolean) => void;
    toggleControls: () => void;
    cleanup: () => void;
  } | null>(null);
  const [gameInitialized, setGameInitialized] = useState(false);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Set actual canvas dimensions
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;

      // Resize the game renderer if initialized
      if (gameRef.current) {
        gameRef.current.game.resize(width, height);
      }
    };

    // Initial resize
    resizeCanvas();

    // Handle window resize
    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener("resize", handleResize);

    // Use ResizeObserver for more accurate resize detection
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    resizeObserver.observe(canvas);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    let mounted = true;

    const initializeGame = async () => {
      try {
        const gameExample = await createGameExample(canvasRef.current!);
        if (mounted) {
          gameRef.current = gameExample;
          setGameInitialized(true);
        } else {
          gameExample.cleanup();
        }
      } catch (error) {
        console.error("Failed to initialize game:", error);
      }
    };

    initializeGame();

    return () => {
      mounted = false;
      if (gameRef.current) {
        gameRef.current.cleanup();
        gameRef.current = null;
      }
      setGameInitialized(false);
    };
  }, []);

  return (
    <div className="demo-page relative w-full h-screen overflow-hidden">
      <canvas
        ref={canvasRef}
        className="game-canvas w-full h-full block bg-gray-900"
      />

      {gameInitialized && gameRef.current && (
        <GameUI game={gameRef.current.game} />
      )}

      {gameInitialized && gameRef.current && (
        <CameraControls 
          switchToCamera={gameRef.current.switchToCamera}
          toggleControls={gameRef.current.toggleControls}
        />
      )}

      <div className="demo-info absolute top-5 right-5 bg-black/80 text-white p-5 rounded-lg max-w-xs font-sans">
        <h2 className="m-0 mb-2.5 text-lg">Enhanced Game Demo</h2>
        <p className="m-0 mb-4 text-sm">
          Click the sphere to apply an impulse!
        </p>
        <ul className="m-0 pl-5 text-xs">
          <li>Physics-enabled sphere (Player Ball)</li>
          <li>Static ground plane</li>
          <li>Multiple cameras with smooth transitions</li>
          <li>Orbit controls management</li>
          <li>Click interaction</li>
          <li>Real-time state management</li>
        </ul>
      </div>
    </div>
  );
}

function GameUI({ game }: { game: GameWorld }) {
  const entityCount = useGameState(game, (state) => state.entities.size);
  const physicsEnabled = useGameState(game, (state) => state.physics.enabled);
  const activeCamera = useGameState(game, (state) => state.scene.activeCamera);
  const cameraTransition = useGameState(game, (state) => state.scene.cameraTransition?.inProgress);
  const ballPosition = useGameState(game, (state) => {
    // Find entity with "player" tag
    const entities = Array.from(state.entities.values());
    const playerEntity = entities.find((entity: any) => entity.hasTag?.("player"));
    return playerEntity?.position;
  });

  return (
    <div className="game-ui absolute top-5 left-5 bg-black/80 text-white p-4 rounded-lg font-sans text-sm">
      <div className="mb-1">
        <strong>Entities:</strong> {entityCount}
      </div>
      <div className="mb-1">
        <strong>Physics:</strong>{" "}
        {physicsEnabled ? "Enabled" : "Disabled"}
      </div>
      <div className="mb-1">
        <strong>Active Camera:</strong> {activeCamera}
      </div>
      <div className="mb-1">
        <strong>Camera Transition:</strong>{" "}
        {cameraTransition ? "In Progress" : "None"}
      </div>
      <div>
        <strong>Ball Position:</strong>{" "}
        {ballPosition ? `X: ${ballPosition.x.toFixed(2)}, Y: ${ballPosition.y.toFixed(2)}, Z: ${ballPosition.z.toFixed(2)}` : "N/A"}
      </div>
    </div>
  );
}

function CameraControls({ 
  switchToCamera, 
  toggleControls 
}: { 
  switchToCamera: (cameraId: string, enableTransition?: boolean) => void;
  toggleControls: () => void;
}) {
  return (
    <div className="camera-controls absolute bottom-5 left-5 bg-black/80 text-white p-4 rounded-lg font-sans">
      <h3 className="m-0 mb-3 text-sm font-bold">Camera Controls</h3>
      
      <div className="mb-3">
        <p className="m-0 mb-2 text-xs">Switch Camera:</p>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => switchToCamera('default')}
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
          >
            Default
          </button>
          <button
            onClick={() => switchToCamera('top-view')}
            className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded"
          >
            Top View
          </button>
          <button
            onClick={() => switchToCamera('side-view')}
            className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded"
          >
            Side View
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => switchToCamera('default', false)}
            className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded"
          >
            Quick Switch
          </button>
        </div>
      </div>

      <div>
        <button
          onClick={toggleControls}
          className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
        >
          Toggle Controls
        </button>
      </div>
    </div>
  );
}
