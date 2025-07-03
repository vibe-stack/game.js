// Vector3 utility type
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

// Transform types for serialization
export interface Transform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

// Project configuration types
export interface ProjectConfig {
  name: string;
  description: string;
  author: string;
  version: string;
  engine: {
    version: string;
    renderer: "webgpu" | "webgl";
  };
  build: {
    target: "web" | "electron" | "mobile";
    optimization: "development" | "production";
  };
}

// Physics configuration
export interface PhysicsConfig {
  enabled: boolean;
  type?: "dynamic" | "static" | "kinematic";
  mass?: number;
  restitution?: number;
  friction?: number;
  linearDamping?: number;
  angularDamping?: number;
  gravityScale?: number;
  canSleep?: boolean;
}

export type EntityType = 
  | "entity"
  | "box" 
  | "sphere" 
  | "cylinder" 
  | "plane" 
  | "cone" 
  | "torus" 
  | "capsule" 
  | "ring"
  | "heightfield"
  | "custom-heightfield"
  | "mesh3d"
  | "camera"
  | "light"
  | "group";

// Base scene entity (matches your Entity class structure)
export interface SceneEntity {
  id: string;
  name: string;
  type: EntityType;
  transform: Transform;
  physics?: PhysicsConfig;
  materialId?: string; // Reference to a material in the library
  tags: string[];
  layer: number;
  visible: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  children: SceneEntity[];
  properties: Record<string, any>; // Entity-specific properties
  metadata: {
    created: number;
    updated: number;
  };
}

// Asset references
export interface AssetReference {
  id: string;
  type: "texture" | "model" | "audio" | "script" | "material";
  path: string;
  name: string;
  metadata?: Record<string, any>;
}

// Full project structure (what gets saved to disk)
export interface GameProject {
  name: string;
  path: string;
  lastModified: Date;
  isRunning?: boolean;
  
  // New unified data structure
  data?: {
    config: ProjectConfig;
    scenes: Record<string, string>; // sceneName -> filePath
    assets: AssetReference[];
    scripts: string[];
    dependencies: Record<string, string>;
    metadata: {
      created: Date;
      modified: Date;
      lastOpened?: Date;
    };
  };

  // Legacy compatibility
  scenes: string[];
  currentScene?: string;
  packageJson?: any;
  metadata: {
    created: Date;
    version: string;
    description?: string;
    author?: string;
  };
}

// Scene data structure matching your GameWorld
export interface SceneData {
  id: string;
  name: string;
  entities: SceneEntity[];
  world: {
    gravity: { x: number; y: number; z: number };
    physics: {
      enabled: boolean;
      timeStep: number;
      maxSubSteps: number;
    };
    rendering: {
      backgroundColor: string;
      environment?: string;
      fog?: {
        enabled: boolean;
        color: string;
        near: number;
        far: number;
      };
      shadows: {
        enabled: boolean;
        type: "basic" | "pcf" | "pcfsoft" | "vsm";
      };
      antialias: boolean;
      targetResolution?: {
        width: number;
        height: number;
        maintainAspectRatio: boolean;
      };
      pixelRatio?: number;
    };
  };
  activeCamera?: string;
  assets: AssetReference[];
  editor: {
    showGrid: boolean;
    gridSize: number;
    gridDivisions: number;
    gridColor: string;
    gridOpacity: number;
    gridCenter: { x: number; y: number; z: number };
    gridInfinite: boolean;
    showHelpers: boolean;
    showWireframe: boolean;
    debugPhysics: boolean;
  };
  metadata: {
    created: Date | number;
    modified: Date | number;
    version: string;
  };
}

// Type aliases for compatibility
export type GameScene = SceneData;
export type GameObject = SceneEntity;

// Material System Types from Guide
export interface MaterialLibrary {
  id: string;
  name: string;
  version: string;
  description?: string;
  materials: MaterialDefinition[];
  sharedShaderGraphs: TSLShaderGraph[];
  sharedTextures: TextureReference[];
  metadata: {
    created: Date | number;
    modified: Date | number;
    author?: string;
    tags?: string[];
  };
}

export interface MaterialDefinition {
  id: string;
  name: string;
  description?: string;
  type: "basic" | "standard" | "physical" | "lambert" | "phong" | "toon" | "shader";
  properties: Record<string, any>;
  shaderGraph?: string;
  metadata: {
    category: string;
    tags: string[];
    preview?: string;
  };
}

export interface TSLShaderGraph {
  id: string;
  name: string;
  version: string;
  nodes: any[];
  connections: any[];
  inputs: any[];
  outputs: any[];
  metadata: {
    description?: string;
    author?: string;
    created: Date | number;
    modified: Date | number;
  };
}

export interface TextureReference {
  id: string;
  assetId: string;
  type: string;
  wrapS?: "repeat" | "clampToEdge" | "mirroredRepeat";
  wrapT?: "repeat" | "clampToEdge" | "mirroredRepeat";
  repeat?: Vector2;
  offset?: Vector2;
  rotation?: number;
  anisotropy?: number;
  flipY?: boolean;
  generateMipmaps?: boolean;
  premultiplyAlpha?: boolean;
  unpackAlignment?: number;
  colorSpace?: 'sRGB' | 'Linear';
}

export interface EnhancedAssetReference extends AssetReference {
  url?: string;
  dataUrl?: string;
  blob?: Blob;
  buffer?: ArrayBuffer;
  textureProperties?: TextureReference;
}