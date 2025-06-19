import { useEffect, useRef, useState } from "react";
import { GameWorld } from "../../models";
import { createKitchenSinkExampleV4, useKitchenSinkGameStateV4 } from "../../models/kitchen-sink-example-v4";

export default function DemoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<any>(null);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

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
        const kitchenSinkExample = await createKitchenSinkExampleV4(canvasRef.current!);
        if (mounted) {
          gameRef.current = kitchenSinkExample;
          setGameInitialized(true);
        } else {
          kitchenSinkExample.cleanup();
        }
      } catch (error) {
        console.error("Failed to initialize kitchen sink demo:", error);
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

  const enableAudio = async () => {
    if (gameRef.current) {
      try {
        await gameRef.current.managers.sound.handleUserInteraction();
        setIsAudioEnabled(true);
      } catch (error) {
        console.error("Failed to enable audio:", error);
      }
    }
  };

  return (
    <div className="demo-page relative w-full h-screen overflow-hidden bg-gray-900">
      <canvas
        ref={canvasRef}
        className="game-canvas w-full h-full block"
      />
{/* 
      {gameInitialized && gameRef.current && (
        <KitchenSinkUI 
          game={gameRef.current.game}
          entities={gameRef.current.entities}
          managers={gameRef.current.managers}
          player={gameRef.current.player}
          currentController={gameRef.current.functions.getCurrentController()}
        />
      )} */}

      {gameInitialized && gameRef.current && (
        <ControlPanelV4 
          functions={gameRef.current.functions}
          managers={gameRef.current.managers}
          isAudioEnabled={isAudioEnabled}
          onEnableAudio={enableAudio}
        />
      )}

      {gameInitialized && gameRef.current && (
        <KeyboardControlsV4 />
      )}
    </div>
  );
}

function ControlPanelV4({ 
  functions, 
  managers, 
  isAudioEnabled, 
  onEnableAudio 
}: { 
  functions: any;
  managers: any;
  isAudioEnabled: boolean;
  onEnableAudio: () => void;
}) {
  return (
    <div className="control-panel absolute bottom-5 left-5 bg-black/90 text-white p-4 rounded-lg font-mono max-w-md">
      <h3 className="text-lg font-bold mb-3 text-blue-400">🎛️ Terrain Demo Controls</h3>
      
      {/* Action Controls */}
      <div className="mb-4">
        <h4 className="text-sm font-bold mb-2 text-yellow-400">Actions:</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={functions.explodeAllObjects}
            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
          >
            Explode (E)
          </button>
          <button
            onClick={functions.resetScene}
            className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded"
          >
            Reset (R)
          </button>
        </div>
      </div>

      {/* Debug Controls */}
      <div className="mb-4">
        <h4 className="text-sm font-bold mb-2 text-green-400">Debug:</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={functions.toggleEntityDebugRender}
            className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded"
          >
            Entity Debug (D)
          </button>
          <button
            onClick={functions.logPhysicsInfo}
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
          >
            Physics Info (I)
          </button>
        </div>
      </div>

      {/* Audio Controls */}
      <div className="mb-4">
        <h4 className="text-sm font-bold mb-2 text-purple-400">Audio:</h4>
        {!isAudioEnabled ? (
          <button
            onClick={onEnableAudio}
            className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 rounded w-full"
          >
            Enable Audio
          </button>
        ) : (
          <div className="text-xs text-gray-300">
            <div>SFX: Click objects to interact</div>
            <div>Jump: Space</div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400">
        <div>🌍 Third Person Terrain Demo</div>
        <div>🎨 Various materials & primitives</div>
        <div>💡 Orbital lighting effects</div>
        <div>🏃‍♂️ Physics-based character controller</div>
      </div>
    </div>
  );
}

function KeyboardControlsV4() {
  return (
    <div className="keyboard-controls absolute top-5 right-5 bg-black/90 text-white p-4 rounded-lg font-mono text-xs max-w-xs">
      <h3 className="text-sm font-bold mb-3 text-cyan-400">⌨️ Terrain Demo Controls</h3>
      
      <div className="space-y-2">
        <div className="border-b border-gray-700 pb-2">
          <div className="text-yellow-400 font-bold">Movement:</div>
          <div className="text-gray-300">WASD: Move around terrain</div>
          <div className="text-gray-300">Space: Jump</div>
          <div className="text-gray-300">Shift: Sprint</div>
          <div className="text-gray-300">Mouse: Look around (third person)</div>
        </div>
        
        <div className="border-b border-gray-700 pb-2">
          <div className="text-red-400 font-bold">Actions:</div>
          <div className="text-gray-300">E: Explode all objects</div>
          <div className="text-gray-300">R: Reset scene</div>
          <div className="text-gray-300">Click objects: Apply force</div>
        </div>
        
        <div className="border-b border-gray-700 pb-2">
          <div className="text-green-400 font-bold">Debug:</div>
          <div className="text-gray-300">P: Toggle physics debug</div>
          <div className="text-gray-300">D: Toggle entity debug</div>
          <div className="text-gray-300">I: Log physics info</div>
        </div>
        
        <div>
          <div className="text-purple-400 font-bold">Features:</div>
          <div className="text-gray-300">• Procedural terrain</div>
          <div className="text-gray-300">• Dynamic primitives</div>
          <div className="text-gray-300">• Orbital lighting</div>
          <div className="text-gray-300">• Physics interactions</div>
          <div className="text-gray-300">• Various materials</div>
        </div>
      </div>
    </div>
  );
}