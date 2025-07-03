import * as THREE from "three/webgpu";
import type RAPIER from "@dimforge/rapier3d-compat";

// Advanced collision shape definitions
export type ColliderShape = 
  | { type: "ball"; radius: number }
  | { type: "cuboid"; halfExtents: THREE.Vector3 }
  | { type: "capsule"; halfHeight: number; radius: number }
  | { type: "cylinder"; halfHeight: number; radius: number }
  | { type: "cone"; halfHeight: number; radius: number }
  | { type: "convexHull"; vertices: Float32Array }
  | { type: "trimesh"; vertices: Float32Array; indices: Uint32Array }
  | { type: "heightfield"; heights: number[][]; scale: THREE.Vector3 }
  | { type: "compound"; shapes: Array<{ shape: ColliderShape; position?: THREE.Vector3; rotation?: THREE.Quaternion }> };

// Collision groups for filtering
export interface CollisionGroups {
  memberships: number;  // What groups this collider belongs to
  filter: number;       // What groups this collider can interact with
}

// Advanced collider configuration
export interface ColliderConfig {
  shape: ColliderShape;
  isSensor?: boolean;
  density?: number;
  friction?: number;
  restitution?: number;
  offset?: THREE.Vector3;
  rotation?: THREE.Quaternion;
  collisionGroups?: CollisionGroups;
  activeCollisionTypes?: number; // Bitmask of ActiveCollisionTypes
  activeEvents?: number; // Bitmask of ActiveEvents
  contactForceEventThreshold?: number;
  solverGroups?: CollisionGroups;
}

// Physics mode enum
export enum PhysicsMode {
  Simple = "simple",
  Advanced = "advanced"
}

// Extended physics configuration
export interface PhysicsConfig {
  // Common properties
  type?: "dynamic" | "static" | "kinematic";
  mode?: PhysicsMode;
  
  // Simple mode properties
  mass?: number;
  restitution?: number;
  friction?: number;
  
  // Advanced mode properties
  colliders?: ColliderConfig[]; // Multiple colliders support
  linearDamping?: number;
  angularDamping?: number;
  gravityScale?: number;
  canSleep?: boolean;
  ccd?: boolean; // Continuous collision detection
  dominanceGroup?: number;
  additionalSolverIterations?: number;
  
  // Constraints
  lockTranslationX?: boolean;
  lockTranslationY?: boolean;
  lockTranslationZ?: boolean;
  lockRotationX?: boolean;
  lockRotationY?: boolean;
  lockRotationZ?: boolean;
  
  // Initial velocities
  linearVelocity?: THREE.Vector3;
  angularVelocity?: THREE.Vector3;
}

// Predefined collision groups
export const CollisionGroupPresets = {
  Default: { memberships: 0x0001, filter: 0xFFFF },
  Static: { memberships: 0x0002, filter: 0xFFFF },
  Dynamic: { memberships: 0x0004, filter: 0xFFFF },
  Player: { memberships: 0x0008, filter: 0xFFFF & ~0x0008 }, // Collides with everything except other players
  Enemy: { memberships: 0x0010, filter: 0xFFFF },
  Projectile: { memberships: 0x0020, filter: 0xFFFF & ~0x0020 }, // Don't collide with other projectiles
  Trigger: { memberships: 0x0040, filter: 0xFFFF },
  NoCollision: { memberships: 0x0080, filter: 0x0000 }, // Doesn't collide with anything
} as const;

export interface TweenConfig {
  target: THREE.Vector3 | THREE.Quaternion;
  duration: number;
  easing?: (t: number) => number;
  onComplete?: () => void;
}

export interface EntityConfig {
  name?: string;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
  physics?: PhysicsConfig;
}

export interface GameConfig {
  canvas: HTMLCanvasElement;
  enablePhysics?: boolean;
  gravity?: THREE.Vector3;
  antialias?: boolean;
  pixelRatio?: number;
  shadowMapEnabled?: boolean;
}

