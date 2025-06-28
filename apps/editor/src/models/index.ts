export { GameWorld } from "./game-world";
export { Entity } from "./entity";
export { Registry, RegistryManager } from "./registry";
export { StateManager, createStateHook, createStateSelector } from "./state-manager";
export { PhysicsManager } from "./physics-manager";
export { DebugRenderer } from "./debug-renderer";
export { InteractionManager, InteractiveObject, InteractiveEvent } from "./interaction-manager";
export { CameraManager } from "./camera-manager";
export { CameraControlManager } from "./camera-control-manager";

// Enhanced systems
export { InputManager } from "./input-manager";
export { AssetManager } from "./asset-manager";
export { SceneManager } from "./scene-manager";
export { SoundManager } from "./sound-manager";

// Asset Pipeline System
export { 
  AssetPipeline,
  DEFAULT_PIPELINE_CONFIG,
  DEFAULT_STREAMING_CONFIG 
} from "./asset-pipeline";

// Scene Loader System
export { 
  SceneLoader,
  EntityLoader,
  CameraLoader,
  LightingLoader,
  PhysicsLoader,
  SceneSerializer,
} from "./scene-loader";

// Script System
export {
  ScriptManager,
  type ScriptLifecycle,
  type ScriptContext,
  type ScriptConfig,
  type CompiledScript,
  type EntityScriptBinding,
  type ScriptParameter,
  type EntityScriptParameters,
} from "./script-manager";

// Example Scripts
export {
  EXAMPLE_SCRIPTS,
  getExampleScript,
  getExampleScriptIds,
  loadExampleScripts,
} from "./example-scripts";

// Shader System
export {
  ShaderManager,
  shaderManager,
  TSLShader
} from "./shader-manager";

// Example Shaders
export {
  EXAMPLE_SHADERS,
  getExampleShader,
  getExampleShaderIds,
  loadExampleShaders,
} from "./example-shaders";

// Character controller
export { 
  CharacterController,
  FPS_CHARACTER_CONFIG,
  THIRD_PERSON_CHARACTER_CONFIG,
  PLATFORMER_CHARACTER_CONFIG 
} from "./character-controller";

// Basic primitives
export { Sphere } from "./primitives/sphere";
export { Box } from "./primitives/box";
export { Mesh3D } from "./primitives/mesh-3d";

// Terrain primitives
export { Heightfield } from "./primitives/heightfield";
export { CustomHeightfield } from "./primitives/custom-heightfield";

// Extended primitives
export { Cylinder } from "./primitives/cylinder";
export { Plane } from "./primitives/plane";
export { Cone } from "./primitives/cone";
export { Torus } from "./primitives/torus";
export { Capsule } from "./primitives/capsule";
export { Ring } from "./primitives/ring";

// Light primitives
export { 
  Light, 
  AmbientLight, 
  DirectionalLight, 
  PointLight, 
  SpotLight 
} from "./primitives/light";

// Camera primitives
export { 
  Camera, 
  PerspectiveCamera, 
  OrthographicCamera 
} from "./primitives/camera";

// Polyhedron primitives
export { 
  Tetrahedron, 
  Octahedron, 
  Dodecahedron, 
  Icosahedron 
} from "./primitives/polyhedron";

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

// Asset Pipeline types
export type {
  AssetPipelineConfig,
  StreamingConfig,
  AssetStreamingState,
  StreamingAsset,
  AssetBundle,
  PipelineMetrics,
} from "./asset-pipeline";

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
  CameraTransitionConfig,
  CameraFollowConfig
} from "./camera-manager";

export type {
  CameraControlConfig,
  CameraControlInfo
} from "./camera-control-manager";

// Character controller types
export type {
  CharacterControllerConfig,
  CharacterState
} from "./character-controller";

// Scene Loader types  
export type {
  EntityData,
  CameraData,
  LightingData,
  PhysicsData,
  LoaderContext,
} from "./scene-loader";

// Basic primitive types
export type { SphereConfig } from "./primitives/sphere";
export type { BoxConfig } from "./primitives/box";
export type { Mesh3DConfig } from "./primitives/mesh-3d";

// Terrain primitive types
export type { HeightfieldConfig } from "./primitives/heightfield";
export type { CustomHeightfieldConfig, HeightfieldEdit, HeightfieldRegion } from "./primitives/custom-heightfield";

// Extended primitive types
export type { CylinderConfig } from "./primitives/cylinder";
export type { PlaneConfig } from "./primitives/plane";
export type { ConeConfig } from "./primitives/cone";
export type { TorusConfig } from "./primitives/torus";
export type { CapsuleConfig } from "./primitives/capsule";
export type { RingConfig } from "./primitives/ring";

// Light primitive types
export type { LightConfig } from "./primitives/light";

// Camera primitive types
export type { CameraEntityConfig } from "./primitives/camera";

// Polyhedron primitive types
export type { 
  PolyhedronConfig,
  TetrahedronConfig, 
  OctahedronConfig, 
  DodecahedronConfig, 
  IcosahedronConfig 
} from "./primitives/polyhedron";

// Shader types
export type {
  ShaderType,
  ShaderParameter,
  TSLShaderConfig,
  TSLNodeDefinition,
  TSLPortDefinition,
  TSLConnectionDefinition,
  CompiledShader,
  ShaderContext
} from "./types"; 