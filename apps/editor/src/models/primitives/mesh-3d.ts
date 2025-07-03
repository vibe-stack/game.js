import * as THREE from "three/webgpu";
import { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";
import { AssetManager } from "../asset-manager";

export interface Mesh3DConfig extends EntityConfig {
  // Model loading
  modelPath?: string;
  modelUrl?: string;
  
  // Geometry and material overrides
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material | THREE.Material[];
  
  // Loading options
  castShadow?: boolean;
  receiveShadow?: boolean;
  enableDraco?: boolean;
  
  // Transform options
  centerModel?: boolean;
  normalizeScale?: boolean;
  targetScale?: number;
  
  // Asset management
  assetManager?: AssetManager;
}

export class Mesh3D extends Entity {
  private meshes: THREE.Mesh[] = [];
  private loadedGLTF?: GLTF;
  private originalMaterials: THREE.Material[] = [];
  private assetManager?: AssetManager;
  
  // Animation system
  private animationMixer?: THREE.AnimationMixer;
  private animationActions: Map<string, THREE.AnimationAction> = new Map();
  private currentAnimation?: string;
  private animationClips: THREE.AnimationClip[] = [];
  
  // Loading state
  private isLoading = false;
  private loadPromise?: Promise<void>;
  
  // Configuration
  public modelPath?: string;
  public modelUrl?: string;
  private readonly config: {
    castShadow: boolean;
    receiveShadow: boolean;
    enableDraco: boolean;
    centerModel: boolean;
    normalizeScale: boolean;
    targetScale: number;
  };
  
  constructor(config: Mesh3DConfig = {}) {
    super(config);
    
    this.config = {
      castShadow: config.castShadow ?? true,
      receiveShadow: config.receiveShadow ?? true,
      enableDraco: config.enableDraco ?? true,
      centerModel: config.centerModel ?? false,
      normalizeScale: config.normalizeScale ?? false,
      targetScale: config.targetScale ?? 1.0,
    };
    
    this.modelPath = config.modelPath;
    this.modelUrl = config.modelUrl;
    this.assetManager = config.assetManager;
    
    // Initialize with empty geometry if no model provided
    if (!config.geometry && !config.modelPath && !config.modelUrl) {
      this.createEmptyMesh(config.material);
    } else if (config.geometry) {
      this.createMeshFromGeometry(config.geometry, config.material);
    }
    
    this.metadata.type = "mesh3d";
    this.addTag("mesh3d");
    
    // Auto-load if modelPath or modelUrl is provided
    if (config.modelPath) {
      // Note: We can't auto-load from path without projectPath, will need to be loaded manually
    } else if (config.modelUrl) {
      this.loadFromUrl(config.modelUrl).catch((error: Error) => {
        console.error("Failed to auto-load model:", error);
      });
    }
  }

  private createEmptyMesh(material?: THREE.Material | THREE.Material[]): void {
    const defaultMaterial = material || new THREE.MeshStandardMaterial({ 
      color: 0x888888,
      wireframe: true 
    });
    
    const emptyGeometry = new THREE.BufferGeometry();
    const mesh = new THREE.Mesh(emptyGeometry, defaultMaterial);
    mesh.castShadow = this.config.castShadow;
    mesh.receiveShadow = this.config.receiveShadow;
    
    this.meshes = [mesh];
    this.add(mesh);
  }

  private createMeshFromGeometry(
    geometry: THREE.BufferGeometry, 
    material?: THREE.Material | THREE.Material[]
  ): void {
    const defaultMaterial = material || new THREE.MeshStandardMaterial({ color: 0x888888 });
    const mesh = new THREE.Mesh(geometry, defaultMaterial);
    mesh.castShadow = this.config.castShadow;
    mesh.receiveShadow = this.config.receiveShadow;
    
    this.meshes = [mesh];
    this.add(mesh);
  }

  /**
   * Set the asset manager for loading models
   */
  setAssetManager(assetManager: AssetManager): void {
    this.assetManager = assetManager;
  }

  /**
   * Load a model from a project-relative path
   */
  async loadFromPath(projectPath: string, modelPath: string): Promise<void> {
    if (this.isLoading) {
      return this.loadPromise;
    }

    this.modelPath = modelPath;
    
    // Get the asset data URL using the project service to avoid CORS issues
    let sanitizedPath = modelPath;
    // If the modelPath is absolute and inside the project directory, convert to relative
    if (sanitizedPath.startsWith('/') && sanitizedPath.startsWith(projectPath)) {
      sanitizedPath = sanitizedPath.substring(projectPath.length);
    }
    // Remove any leading slash to ensure truly relative
    if (sanitizedPath.startsWith('/')) {
      sanitizedPath = sanitizedPath.substring(1);
    }
    // At this point sanitizedPath should look like "assets/....gltf"
    let modelUrl: string;
    
    try {
      // Use window.projectAPI if available (in renderer context)
      if (typeof window !== 'undefined' && (window as any).projectAPI) {
        const assetUrl = await (window as any).projectAPI.getAssetUrl(projectPath, sanitizedPath);
        if (!assetUrl) {
          throw new Error(`Failed to get asset for ${modelPath}`);
        }

        if (assetUrl.startsWith('data:')) {
          // For data URLs, convert to a blob URL so GLTFLoader can fetch it
          const response = await fetch(assetUrl);
          const blob = await response.blob();
          modelUrl = URL.createObjectURL(blob);
        } else {
          // HTTP URL can be used directly (keeps relative paths intact)
          modelUrl = assetUrl;
        }

        this.modelUrl = modelUrl; // Store for serialization/debugging
      } else {
        throw new Error("Project API not available");
      }
    } catch (error) {
      console.error("Failed to get asset URL:", error);
      throw new Error(`Cannot load model from path: ${modelPath}`);
    }

    return this.loadFromUrl(modelUrl);
  }

  /**
   * Load a model from a URL
   */
  async loadFromUrl(url: string): Promise<void> {
    if (this.isLoading) {
      return this.loadPromise;
    }

    this.isLoading = true;
    this.modelUrl = url;

    this.loadPromise = this._loadModel(url);
    
    try {
      await this.loadPromise;
    } finally {
      this.isLoading = false;
      this.loadPromise = undefined;
    }
  }

  /**
   * Load model using the asset manager
   */
  async loadWithAssetManager(assetId: string): Promise<void> {
    if (!this.assetManager) {
      throw new Error("Asset manager not set");
    }

    if (this.isLoading) {
      return this.loadPromise;
    }

    this.isLoading = true;
    
    this.loadPromise = this._loadWithAssetManager(assetId);
    
    try {
      await this.loadPromise;
    } finally {
      this.isLoading = false;
      this.loadPromise = undefined;
    }
  }

  private async _loadWithAssetManager(assetId: string): Promise<void> {
    if (!this.assetManager) {
      throw new Error("Asset manager not available");
    }

    try {
      // Load model using asset manager
      const gltf = await this.assetManager.loadModel(assetId, ''); // URL will be managed by asset manager
      this._processLoadedGLTF(gltf);
      this.emitChange();
    } catch (error) {
      console.error("Failed to load model with asset manager:", error);
      throw error;
    }
  }

  private async _loadModel(url: string): Promise<void> {
    const loader = new GLTFLoader();
    
    // Setup DRACO loader if enabled
    if (this.config.enableDraco) {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('/draco/');
      loader.setDRACOLoader(dracoLoader);
    }

    try {
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        loader.load(
          url,
          resolve,
                     (progress) => {
             const percentage = (progress.loaded / progress.total) * 100;
             // Emit loading progress event if needed
             this.dispatchEvent({ type: 'loadProgress', percentage, loaded: progress.loaded, total: progress.total });
           },
          reject
        );
      });

             this._processLoadedGLTF(gltf);
       this.emitChange();
       // Emit custom events using THREE.js event system
       this.dispatchEvent({ type: 'modelLoaded', gltf, url });
     } catch (error) {
       console.error("Failed to load GLTF model:", error);
       this.dispatchEvent({ type: 'modelError', error, url });
       throw error;
    }
  }

  private _processLoadedGLTF(gltf: GLTF): void {
    // Clear existing meshes
    this.clearMeshes();
    
    // Store the loaded GLTF
    this.loadedGLTF = gltf;
    
    // Extract meshes from the GLTF scene
    const meshes: THREE.Mesh[] = [];
    const materials: THREE.Material[] = [];
    
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
        
        // Store original materials
        if (Array.isArray(child.material)) {
          materials.push(...child.material);
        } else {
          materials.push(child.material);
        }
        
        // Apply shadow settings
        child.castShadow = this.config.castShadow;
        child.receiveShadow = this.config.receiveShadow;
      }
    });

    // Store meshes and materials
    this.meshes = meshes;
    this.originalMaterials = materials;

    // Add the entire scene to this entity
    this.add(gltf.scene);

    // Setup animations if they exist
    this.setupAnimations(gltf);

    // Apply transformations if needed
    if (this.config.centerModel) {
      this.centerModel();
    }
    
    if (this.config.normalizeScale) {
      this.normalizeModelScale();
    }
  }

  private clearMeshes(): void {
    // Stop and clear animations
    if (this.animationMixer) {
      this.animationMixer.stopAllAction();
    }
    this.animationActions.clear();
    this.animationClips = [];
    this.currentAnimation = undefined;
    this.animationMixer = undefined;
    
    // Remove all children (previous models)
    while (this.children.length > 0) {
      const child = this.children[0];
      this.remove(child);
      
      // Dispose geometries and materials if they're disposable
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    }
    
    this.meshes = [];
    this.originalMaterials = [];
  }

  private centerModel(): void {
    if (this.meshes.length === 0) return;
    
    const box = new THREE.Box3();
    this.meshes.forEach(mesh => {
      box.expandByObject(mesh);
    });
    
    const center = box.getCenter(new THREE.Vector3());
    this.children.forEach(child => {
      child.position.sub(center);
    });
  }

  private normalizeModelScale(): void {
    if (this.meshes.length === 0) return;
    
    const box = new THREE.Box3();
    this.meshes.forEach(mesh => {
      box.expandByObject(mesh);
    });
    
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    if (maxDimension > 0) {
      const scaleFactor = this.config.targetScale / maxDimension;
      this.children.forEach(child => {
        child.scale.multiplyScalar(scaleFactor);
      });
    }
  }

  /**
   * Get all meshes in the loaded model
   */
  getMeshes(): THREE.Mesh[] {
    return [...this.meshes];
  }

  /**
   * Get the first mesh (for compatibility with existing code)
   */
  getMesh(): THREE.Mesh | null {
    return this.meshes.length > 0 ? this.meshes[0] : null;
  }

  /**
   * Get geometry from the first mesh (for compatibility with existing UI)
   */
  getGeometry(): THREE.BufferGeometry | null {
    const mesh = this.getMesh();
    return mesh ? mesh.geometry : null;
  }

  /**
   * Get the loaded GLTF object
   */
  getGLTF(): GLTF | null {
    return this.loadedGLTF || null;
  }

  /**
   * Replace material on all meshes
   */
  setMaterial(material: THREE.Material | THREE.Material[]): void {
    this.meshes.forEach(mesh => {
      mesh.material = material;
    });
    this.emitChange();
  }

  /**
   * Get materials from all meshes
   */
  getMaterials(): THREE.Material[] {
    const materials: THREE.Material[] = [];
    this.meshes.forEach(mesh => {
      if (Array.isArray(mesh.material)) {
        materials.push(...mesh.material);
      } else {
        materials.push(mesh.material);
      }
    });
    return materials;
  }

  /**
   * Restore original materials from the loaded model
   */
  restoreOriginalMaterials(): void {
    if (this.originalMaterials.length === 0) return;
    
    let materialIndex = 0;
    this.meshes.forEach(mesh => {
      if (materialIndex < this.originalMaterials.length) {
        mesh.material = this.originalMaterials[materialIndex++];
      }
    });
    this.emitChange();
  }

  /**
   * Check if model is currently loading
   */
  isModelLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Check if model has been loaded
   */
  hasModel(): boolean {
    return this.loadedGLTF !== undefined && this.meshes.length > 0;
  }

  /**
   * Get model loading progress
   */
  getLoadingProgress(): number {
    // This would need to be implemented with proper progress tracking
    // For now, return 100 if loaded, 0 if not
    return this.hasModel() ? 100 : 0;
  }

  /**
   * Create physics collider from loaded geometry
   */
  protected createCollider(config: any): void {
    if (!this.physicsManager || !this.rigidBodyId) {
      return;
    }

    // Check if this entity has a character controller - if so, create a capsule collider
    if (this.hasCharacterController && this.characterControllerConfig) {
      // Create capsule collider for character controller with scaling
      const scaledCapsuleSize = new THREE.Vector3(
        this.characterControllerConfig.capsuleRadius * 2 * Math.max(this.scale.x, this.scale.z),
        this.characterControllerConfig.capsuleHalfHeight * 2 * this.scale.y,
        this.characterControllerConfig.capsuleRadius * 2 * Math.max(this.scale.x, this.scale.z)
      );
      
      this.physicsManager.createCollider(
        this.colliderId!, 
        this.rigidBodyId, 
        "capsule", 
        scaledCapsuleSize, 
        config
      );
      return;
    }

    // For regular physics, use mesh-based collider if we have meshes
    if (this.meshes.length > 0) {
      const firstMesh = this.meshes[0];
      if (firstMesh && firstMesh.geometry) {
        const geometry = firstMesh.geometry;
        
        // Calculate bounding box for collider
        geometry.computeBoundingBox();
        const boundingBox = geometry.boundingBox;
        
        if (boundingBox) {
          const size = new THREE.Vector3();
          boundingBox.getSize(size);
          
          // Apply entity scale to the bounding box size
          const scaledSize = this.getScaledDimensions(size);
          
          // Create a box collider based on the scaled bounding box
          this.physicsManager.createCollider(
            this.colliderId!, 
            this.rigidBodyId, 
            "cuboid", 
            scaledSize, 
            config
          );
          return;
        }
      }
    }
    
    // Fallback: create a default scaled box collider
    const defaultSize = new THREE.Vector3(1, 1, 1);
    const scaledDefaultSize = this.getScaledDimensions(defaultSize);
    this.physicsManager.createCollider(
      this.colliderId!, 
      this.rigidBodyId, 
      "cuboid", 
      scaledDefaultSize, 
      config
    );
  }

  /**
   * Serialize the entity including model path
   */
  serialize(): EntityData {
    return {
      id: this.entityId,
      name: this.entityName,
      type: "mesh3d",
      transform: {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      visible: this.visible,
      castShadow: this.config.castShadow,
      receiveShadow: this.config.receiveShadow,
      userData: { ...this.userData },
      tags: [...this.metadata.tags],
      layer: this.metadata.layer,
      physics: this.serializePhysics(),
      characterController: this.serializeCharacterController(),
      scripts: this.serializeScripts(),
      properties: {
        modelPath: this.modelPath,
        modelUrl: this.modelUrl,
        centerModel: this.config.centerModel,
        normalizeScale: this.config.normalizeScale,
        targetScale: this.config.targetScale,
        enableDraco: this.config.enableDraco,
        currentAnimation: this.currentAnimation,
        animationNames: this.getAnimationNames(),
      }
    };
  }

  /**
   * Load model from serialized data
   */
  async loadFromSerialized(data: EntityData, projectPath?: string): Promise<void> {
    if (!data.properties) return;

    const { modelPath, modelUrl, currentAnimation } = data.properties;
    
    if (modelPath && projectPath) {
      await this.loadFromPath(projectPath, modelPath);
    } else if (modelUrl) {
      await this.loadFromUrl(modelUrl);
    }
    
    // Restore animation state if it was playing
    if (currentAnimation && this.hasAnimations()) {
      this.playAnimation(currentAnimation);
    }
  }

     /**
    * Setup animations from loaded GLTF
    */
   private setupAnimations(gltf: GLTF): void {
     // Clear existing animations
     this.animationActions.clear();
     this.animationClips = [];
     
     if (gltf.animations && gltf.animations.length > 0) {
       // Create animation mixer
       this.animationMixer = new THREE.AnimationMixer(gltf.scene);
       
       // Store animation clips
       this.animationClips = gltf.animations;
       
       // Create actions for each animation
       gltf.animations.forEach((clip) => {
         const action = this.animationMixer!.clipAction(clip);
         this.animationActions.set(clip.name, action);
       });
     }
   }

   /**
    * Get list of available animation names
    */
   getAnimationNames(): string[] {
     return this.animationClips.map(clip => clip.name);
   }

   /**
    * Play an animation by name
    */
   playAnimation(animationName: string, fadeTime: number = 0.2): boolean {
     if (!this.animationMixer || !this.animationActions.has(animationName)) {
       return false;
     }

     const action = this.animationActions.get(animationName)!;
     
     // Stop current animation if different
     if (this.currentAnimation && this.currentAnimation !== animationName) {
       const currentAction = this.animationActions.get(this.currentAnimation);
       if (currentAction) {
         if (fadeTime > 0) {
           currentAction.fadeOut(fadeTime);
         } else {
           currentAction.stop();
         }
       }
     }

     // Start new animation
     if (fadeTime > 0) {
       action.reset().fadeIn(fadeTime).play();
     } else {
       action.reset().play();
     }

     this.currentAnimation = animationName;
     return true;
   }

   /**
    * Stop current animation
    */
   stopAnimation(fadeTime: number = 0.2): void {
     if (this.currentAnimation) {
       const action = this.animationActions.get(this.currentAnimation);
       if (action) {
         if (fadeTime > 0) {
           action.fadeOut(fadeTime);
         } else {
           action.stop();
         }
       }
       this.currentAnimation = undefined;
     }
   }

   /**
    * Update animation mixer (should be called in render loop)
    */
   updateAnimations(deltaTime: number): void {
     if (this.animationMixer) {
       this.animationMixer.update(deltaTime);
     }
   }

   /**
    * Get current playing animation name
    */
   getCurrentAnimation(): string | undefined {
     return this.currentAnimation;
   }

   /**
    * Check if animations are available
    */
   hasAnimations(): boolean {
     return this.animationClips.length > 0;
   }

   /**
    * Get animation mixer for advanced control
    */
   getAnimationMixer(): THREE.AnimationMixer | undefined {
     return this.animationMixer;
   }

   /**
    * Cleanup resources
    */
   dispose(): void {
     this.clearMeshes();
     
     // Dispose animation mixer
     if (this.animationMixer) {
       this.animationMixer.stopAllAction();
       this.animationActions.clear();
       this.animationClips = [];
       this.animationMixer = undefined;
       this.currentAnimation = undefined;
     }
     
     // Clean up blob URLs
     if (this.modelUrl && this.modelUrl.startsWith('blob:')) {
       URL.revokeObjectURL(this.modelUrl);
       this.modelUrl = undefined;
     }
     
     if (this.loadedGLTF) {
       // Dispose GLTF resources
       this.loadedGLTF.scene.traverse((child) => {
         if (child instanceof THREE.Mesh) {
           if (child.geometry) {
             child.geometry.dispose();
           }
           if (child.material) {
             if (Array.isArray(child.material)) {
               child.material.forEach(mat => mat.dispose());
             } else {
               child.material.dispose();
             }
           }
         }
       });
     }
     
     this.loadedGLTF = undefined;
   }
}
