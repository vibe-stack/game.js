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
  modelId?: string;
  modelPath?: string;
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material | THREE.Material[];
  materialId?: string;
  
  // Rendering options
  castShadow?: boolean;
  receiveShadow?: boolean;
  visible?: boolean;
  renderOrder?: number;
  frustumCulled?: boolean;
  
  // Animation
  animations?: string[];
  autoPlay?: string;
  
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
  private mesh: THREE.Mesh | THREE.InstancedMesh | THREE.LOD | THREE.Group | null = null;
  private assetManager: AssetManager | null = null;
  private animationMixer: THREE.AnimationMixer | null = null;
  private animationActions = new Map<string, THREE.AnimationAction>();
  private currentAnimation: string | null = null;
  private originalGLTF: GLTF | null = null;
  private loadedGeometry: THREE.BufferGeometry | null = null;
  private loadedMaterials: THREE.Material[] = [];
  private modelId: string | null = null;
  private modelPath: string | null = null;

  constructor(config: Mesh3DConfig = {}) {
    console.log("Mesh3D constructor: Config position:", config.position);

    super({
      name: config.name,
      position: config.position,
      rotation: config.rotation,
      scale: config.scale,
    });

    console.log("Mesh3D constructor: Entity position after super():", {
      x: this.position.x, y: this.position.y, z: this.position.z
    });

    this.metadata.type = "mesh3d";
    this.modelPath = config.modelPath || null;
    
    if (config.geometry) {
      this.createFromGeometry(config);
      this.finalizeMeshSetup(config);
    } else {
      this.setupMesh(config);
    }

    console.log("Mesh3D constructor: Final entity position:", {
      x: this.position.x, y: this.position.y, z: this.position.z
    });
  }

  public setAssetManager(assetManager: AssetManager): this {
    this.assetManager = assetManager;
    return this;
  }

  private async setupMesh(config: Mesh3DConfig): Promise<void> {
    this.clearExistingMesh();

    try {
      if (config.modelPath) {
        // Store the model path but don't load it yet - loading happens later via loadFromPath
        this.storeModelPath(config.modelPath);
        this.createEmptyMesh(); // Create placeholder mesh
      } else if (config.modelId && this.assetManager) {
        await this.loadFromAsset(config.modelId, config);
      } else if (config.geometry) {
        this.createFromGeometry(config);
      } else {
        this.createEmptyMesh();
      }

      this.finalizeMeshSetup(config);
    } catch (error) {
      console.error('Failed to setup Mesh3D:', error);
      // Create empty mesh as fallback
      this.createEmptyMesh();
      this.finalizeMeshSetup(config);
    }
  }

  private clearExistingMesh(): void {
    if (this.mesh) {
      console.log("clearExistingMesh: Removing mesh from entity:", {
        meshType: this.mesh.constructor.name,
        meshParent: this.mesh.parent?.constructor.name,
        entityChildren: this.children.length
      });
      this.remove(this.mesh);
      this.disposeMesh();
      console.log("clearExistingMesh: After removal, entity children:", this.children.length);
    }
  }

  private storeModelPath(modelPath: string): void {
    this.modelPath = modelPath;
    (this.metadata as any).modelPath = modelPath;
  }

  private finalizeMeshSetup(config: Mesh3DConfig): void {
    if (this.mesh) {
      this.applyMeshProperties(config);
      
      // Add unique identifier to the mesh for debugging
      (this.mesh as any).entityId = this.entityId;
      (this.mesh as any).entityName = this.entityName;
      (this.mesh as any).debugMarker = `MESH_FOR_${this.entityName}_${this.entityId}`;
      
      this.add(this.mesh);
      this.updateMatrixWorld(true);

      // Debug: Check parent-child relationship AND mesh transforms
      console.log("Mesh3D finalizeMeshSetup debug:", {
        entityPosition: { x: this.position.x, y: this.position.y, z: this.position.z },
        entityName: this.entityName,
        entityId: this.entityId,
        meshType: this.mesh.constructor.name,
        meshParent: this.mesh.parent?.constructor.name,
        meshChildren: this.children.length,
        isAddedToEntity: this.children.includes(this.mesh),
        meshLocalPosition: { x: this.mesh.position.x, y: this.mesh.position.y, z: this.mesh.position.z },
        meshWorldPosition: { x: 0, y: 0, z: 0 }, // Will fill below
        meshMatrixAutoUpdate: this.mesh.matrixAutoUpdate,
        entityMatrixAutoUpdate: this.matrixAutoUpdate,
        meshDebugMarker: (this.mesh as any).debugMarker
      });

      // Get mesh world position
      const worldPos = new THREE.Vector3();
      this.mesh.getWorldPosition(worldPos);
      console.log("Mesh world position:", { x: worldPos.x, y: worldPos.y, z: worldPos.z });

      this.emitChange();
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

    this.processGLTF(gltf, config);
  }

  private processGLTF(gltf: GLTF, config: Mesh3DConfig): void {
    console.log("processGLTF: Entity position before processing:", {
      x: this.position.x, y: this.position.y, z: this.position.z
    });

    console.log("processGLTF: Original GLTF scene transform:", {
      position: { x: gltf.scene.position.x, y: gltf.scene.position.y, z: gltf.scene.position.z },
      rotation: { x: gltf.scene.rotation.x, y: gltf.scene.rotation.y, z: gltf.scene.rotation.z },
      scale: { x: gltf.scene.scale.x, y: gltf.scene.scale.y, z: gltf.scene.scale.z }
    });

    this.originalGLTF = gltf;
    const scene = gltf.scene.clone();
    
    console.log("processGLTF: Cloned scene transform before reset:", {
      position: { x: scene.position.x, y: scene.position.y, z: scene.position.z },
      rotation: { x: scene.rotation.x, y: scene.rotation.y, z: scene.rotation.z },
      scale: { x: scene.scale.x, y: scene.scale.y, z: scene.scale.z }
    });
    
    // Reset the scene's transform to ensure it doesn't interfere with entity positioning
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0);
    scene.scale.set(1, 1, 1);
    scene.updateMatrix();
    
    console.log("processGLTF: Scene transform after reset:", {
      position: { x: scene.position.x, y: scene.position.y, z: scene.position.z },
      rotation: { x: scene.rotation.x, y: scene.rotation.y, z: scene.rotation.z },
      scale: { x: scene.scale.x, y: scene.scale.y, z: scene.scale.z },
      matrixAutoUpdate: scene.matrixAutoUpdate
    });
    
    // Use the entire scene as our mesh - this properly handles multiple meshes and complex hierarchies
    this.mesh = scene;
    this.mesh.matrixAutoUpdate = true;
    
    // CRITICAL: Also ensure all children have matrixAutoUpdate enabled
    this.mesh.traverse((child) => {
      child.matrixAutoUpdate = true;
      console.log("Setting matrixAutoUpdate=true for child:", {
        type: child.constructor.name,
        position: { x: child.position.x, y: child.position.y, z: child.position.z }
      });
    });

    console.log("processGLTF: Entity position after processing:", {
      x: this.position.x, y: this.position.y, z: this.position.z
    });

    this.setupAnimations(gltf.animations, config);
    
    if (config.materialId && this.assetManager) {
      this.applyMaterialOverride(config.materialId);
    }
  }

  private createFromGeometry(config: Mesh3DConfig): void {
    const material = config.material || new THREE.MeshStandardMaterial();
    
    this.loadedGeometry = config.geometry!;
    this.loadedMaterials = Array.isArray(material) ? material : [material];

    if (config.instanceCount && config.instanceCount > 1) {
      this.createInstancedMesh(config.geometry!, material, config);
    } else if (config.lodLevels) {
      this.mesh = this.createLOD(config);
    } else {
      this.mesh = new THREE.Mesh(config.geometry, material);
    }
  }

  private createInstancedMesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], config: Mesh3DConfig): void {
    this.mesh = new THREE.InstancedMesh(geometry, material, config.instanceCount!);
    
    if (config.instanceMatrices) {
      (this.mesh as THREE.InstancedMesh).instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.setInstanceMatrices(config.instanceMatrices);
    }
    
    if (config.instanceColors) {
      (this.mesh as THREE.InstancedMesh).instanceColor = new THREE.InstancedBufferAttribute(
        config.instanceColors, 3
      );
    }
  }

  private createEmptyMesh(): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x888888, 
      transparent: true, 
      opacity: 0.5,
      wireframe: true
    });
    
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

    const properties = {
      castShadow: config.castShadow,
      receiveShadow: config.receiveShadow,
      visible: config.visible,
      renderOrder: config.renderOrder,
      frustumCulled: config.frustumCulled
    };

    // Apply properties to the mesh itself if it's a direct mesh
    if (this.mesh instanceof THREE.Mesh || this.mesh instanceof THREE.InstancedMesh) {
      Object.entries(properties).forEach(([key, value]) => {
        if (value !== undefined) {
          (this.mesh as any)[key] = value;
        }
      });
    } else {
      // If mesh is a scene/group, apply properties to all child meshes
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          Object.entries(properties).forEach(([key, value]) => {
            if (value !== undefined) {
              (child as any)[key] = value;
            }
          });
        }
      });
    }
  }

  private setupAnimations(animations: THREE.AnimationClip[] | undefined, config: Mesh3DConfig): void {
    if (!this.mesh || !animations || animations.length === 0) return;

    this.animationMixer = new THREE.AnimationMixer(this.mesh);
    
    animations.forEach((clip) => {
      const action = this.animationMixer!.clipAction(clip);
      this.animationActions.set(clip.name, action);
    });

    if (config.autoPlay && this.animationActions.has(config.autoPlay)) {
      this.playAnimation(config.autoPlay);
    }
  }

  private async applyMaterialOverride(materialId: string): Promise<void> {
    if (!this.assetManager || !this.mesh) return;

    const material = await this.assetManager.getMaterial(materialId);
    if (!material) return;

    if (this.mesh instanceof THREE.Mesh || this.mesh instanceof THREE.InstancedMesh) {
      this.mesh.material = material;
    } else {
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

    if (this.currentAnimation && this.currentAnimation !== name) {
      const currentAction = this.animationActions.get(this.currentAnimation);
      if (currentAction) {
        currentAction.fadeOut(fadeTime);
      }
    }

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
      this.animationActions.forEach((action) => action.fadeOut(fadeTime));
      this.currentAnimation = null;
    }
  }

  public pauseAnimation(name?: string): void {
    if (!this.animationMixer) return;

    if (name) {
      const action = this.animationActions.get(name);
      if (action) action.paused = true;
    } else {
      this.animationActions.forEach((action) => action.paused = true);
    }
  }

  public resumeAnimation(name?: string): void {
    if (!this.animationMixer) return;

    if (name) {
      const action = this.animationActions.get(name);
      if (action) action.paused = false;
    } else {
      this.animationActions.forEach((action) => action.paused = false);
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

  // Instance methods
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
    
    // If mesh is a scene/group, find the first mesh with geometry
    if (this.mesh) {
      let foundGeometry: THREE.BufferGeometry | null = null;
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry && !foundGeometry) {
          foundGeometry = child.geometry;
        }
      });
      if (foundGeometry) return foundGeometry;
    }
    
    return this.loadedGeometry;
  }

  public getMaterial(): THREE.Material | THREE.Material[] | null {
    if (this.mesh instanceof THREE.Mesh || this.mesh instanceof THREE.InstancedMesh) {
      return this.mesh.material;
    }
    
    // If mesh is a scene/group, collect materials from all meshes
    if (this.mesh && this.loadedMaterials.length === 0) {
      const materials: THREE.Material[] = [];
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
          materials.push(...childMaterials);
        }
      });
      if (materials.length > 0) {
        return materials.length === 1 ? materials[0] : materials;
      }
    }
    
    return this.loadedMaterials.length > 0 ? 
      (this.loadedMaterials.length === 1 ? this.loadedMaterials[0] : this.loadedMaterials) : 
      null;
  }

  public setMaterial(material: THREE.Material | THREE.Material[]): void {
    if (this.mesh instanceof THREE.Mesh || this.mesh instanceof THREE.InstancedMesh) {
      this.mesh.material = material;
    } else if (this.mesh) {
      // If mesh is a scene/group, apply material to all child meshes
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = material;
        }
      });
    }
    this.loadedMaterials = Array.isArray(material) ? material : [material];
  }

  public getMesh(): THREE.Mesh | THREE.InstancedMesh | THREE.LOD | THREE.Group | null {
    return this.mesh;
  }

  public raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void {
    if (this.mesh) {
      this.mesh.raycast(raycaster, intersects);
    }
  }

  // Physics collider creation
  protected createCollider(config: any): void {
    if (!this.physicsManager || !this.colliderId || !this.rigidBodyId) return;

    const geometry = this.getGeometry();
    if (!geometry) return;

    const worldScale = this.getWorldScale(new THREE.Vector3());

    if (geometry instanceof THREE.BoxGeometry) {
      const size = new THREE.Vector3();
      geometry.computeBoundingBox();
      geometry.boundingBox!.getSize(size);
      size.multiply(worldScale);
      this.physicsManager.createCollider(this.colliderId, this.rigidBodyId, "cuboid", size, config);
    } else if (geometry instanceof THREE.SphereGeometry) {
      const scaledRadius = geometry.parameters.radius * Math.max(worldScale.x, worldScale.y, worldScale.z);
      this.physicsManager.createCollider(this.colliderId, this.rigidBodyId, "ball", scaledRadius, config);
    } else {
      this.createComplexCollider(geometry, worldScale, config);
    }
  }

  private createComplexCollider(geometry: THREE.BufferGeometry, worldScale: THREE.Vector3, config: any): void {
    const positionAttribute = geometry.getAttribute('position');
    if (!positionAttribute) return;

    const originalVertices = new Float32Array(positionAttribute.array);
    const vertices = new Float32Array(originalVertices.length);
    
    for (let i = 0; i < originalVertices.length; i += 3) {
      vertices[i] = originalVertices[i] * worldScale.x;
      vertices[i + 1] = originalVertices[i + 1] * worldScale.y;
      vertices[i + 2] = originalVertices[i + 2] * worldScale.z;
    }
    
    const collider = this.physicsManager!.createCollider(
      this.colliderId!, 
      this.rigidBodyId!, 
      "convexhull", 
      { vertices },
      config
    );
    
    if (!collider && geometry.index) {
      const indices = new Uint32Array(geometry.index.array);
      this.physicsManager!.createCollider(
        this.colliderId!,
        this.rigidBodyId!,
        "trimesh",
        { vertices, indices },
        config
      );
    }
  }

  public updateTweens(delta: number): void {
    super.updateTweens(delta);
    
    if (this.animationMixer) {
      this.animationMixer.update(delta);
    }
  }

  private disposeMesh(): void {
    if (this.animationMixer) {
      this.animationMixer.stopAllAction();
      this.animationMixer = null;
    }
    
    this.animationActions.clear();
    this.currentAnimation = null;

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

  // Serialization
  serialize(): EntityData {
    const meshData: EntityData = {
      id: this.entityId,
      name: this.entityName,
      type: "mesh3d",
      transform: {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      visible: this.visible,
      castShadow: this.castShadow,
      receiveShadow: this.receiveShadow,
      physics: this.physicsConfig ? {
        enabled: true,
        type: this.physicsConfig.type || "dynamic",
        mass: this.physicsConfig.mass,
        restitution: this.physicsConfig.restitution,
        friction: this.physicsConfig.friction,
      } : undefined,
      characterController: this.serializeCharacterController(),
      userData: { ...this.userData },
      tags: [...this.metadata.tags],
      layer: this.metadata.layer,
      properties: {
        modelPath: this.modelPath || (this.metadata as any).modelPath,
      }
    };

    this.serializeGeometryAndMaterial(meshData);
    return meshData;
  }

  private serializeGeometryAndMaterial(meshData: EntityData): void {
    if (!meshData.properties?.modelPath && this.mesh) {
      if (this.mesh instanceof THREE.Mesh || this.mesh instanceof THREE.InstancedMesh) {
        const geometry = this.mesh.geometry;
        if (geometry) {
          meshData.geometry = {
            type: geometry.type,
            parameters: (geometry as any).parameters || {}
          };
        }
        
        const material = this.mesh.material;
        if (material) {
          meshData.material = {
            type: (material as any).type,
            properties: {}
          };
          if ('color' in material) {
            meshData.material.properties.color = (material as any).color.getHex();
          }
        }
      }
    }
  }

  // Model loading methods
  public async loadFromUrl(url: string): Promise<void> {
    if (!this.assetManager) {
      throw new Error('AssetManager not set - cannot load model from URL');
    }

    try {
      // Use the URL as the asset ID, or generate a unique ID
      const assetId = `model_${url.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const gltf = await this.assetManager.loadModel(assetId, url);

      this.clearExistingMesh();
      this.processGLTF(gltf, {});
      this.finalizeMeshSetup({
        castShadow: this.castShadow,
        receiveShadow: this.receiveShadow
      });
    } catch (error) {
      console.error('Failed to load model from URL:', error);
      throw error;
    }
  }

  public async loadFromPath(projectPath: string, modelPath: string): Promise<void> {
    if (!this.assetManager) {
      throw new Error('AssetManager not set - cannot load model from path');
    }

    try {
      // Get the asset URL from the project API
      const assetUrl = await window.projectAPI.getAssetUrl(projectPath, modelPath);
      if (!assetUrl) {
        throw new Error(`Could not resolve asset URL for path: ${modelPath}`);
      }

      // Use the model path as the asset ID for consistency
      const assetId = `model_${modelPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const gltf = await this.assetManager.loadModel(assetId, assetUrl);

      this.clearExistingMesh();
      this.processGLTF(gltf, {});
      this.finalizeMeshSetup({
        castShadow: this.castShadow,
        receiveShadow: this.receiveShadow
      });

      // Store the model path for serialization
      this.modelPath = modelPath;
      (this.metadata as any).modelPath = modelPath;
    } catch (error) {
      console.error('Failed to load model from path:', error);
      throw error;
    }
  }

  public static async fromSerializedData(data: EntityData, assetManager?: AssetManager): Promise<Mesh3D> {
    const config: Mesh3DConfig = {
      name: data.name,
      position: data.transform?.position ? new THREE.Vector3(
        data.transform.position.x,
        data.transform.position.y,
        data.transform.position.z
      ) : undefined,
      rotation: data.transform?.rotation ? new THREE.Euler(
        data.transform.rotation.x,
        data.transform.rotation.y,
        data.transform.rotation.z
      ) : undefined,
      scale: data.transform?.scale ? new THREE.Vector3(
        data.transform.scale.x,
        data.transform.scale.y,
        data.transform.scale.z
      ) : undefined,
      modelPath: data.properties?.modelPath,
      castShadow: data.castShadow,
      receiveShadow: data.receiveShadow,
    };

    const mesh = new Mesh3D(config);
    
    if (config.modelPath) {
      mesh.modelPath = config.modelPath;
      (mesh.metadata as any).modelPath = config.modelPath;
    }

    if (data.physics) {
      mesh.physicsConfig = {
        type: data.physics.type,
        mass: data.physics.mass,
        restitution: data.physics.restitution,
        friction: data.physics.friction,
      };
    }

    if (data.tags) {
      mesh.metadata.tags = [...data.tags];
    }

    return mesh;
  }

  // Transform methods removed - using base Entity class implementation
  // The mesh is added as a child via this.add(this.mesh), so it inherits
  // the entity's transform automatically through THREE.js parent-child hierarchy
} 