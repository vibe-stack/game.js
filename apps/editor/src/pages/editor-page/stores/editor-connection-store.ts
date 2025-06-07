import { create } from "zustand";

interface PropertyUpdate {
  scenePath: string;
  property: string;
  value: unknown;
  temporary?: boolean;
}

interface SceneReloadData {
  scenePath: string;
  [key: string]: unknown;
}

interface EditorState {
  properties?: Record<string, unknown>;
  objects?: Record<string, unknown>;
  overrides?: Record<string, unknown>;
}

interface EditorConnectionStore {
  ws: WebSocket | null;
  isConnected: boolean;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";

  connect: (projectName: string) => void;
  disconnect: () => void;
  sendPropertyUpdate: (
    scenePath: string,
    property: string,
    value: unknown,
    temporary?: boolean,
  ) => void;
  onPropertyUpdate: (callback: (update: PropertyUpdate) => void) => void;
  onSceneUpdate: (callback: (data: SceneReloadData) => void) => void;
}

let globalPropertyUpdateCallback: ((update: PropertyUpdate) => void) | null =
  null;
let globalSceneUpdateCallback: ((data: SceneReloadData) => void) | null = null;

// Function to process scene state responses from the game
function processSceneStateResponse(editorState: EditorState): void {
  if (globalSceneUpdateCallback) {
    globalSceneUpdateCallback({
      scenePath: "current", // Default scene path since we don't have it in the response
      type: "scene-state-response",
      editorState,
    });
  }
}

export const useEditorConnectionStore = create<EditorConnectionStore>(
  (set, get) => ({
    ws: null,
    isConnected: false,
    connectionStatus: "disconnected",

    connect: (projectName: string) => {
      const { ws: existingWs, disconnect, connectionStatus } = get();

      // Prevent multiple simultaneous connection attempts
      if (connectionStatus === "connecting") {
        return;
      }

      // Disconnect any existing connection
      if (existingWs) {
        disconnect();
      }

      set({ connectionStatus: "connecting" });

      try {
        const ws = new WebSocket("ws://localhost:3001");

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            set({
              connectionStatus: "error",
              isConnected: false,
              ws: null,
            });
          }
        }, 5000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          set({
            ws,
            isConnected: true,
            connectionStatus: "connected",
          });

          // Send a test message to verify connection
          try {
            const testMessage = {
              type: "connection-test",
              projectName,
              timestamp: Date.now(),
            };
            ws.send(JSON.stringify(testMessage));
          } catch (error) {
            console.error("Failed to send connection test:", error);
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (
              data.type === "property-update" &&
              globalPropertyUpdateCallback
            ) {
              globalPropertyUpdateCallback(data);
            } else if (
              data.type === "scene:reload" &&
              globalSceneUpdateCallback
            ) {
              globalSceneUpdateCallback(data);
            } else if (data.type === "scene-state-response") {
              if (data.editorState) {
                processSceneStateResponse(data.editorState);
              }
            } else if (data.type === "heartbeat") {
              // do nothing
            } else if (data.type === "connection-confirmed") {
              // do nothing
            } else if (
              data.type === "custom" &&
              data.event === "scene-state-response"
            ) {
              if (data.data && data.data.editorState) {
                processSceneStateResponse(data.data.editorState);
              }
            } else {
              // do nothing
            }
          } catch (error) {
            console.error("🔥 Editor WebSocket error:", error);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          set({
            ws: null,
            isConnected: false,
            connectionStatus: "disconnected",
          });

          // Only attempt manual reconnection for unexpected disconnections
          // Don't auto-reconnect to prevent infinite loops
          if (event.code !== 1000 && event.code !== 1001) {
            console.error("🔄 Unexpected disconnection detected. Manual reconnection may be needed.",
            );
          }
        };

        ws.onerror = (error) => {
          console.error("🔥 Editor WebSocket error:", error);
          clearTimeout(connectionTimeout);
          set({
            connectionStatus: "error",
            isConnected: false,
            ws: null,
          });
        };

        set({ ws });
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        set({
          connectionStatus: "error",
          isConnected: false,
          ws: null,
        });
      }
    },

    disconnect: () => {
      const { ws } = get();
      if (ws) {
        ws.close();
      }
      set({
        ws: null,
        isConnected: false,
        connectionStatus: "disconnected",
      });
    },

    sendPropertyUpdate: (
      scenePath: string,
      property: string,
      value: unknown,
      temporary = false,
    ) => {
      const { ws, isConnected } = get();

      if (!ws || !isConnected) {
        return;
      }

      const update = {
        scenePath,
        property,
        value,
        temporary,
      };

      try {
        ws.send(JSON.stringify(update));
      } catch (error) {
        console.error("Failed to send property update:", error);
      }
    },

    onPropertyUpdate: (callback: (update: PropertyUpdate) => void) => {
      globalPropertyUpdateCallback = callback;
    },

    onSceneUpdate: (callback: (data: SceneReloadData) => void) => {
      globalSceneUpdateCallback = callback;
    },
  }),
);
