import { GameWorld } from "../game-world";
import { EntityLoader } from "./entity-loader";
import { PhysicsLoader } from "./physics-loader";
import { SceneData, LoaderContext } from "./types";
import { materialSystem } from "../../services/material-system";
import * as THREE from "three/webgpu";

export class SceneLoader {
  private entityLoader: EntityLoader;
  private physicsLoader: PhysicsLoader;

  constructor() {
    this.entityLoader = new EntityLoader();
    this.physicsLoader = new PhysicsLoader();
  }

  async loadScene(gameWorld: GameWorld, sceneData: SceneData): Promise<void> {
    const context: LoaderContext = {
      gameWorld,
      materials: new Map(),
      geometries: new Map(),
      textures: new Map(),
    };

    try {
      gameWorld.scene.clear();
      
      // Load materials first
      await this.loadMaterials(context, sceneData);
      
      // Transform physics data to expected format
      const physicsData = {
        enabled: sceneData.world.physics.enabled,
        gravity: [sceneData.world.gravity.x, sceneData.world.gravity.y, sceneData.world.gravity.z] as [number, number, number],
        debugRender: sceneData.editor?.debugPhysics || false,
        solver: {
          iterations: 10,
          timestep: sceneData.world.physics.timeStep
        }
      };
      
      if (physicsData) {
        await this.physicsLoader.load(context, physicsData);
      }
      // Convert SceneEntity to EntityData format for the entity loader
      // Use type assertion to handle complex type differences temporarily
      const entityData = sceneData.entities as any[];
      await this.entityLoader.load(context, entityData);

    } catch (error) {
      console.error(`Failed to load scene "${sceneData.name}":`, error);
      throw error;
    }
  }

  private async loadMaterials(context: LoaderContext, sceneData: SceneData): Promise<void> {
    // Load materials from the assets array if they exist
    const materialAssets = sceneData.assets?.filter(asset => asset.type === 'material') || [];
    
    for (const materialAsset of materialAssets) {
      if (materialAsset.metadata?.materialDefinition) {
        const materialDef = materialAsset.metadata.materialDefinition;
        
        // Add the material definition to the material system
        materialSystem.loadMaterialLibrary({
          id: `scene-materials-${Date.now()}`,
          name: 'Scene Materials',
          version: '1.0.0',
          materials: [materialDef],
          sharedShaderGraphs: [],
          sharedTextures: [],
          metadata: {
            created: new Date(),
            modified: new Date()
          }
        });
        
        // Create the THREE.js material and store it in the context
        const threeMaterial = await this.createMaterialFromDefinition(materialDef);
        context.materials.set(materialDef.id, threeMaterial);
        
      }
    }
    
    // Also check if materials are stored in metadata (fallback)
    if ((sceneData.metadata as any)?.materials) {
      const materials = (sceneData.metadata as any).materials;
      for (const materialDef of materials) {
        if (!context.materials.has(materialDef.id)) {
          materialSystem.loadMaterialLibrary({
            id: `scene-materials-metadata-${Date.now()}`,
            name: 'Scene Materials (Metadata)',
            version: '1.0.0',
            materials: [materialDef],
            sharedShaderGraphs: [],
            sharedTextures: [],
            metadata: {
              created: new Date(),
              modified: new Date()
            }
          });
          
          const threeMaterial = await this.createMaterialFromDefinition(materialDef);
          context.materials.set(materialDef.id, threeMaterial);
          
        }
      }
    }
  }

