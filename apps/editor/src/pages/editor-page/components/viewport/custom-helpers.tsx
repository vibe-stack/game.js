import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, PlaneGeometry, Vector3, BufferGeometry, Float32BufferAttribute } from "three";

export function RectAreaLightHelper({
  width = 10,
  height = 10,
  color = "#00ff00",
}: {
  width?: number;
  height?: number;
  color?: string;
}) {
  const meshRef = useRef<Mesh>(null);
  const rayLength = Math.max(width, height) * 0.8;

  const arrowGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    const arrowPoints = [
      new Vector3(0, 0, 0),
      new Vector3(0, 0, -rayLength),
      new Vector3(-0.2, 0, -rayLength + 0.5),
      new Vector3(0, 0, -rayLength),
      new Vector3(0.2, 0, -rayLength + 0.5),
      new Vector3(0, 0, -rayLength),
      new Vector3(0, -0.2, -rayLength + 0.5),
      new Vector3(0, 0, -rayLength),
      new Vector3(0, 0.2, -rayLength + 0.5),
    ];
    
    const positions = new Float32Array(arrowPoints.flatMap(p => [p.x, p.y, p.z]));
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return geometry;
  }, [rayLength]);

  return (
    <group>
      <mesh ref={meshRef}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={2} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new PlaneGeometry(width, height)]} />
        <lineBasicMaterial color={color} />
      </lineSegments>
      <lineSegments geometry={arrowGeometry}>
        <lineBasicMaterial color={color} />
      </lineSegments>
    </group>
  );
}

export function AmbientLightHelper({
  size = 1,
  color = "#ffff00",
}: {
  size?: number;
  color?: string;
}) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.5;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[size * 0.5]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.6} />
    </mesh>
  );
}

export function HemisphereLightHelper({
  size = 1,
  skyColor = "#ffffff",
  groundColor = "#444444",
}: {
  size?: number;
  skyColor?: string;
  groundColor?: string;
}) {
  return (
    <group>
      <mesh position={[0, size * 0.25, 0]}>
        <sphereGeometry
          args={[size * 0.5, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5]}
        />
        <meshBasicMaterial
          color={skyColor}
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh position={[0, -size * 0.25, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry
          args={[size * 0.5, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5]}
        />
        <meshBasicMaterial
          color={groundColor}
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}

export function EmptyObjectHelper({
  size = 0.5,
  color = "#888888",
}: {
  size?: number;
  color?: string;
}) {
  const meshRef = useRef<Mesh>(null);

  const axisGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    const axisPoints = [
      // X axis (red)
      new Vector3(0, 0, 0), new Vector3(size, 0, 0),
      // Y axis (green)
      new Vector3(0, 0, 0), new Vector3(0, size, 0),
      // Z axis (blue)
      new Vector3(0, 0, 0), new Vector3(0, 0, size),
    ];
    
    const positions = new Float32Array(axisPoints.flatMap(p => [p.x, p.y, p.z]));
    const colors = new Float32Array([
      // X axis (red)
      1, 0, 0, 1, 0, 0,
      // Y axis (green)
      0, 1, 0, 0, 1, 0,
      // Z axis (blue)
      0, 0, 1, 0, 0, 1,
    ]);
    
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return geometry;
  }, [size]);

  return (
    <group>
      {/* Small wireframe cube to indicate the object position */}
      <mesh ref={meshRef}>
        <boxGeometry args={[size * 0.4, size * 0.4, size * 0.4]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.4} />
      </mesh>
      {/* Colored axes */}
      <lineSegments geometry={axisGeometry}>
        <lineBasicMaterial vertexColors transparent opacity={0.7} />
      </lineSegments>
    </group>
  );
}
