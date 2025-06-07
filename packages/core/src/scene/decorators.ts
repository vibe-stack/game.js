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
        setTimeout(() => this.loadMetadata(metadataPath), 0);
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
          
          console.log(`🔍 Scene attempting to load metadata from: ${actualMetadataPath}`);
          console.log(`🌐 Current window location: ${window.location.href}`);
          console.log(`🛣️ Route path: ${routePath}`);
          console.log(`📂 Resolved fetch URL will be: ${new URL(actualMetadataPath, window.location.href).href}`);
          
          const response = await fetch(actualMetadataPath);
          console.log(`📡 Fetch response status: ${response.status} for ${actualMetadataPath}`);
          
          if (response.ok) {
            const metadata = await response.json();
            console.log(`✅ Successfully loaded metadata:`, metadata);
            (this as any).setMetadata(metadata);
          } else {
            console.warn(`❌ Failed to fetch metadata from ${actualMetadataPath}: HTTP ${response.status}`);
          }
        } catch (error) {
          console.warn(`Could not load metadata from ${metadataPath}:`, error);
        }
      }
    };
  };
} 