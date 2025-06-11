import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { MaterialRenderer } from "./material-compatibility";
import { generateExtrudedArcGeometry } from "@/utils/extruded-arc-generator";

interface ExtrudedArcRendererProps {
  component: ExtrudedArcComponent;
  children?: React.ReactNode;
}

export default function ExtrudedArcRenderer({
  component,
  children,
}: ExtrudedArcRendererProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const props = component.properties;
  
  // Get renderType from component properties like other renderers
  const renderType = props.renderType || "solid";

  const { geometry } = useMemo(() => {
    try {
      const geometry = generateExtrudedArcGeometry(props);
      return { geometry };
    } catch (error) {
      console.warn("Failed to generate extruded arc geometry:", error);
      // Fallback to a simple box geometry
      return { geometry: new THREE.BoxGeometry(1, 0.1, 1) };
    }
  }, [
    props.arcRadius,
    props.pitch,
    props.width,
    props.height,
    props.angle,
    props.segments,
    props.closed,
    props.crossSectionSegments,
    props.extrusionSegments,
    props.uvScale?.x,
    props.uvScale?.y,
    props.flipUVs,
  ]);

  if (!component.enabled) return <>{children}</>;

  return (
    <mesh 
      ref={meshRef} 
      geometry={geometry} 
      castShadow={props.castShadow || false}
      receiveShadow={props.receiveShadow || false}
    >
      <MaterialRenderer 
        component={component as any} 
        renderType={renderType}
      />
      {children}
    </mesh>
  );
} 