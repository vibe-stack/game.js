import { create } from 'zustand';
import { SceneObject } from '../types';

interface SceneSyncStore {
  loadSceneObjects: (scenePath: string) => Promise<void>;
  requestSceneState: () => Promise<void>;
  setupEditorConnection: (projectName: string) => void;
}

export const useSceneSyncStore = create<SceneSyncStore>(() => ({
  loadSceneObjects: async (scenePath: string) => {
    try {
      const { useDevServerStore } = await import('./dev-server-store');
      const serverInfo = useDevServerStore.getState().serverInfo;
      
      if (!serverInfo?.url) {
        const { useSceneObjectsStore } = await import('./scene-objects-store');
        useSceneObjectsStore.getState().setSceneObjects([]);
        return;
      }

      const projectName = new URLSearchParams(window.location.search).get('project') || 'current-project';

      const { useEditorConnectionStore } = await import('./editor-connection-store');
      const editorConnection = useEditorConnectionStore.getState();
      
      try {
        if (!editorConnection.isConnected) {
          editorConnection.connect(projectName);
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (editorConnection.isConnected) {
          await requestSceneState();
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { useSceneObjectsStore } = await import('./scene-objects-store');
          const currentObjects = useSceneObjectsStore.getState().sceneObjects;
          if (currentObjects.length > 0) {
            return;
          }
        }
      } catch {
        // Continue to fallback
      }

      const editorJsonUrl = `${serverInfo.url}/${scenePath.replace(/\.(ts|js)$/, '.editor.json')}`;
      
      try {
        const response = await fetch(editorJsonUrl);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const editorData = await response.json();
            const objects: SceneObject[] = [];
            
            if (editorData.scene && editorData.scene.object && editorData.scene.object.children) {
              
              interface ThreeJSObject {
                uuid?: string;
                name?: string;
                type?: string;
                visible?: boolean;
                matrix?: number[];
                material?: string;
                geometry?: string;
                children?: ThreeJSObject[];
              }
              
              interface ThreeJSMaterial {
                uuid: string;
                type: string;
                color?: number;
                opacity?: number;
                transparent?: boolean;
              }
              
              const convertThreeJSObjectToSceneObject = (obj: ThreeJSObject): SceneObject => {
                let position: [number, number, number] = [0, 0, 0];
                let rotation: [number, number, number] = [0, 0, 0];
                let scale: [number, number, number] = [1, 1, 1];
                
                if (obj.matrix && Array.isArray(obj.matrix) && obj.matrix.length === 16) {
                  const m = obj.matrix;
                  position = [m[12], m[13], m[14]];
                  
                  const sx = Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2]);
                  const sy = Math.sqrt(m[4] * m[4] + m[5] * m[5] + m[6] * m[6]);
                  const sz = Math.sqrt(m[8] * m[8] + m[9] * m[9] + m[10] * m[10]);
                  scale = [sx, sy, sz];
                  
                  rotation = [0, 0, 0];
                }
                
                let material: { color?: number; opacity?: number; transparent?: boolean } | undefined;
                if (obj.material && editorData.scene.materials) {
                  const materialData = (editorData.scene.materials as ThreeJSMaterial[]).find((mat) => mat.uuid === obj.material);
                  if (materialData) {
                    material = {
                      color: materialData.color,
                      opacity: materialData.opacity || 1,
                      transparent: materialData.transparent || false
                    };
                  }
                }
                
                const sceneObject: SceneObject = {
                  id: obj.uuid || obj.name || Date.now().toString(),
                  name: obj.name || obj.uuid || 'Unnamed',
                  type: obj.type || 'Object3D',
                  visible: obj.visible !== false,
                  position,
                  rotation,
                  scale,
                  material
                };
                
                if (obj.children && obj.children.length > 0) {
                  sceneObject.children = obj.children.map(convertThreeJSObjectToSceneObject);
                }
                
                return sceneObject;
              };
              
              (editorData.scene.object.children as ThreeJSObject[]).forEach((child) => {
                objects.push(convertThreeJSObjectToSceneObject(child));
              });
            } else if (editorData.objects) {
              Object.entries(editorData.objects).forEach(([key, obj]: [string, unknown]) => {
                const objectData = obj as Record<string, unknown>;
                objects.push({
                  id: key,
                  name: (objectData.name as string) || key,
                  type: (objectData.type as string) || 'Object3D',
                  visible: objectData.visible !== false,
                  position: (objectData.position as [number, number, number]) || [0, 0, 0],
                  rotation: (objectData.rotation as [number, number, number]) || [0, 0, 0],
                  scale: (objectData.scale as [number, number, number]) || [1, 1, 1],
                  material: (objectData.material as { color?: number; opacity?: number; transparent?: boolean }) || undefined
                });
              });
            }
            
            const { useSceneObjectsStore } = await import('./scene-objects-store');
            useSceneObjectsStore.getState().setSceneObjects(objects);
            return;
          }
        }
      } catch {
        // Continue to fallback
      }

      const { useSceneObjectsStore } = await import('./scene-objects-store');
      useSceneObjectsStore.getState().setSceneObjects([]);
    } catch {
      const { useSceneObjectsStore } = await import('./scene-objects-store');
      useSceneObjectsStore.getState().setSceneObjects([]);
    }
  },

  requestSceneState: async () => {
    try {
      const { useEditorConnectionStore } = await import('./editor-connection-store');
      const editorConnection = useEditorConnectionStore.getState();
      
      if (editorConnection.isConnected && editorConnection.ws) {
        const requestMessage = {
          type: 'request-scene-state',
          timestamp: Date.now()
        };
        
        editorConnection.ws.send(JSON.stringify(requestMessage));
        
        if (typeof window !== 'undefined' && (window as Window & { __vite_ws?: WebSocket }).__vite_ws) {
          const viteMessage = {
            type: 'custom',
            event: 'request-scene-state',
            data: { timestamp: Date.now() }
          };
          
          (window as Window & { __vite_ws?: WebSocket }).__vite_ws!.send(JSON.stringify(viteMessage));
        }
      }
    } catch {
      // Silent fail
    }
  },

  setupEditorConnection: (projectName: string) => {
    import('./editor-connection-store').then(({ useEditorConnectionStore }) => {
      const editorConnection = useEditorConnectionStore.getState();
      
      editorConnection.onPropertyUpdate(() => {
        // Handle property updates if needed
      });

      editorConnection.onSceneUpdate(async (data) => {
        if (data.type === 'scene-state-response' && 'editorState' in data && data.editorState) {
          const editorState = data.editorState as { properties?: unknown; objects?: Record<string, unknown>; overrides?: unknown };
          
          if (editorState.objects) {
            const objects: SceneObject[] = [];
            
            Object.entries(editorState.objects).forEach(([key, obj]) => {
              const objectData = obj as Record<string, unknown>;
              objects.push({
                id: key,
                name: (objectData.name as string) || key,
                type: (objectData.type as string) || 'Object3D',
                visible: objectData.visible !== false,
                position: (objectData.position as [number, number, number]) || [0, 0, 0],
                rotation: (objectData.rotation as [number, number, number]) || [0, 0, 0],
                scale: (objectData.scale as [number, number, number]) || [1, 1, 1],
                material: objectData.material as { color?: number; opacity?: number; transparent?: boolean } | undefined
              });
            });
            
            const { useSceneObjectsStore } = await import('./scene-objects-store');
            useSceneObjectsStore.getState().setSceneObjects(objects);
            return;
          }
        }
      });

      editorConnection.connect(projectName);
    });
  }
}));

const { requestSceneState } = useSceneSyncStore.getState(); 