export interface RegistryItem<T = any> {
  id: string;
  name: string;
  item: T;
  metadata?: Record<string, any>;
}

export interface StateSubscriber<T = any> {
  id: string;
  callback: (state: T) => void;
  filter?: (state: T) => boolean;
}

export interface GameState {
  entities: Map<string, any>;
  cameras: Map<string, THREE.Camera>;
  controls: Map<string, any>;
  physics: {
    enabled: boolean;
    world?: RAPIER.World;
  };
  interaction: {
    activeObjects: string[];
    hoveredObject?: string;
    selectedObject?: string;
  };
  scene: {
    activeCamera: string;
    activeControls: string;
    cameraTransition?: {
      inProgress: boolean;
      from?: string;
      to?: string;
    };
  };
  [key: string]: any;
}

export interface InteractionCallbacks {
  click?: (event: any) => void;
  mouseover?: (event: any) => void;
  mouseout?: (event: any) => void;
  mouseenter?: (event: any) => void;
  mouseleave?: (event: any) => void;
  mousedown?: (event: any) => void;
  mouseup?: (event: any) => void;
  pointerdown?: (event: any) => void;
  pointerup?: (event: any) => void;
  // Legacy API for backwards compatibility
  onClick?: (event: any) => void;
  onHover?: (event: any) => void;
  onMouseEnter?: (event: any) => void;
  onMouseLeave?: (event: any) => void;
  onPointerDown?: (event: any) => void;
  onPointerUp?: (event: any) => void;
}

export type EntityType = "mesh" | "sphere" | "box" | "mesh3d" | "light" | "camera" | "group" | "primitive" | "entity";

export interface EntityMetadata {
  type: EntityType;
  created: number;
  updated: number;
  tags: string[];
  layer: number;
}

// Shader System Types
export type ShaderType = "material" | "postprocess" | "compute" | "particle";

export interface ShaderParameter {
  name: string;
  type: "float" | "vec2" | "vec3" | "vec4" | "texture" | "sampler2D" | "mat3" | "mat4" | "bool" | "int";
  defaultValue?: any;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

export interface TSLShaderConfig {
  id?: string;
  name: string;
  type: ShaderType;
  graph?: {
    nodes: TSLNodeDefinition[];
    connections: TSLConnectionDefinition[];
  };
  parameters?: ShaderParameter[];
  materialConnections?: {
    colorNode?: string;
    normalNode?: string;
    metalnessNode?: string;
    roughnessNode?: string;
    emissiveNode?: string;
    aoNode?: string;
    displacementNode?: string;
    alphaNode?: string;
  };
  metadata?: {
    description?: string;
    author?: string;
    version?: string;
    tags?: string[];
  };
}

export interface TSLNodeDefinition {
  id: string;
  type: string;
  position?: { x: number; y: number };
  properties?: Record<string, any>;
  inputs?: TSLPortDefinition[];
  outputs?: TSLPortDefinition[];
}

export interface TSLPortDefinition {
  id: string;
  name: string;
  type: string;
  defaultValue?: any;
  required?: boolean;
}

export interface TSLConnectionDefinition {
  from: {
    nodeId: string;
    outputId: string;
  };
  to: {
    nodeId: string;
    inputId: string;
  };
}

export interface CompiledShader {
  shaderId: string;
  material: THREE.Material;
  uniforms?: Record<string, { value: any; type: string }>;
  vertexNode?: any;
  fragmentNode?: any;
  context?: ShaderContext;
}

export interface ShaderContext {
  renderer?: THREE.WebGPURenderer;
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  target?: THREE.Object3D;
  time?: number;
}

export interface TSLShader {
  id: string;
  name: string;
  type: ShaderType;
  graph: any;
  parameters: ShaderParameter[];
  materialConnections?: any;
  metadata: any;
  updateGraph(graph: any): void;
  updateParameter(name: string, value: any): void;
  serialize(): any;
  dispose(): void;
} 