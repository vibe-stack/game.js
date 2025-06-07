import { create } from 'zustand';

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
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  
  connect: (projectName: string) => void;
  disconnect: () => void;
  sendPropertyUpdate: (scenePath: string, property: string, value: unknown, temporary?: boolean) => void;
  onPropertyUpdate: (callback: (update: PropertyUpdate) => void) => void;
  onSceneUpdate: (callback: (data: SceneReloadData) => void) => void;
}

let globalPropertyUpdateCallback: ((update: PropertyUpdate) => void) | null = null;
let globalSceneUpdateCallback: ((data: SceneReloadData) => void) | null = null;

// Function to process scene state responses from the game
function processSceneStateResponse(editorState: EditorState): void {
  console.log('Processing scene state response:', editorState);
  
  // Trigger the scene update callback with the new state
  if (globalSceneUpdateCallback) {
    globalSceneUpdateCallback({
      scenePath: 'current', // Default scene path since we don't have it in the response
      type: 'scene-state-response',
      editorState
    });
  }
}

export const useEditorConnectionStore = create<EditorConnectionStore>((set, get) => ({
  ws: null,
  isConnected: false,
  connectionStatus: 'disconnected',

  connect: (projectName: string) => {
    const { ws: existingWs, disconnect, connectionStatus } = get();
    
    // Prevent multiple simultaneous connection attempts
    if (connectionStatus === 'connecting') {
      console.log('🔗 Connection already in progress, skipping...');
      return;
    }
    
    // Disconnect any existing connection
    if (existingWs) {
      console.log('🔌 Disconnecting existing WebSocket connection');
      disconnect();
    }

    console.log(`🔗 Attempting to connect to WebSocket for project: ${projectName}`);
    set({ connectionStatus: 'connecting' });

    try {
      const ws = new WebSocket('ws://localhost:3001');
      
      // Set up connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log('⏰ WebSocket connection timeout');
          ws.close();
          set({ 
            connectionStatus: 'error',
            isConnected: false,
            ws: null
          });
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('🎨 Editor connected to WebSocket');
        set({ 
          ws, 
          isConnected: true, 
          connectionStatus: 'connected' 
        });

        // Send a test message to verify connection
        try {
          const testMessage = { 
            type: 'connection-test', 
            projectName, 
            timestamp: Date.now() 
          };
          ws.send(JSON.stringify(testMessage));
          console.log('📤 Sent connection test message:', testMessage);
        } catch (error) {
          console.error('Failed to send connection test:', error);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received WebSocket message:', data);
          
          if (data.type === 'property-update' && globalPropertyUpdateCallback) {
            globalPropertyUpdateCallback(data);
          } else if (data.type === 'scene:reload' && globalSceneUpdateCallback) {
            globalSceneUpdateCallback(data);
          } else if (data.type === 'scene-state-response') {
            // Handle scene state response from the game
            console.log('🎮 Received scene state from game:', data);
            if (data.editorState) {
              // Parse the scene objects and update the scene store
              processSceneStateResponse(data.editorState);
            }
          } else if (data.type === 'heartbeat') {
            console.log('💓 Received heartbeat from dev server');
          } else if (data.type === 'connection-confirmed') {
            console.log('✅ Connection confirmed by dev server');
          } else if (data.type === 'custom' && data.event === 'scene-state-response') {
            // Handle scene state response via Vite WebSocket
            console.log('🌐 Received scene state via Vite:', data);
            if (data.data && data.data.editorState) {
              processSceneStateResponse(data.data.editorState);
            }
          } else {
            console.log('📨 Received unknown message type:', data.type, data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, 'Raw message:', event.data);
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('🔌 Editor WebSocket disconnected', { code: event.code, reason: event.reason });
        set({ 
          ws: null, 
          isConnected: false, 
          connectionStatus: 'disconnected' 
        });
        
        // Only attempt manual reconnection for unexpected disconnections
        // Don't auto-reconnect to prevent infinite loops
        if (event.code !== 1000 && event.code !== 1001) {
          console.log('🔄 Unexpected disconnection detected. Manual reconnection may be needed.');
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('🔥 Editor WebSocket error:', error);
        set({ 
          connectionStatus: 'error',
          isConnected: false,
          ws: null
        });
      };

      set({ ws });
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      set({ 
        connectionStatus: 'error',
        isConnected: false,
        ws: null
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
      connectionStatus: 'disconnected' 
    });
  },

  sendPropertyUpdate: (scenePath: string, property: string, value: unknown, temporary = false) => {
    const { ws, isConnected } = get();
    
    if (!ws || !isConnected) {
      console.warn('Cannot send property update: WebSocket not connected');
      return;
    }

    const update = {
      scenePath,
      property,
      value,
      temporary
    };

    try {
      ws.send(JSON.stringify(update));
      console.log(`🎛️ Sent ${temporary ? 'temporary' : 'permanent'} update:`, update);
    } catch (error) {
      console.error('Failed to send property update:', error);
    }
  },

  onPropertyUpdate: (callback: (update: PropertyUpdate) => void) => {
    globalPropertyUpdateCallback = callback;
  },

  onSceneUpdate: (callback: (data: SceneReloadData) => void) => {
    globalSceneUpdateCallback = callback;
  }
})); 