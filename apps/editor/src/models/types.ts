import * as THREE from "three/webgpu";
import type RAPIER from "@dimforge/rapier3d-compat";

export interface PhysicsConfig {
  mass?: number;
  restitution?: number;
  friction?: number;
  type?: "dynamic" | "static" | "kinematic";
}

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