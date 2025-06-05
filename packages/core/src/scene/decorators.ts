import 'reflect-metadata';

export interface EditableOptions {
  type?: 'number' | 'string' | 'boolean' | 'vector3' | 'color';
  min?: number;
  max?: number;
  step?: number;
  default?: any;
  label?: string;
  description?: string;
}

export function Editable(options: EditableOptions = {}) {
  return function (target: any, propertyKey: string) {
    const existingMetadata = Reflect.getMetadata('editable:properties', target) || [];
    existingMetadata.push({
      property: propertyKey,
      options
    });
    Reflect.defineMetadata('editable:properties', existingMetadata, target);
  };
}

export function SceneMetadata(metadataPath: string) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
        this.loadMetadata(metadataPath);
      }

      async loadMetadata(path: string) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            const metadata = await response.json();
            (this as any).setMetadata(metadata);
          }
        } catch (error) {
          console.warn(`Could not load metadata from ${path}:`, error);
        }
      }
    };
  };
} 