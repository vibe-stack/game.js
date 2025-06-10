import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import useEditorStore from "@/stores/editor-store";

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

  // Check if heights need to be generated
  useEffect(() => {
    const needsGeneration = !props.heights || 
                           props.heights.length === 0 || 
                           props.heights[0]?.length === 0 ||
                           (props.heights.length === 1 && props.heights[0].length === 0);
                           
    if (needsGeneration && objectId) {
      updateHeightfieldComponent(objectId, component.id, { lastGenerated: new Date() });
    }
  }, [props.heights, objectId, component.id, updateHeightfieldComponent]);

  const { geometry, displacementTexture } = useMemo(() => {
    const {
      width,
      depth,
      rows,
      columns,
      heights,
      minElevation,
      maxElevation,
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

    const textureSize = 256;
    const textureData = new Uint8Array(textureSize * textureSize);
    const range = maxElevation - minElevation;

    for (let y = 0; y < textureSize; y++) {
      for (let x = 0; x < textureSize; x++) {
        const hx = Math.floor((x * (columns - 1)) / (textureSize - 1));
        const hy = Math.floor((y * (rows - 1)) / (textureSize - 1));
        const height = heights?.[hy]?.[hx] || 0;
        const normalizedHeight =
          range > 0 ? (height - minElevation) / range : 0;
        textureData[y * textureSize + x] = Math.floor(normalizedHeight * 255);
      }
    }

    const displacementTexture = new THREE.DataTexture(
      textureData,
      textureSize,
      textureSize,
      THREE.RedFormat,
    );
    displacementTexture.needsUpdate = true;

    return { geometry, displacementTexture };
  }, [
    props.width,
    props.depth,
    props.rows,
    props.columns,
    props.heights,
    props.minElevation,
    props.maxElevation,
    props.displacementScale,
  ]);

  if (!component.enabled) return <>{children}</>;

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial
        color="#8b7355"
        roughness={0.8}
        metalness={0.0}
        displacementMap={displacementTexture}
        displacementScale={0}
        wireframe={props.wireframe}
      />
      {children}
    </mesh>
  );
}