  private async createMaterialFromDefinition(materialDef: any): Promise<THREE.Material> {
    let material: THREE.Material;

    switch (materialDef.type) {
      case 'basic':
        material = new THREE.MeshBasicMaterial();
        break;
      case 'lambert':
        material = new THREE.MeshLambertMaterial();
        break;
      case 'phong':
        material = new THREE.MeshPhongMaterial();
        break;
      case 'standard':
        material = new THREE.MeshStandardMaterial();
        break;
      case 'physical':
        material = new THREE.MeshPhysicalMaterial();
        break;
      case 'toon':
        material = new THREE.MeshToonMaterial();
        break;
      default:
        material = new THREE.MeshStandardMaterial();
    }

    // Apply properties from the material definition
    const props = materialDef.properties || {};
    
    // Common properties
    if (props.opacity !== undefined) material.opacity = props.opacity;
    if (props.transparent !== undefined) material.transparent = props.transparent;
    if (props.side !== undefined) material.side = props.side;
    if (props.visible !== undefined) material.visible = props.visible;
    
    // Color properties
    if (props.color && 'color' in material) {
      (material as any).color.set(props.color);
    }
    if (props.emissive && 'emissive' in material) {
      (material as any).emissive.set(props.emissive);
    }
    if (props.emissiveIntensity !== undefined && 'emissiveIntensity' in material) {
      (material as any).emissiveIntensity = props.emissiveIntensity;
    }
    
    // PBR properties
    if (props.metalness !== undefined && 'metalness' in material) {
      (material as any).metalness = props.metalness;
    }
    if (props.roughness !== undefined && 'roughness' in material) {
      (material as any).roughness = props.roughness;
    }
    
    // Phong properties
    if (props.specular && 'specular' in material) {
      (material as any).specular.set(props.specular);
    }
    if (props.shininess !== undefined && 'shininess' in material) {
      (material as any).shininess = props.shininess;
    }
    
    // Other properties
    if (props.wireframe !== undefined && 'wireframe' in material) {
      (material as any).wireframe = props.wireframe;
    }

    return material;
  }

  static validateSceneData(sceneData: any): sceneData is SceneData {
    if (!sceneData || typeof sceneData !== 'object') return false;
    return sceneData.entities && Array.isArray(sceneData.entities);
  }

  static getDefaultSceneData(): SceneData {
    const now = new Date();
    return {
      id: `scene_${Date.now()}`,
      name: "New Scene",
      entities: [
        { id: "main-camera", name: "Main Camera", type: "camera", transform: { position: { x: 5, y: 5, z: 10 }, rotation: {x:-0.4, y: 0.3, z: 0.1}, scale: { x:1, y:1, z:1 } }, properties: { type: "perspective", fov: 75, near: 0.1, far: 1000, isActive: true }, children: [], tags: [], layer: 0, visible: true, metadata: { created: Date.now(), updated: Date.now() }},
        { id: "ambient-light", name: "Ambient Light", type: "light", transform: { position: { x: 0, y: 0, z: 0 }, rotation: {x:0,y:0,z:0}, scale: {x:1,y:1,z:1} }, properties: { type: "ambient", color: "#404040", intensity: 0.8 }, children: [], tags: [], layer: 0, visible: true, metadata: { created: Date.now(), updated: Date.now() }},
        { id: "directional-light", name: "Sun", type: "light", transform: { position: { x: 10, y: 15, z: 5 }, rotation: {x:0,y:0,z:0}, scale:{x:1,y:1,z:1} }, properties: { type: "directional", color: "#ffffff", intensity: 1.5, castShadow: true }, children: [], tags: [], layer: 0, visible: true, metadata: { created: Date.now(), updated: Date.now() }},
        { id: "ground", name: "Ground", type: "box", transform: { position: { x: 0, y: -0.5, z: 0 }, rotation: {x:0,y:0,z:0}, scale: {x:20,y:1,z:20} }, physics: { enabled: true, type: 'static' }, children: [], tags: ["ground"], layer: 0, visible: true, castShadow: false, receiveShadow: true, properties: {}, metadata: { created: Date.now(), updated: Date.now() }},
      ],
      world: {
        gravity: { x: 0, y: -9.81, z: 0 },
        physics: { enabled: true, timeStep: 1/60, maxSubSteps: 10 },
        rendering: {
          backgroundColor: "#87CEEB", environment: "",
          fog: { enabled: false, color: "#ffffff", near: 10, far: 100 },
          shadows: { enabled: true, type: "pcfsoft" },
          antialias: true, pixelRatio: 1,
        },
      },
      activeCamera: "main-camera",
      assets: [],
      editor: { showGrid: true, gridSize: 1, showHelpers: true, showWireframe: false, debugPhysics: false },
      metadata: { created: now, modified: now, version: "1.0.0" },
    };
  }
}