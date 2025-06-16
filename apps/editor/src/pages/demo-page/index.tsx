import { useEffect, useRef, useState } from "react";
import { GameWorld } from "../../models";
import { createGameExample, useGameState } from "../../models/example";

export default function DemoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    game: GameWorld;
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

      <div className="demo-info absolute top-5 right-5 bg-black/80 text-white p-5 rounded-lg max-w-xs font-sans">
        <h2 className="m-0 mb-2.5 text-lg">Game Demo</h2>
        <p className="m-0 mb-4 text-sm">
          Click the sphere to apply an impulse!
        </p>
        <ul className="m-0 pl-5 text-xs">
          <li>Physics-enabled sphere (Player Ball)</li>
          <li>Static ground plane</li>
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
      <div>
        <strong>Physics:</strong>{" "}
        {physicsEnabled ? "Enabled" : "Disabled"}
      </div>
      <div>
        <strong>Ball Position:</strong>{" "}
        {ballPosition ? `X: ${ballPosition.x.toFixed(2)}, Y: ${ballPosition.y.toFixed(2)}, Z: ${ballPosition.z.toFixed(2)}` : "N/A"}
      </div>
    </div>
  );
}
