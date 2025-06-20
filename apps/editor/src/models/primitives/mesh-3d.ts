import * as THREE from "three/webgpu";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Entity } from "../entity";
import { AssetManager } from "../asset-manager";
import { EntityData } from "../scene-loader";

export interface Mesh3DConfig {
  name?: string;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
  
  // Model loading
  modelId?: string; // Asset ID for loading from AssetManager
  geometry?: THREE.BufferGeometry; // Direct geometry
  material?: THREE.Material | THREE.Material[]; // Direct material(s)
  materialId?: string; // Asset ID for material
  
  // Rendering options
  castShadow?: boolean;
  receiveShadow?: boolean;
  visible?: boolean;
  renderOrder?: number;
  frustumCulled?: boolean;
  
  // Animation
  animations?: string[]; // Animation names to extract from model
  autoPlay?: string; // Animation to auto-play
  
  // LOD (Level of Detail)
  lodLevels?: Array<{
    geometry: THREE.BufferGeometry;
    material?: THREE.Material | THREE.Material[];
    distance: number;
  }>;
  
  // Instancing
  instanceCount?: number;
  instanceMatrices?: Float32Array;
  instanceColors?: Float32Array;
}

export class Mesh3D extends Entity {
  private mesh: THREE.Mesh | THREE.InstancedMesh | THREE.LOD | null = null;
  private assetManager: AssetManager | null = null;
  private animationMixer: THREE.AnimationMixer | null = null;
  private animationActions = new Map<string, THREE.AnimationAction>();
  private currentAnimation: string | null = null;
  
  // Original model data (for cloning)
  private originalGLTF: GLTF | null = null;
  private loadedGeometry: THREE.BufferGeometry | null = null;
  private loadedMaterials: THREE.Material[] = [];

  private modelId: string | null = null;  

  constructor(config: Mesh3DConfig = {}) {
    super({
      name: config.name,
      position: config.position,
      rotation: config.rotation,
      scale: config.scale,
    });

    this.metadata.type = "mesh3d";
    this.setupMesh(config);
  }

  public setAssetManager(assetManager: AssetManager): this {
    this.assetManager = assetManager;
    return this;
  }

  private async setupMesh(config: Mesh3DConfig): Promise<void> {
    // Clear existing mesh
    if (this.mesh) {
      this.remove(this.mesh);
      this.disposeMesh();
    }

    try {
      // Load model if modelId is provided
      if (config.modelId && this.assetManager) {
        await this.loadFromAsset(config.modelId, config);
      } 
      // Create from geometry and material
      else if (config.geometry) {
        await this.createFromGeometry(config);
      }
      // Create empty mesh for manual setup
      else {
        this.createEmptyMesh(config);
      }

      // Apply common properties
      if (this.mesh) {
        this.applyMeshProperties(config);
        this.add(this.mesh);
      }

    } catch (error) {
      console.error('Failed to setup Mesh3D:', error);
    }
  }

