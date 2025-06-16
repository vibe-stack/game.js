export { GameWorld } from "./game-world";
export { Entity } from "./entity";
export { Registry, RegistryManager } from "./registry";
export { StateManager, createStateHook, createStateSelector } from "./state-manager";
export { PhysicsManager } from "./physics-manager";
export { InteractionManager, InteractiveObject, InteractiveEvent } from "./interaction-manager";
export { CameraManager } from "./camera-manager";
export { CameraControlManager } from "./camera-control-manager";

// Enhanced systems
export { InputManager } from "./input-manager";
export { AssetManager } from "./asset-manager";
export { SceneManager } from "./scene-manager";
export { SoundManager } from "./sound-manager";

export { Sphere } from "./primitives/sphere";
export { Box } from "./primitives/box";
export { Mesh3D } from "./primitives/mesh-3d";

export type {
  PhysicsConfig,
  TweenConfig,
  EntityConfig,
  GameConfig,
  RegistryItem,
  StateSubscriber,
  GameState,
  InteractionCallbacks,
  EntityType,
  EntityMetadata,
} from "./types";

// Input system types
export type {
  InputState,
  InputBinding,
  InputSource,
  TouchData,
  GamepadState,
  VirtualControlState,
} from "./input-manager";

// Asset system types
export type {
  AssetManifest,
  MaterialDefinition,
  LoadingProgress,
  AssetData,
} from "./asset-manager";

// Scene system types
export type {
  SceneConfig,
  SceneTransition,
  SceneData,
} from "./scene-manager";

// Sound system types
export type {
  SoundConfig,
  SoundInstance,
  AudioCategory,
} from "./sound-manager";

export type { 
  CameraConfig, 
  CameraTransitionConfig 
} from "./camera-manager";

export type { 
  CameraControlConfig, 
  CameraControlInfo 
} from "./camera-control-manager";

export type { SphereConfig } from "./primitives/sphere";
export type { BoxConfig } from "./primitives/box";
export type { Mesh3DConfig } from "./primitives/mesh-3d"; 