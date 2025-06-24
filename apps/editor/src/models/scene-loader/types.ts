import { GameWorld } from "../game-world";
import { SceneData as ProjectSceneData } from "../../types/project";
import { AssetManager } from "../asset-manager";
import * as THREE from "three/webgpu";

// Re-export the main SceneData type for clarity
export type SceneData = ProjectSceneData;

export interface LoaderContext {
  gameWorld: GameWorld;
  materials: Map<string, THREE.Material>;
  geometries: Map<string, THREE.BufferGeometry>;
  textures: Map<string, THREE.Texture>;
  assetManager?: AssetManager;
}

// Keep other types for loader-specific data shapes if they differ
export interface EntityData {
  id: string;
  name: string;
  type: string;
  transform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  }
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  userData: Record<string, any>;
  tags: string[];
  layer: number;
  physics?: {
    enabled: boolean;
    type: "static" | "dynamic" | "kinematic";
    mass?: number;
    restitution?: number;
    friction?: number;
    colliderShape?: string;
    colliderSize?: [number, number, number];
  };
  characterController?: {
    capsuleHalfHeight: number;
    capsuleRadius: number;
    maxSpeed: number;
    acceleration: number;
    jumpForce: number;
    sprintMultiplier: number;
    offset: number;
    maxSlopeClimbAngle: number;
    minSlopeSlideAngle: number;
    autoStepMaxHeight: number;
    autoStepMinWidth: number;
    autoStepIncludeDynamic: boolean;
    snapToGroundDistance: number;
    gravityScale: number;
    maxFallSpeed: number;
    cameraMode: "first-person" | "third-person";
    cameraDistance: number;
    cameraHeight: number;
    cameraMinDistance: number;
    cameraMaxDistance: number;
    cameraUpLimit: number;
    cameraDownLimit: number;
    cameraSensitivity: number;
  };
  geometry?: {
    type: string;
    parameters: Record<string, any>;
  };
  material?: {
    type: string;
    properties: Record<string, any>;
  };
  materialId?: string;
  properties?: Record<string, any>;
  children?: EntityData[];
}

export interface CameraData {
  id: string;
  name: string;
  type: "perspective" | "orthographic";
  position: [number, number, number];
  rotation: [number, number, number];
  target?: [number, number, number];
  active: boolean;
  properties: {
    fov?: number;
    aspect?: number;
    near: number;
    far: number;
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    zoom?: number;
  };
  controls?: {
    type: string;
    enabled: boolean;
    properties: Record<string, any>;
  };
}

export interface LightingData {
  ambient: { color: number; intensity: number; };
  directional: Array<{ id: string; name: string; color: number; intensity: number; position: [number, number, number]; target?: [number, number, number]; castShadow: boolean; shadow?: any; }>;
  point: Array<{ id: string; name: string; color: number; intensity: number; distance: number; decay: number; position: [number, number, number]; castShadow: boolean; shadow?: any; }>;
  spot: Array<{ id: string; name: string; color: number; intensity: number; distance: number; angle: number; penumbra: number; decay: number; position: [number, number, number]; target: [number, number, number]; castShadow: boolean; shadow?: any; }>;
}

export interface PhysicsData {
  enabled: boolean;
  gravity: [number, number, number];
  debugRender: boolean;
  solver: {
    iterations: number;
    timestep: number;
  };
}

export interface MaterialData {
  id: string;
  name: string;
  type: string;
  properties: Record<string, any>;
  maps?: Record<string, string>;
}

export interface TextureData {
  id: string;
  name: string;
  url: string;
  wrapS: number;
  wrapT: number;
  magFilter: number;
  minFilter: number;
  format: number;
  type: number;
  anisotropy: number;
  encoding: number;
  flipY: boolean;
  generateMipmaps: boolean;
}