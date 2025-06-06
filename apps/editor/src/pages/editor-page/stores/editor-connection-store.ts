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

export const useEditorConnectionStore = create<EditorConnectionStore>((set, get) => ({
  ws: null,
  isConnected: false,
  connectionStatus: 'disconnected',

  connect: (projectName: string) => {
    const { ws: existingWs, disconnect } = get();
    
    // Disconnect any existing connection
    if (existingWs) {
      disconnect();
    }

    set({ connectionStatus: 'connecting' });

    try {
      const ws = new WebSocket('ws://localhost:3001');
      
      ws.onopen = () => {
        console.log('🎨 Editor connected to WebSocket');
        set({ 
          ws, 
          isConnected: true, 
          connectionStatus: 'connected' 
        });

        // Connect to the project through the API
        window.projectAPI.connectToEditor(projectName)
          .catch(error => console.error('Failed to connect to editor:', error));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'property-update' && globalPropertyUpdateCallback) {
            globalPropertyUpdateCallback(data);
          } else if (data.type === 'scene:reload' && globalSceneUpdateCallback) {
            globalSceneUpdateCallback(data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('🔌 Editor WebSocket disconnected');
        set({ 
          ws: null, 
          isConnected: false, 
          connectionStatus: 'disconnected' 
        });
        
        // Attempt to reconnect after 2 seconds if we were previously connected
        const { connectionStatus } = get();
        if (connectionStatus === 'connected') {
          setTimeout(() => {
            const { connect } = get();
            connect(projectName);
          }, 2000);
        }
      };

      ws.onerror = (error) => {
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