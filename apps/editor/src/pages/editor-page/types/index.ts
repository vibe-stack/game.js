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
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  children?: SceneObject[];
  material?: {
    color?: number;
    opacity?: number;
    transparent?: boolean;
  };
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