  private async loadFromAsset(modelId: string, config: Mesh3DConfig): Promise<void> {
    if (!this.assetManager) {
      throw new Error('AssetManager not set');
    }

    const gltf = await this.assetManager.getModel(modelId);
    if (!gltf) {
      throw new Error(`Model ${modelId} not found`);
    }

    this.originalGLTF = gltf;

    // Clone the scene to avoid modifying the original
    const scene = gltf.scene.clone();
    
    // Handle single mesh vs multiple meshes
    const meshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });

    if (meshes.length === 1) {
      // Single mesh - use it directly
      this.mesh = meshes[0];
      this.loadedGeometry = meshes[0].geometry;
      this.loadedMaterials = Array.isArray(meshes[0].material) 
        ? meshes[0].material 
        : [meshes[0].material];
    } else if (meshes.length > 1) {
      // Multiple meshes - create a group or use LOD
      if (config.lodLevels) {
        this.mesh = this.createLOD(config);
      } else {
        // Use the entire scene as a group
        this.mesh = scene as any; // Group extends Object3D like Mesh
      }
    }

    // Setup animations
    if (gltf.animations && gltf.animations.length > 0) {
      this.setupAnimations(gltf.animations, config);
    }

    // Apply material overrides
    if (config.materialId && this.assetManager) {
      await this.applyMaterialOverride(config.materialId);
    }
  }

  private async createFromGeometry(config: Mesh3DConfig): Promise<void> {
    let material: THREE.Material | THREE.Material[];

    // Load material if materialId is provided
    if (config.materialId && this.assetManager) {
      const loadedMaterial = await this.assetManager.getMaterial(config.materialId);
      material = loadedMaterial || new THREE.MeshStandardMaterial();
    } else if (config.material) {
      material = config.material;
    } else {
      material = new THREE.MeshStandardMaterial();
    }

    this.loadedGeometry = config.geometry!;
    this.loadedMaterials = Array.isArray(material) ? material : [material];

    // Create appropriate mesh type
    if (config.instanceCount && config.instanceCount > 1) {
      this.mesh = new THREE.InstancedMesh(
        config.geometry!,
        material,
        config.instanceCount
      );
      
      if (config.instanceMatrices) {
        (this.mesh as THREE.InstancedMesh).instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.setInstanceMatrices(config.instanceMatrices);
      }
      
      if (config.instanceColors) {
        (this.mesh as THREE.InstancedMesh).instanceColor = new THREE.InstancedBufferAttribute(
          config.instanceColors, 3
        );
      }
    } else if (config.lodLevels) {
      this.mesh = this.createLOD(config);
    } else {
      this.mesh = new THREE.Mesh(config.geometry, material);
    }
  }

  private createEmptyMesh(config: Mesh3DConfig): void {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshStandardMaterial();
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.loadedGeometry = geometry;
    this.loadedMaterials = [material];
  }

  private createLOD(config: Mesh3DConfig): THREE.LOD {
    const lod = new THREE.LOD();
    
    if (config.lodLevels) {
      config.lodLevels.forEach((level) => {
        const mesh = new THREE.Mesh(level.geometry, level.material || this.loadedMaterials[0]);
        lod.addLevel(mesh, level.distance);
      });
    }
    
    return lod;
  }

  private applyMeshProperties(config: Mesh3DConfig): void {
    if (!this.mesh) return;

    // Rendering properties
    if (config.castShadow !== undefined) {
      this.mesh.castShadow = config.castShadow;
    }
    if (config.receiveShadow !== undefined) {
      this.mesh.receiveShadow = config.receiveShadow;
    }
    if (config.visible !== undefined) {
      this.mesh.visible = config.visible;
    }
    if (config.renderOrder !== undefined) {
      this.mesh.renderOrder = config.renderOrder;
    }
    if (config.frustumCulled !== undefined) {
      this.mesh.frustumCulled = config.frustumCulled;
    }
  }

  private setupAnimations(animations: THREE.AnimationClip[], config: Mesh3DConfig): void {
    if (!this.mesh) return;

    this.animationMixer = new THREE.AnimationMixer(this.mesh);
    
    animations.forEach((clip) => {
      const action = this.animationMixer!.clipAction(clip);
      this.animationActions.set(clip.name, action);
    });

    // Auto-play animation if specified
    if (config.autoPlay && this.animationActions.has(config.autoPlay)) {
      this.playAnimation(config.autoPlay);
    }
  }

  private async applyMaterialOverride(materialId: string): Promise<void> {
    if (!this.assetManager || !this.mesh) return;

    const material = await this.assetManager.getMaterial(materialId);
    if (!material) return;

    if (this.mesh instanceof THREE.Mesh) {
      this.mesh.material = material;
    } else if (this.mesh instanceof THREE.InstancedMesh) {
      this.mesh.material = material;
    }
    // For LOD and Groups, traverse and apply to all meshes
    else {
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = material;
        }
      });
    }
  }

  // Animation methods
  public playAnimation(name: string, fadeTime: number = 0.2): boolean {
    if (!this.animationMixer || !this.animationActions.has(name)) {
      return false;
    }

    // Stop current animation
    if (this.currentAnimation && this.currentAnimation !== name) {
      const currentAction = this.animationActions.get(this.currentAnimation);
      if (currentAction) {
        currentAction.fadeOut(fadeTime);
      }
    }

    // Start new animation
    const action = this.animationActions.get(name)!;
    action.reset().fadeIn(fadeTime).play();
    this.currentAnimation = name;

    return true;
  }

  public stopAnimation(name?: string, fadeTime: number = 0.2): void {
    if (!this.animationMixer) return;

    if (name) {
      const action = this.animationActions.get(name);
      if (action) {
        action.fadeOut(fadeTime);
        if (this.currentAnimation === name) {
          this.currentAnimation = null;
        }
      }
    } else {
      // Stop all animations
      this.animationActions.forEach((action) => {
        action.fadeOut(fadeTime);
      });
      this.currentAnimation = null;
    }
  }

  public pauseAnimation(name?: string): void {
    if (!this.animationMixer) return;

    if (name) {
      const action = this.animationActions.get(name);
      if (action) {
        action.paused = true;
      }
    } else {
      this.animationActions.forEach((action) => {
        action.paused = true;
      });
    }
  }

  public resumeAnimation(name?: string): void {
    if (!this.animationMixer) return;

    if (name) {
      const action = this.animationActions.get(name);
      if (action) {
        action.paused = false;
      }
    } else {
      this.animationActions.forEach((action) => {
        action.paused = false;
      });
    }
  }

  public setAnimationSpeed(name: string, speed: number): boolean {
    const action = this.animationActions.get(name);
    if (action) {
      action.timeScale = speed;
      return true;
    }
    return false;
  }

  public getAnimationNames(): string[] {
    return Array.from(this.animationActions.keys());
  }

  public isAnimationPlaying(name: string): boolean {
    const action = this.animationActions.get(name);
    return action ? action.isRunning() && !action.paused : false;
  }

  // Instance methods (for InstancedMesh)
  public setInstanceMatrices(matrices: Float32Array): void {
    if (this.mesh instanceof THREE.InstancedMesh) {
      this.mesh.instanceMatrix.array.set(matrices);
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  public setInstanceMatrix(index: number, matrix: THREE.Matrix4): void {
    if (this.mesh instanceof THREE.InstancedMesh) {
      this.mesh.setMatrixAt(index, matrix);
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  public getInstanceMatrix(index: number, target: THREE.Matrix4): THREE.Matrix4 {
    if (this.mesh instanceof THREE.InstancedMesh) {
      this.mesh.getMatrixAt(index, target);
    }
    return target;
  }

  public setInstanceColor(index: number, color: THREE.Color): void {
    if (this.mesh instanceof THREE.InstancedMesh && this.mesh.instanceColor) {
      this.mesh.setColorAt(index, color);
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  // Geometry and material access
  public getGeometry(): THREE.BufferGeometry | null {
    if (this.mesh instanceof THREE.Mesh || this.mesh instanceof THREE.InstancedMesh) {
      return this.mesh.geometry;
    }
    return this.loadedGeometry;
  }

  public getMaterial(): THREE.Material | THREE.Material[] | null {
    if (this.mesh instanceof THREE.Mesh || this.mesh instanceof THREE.InstancedMesh) {
      return this.mesh.material;
    }
    return this.loadedMaterials.length > 0 ? 
      (this.loadedMaterials.length === 1 ? this.loadedMaterials[0] : this.loadedMaterials) : 
      null;
  }

  public setMaterial(material: THREE.Material | THREE.Material[]): void {
    if (this.mesh instanceof THREE.Mesh || this.mesh instanceof THREE.InstancedMesh) {
      this.mesh.material = material;
    }
    this.loadedMaterials = Array.isArray(material) ? material : [material];
  }

  public getMesh(): THREE.Mesh | THREE.InstancedMesh | THREE.LOD | null {
    return this.mesh;
  }

  // Raycast support
  public raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void {
    if (this.mesh) {
      this.mesh.raycast(raycaster, intersects);
    }
  }

  // Physics collider creation helper
  protected createCollider(config: any): void {
    if (!this.physicsManager || !this.colliderId || !this.rigidBodyId) return;

    const geometry = this.getGeometry();
    if (!geometry) return;

    // Create appropriate collider based on geometry
    if (geometry instanceof THREE.BoxGeometry) {
      const size = new THREE.Vector3();
      geometry.computeBoundingBox();
      geometry.boundingBox!.getSize(size);
      this.physicsManager.createCollider(this.colliderId, this.rigidBodyId, "cuboid", size, config);
    } else if (geometry instanceof THREE.SphereGeometry) {
      this.physicsManager.createCollider(this.colliderId, this.rigidBodyId, "ball", geometry.parameters.radius, config);
    } else {
      // Use trimesh for complex geometry (convex not supported in current API)
      this.physicsManager.createCollider(this.colliderId, this.rigidBodyId, "trimesh", new THREE.Vector3(1, 1, 1), config);
    }
  }

  // Update loop integration
  public updateTweens(delta: number): void {
    super.updateTweens(delta);
    
    // Update animations
    if (this.animationMixer) {
      this.animationMixer.update(delta);
    }
  }

  // Cleanup
  private disposeMesh(): void {
    if (this.animationMixer) {
      this.animationMixer.stopAllAction();
      this.animationMixer = null;
    }
    
    this.animationActions.clear();
    this.currentAnimation = null;

    // Dispose geometry and materials if they're not shared
    if (this.loadedGeometry && !this.originalGLTF) {
      this.loadedGeometry.dispose();
    }
    
    this.loadedMaterials.forEach((material) => {
      if (!this.originalGLTF) {
        material.dispose();
      }
    });

    this.loadedGeometry = null;
    this.loadedMaterials = [];
    this.originalGLTF = null;
  }

  public destroy(): void {
    this.disposeMesh();
    super.destroy();
  }

  // Static factory methods
  public static async fromModel(
    assetManager: AssetManager, 
    modelId: string, 
    config: Omit<Mesh3DConfig, 'modelId'> = {}
  ): Promise<Mesh3D> {
    const mesh = new Mesh3D({ ...config, modelId });
    mesh.setAssetManager(assetManager);
    await mesh.setupMesh({ ...config, modelId });
    return mesh;
  }

  public static fromGeometry(
    geometry: THREE.BufferGeometry,
    material?: THREE.Material | THREE.Material[],
    config: Omit<Mesh3DConfig, 'geometry' | 'material'> = {}
  ): Mesh3D {
    return new Mesh3D({ ...config, geometry, material });
  }

  serialize(): EntityData {
    return {
      id: this.entityId, name: this.entityName, type: "mesh3d",
      transform: {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      visible: this.visible, castShadow: this.castShadow, receiveShadow: this.receiveShadow,
      userData: { ...this.userData }, tags: [...this.metadata.tags], layer: this.metadata.layer,
      geometry: { type: "Mesh3D", parameters: { modelId: this.modelId, geometry: this.loadedGeometry, material: this.loadedMaterials } }  
    };
  }
} 