import { Helper } from "@react-three/drei";
import React from "react";
import { BoxHelper } from "three/webgpu";
import { getGeometryComponent } from "./geometry-components";
import { MaterialRenderer } from "./material-compatibility";

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
    geometryProps = {},
    castShadow = false,
    receiveShadow = false,
    renderType = "solid"
  } = component.properties;

  if (!component.enabled) return <>{children}</>;

  const GeometryComponent = getGeometryComponent(geometry);

  return (
    <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
      <GeometryComponent {...geometryProps} />
      <MaterialRenderer component={component} renderType={renderType} />
      {showHelpers && (
        <Helper type={BoxHelper} args={[0xffff00]} />
      )}
      {children}
    </mesh>
  );
} 