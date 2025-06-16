export { GameWorld } from "./game-world";
export { Entity } from "./entity";
export { Registry, RegistryManager } from "./registry";
export { StateManager, createStateHook, createStateSelector } from "./state-manager";
export { PhysicsManager } from "./physics-manager";
export { InteractionManager, InteractiveObject, InteractiveEvent } from "./interaction-manager";

export { Sphere } from "./primitives/sphere";
export { Box } from "./primitives/box";

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

export type { SphereConfig } from "./primitives/sphere";
export type { BoxConfig } from "./primitives/box"; 