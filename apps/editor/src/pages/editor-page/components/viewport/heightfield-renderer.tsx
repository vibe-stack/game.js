import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import useEditorStore from "@/stores/editor-store";
import { MaterialRenderer } from "./material-compatibility";

interface HeightfieldRendererProps {
  component: HeightfieldComponent;
  objectId?: string;
  children?: React.ReactNode;
}

export default function HeightfieldRenderer({
  component,
  objectId,
  children,
}: HeightfieldRendererProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { updateHeightfieldComponent } = useEditorStore();
  const props = component.properties;
  
  // Get renderType from component properties like MeshRenderer does
  const renderType = props.renderType || "solid";

  // Check if heights need to be generated
  useEffect(() => {
    const needsGeneration =
      !props.heights ||
      props.heights.length === 0 ||
      props.heights[0]?.length === 0 ||
      (props.heights.length === 1 && props.heights[0].length === 0);

    if (needsGeneration && objectId) {
      updateHeightfieldComponent(objectId, component.id, {
        lastGenerated: new Date(),
      });
    }
  }, [props.heights, objectId, component.id, updateHeightfieldComponent]);

  const { geometry } = useMemo(() => {
    const {
      width,
      depth,
      rows,
      columns,
      heights,
      displacementScale,
    } = props;

    const geometry = new THREE.PlaneGeometry(
      width,
      depth,
      columns - 1,
      rows - 1,
    );
    const positionAttribute = geometry.attributes.position;
    const vertices = positionAttribute.array as Float32Array;

    if (heights && heights.length > 0 && heights[0].length > 0) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
          const index = y * columns + x;
          const vertexIndex = index * 3;
          vertices[vertexIndex + 2] = heights[y][x] * displacementScale;
        }
      }
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();

    return { geometry };
  }, [
    props.width,
    props.depth,
    props.rows,
    props.columns,
    props.heights,
    props.displacementScale,
  ]);

  if (!component.enabled) return <>{children}</>;

  return (
    <mesh 
      ref={meshRef} 
      geometry={geometry} 
      rotation={[-Math.PI / 2, 0, 0]}
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
