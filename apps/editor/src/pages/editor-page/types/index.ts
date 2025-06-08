export interface GameProject {
  name: string;
  path: string;
}

export interface DevServerInfo {
  url?: string;
  port?: number;
}

export interface SceneRoute {
  path: string;
  filePath: string;
  name: string;
}

export interface SceneObject {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  matrix?: number[];
  children?: SceneObject[];
  material?: {
    color?: number;
    opacity?: number;
    transparent?: boolean;
  };
}

export interface SceneGeometry {
  uuid: string;
  type: 'BoxGeometry' | 'SphereGeometry' | 'CylinderGeometry' | 'PlaneGeometry' | 'TorusGeometry';
  // Common geometry properties
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  radiusTop?: number;
  radiusBottom?: number;
  widthSegments?: number;
  heightSegments?: number;
  depthSegments?: number;
  radialSegments?: number;
  tube?: number;
  tubularSegments?: number;
  arc?: number;
}

export interface SceneMaterial {
  uuid: string;
  type: 'MeshBasicMaterial' | 'MeshPhongMaterial' | 'MeshStandardMaterial' | 'MeshLambertMaterial';
  color?: number;
  transparent?: boolean;
  opacity?: number;
  wireframe?: boolean;
  roughness?: number;
  metalness?: number;
  emissive?: number;
  specular?: number;
  shininess?: number;
}

export interface SceneDefinition {
  metadata: {
    version: number;
    type: string;
    generator: string;
  };
  geometries: SceneGeometry[];
  materials: SceneMaterial[];
  object: {
    uuid: string;
    type: string;
    name: string;
    children: SceneObjectDefinition[];
  };
}

export interface SceneObjectDefinition {
  uuid: string;
  type: string;
  name: string;
  geometry?: string;
  material?: string;
  matrix?: number[];
  children?: SceneObjectDefinition[];
}

export interface SceneEditorData {
  debugScene: string;
  color?: string; // scene background color
  scene: SceneDefinition;
}

export interface ObjectCreateOptions {
  type: 'Mesh';
  geometry: {
    type: 'BoxGeometry' | 'SphereGeometry' | 'CylinderGeometry' | 'PlaneGeometry' | 'TorusGeometry';
    width?: number;
    height?: number;
    depth?: number;
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    depthSegments?: number;
    radiusTop?: number;
    radiusBottom?: number;
    radialSegments?: number;
    tube?: number;
    tubularSegments?: number;
    arc?: number;
  };
  material: {
    type: 'MeshBasicMaterial' | 'MeshPhongMaterial' | 'MeshStandardMaterial' | 'MeshLambertMaterial';
    color?: number;
    transparent?: boolean;
    opacity?: number;
    wireframe?: boolean;
    roughness?: number;
    metalness?: number;
    emissive?: number;
    specular?: number;
    shininess?: number;
  };
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
} 