import * as THREE from "three";
import { PropertyUpdater } from "./property-updater";
import { ObjectFactory } from "./object-factory";

export interface SceneParams {
  [key: string]: string;
}

export interface SceneMetadata {
  [key: string]: any;
}

// Helper function to safely check if we're in development
function isDevelopment(): boolean {
  try {
    return (
      typeof import.meta !== "undefined" &&
      import.meta.env !== undefined &&
      import.meta.env.DEV === true
    );
  } catch {
    return false;
  }
}

export abstract class Scene {
  protected scene: THREE.Scene;
  protected camera: THREE.Camera;
  protected renderer: THREE.WebGLRenderer;
  protected params: SceneParams = {};
  protected metadata: SceneMetadata = {};

  // Editor integration (development only)
  private _editorOverrides: any = {};
  private _sceneObjects: Map<string, THREE.Object3D> = new Map();
  private _wsConnection: WebSocket | null = null;
  private _routePath: string = "/";

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = this.getRenderer();

    // Only setup editor features in development
    if (isDevelopment()) {
      this.setupEditorIntegration();
    }
  }

  abstract init(): Promise<void>;
  abstract update(deltaTime: number): void;
  abstract cleanup(): void;

  // Internal init method that handles metadata loading before user's init
  async internalInit(): Promise<void> {
    // Load metadata if decorator was used
    if ((this as any).getMetadataPath && typeof (this as any).loadMetadata === 'function') {
      const metadataPath = (this as any).getMetadataPath();
      if (metadataPath) {
        await (this as any).loadMetadata(metadataPath);
      }
    }
    
    // Call user's init method
    await this.init();
  }

  onEnter?(): void;
  onExit?(): void;
  onResize?(width: number, height: number): void;

  // Clear the object registry - called internally during scene switching
  clearObjectRegistry(): void {
    if (!isDevelopment()) return;

    this._sceneObjects.clear();
    this._editorOverrides = {};
  }

  setParams(params: SceneParams): void {
    this.params = params;
  }

  setRoutePath(routePath: string): void {
    this._routePath = routePath;
  }

  getRoutePath(): string {
    return this._routePath;
  }

  setMetadata(metadata: SceneMetadata): void {
    this.metadata = metadata;
    this.applyMetadata();
  }

  // === DEVELOPMENT-ONLY EDITOR METHODS ===
  // These get tree-shaken out of production builds

  private setupEditorIntegration(): void {
    if (!isDevelopment()) return;

    // Connect to Vite's WebSocket for hot module replacement
    if (typeof window !== "undefined" && (window as any).__vite_ws) {
      const viteWs = (window as any).__vite_ws;

      // Listen for property updates from the editor
      viteWs.addEventListener("message", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "custom" && data.event === "property-update") {
            this.applyEditorUpdate(data.data);
          } else if (data.type === "custom" && data.event === "scene-reload") {
            this.handleSceneReload(data.data);
          } else if (
            data.type === "custom" &&
            data.event === "request-scene-state"
          ) {
            this.sendSceneStateViaVite();
          }
        } catch (error) {
          // Ignore non-JSON messages
        }
      });
    }

    // Always try direct WebSocket connection as well for editor communication
    try {
      this._wsConnection = new WebSocket("ws://localhost:3001");

      this._wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Handle different message types from the editor
          if (
            data.type === "property-update" ||
            (data.type === "custom" && data.event === "property-update")
          ) {
            const update = data.data || data; // Support both formats
            this.applyEditorUpdate(update);
          } else if (
            data.type === "scene-reload" ||
            (data.type === "custom" && data.event === "scene-reload")
          ) {
            const reloadData = data.data || data; // Support both formats
            this.handleSceneReload(reloadData);
          } else if (data.type === "request-scene-state") {
            this.sendSceneStateToEditor();
          }
        } catch (error) {}
      };

      this._wsConnection.onclose = () => {
        // Attempt to reconnect in development
        setTimeout(() => this.setupEditorIntegration(), 2000);
      };
    } catch (error) {}
  }

  setEditorOverrides(overrides: any): void {
    if (!isDevelopment()) return;

    this._editorOverrides = overrides;
    this.applyEditorOverrides();
  }

  getEditorOverrides(): any {
    return isDevelopment() ? this._editorOverrides : {};
  }

  registerObject(name: string, object: THREE.Object3D): void {
    if (!isDevelopment()) return;

    this._sceneObjects.set(name, object);
    object.name = name;
  }

  getObject(name: string): THREE.Object3D | undefined {
    return isDevelopment() ? this._sceneObjects.get(name) : undefined;
  }

  getAllObjects(): Map<string, THREE.Object3D> {
    return isDevelopment() ? new Map(this._sceneObjects) : new Map();
  }

  updateObjectProperty(
    objectName: string,
    propertyPath: string,
    value: any
  ): void {
    if (!isDevelopment()) return;

    const obj = this.getObject(objectName);
    if (!obj) return;

    PropertyUpdater.applyObjectPropertyUpdate(obj, propertyPath.split("."), value);
  }

  private applyEditorUpdate(update: any): void {
    if (!isDevelopment()) return;

    if (update.property.startsWith("objects.")) {
      const pathParts = update.property.split(".");
      const objectName = pathParts[1];
      const propertyPath = pathParts.slice(2);

      const obj = this.getObject(objectName);
      if (!obj) {
        return;
      }

      // Use PropertyUpdater for all object property updates
      PropertyUpdater.applyObjectPropertyUpdate(obj, propertyPath, update.value);
    } else if (this.hasOwnProperty(update.property)) {
      // Handle scene-level property updates
      (this as any)[update.property] = update.value;
    }
  }

  getEditableProperties(): any {
    if (!isDevelopment()) return {};

    const properties: any = {};
    const prototype = Object.getPrototypeOf(this);
    const editableProps =
      Reflect.getMetadata?.("editable:properties", prototype) || [];

    editableProps.forEach((prop: any) => {
      properties[prop.property] = {
        value: (this as any)[prop.property],
        options: prop.options,
      };
    });

    return properties;
  }

  getEditableObjects(): any {
    if (!isDevelopment()) return {};

    const objects: any = {};

    this._sceneObjects.forEach((obj, name) => {
      objects[name] = {
        type: obj.type,
        position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
        rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
        scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
        visible: obj.visible,
        matrix: obj.matrix.toArray(),
        ...(obj instanceof THREE.Mesh && {
          material:
            obj.material instanceof THREE.Material
              ? {
                  color:
                    obj.material instanceof THREE.MeshBasicMaterial
                      ? obj.material.color.getHex()
                      : undefined,
                  opacity: obj.material.opacity,
                  transparent: obj.material.transparent,
                }
              : undefined,
        }),
      };
    });

    return objects;
  }

  serialize(): any {
    const sceneData = this.scene.toJSON();

    return {
      scene: sceneData,
      camera: this.camera.toJSON(),
      metadata: this.metadata,
      // Only include editor data in development
      ...(isDevelopment() && {
        editorOverrides: this._editorOverrides,
        editableProperties: this.getEditableProperties(),
        registeredObjects: Array.from(this._sceneObjects.keys()),
      }),
    };
  }

  // === AUTOMATIC OBJECT CREATION FROM METADATA ===

  protected async createObjectsFromMetadata(): Promise<void> {
    // Safety check: ensure the scene is properly initialized before creating objects
    if (!this.scene || typeof this.scene.add !== 'function') {
      console.warn('Scene not properly initialized, skipping object creation from metadata');
      return;
    }

    // Handle new Three.js JSON format
    if (this.metadata.scene) {
      try {
        const obj = ObjectFactory.createObject(this.metadata.scene);
        if (obj) {
          // Mark this object as being created from metadata
          obj.userData = obj.userData || {};
          obj.userData.fromMetadata = true;
          
          // Add the entire loaded object structure to our scene
          this.scene.add(obj);
          
          // Register the root object
          this.registerObject(obj.name || obj.uuid || 'loaded-scene', obj);
          
          // If it's a Group, register all named children recursively
          if (obj.type === 'Group') {
            this.registerChildrenRecursively(obj);
          }
        }
      } catch (error) {
        console.warn('Failed to create objects from Three.js metadata:', error);
      }
    }
    
    // Legacy support for old simplified format
    if (this.metadata.objects) {
      for (const [name, objectData] of Object.entries(this.metadata.objects)) {
        try {
          const obj = ObjectFactory.createObject(objectData as any);

          if (obj) {
            // Mark this object as being created from metadata
            obj.userData = obj.userData || {};
            obj.userData.fromMetadata = true;
            
            this.scene.add(obj);
            this.registerObject(name, obj);
          }
        } catch (error) {
          console.warn(`Failed to create object ${name}:`, error);
        }
      }
    }
  }

  private registerChildrenRecursively(parent: THREE.Object3D): void {
    if (!isDevelopment()) return;
    
    parent.children.forEach((child) => {
      // Mark child as being from metadata
      child.userData = child.userData || {};
      child.userData.fromMetadata = true;
      
      if (child.name) {
        this.registerObject(child.name, child);
      }
      
      // Recursively register children of children
      if (child.children.length > 0) {
        this.registerChildrenRecursively(child);
      }
    });
  }

  // === END DEVELOPMENT-ONLY METHODS ===

  protected applyMetadata(): void {
    // Apply @Editable property overrides
    for (const [key, value] of Object.entries(this.metadata)) {
      if (key !== "objects" && key !== "scene" && this.hasOwnProperty(key)) {
        (this as any)[key] = value;
      }
    }

    // Automatically create objects from metadata
    // Only create objects if the scene is properly initialized
    if (this.scene && typeof this.scene.add === 'function') {
      this.createObjectsFromMetadata();
    } else {
      // If scene isn't ready, we'll defer object creation until init() is called
      console.warn('Scene not ready, deferring object creation from metadata');
    }
  }

  private applyEditorOverrides(): void {
    if (!isDevelopment()) return;

    for (const [key, value] of Object.entries(this._editorOverrides)) {
      if (key === "objects") {
        if (typeof value === "object" && value !== null) {
          for (const [objName, objOverrides] of Object.entries(value)) {
            const obj = this.getObject(objName);
            if (obj && objOverrides) {
              this.applyThreeJSOverrides(obj, objOverrides as any);
            }
          }
        }
      } else if (this.hasOwnProperty(key)) {
        (this as any)[key] = value;
      }
    }
  }

  private applyThreeJSOverrides(object: THREE.Object3D, overrides: any): void {
    for (const [key, value] of Object.entries(overrides)) {
      if (key === "position" && object.position) {
        if (value && typeof value === 'object' && 'x' in value && 'y' in value && 'z' in value) {
          object.position.set(Number(value.x), Number(value.y), Number(value.z));
        }
      } else if (key === "rotation" && object.rotation) {
        if (value && typeof value === 'object' && 'x' in value && 'y' in value && 'z' in value) {
          object.rotation.set(Number(value.x), Number(value.y), Number(value.z));
        }
      } else if (key === "scale" && object.scale) {
        if (value && typeof value === 'object' && 'x' in value && 'y' in value && 'z' in value) {
          object.scale.set(Number(value.x), Number(value.y), Number(value.z));
        }
      } else if (key === "matrix") {
        if (Array.isArray(value) && value.length === 16) {
          object.matrix.fromArray(value);
          object.matrix.decompose(object.position, object.quaternion, object.scale);
        }
      } else if (key === "visible") {
        object.visible = value as boolean;
      } else if (key === "material" && "material" in object) {
        const material = (object as any).material;
        if (material && typeof value === "object") {
          Object.assign(material, value);
        }
      } else {
        (object as any)[key] = value;
      }
    }
  }

  protected getRenderer(): THREE.WebGLRenderer {
    return (globalThis as any).__THREEJS_RENDERER__;
  }

  protected getCamera(): THREE.Camera {
    return this.camera;
  }

  protected getScene(): THREE.Scene {
    return this.scene;
  }

  private sendSceneStateToEditor(): void {
    if (
      !isDevelopment() ||
      !this._wsConnection ||
      this._wsConnection.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    const sceneState = {
      type: "scene-state-response",
      timestamp: Date.now(),
      editorState: {
        properties: this.getEditableProperties(),
        objects: this.getEditableObjects(),
        overrides: this.getEditorOverrides(),
      },
    };

    try {
      this._wsConnection.send(JSON.stringify(sceneState));
    } catch (error) {}
  }

  private sendSceneStateViaVite(): void {
    if (
      !isDevelopment() ||
      typeof window === "undefined" ||
      !(window as any).__vite_ws
    ) {
      return;
    }

    const viteWs = (window as any).__vite_ws;
    const sceneState = {
      type: "custom",
      event: "scene-state-response",
      data: {
        timestamp: Date.now(),
        editorState: {
          properties: this.getEditableProperties(),
          objects: this.getEditableObjects(),
          overrides: this.getEditorOverrides(),
        },
      },
    };

    try {
      viteWs.send(JSON.stringify(sceneState));
    } catch (error) {}
  }

  private handleSceneReload(data: any): void {
    if (!isDevelopment() || !data.sceneData) return;

    try {
      // Find and remove all auto-generated objects (those created from metadata)
      const objectsToRemove: string[] = [];
      
      this._sceneObjects.forEach((obj, name) => {
        // Remove objects that were created from metadata (loaded scene objects)
        if (name.startsWith('loaded-') || name === 'loaded-scene' || obj.userData?.fromMetadata) {
          this.scene.remove(obj);
          objectsToRemove.push(name);
        }
      });

      // Clear them from the registry
      objectsToRemove.forEach(name => {
        this._sceneObjects.delete(name);
      });

      // Update metadata with new scene data
      this.metadata.scene = data.sceneData;

      // Recreate objects from the updated metadata
      this.createObjectsFromMetadata();

      console.log(`🔄 Scene reloaded with updated Three.js objects (removed ${objectsToRemove.length} old objects)`);
    } catch (error) {
      console.error('Failed to reload scene:', error);
    }
  }
}
