import React from 'react';
import { getMaterialComponent } from './material-components';
import { EnhancedMaterial } from './enhanced-material-components';
import useEditorStore from '@/stores/editor-store';

interface NewMaterialProps {
  materialRef: {
    type: 'library' | 'inline';
    materialId?: string;
    properties?: any;
  };
  textures?: Record<string, string>;
  uniforms?: Record<string, any>;
}

// Detect if component uses legacy or new material format
export function isLegacyMaterial(component: GameObjectComponent): boolean {
  const props = component.properties;
  return (
    typeof props.material === 'string' &&
    props.materialProps !== undefined &&
    props.materialRef === undefined
  );
}

// Convert legacy material format to new format
export function migrateLegacyMaterial(component: GameObjectComponent): NewMaterialProps {
  const { material, materialProps = {} } = component.properties;
  
  return {
    materialRef: {
      type: 'inline',
      properties: {
        type: material,
        ...materialProps,
        // Mark as legacy for UI display
        _legacy: true
      }
    }
  };
}

// Component that handles both legacy and new materials
interface MaterialRendererProps {
  component: GameObjectComponent;
  renderType?: string;
}

export function MaterialRenderer({ component, renderType = "solid" }: MaterialRendererProps) {
  const isLegacy = isLegacyMaterial(component);
  const { materials } = useEditorStore();
  
  if (isLegacy) {
    // Handle legacy materials with compatibility layer
    const {
      material = "standard",
      materialProps = {},
    } = component.properties;

    // Apply render type specific properties for legacy materials
    const enhancedMaterialProps = React.useMemo(() => {
      const baseProps = { ...materialProps };
      
      switch (renderType) {
        case "wireframe":
          baseProps.wireframe = true;
          break;
        case "normals":
          return {
            ...baseProps,
            vertexColors: true,
          };
        case "realistic":
          baseProps.envMapIntensity = baseProps.envMapIntensity || 1;
          baseProps.metalness = baseProps.metalness || 0.1;
          baseProps.roughness = baseProps.roughness || 0.3;
          break;
        default:
          break;
      }
      
      return baseProps;
    }, [materialProps, renderType]);

    const effectiveMaterial = renderType === "normals" ? "normal" : material;
    const LegacyMaterialComponent = getMaterialComponent(effectiveMaterial);
    
    return <LegacyMaterialComponent {...enhancedMaterialProps} />;
  } else {
    // Handle new enhanced materials
    const {
      materialRef = { type: 'inline', properties: { type: 'standard', color: '#ffffff' } },
      textures = {},
      uniforms = {},
    } = component.properties;

    // Apply render type modifications to new materials
    const enhancedMaterialRef = React.useMemo(() => {
      if (renderType === "wireframe") {
        return {
          ...materialRef,
          properties: {
            ...materialRef.properties,
            wireframe: true
          }
        };
      }
      
      if (renderType === "normals") {
        return {
          type: 'inline' as const,
          properties: {
            type: 'normal'
          }
        };
      }

      if (renderType === "realistic") {
        return {
          ...materialRef,
          properties: {
            ...materialRef.properties,
            envMapIntensity: materialRef.properties?.envMapIntensity || 1,
            metalness: materialRef.properties?.metalness || 0.1,
            roughness: materialRef.properties?.roughness || 0.3,
          }
        };
      }

      return materialRef;
    }, [materialRef, renderType]);

    // Get textures from the appropriate source
    const textureReferences = React.useMemo(() => {
      if (materialRef.type === 'library' && materialRef.materialId) {
        // Get textures from the material library definition
        const materialDefinition = materials.find(m => m.id === materialRef.materialId);
        return materialDefinition?.textures || [];
      } else {
        // Use textures from component properties or convert from legacy format
        if (Array.isArray(textures)) {
          return textures;
        } else {
          // Convert old format Record<string, string> to TextureReference[]
          return Object.entries(textures).map(([type, assetId]) => ({
            id: `texture_${Date.now()}_${type}`,
            type,
            assetId,
            wrapS: 'repeat',
            wrapT: 'repeat',
            repeat: { x: 1, y: 1 },
            offset: { x: 0, y: 0 },
            rotation: 0,
            flipY: true,
            generateMipmaps: true,
            anisotropy: 1
          }));
        }
      }
    }, [materialRef, textures, materials]);
    
    return (
      <EnhancedMaterial 
        materialRef={enhancedMaterialRef}
        textures={textureReferences}
        uniforms={uniforms}
      />
    );
  }
}

// Utility to get material display name for UI
export function getMaterialDisplayName(component: GameObjectComponent): string {
  if (isLegacyMaterial(component)) {
    const { material = "standard" } = component.properties;
    return `${material} (Legacy)`;
  } else {
    const { materialRef } = component.properties;
    if (materialRef?.type === 'library' && materialRef.materialId) {
      return `Library: ${materialRef.materialId}`;
    } else if (materialRef?.properties?.type) {
      return materialRef.properties.type;
    }
    return 'Unknown';
  }
}

// Utility to upgrade legacy material to new format
export function upgradeMaterialComponent(component: GameObjectComponent): GameObjectComponent {
  if (!isLegacyMaterial(component)) {
    return component; // Already using new format
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { material, materialProps, ...restProps } = component.properties;
  const migratedMaterial = migrateLegacyMaterial(component);

  return {
    ...component,
    properties: {
      ...restProps,
      ...migratedMaterial
    }
  };
} 