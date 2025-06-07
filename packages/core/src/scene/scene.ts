import * as THREE from 'three';

export interface SceneParams {
  [key: string]: string;
}

export interface SceneMetadata {
  [key: string]: any;
}

// Helper function to safely check if we're in development
function isDevelopment(): boolean {
  try {
    return typeof import.meta !== 'undefined' && 
           import.meta.env !== undefined && 
           import.meta.env.DEV === true;
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

  onEnter?(): void;
  onExit?(): void;
  onResize?(width: number, height: number): void;

  setParams(params: SceneParams): void {
    this.params = params;
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
    if (typeof window !== 'undefined' && (window as any).__vite_ws) {
      const viteWs = (window as any).__vite_ws;
      
      // Listen for property updates from the editor
      viteWs.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'custom' && data.event === 'property-update') {
            console.log('🔥 Received property update:', data.data);
            this.applyEditorUpdate(data.data);
          } else if (data.type === 'custom' && data.event === 'request-scene-state') {
            console.log('📡 Received scene state request via Vite');
            this.sendSceneStateViaVite();
          }
        } catch (error) {
          // Ignore non-JSON messages
        }
      });
      
      console.log('🎨 Scene connected to Vite WebSocket for live updates');
    }
    
    // Always try direct WebSocket connection as well for editor communication
    try {
      this._wsConnection = new WebSocket('ws://localhost:3001');
      
      this._wsConnection.onopen = () => {
        console.log('🎨 Scene connected to editor WebSocket');
      };
      
      this._wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Handle different message types from the editor
          if (data.type === 'property-update' || (data.type === 'custom' && data.event === 'property-update')) {
            const update = data.data || data; // Support both formats
            console.log('🔥 Received property update:', update);
            this.applyEditorUpdate(update);
          } else if (data.type === 'request-scene-state') {
            console.log('📡 Received scene state request');
            this.sendSceneStateToEditor();
          }
        } catch (error) {
          console.error('Failed to parse editor update:', error);
        }
      };

      this._wsConnection.onclose = () => {
        console.log('🔌 Editor WebSocket disconnected');
        // Attempt to reconnect in development
        setTimeout(() => this.setupEditorIntegration(), 2000);
      };
    } catch (error) {
      console.log('⚠️ No editor WebSocket available');
    }
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

  updateObjectProperty(objectName: string, propertyPath: string, value: any): void {
    if (!isDevelopment()) return;
    
    const obj = this.getObject(objectName);
    if (!obj) return;

    this.setNestedProperty(obj, propertyPath, value);
  }

  private applyEditorUpdate(update: any): void {
    if (!isDevelopment()) return;
    
    console.log(`🎛️ Applying update: ${update.property} = ${JSON.stringify(update.value)}`);
    
    if (update.property.startsWith('objects.')) {
      const pathParts = update.property.split('.');
      const objectName = pathParts[1];
      const propertyPath = pathParts.slice(2);
      
      const obj = this.getObject(objectName);
      if (!obj) {
        console.warn(`Object ${objectName} not found`);
        return;
      }
      
      // Handle specific property updates with smart application
      this.applyObjectPropertyUpdate(obj, propertyPath, update.value);
    } else if (this.hasOwnProperty(update.property)) {
      // Handle scene-level property updates
      (this as any)[update.property] = update.value;
    }
  }

  private applyObjectPropertyUpdate(obj: THREE.Object3D, propertyPath: string[], value: any): void {
    const property = propertyPath.join('.');
    
    switch (property) {
      case 'position':
        if (Array.isArray(value) && value.length === 3) {
          obj.position.fromArray(value);
          console.log(`  📍 Updated ${obj.name} position:`, value);
        }
        break;
        
      case 'rotation':
        if (Array.isArray(value) && value.length === 3) {
          obj.rotation.set(value[0], value[1], value[2]);
          console.log(`  🔄 Updated ${obj.name} rotation:`, value);
        }
        break;
        
      case 'scale':
        if (Array.isArray(value) && value.length === 3) {
          obj.scale.fromArray(value);
          console.log(`  📏 Updated ${obj.name} scale:`, value);
        }
        break;
        
      case 'visible':
        obj.visible = Boolean(value);
        console.log(`  👁️ Updated ${obj.name} visibility:`, value);
        break;
        
      case 'material.color':
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.Material) {
          const material = obj.material as any;
          if (material.color) {
            // Handle hex color strings like "#ff0000" or numeric values
            const colorValue = typeof value === 'string' ? 
              parseInt(value.replace('#', ''), 16) : value;
            material.color.setHex(colorValue);
            console.log(`  🎨 Updated ${obj.name} material color:`, value);
          }
        }
        break;
        
      case 'material.opacity':
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.Material) {
          const material = obj.material as any;
          if ('opacity' in material) {
            material.opacity = Number(value);
            console.log(`  🔍 Updated ${obj.name} material opacity:`, value);
          }
        }
        break;
        
      case 'material.transparent':
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.Material) {
          const material = obj.material as any;
          if ('transparent' in material) {
            material.transparent = Boolean(value);
            console.log(`  🫧 Updated ${obj.name} material transparency:`, value);
          }
        }
        break;
        
      default:
        // Fallback to generic nested property setting
        this.setNestedProperty(obj, property, value);
        console.log(`  🔧 Updated ${obj.name} ${property}:`, value);
        break;
    }
  }

  getEditableProperties(): any {
    if (!isDevelopment()) return {};
    
    const properties: any = {};
    const prototype = Object.getPrototypeOf(this);
    const editableProps = Reflect.getMetadata?.('editable:properties', prototype) || [];
    
    editableProps.forEach((prop: any) => {
      properties[prop.property] = {
        value: (this as any)[prop.property],
        options: prop.options
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
        position: obj.position.toArray(),
        rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
        scale: obj.scale.toArray(),
        visible: obj.visible,
        ...(obj instanceof THREE.Mesh && {
          material: obj.material instanceof THREE.Material ? {
            color: obj.material instanceof THREE.MeshBasicMaterial ? obj.material.color.getHex() : undefined,
            opacity: obj.material.opacity,
            transparent: obj.material.transparent
          } : undefined
        })
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
        registeredObjects: Array.from(this._sceneObjects.keys())
      })
    };
  }

  // === AUTOMATIC OBJECT CREATION FROM METADATA ===
  
  protected async createObjectsFromMetadata(): Promise<void> {
    if (this.metadata.objects) {
      for (const [name, objectData] of Object.entries(this.metadata.objects)) {
        try {
          const obj = this.createThreeJSObject(objectData as any);
          
          if (obj) {
            this.scene.add(obj);
            this.registerObject(name, obj);
            console.log(`🎮 Auto-created object: ${name}`);
          }
        } catch (error) {
          console.error(`🚨 Failed to create object ${name}:`, error);
        }
      }
    }
  }

  // Create Three.js objects directly instead of using ObjectLoader
  private createThreeJSObject(data: any): THREE.Object3D | null {
    if (data.type === 'Mesh' && data.geometry && data.material) {
      // Create geometry
      const geometry = this.createGeometry(data.geometry);
      if (!geometry) return null;

      // Create material
      const material = this.createMaterial(data.material);
      if (!material) return null;

      // Create mesh
      const mesh = new THREE.Mesh(geometry, material);
      
      // Apply transform
      if (data.position) {
        mesh.position.fromArray(data.position);
      }
      if (data.rotation) {
        mesh.rotation.set(data.rotation[0], data.rotation[1], data.rotation[2]);
      }
      if (data.scale) {
        mesh.scale.fromArray(data.scale);
      }
      
      return mesh;
    }
    
    return null;
  }

  private createGeometry(geometryData: any): THREE.BufferGeometry | null {
    switch (geometryData.type) {
      case 'BoxGeometry':
        return new THREE.BoxGeometry(
          geometryData.width || 1,
          geometryData.height || 1,
          geometryData.depth || 1,
          geometryData.widthSegments,
          geometryData.heightSegments,
          geometryData.depthSegments
        );
      
      case 'SphereGeometry':
        return new THREE.SphereGeometry(
          geometryData.radius || 1,
          geometryData.widthSegments || 32,
          geometryData.heightSegments || 16,
          geometryData.phiStart,
          geometryData.phiLength,
          geometryData.thetaStart,
          geometryData.thetaLength
        );
      
      case 'CylinderGeometry':
        return new THREE.CylinderGeometry(
          geometryData.radiusTop || 1,
          geometryData.radiusBottom || 1,
          geometryData.height || 1,
          geometryData.radialSegments || 8,
          geometryData.heightSegments,
          geometryData.openEnded,
          geometryData.thetaStart,
          geometryData.thetaLength
        );
      
      case 'PlaneGeometry':
        return new THREE.PlaneGeometry(
          geometryData.width || 1,
          geometryData.height || 1,
          geometryData.widthSegments,
          geometryData.heightSegments
        );
      
      case 'TorusGeometry':
        return new THREE.TorusGeometry(
          geometryData.radius || 1,
          geometryData.tube || 0.4,
          geometryData.radialSegments || 8,
          geometryData.tubularSegments || 6,
          geometryData.arc
        );
      
      default:
        console.warn(`Unknown geometry type: ${geometryData.type}`);
        return null;
    }
  }

  private createMaterial(materialData: any): THREE.Material | null {
    switch (materialData.type) {
      case 'MeshBasicMaterial':
        return new THREE.MeshBasicMaterial({
          color: materialData.color || 0xffffff,
          transparent: materialData.transparent,
          opacity: materialData.opacity,
          wireframe: materialData.wireframe,
          side: materialData.side
        });
      
      case 'MeshPhongMaterial':
        return new THREE.MeshPhongMaterial({
          color: materialData.color || 0xffffff,
          emissive: materialData.emissive,
          specular: materialData.specular,
          shininess: materialData.shininess,
          transparent: materialData.transparent,
          opacity: materialData.opacity,
          wireframe: materialData.wireframe,
          side: materialData.side
        });
      
      case 'MeshStandardMaterial':
        return new THREE.MeshStandardMaterial({
          color: materialData.color || 0xffffff,
          emissive: materialData.emissive,
          roughness: materialData.roughness || 1,
          metalness: materialData.metalness || 0,
          transparent: materialData.transparent,
          opacity: materialData.opacity,
          wireframe: materialData.wireframe,
          side: materialData.side
        });
      
      case 'MeshLambertMaterial':
        return new THREE.MeshLambertMaterial({
          color: materialData.color || 0xffffff,
          emissive: materialData.emissive,
          transparent: materialData.transparent,
          opacity: materialData.opacity,
          wireframe: materialData.wireframe,
          side: materialData.side
        });
      
      default:
        console.warn(`Unknown material type: ${materialData.type}`);
        return new THREE.MeshBasicMaterial({ color: materialData.color || 0xffffff });
    }
  }

  // === END DEVELOPMENT-ONLY METHODS ===

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
      if (!current) return;
    }
    
    const finalKey = keys[keys.length - 1];
    
    if (current[finalKey] && typeof current[finalKey].set === 'function') {
      if (Array.isArray(value)) {
        current[finalKey].set(...value);
      } else {
        current[finalKey].set(value);
      }
    } else if (current[finalKey] && typeof current[finalKey].copy === 'function') {
      current[finalKey].copy(value);
    } else {
      current[finalKey] = value;
    }
  }

  protected applyMetadata(): void {
    // Apply @Editable property overrides
    for (const [key, value] of Object.entries(this.metadata)) {
      if (key !== 'objects' && this.hasOwnProperty(key)) {
        (this as any)[key] = value;
      }
    }

    // Automatically create objects from metadata
    this.createObjectsFromMetadata();
  }

  private applyEditorOverrides(): void {
    if (!isDevelopment()) return;
    
    for (const [key, value] of Object.entries(this._editorOverrides)) {
      if (key === 'objects') {
        if (typeof value === 'object' && value !== null) {
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
      if (key === 'position' && object.position) {
        object.position.fromArray(value as number[]);
      } else if (key === 'rotation' && object.rotation) {
        if (Array.isArray(value)) {
          object.rotation.set(value[0], value[1], value[2]);
        }
      } else if (key === 'scale' && object.scale) {
        object.scale.fromArray(value as number[]);
      } else if (key === 'visible') {
        object.visible = value as boolean;
      } else if (key === 'material' && 'material' in object) {
        const material = (object as any).material;
        if (material && typeof value === 'object') {
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
    if (!isDevelopment() || !this._wsConnection || this._wsConnection.readyState !== WebSocket.OPEN) {
      return;
    }

    const sceneState = {
      type: 'scene-state-response',
      timestamp: Date.now(),
      editorState: {
        properties: this.getEditableProperties(),
        objects: this.getEditableObjects(),
        overrides: this.getEditorOverrides()
      }
    };

    try {
      this._wsConnection.send(JSON.stringify(sceneState));
      console.log('📤 Sent scene state to editor:', sceneState);
    } catch (error) {
      console.error('Failed to send scene state to editor:', error);
    }
  }

  private sendSceneStateViaVite(): void {
    if (!isDevelopment() || typeof window === 'undefined' || !(window as any).__vite_ws) {
      return;
    }

    const viteWs = (window as any).__vite_ws;
    const sceneState = {
      type: 'custom',
      event: 'scene-state-response', 
      data: {
        timestamp: Date.now(),
        editorState: {
          properties: this.getEditableProperties(),
          objects: this.getEditableObjects(),
          overrides: this.getEditorOverrides()
        }
      }
    };

    try {
      viteWs.send(JSON.stringify(sceneState));
      console.log('📤 Sent scene state via Vite:', sceneState);
    } catch (error) {
      console.error('Failed to send scene state via Vite:', error);
    }
  }
} 