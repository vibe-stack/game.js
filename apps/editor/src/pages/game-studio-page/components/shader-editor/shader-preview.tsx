import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three/webgpu';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { shaderManager } from '@/models';

interface ShaderPreviewProps {
  shaderId: string;
}

type PreviewShape = 'sphere' | 'cube' | 'plane' | 'torus' | 'torusKnot';

function PreviewMesh({ shaderId, shape }: { shaderId: string; shape: PreviewShape }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [material, setMaterial] = useState<THREE.Material | null>(null);

  useEffect(() => {
    const loadShader = async () => {
      try {
        const compiled = await shaderManager.compileShader(shaderId);
        if (compiled.material) {
          setMaterial(compiled.material);
        }
      } catch (error) {
        console.error('Failed to compile shader for preview:', error);
      }
    };

    loadShader();

    // Listen for shader updates
    const handleShaderUpdated = (updatedShaderId: string) => {
      if (updatedShaderId === shaderId) {
        loadShader();
      }
    };

    shaderManager.on('shader:updated', handleShaderUpdated);
    shaderManager.on('shader:compiled', handleShaderUpdated);

    return () => {
      shaderManager.off('shader:updated', handleShaderUpdated);
      shaderManager.off('shader:compiled', handleShaderUpdated);
    };
  }, [shaderId]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  const geometry = React.useMemo(() => {
    switch (shape) {
      case 'sphere':
        return new THREE.SphereGeometry(1, 32, 32);
      case 'cube':
        return new THREE.BoxGeometry(1.5, 1.5, 1.5);
      case 'plane':
        return new THREE.PlaneGeometry(2, 2);
      case 'torus':
        return new THREE.TorusGeometry(1, 0.4, 16, 100);
      case 'torusKnot':
        return new THREE.TorusKnotGeometry(0.8, 0.3, 100, 16);
      default:
        return new THREE.SphereGeometry(1, 32, 32);
    }
  }, [shape]);

  if (!material) {
    return (
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial color="#888888" />
      </mesh>
    );
  }

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}

export function ShaderPreview({ shaderId }: ShaderPreviewProps) {
  const [previewShape, setPreviewShape] = useState<PreviewShape>('sphere');

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <Label htmlFor="preview-shape">Preview Shape</Label>
        <Select value={previewShape} onValueChange={(v) => setPreviewShape(v as PreviewShape)}>
          <SelectTrigger id="preview-shape">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sphere">Sphere</SelectItem>
            <SelectItem value="cube">Cube</SelectItem>
            <SelectItem value="plane">Plane</SelectItem>
            <SelectItem value="torus">Torus</SelectItem>
            <SelectItem value="torusKnot">Torus Knot</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="flex-1 overflow-hidden">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          style={{ background: '#1a1a1a' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <PreviewMesh shaderId={shaderId} shape={previewShape} />
          <OrbitControls enablePan={false} />
        </Canvas>
      </Card>
    </div>
  );
} 