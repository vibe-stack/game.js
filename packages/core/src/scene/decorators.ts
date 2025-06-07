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
      _metadataPath: string = metadataPath;
      
      constructor(...args: any[]) {
        super(...args);
        // Store the metadata path - loading will happen during init phase
        (this as any)._metadataPath = metadataPath;
      }

      getMetadataPath(): string {
        return this._metadataPath;
      }

      async loadMetadata(metadataPath: string) {
        try {
          const routePath = (this as any).getRoutePath ? (this as any).getRoutePath() : '/';
          
          let actualMetadataPath: string;
          if (routePath === '/') {
            actualMetadataPath = `src/app/${metadataPath}`;
          } else {
            const routeSegments = routePath.split('/').filter((segment: string) => segment);
            actualMetadataPath = `src/app/${routeSegments.join('/')}/${metadataPath}`;
          }
          
          const response = await fetch(actualMetadataPath);
          
          if (response.ok) {
            const metadata = await response.json();
            (this as any).setMetadata(metadata);
          } else {
            const errorText = await response.text();
          }
        } catch (error) {
        }
      }
    };
  };
}