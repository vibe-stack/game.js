import React from 'react';
import { getMaterialComponent } from './material-components';
import { EnhancedMaterial } from './enhanced-material-components';

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
    
    return (
      <EnhancedMaterial 
        materialRef={enhancedMaterialRef}
        textures={textures}
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

  const { material: _material, materialProps: _materialProps, ...restProps } = component.properties;
  const migratedMaterial = migrateLegacyMaterial(component);

  return {
    ...component,
    properties: {
      ...restProps,
      ...migratedMaterial
    }
  };
} 