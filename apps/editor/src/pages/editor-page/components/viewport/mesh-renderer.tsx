import { Helper } from "@react-three/drei";
import React from "react";
import { BoxHelper } from "three/webgpu";
import { getGeometryComponent } from "./geometry-components";
import { getMaterialComponent } from "./material-components";

interface ComponentRendererProps {
  component: GameObjectComponent;
  children?: React.ReactNode;
  showHelpers?: boolean;
}

export function MeshRenderer({ 
  component, 
  children, 
  showHelpers = false 
}: ComponentRendererProps) {
  const {
    geometry = "box",
    material = "standard",
    materialProps = {},
    geometryProps = {},
    castShadow = false,
    receiveShadow = false,
    renderType = "solid"
  } = component.properties;

  if (!component.enabled) return <>{children}</>;

  const GeometryComponent = getGeometryComponent(geometry);

  // Apply render type specific properties
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
          // Use a normal material for debugging
        };
      case "realistic":
        // Enhanced realistic rendering
        baseProps.envMapIntensity = baseProps.envMapIntensity || 1;
        baseProps.metalness = baseProps.metalness || 0.1;
        baseProps.roughness = baseProps.roughness || 0.3;
        break;
      case "solid":
      default:
        // Keep default solid rendering
        break;
    }
    
    return baseProps;
  }, [materialProps, renderType]);

  const effectiveMaterial = renderType === "normals" ? "normal" : material;
  const EffectiveMaterialComponent = getMaterialComponent(effectiveMaterial);

  return (
    <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
      <GeometryComponent {...geometryProps} />
      <EffectiveMaterialComponent {...enhancedMaterialProps} />
      {showHelpers && (
        <Helper type={BoxHelper} args={[0xffff00]} />
      )}
      {children}
    </mesh>
  );
} 