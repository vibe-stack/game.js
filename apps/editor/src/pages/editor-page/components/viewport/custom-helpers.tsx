import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, PlaneGeometry } from "three";

export function RectAreaLightHelper({ 
  width = 10, 
  height = 10, 
  color = "#ffff00" 
}: { 
  width?: number; 
  height?: number; 
  color?: string; 
}) {
  const meshRef = useRef<Mesh>(null);

  return (
    <group>
      <mesh ref={meshRef}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.3} 
          side={2}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new PlaneGeometry(width, height)]} />
        <lineBasicMaterial color={color} />
      </lineSegments>
    </group>
  );
}

export function AmbientLightHelper({ 
  size = 1, 
  color = "#ffff00" 
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
      <meshBasicMaterial 
        color={color} 
        wireframe 
        transparent 
        opacity={0.6}
      />
    </mesh>
  );
}

export function HemisphereLightHelper({ 
  size = 1, 
  skyColor = "#ffffff", 
  groundColor = "#444444" 
}: { 
  size?: number; 
  skyColor?: string; 
  groundColor?: string; 
}) {
  return (
    <group>
      <mesh position={[0, size * 0.25, 0]}>
        <sphereGeometry args={[size * 0.5, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshBasicMaterial 
          color={skyColor} 
          wireframe 
          transparent 
          opacity={0.6}
        />
      </mesh>
      <mesh position={[0, -size * 0.25, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[size * 0.5, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
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