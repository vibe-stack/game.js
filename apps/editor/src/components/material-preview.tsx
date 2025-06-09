import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface MaterialPreviewProps {
  materialProperties: any;
  size?: number;
  autoRotate?: boolean;
}

function PreviewSphere({ materialProperties }: { materialProperties: any }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  // Create material based on properties
  const createMaterial = () => {
    const { type = 'standard', ...props } = materialProperties;
    
    let material: THREE.Material;
    
    switch (type) {
      case 'basic':
        material = new THREE.MeshBasicMaterial();
        break;
      case 'lambert':
        material = new THREE.MeshLambertMaterial();
        break;
      case 'phong':
        material = new THREE.MeshPhongMaterial();
        break;
      case 'standard':
        material = new THREE.MeshStandardMaterial();
        break;
      case 'physical':
        material = new THREE.MeshPhysicalMaterial();
        break;
      case 'toon':
        material = new THREE.MeshToonMaterial();
        break;
      default:
        material = new THREE.MeshStandardMaterial();
    }

    // Apply common properties
    if (props.color) (material as any).color?.set(props.color);
    if (props.transparent !== undefined) material.transparent = props.transparent;
    if (props.opacity !== undefined) material.opacity = props.opacity;
    if (props.wireframe !== undefined && 'wireframe' in material) {
      (material as any).wireframe = props.wireframe;
    }
    if (props.side !== undefined) material.side = props.side;

    // Apply material-specific properties
    if ('emissive' in material && props.emissive) {
      (material as any).emissive.set(props.emissive);
    }
    if ('emissiveIntensity' in material && props.emissiveIntensity !== undefined) {
      (material as any).emissiveIntensity = props.emissiveIntensity;
    }
    if ('metalness' in material && props.metalness !== undefined) {
      (material as any).metalness = props.metalness;
    }
    if ('roughness' in material && props.roughness !== undefined) {
      (material as any).roughness = props.roughness;
    }
    if ('transmission' in material && props.transmission !== undefined) {
      (material as any).transmission = props.transmission;
    }
    if ('thickness' in material && props.thickness !== undefined) {
      (material as any).thickness = props.thickness;
    }
    if ('ior' in material && props.ior !== undefined) {
      (material as any).ior = props.ior;
    }
    if ('clearcoat' in material && props.clearcoat !== undefined) {
      (material as any).clearcoat = props.clearcoat;
    }
    if ('clearcoatRoughness' in material && props.clearcoatRoughness !== undefined) {
      (material as any).clearcoatRoughness = props.clearcoatRoughness;
    }

    return material;
  };

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 16]} />
      <primitive object={createMaterial()} />
    </mesh>
  );
}

export default function MaterialPreview({ 
  materialProperties, 
  size = 120, 
  autoRotate = true 
}: MaterialPreviewProps) {
  return (
    <div 
      className="border rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800"
      style={{ width: size, height: size }}
    >
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-5, -5, -5]} intensity={0.5} />
        
        <PreviewSphere materialProperties={materialProperties} />
        
        {autoRotate && (
          <OrbitControls 
            enableZoom={false} 
            enablePan={false}
            autoRotate={true}
            autoRotateSpeed={2}
          />
        )}
      </Canvas>
    </div>
  );
} 