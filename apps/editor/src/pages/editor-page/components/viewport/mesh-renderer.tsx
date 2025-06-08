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
  } = component.properties;

  if (!component.enabled) return <>{children}</>;

  const GeometryComponent = getGeometryComponent(geometry);
  const MaterialComponent = getMaterialComponent(material);

  return (
    <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
      <GeometryComponent {...geometryProps} />
      <MaterialComponent {...materialProps} />
      {showHelpers && (
        <Helper type={BoxHelper} args={[0xffff00]} />
      )}
      {children}
    </mesh>
  );
} 