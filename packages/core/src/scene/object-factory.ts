import * as THREE from "three";

export interface ObjectData {
  // Three.js standard JSON format
  metadata?: any;
  geometries?: any[];
  materials?: any[];
  textures?: any[];
  images?: any[];
  shapes?: any[];
  skeletons?: any[];
  animations?: any[];
  nodes?: any[];
  object?: any;
}

export class ObjectFactory {
  private static loader = new THREE.ObjectLoader();

  static createObject(data: ObjectData): THREE.Object3D | null {
    try {
      return this.loader.parse(data);
    } catch (error) {
      console.warn('Failed to create object:', error);
      return null;
    }
  }

  static objectToJSON(object: THREE.Object3D): any {
    return object.toJSON();
  }

  static getAvailableGeometryTypes(): string[] {
    return Object.keys(THREE).filter(key => key.endsWith('Geometry'));
  }

  static getAvailableMaterialTypes(): string[] {
    return Object.keys(THREE).filter(key => key.endsWith('Material'));
  }

  static getAvailableObjectTypes(): string[] {
    return ["Mesh", "Group", "AmbientLight", "DirectionalLight", "PointLight"];
  }
} 