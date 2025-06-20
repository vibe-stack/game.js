import { EntityConfig, EntityMetadata } from "../models/types";
import * as THREE from "three/webgpu";

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
  // Rapier3D specific
  linearDamping?: number;
  angularDamping?: number;
  gravityScale?: number;
  canSleep?: boolean;
}

// Entity types matching your new system
export type EntityType = 
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
  material?: MaterialReference;
  tags: string[];
  layer: number;
  visible: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  children: SceneEntity[];
  // Entity-specific properties
  properties: Record<string, any>;
  metadata: {
    created: number;
    updated: number;
  };
}

// Primitive-specific configurations
export interface BoxProperties {
  width: number;
  height: number;
  depth: number;
  widthSegments?: number;
  heightSegments?: number;
  depthSegments?: number;
}

export interface SphereProperties {
  radius: number;
  widthSegments?: number;
  heightSegments?: number;
  phiStart?: number;
  phiLength?: number;
  thetaStart?: number;
  thetaLength?: number;
}

export interface CylinderProperties {
  radiusTop: number;
  radiusBottom: number;
  height: number;
  radialSegments?: number;
  heightSegments?: number;
  openEnded?: boolean;
  thetaStart?: number;
  thetaLength?: number;
}

export interface PlaneProperties {
  width: number;
  height: number;
  widthSegments?: number;
  heightSegments?: number;
}

export interface ConeProperties {
  radius: number;
  height: number;
  radialSegments?: number;
  heightSegments?: number;
  openEnded?: boolean;
  thetaStart?: number;
  thetaLength?: number;
}

export interface TorusProperties {
  radius: number;
  tubeRadius: number;
  radialSegments?: number;
  tubularSegments?: number;
  arc?: number;
}

export interface CapsuleProperties {
  radius: number;
  length: number;
  capSegments?: number;
  radialSegments?: number;
}

export interface RingProperties {
  innerRadius: number;
  outerRadius: number;
  thetaSegments?: number;
  phiSegments?: number;
  thetaStart?: number;
  thetaLength?: number;
}

export interface HeightfieldProperties {
  width: number;
  depth: number;
  rows: number;
  columns: number;
  minElevation: number;
  maxElevation: number;
  algorithm: "perlin" | "simplex" | "ridged" | "fbm" | "voronoi" | "diamond-square" | "random" | "flat" | "custom";
  seed: number;
  noise: {
    frequency: number;
    amplitude: number;
    octaves: number;
    persistence: number;
    lacunarity: number;
  };
  customHeights?: number[][];
  uvScale: { x: number; y: number };
  smoothing: boolean;
  wireframe: boolean;
}

export interface Mesh3DProperties {
  geometry: string; // Asset reference
  animations?: string[];
}

export interface CameraProperties {
  type: "perspective" | "orthographic";
  fov?: number;
  aspect?: number;
  near: number;
  far: number;
  zoom?: number;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  isActive: boolean;
}

export interface LightProperties {
  type: "ambient" | "directional" | "point" | "spot" | "hemisphere";
  color: string;
  intensity: number;
  castShadow?: boolean;
  // Directional/Spot light
  target?: { x: number; y: number; z: number };
  // Point/Spot light
  distance?: number;
  decay?: number;
  // Spot light
  angle?: number;
  penumbra?: number;
  // Hemisphere light
  groundColor?: string;
}

// Material system
export interface MaterialReference {
  type: "library" | "inline" | "standard";
  materialId?: string;
  properties?: MaterialProperties;
}

export interface MaterialProperties {
  type: "basic" | "standard" | "physical" | "lambert" | "phong" | "toon";
  color: string;
  opacity: number;
  transparent: boolean;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  wireframe?: boolean;
  // Texture maps
  map?: string; // Asset reference
  normalMap?: string;
  roughnessMap?: string;
  metalnessMap?: string;
  emissiveMap?: string;
  aoMap?: string;
}

// Asset references
export interface AssetReference {
  id: string;
  type: "texture" | "model" | "audio" | "script" | "material";
  path: string;
  name: string;
  metadata?: Record<string, any>;
}

// Scene data structure matching your GameWorld
export interface SceneData {
  id: string;
  name: string;
  entities: SceneEntity[];
  
  // World configuration
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
      pixelRatio?: number;
    };
  };
  
  // Active references
  activeCamera?: string;
  activeLighting?: string;
  
  // Assets used in this scene
  assets: AssetReference[];
  
  // Editor-specific data
  editor: {
    showGrid: boolean;
    gridSize: number;
    showHelpers: boolean;
    showWireframe: boolean;
    debugPhysics: boolean;
  };
  
  metadata: {
    created: Date;
    modified: Date;
    version: string;
  };
}

// Project structure
export interface ProjectData {
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
}

// Editor-specific configuration
export interface EditorConfig {
  theme: "light" | "dark" | "system";
  viewport: {
    showGrid: boolean;
    gridSize: number;
    showGizmos: boolean;
    cameraSpeed: number;
    background: string;
  };
  shortcuts: Record<string, string>;
  panels: {
    sceneTree: { visible: boolean; width: number };
    inspector: { visible: boolean; width: number };
    assets: { visible: boolean; height: number };
  };
  autoSave: {
    enabled: boolean;
    interval: number; // seconds
  };
}

// Full project structure (what gets saved to disk)
export interface GameProject {
  name: string;
  path: string;
  data: ProjectData;
  editorConfig: EditorConfig;
  
  // Runtime data
  lastModified: Date;
  isRunning?: boolean;
  
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

// Project creation options
export interface CreateProjectOptions {
  name: string;
  path?: string;
  template?: "empty" | "basic" | "platformer" | "fps";
  description?: string;
  author?: string;
}

// Project loading result
export interface LoadProjectResult {
  project: GameProject;
  scenes: Map<string, SceneData>;
  errors?: string[];
}

// Template system
export type ProjectTemplate = "empty" | "basic" | "platformer" | "fps";

export interface TemplateConfig {
  id: ProjectTemplate;
  name: string;
  description: string;
  icon: string;
  entities: Partial<SceneEntity>[];
  worldConfig: Partial<SceneData["world"]>;
} 