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
  onClick?: (event: any) => void;
  onHover?: (event: any) => void;
  onMouseEnter?: (event: any) => void;
  onMouseLeave?: (event: any) => void;
  onPointerDown?: (event: any) => void;
  onPointerUp?: (event: any) => void;
}

export type EntityType = "mesh" | "sphere" | "box" | "mesh3d" | "light" | "camera" | "group" | "primitive";

export interface EntityMetadata {
  type: EntityType;
  created: number;
  updated: number;
  tags: string[];
  layer: number;
} 