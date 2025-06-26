import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import useGameStudioStore from '@/stores/game-studio-store';

interface MaterialPreviewProps {
  materialProperties: any;
  size?: number;
  autoRotate?: boolean;
}

function PreviewSphere({ materialProperties }: { materialProperties: any }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [material, setMaterial] = useState<THREE.Material | null>(null);
  const { currentProject } = useGameStudioStore();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  // Create material with textures
  useEffect(() => {
    const createMaterial = async () => {
      const { type = 'standard', ...props } = materialProperties;
      
      let newMaterial: THREE.Material;
      
      switch (type) {
        case 'basic':
          newMaterial = new THREE.MeshBasicMaterial();
          break;
        case 'lambert':
          newMaterial = new THREE.MeshLambertMaterial();
          break;
        case 'phong':
          newMaterial = new THREE.MeshPhongMaterial();
          break;
        case 'standard':
          newMaterial = new THREE.MeshStandardMaterial();
          break;
        case 'physical':
          newMaterial = new THREE.MeshPhysicalMaterial();
          break;
        case 'toon':
          newMaterial = new THREE.MeshToonMaterial();
          break;
        default:
          newMaterial = new THREE.MeshStandardMaterial();
      }

      // Apply common properties
      if (props.color) (newMaterial as any).color?.set(props.color);
      if (props.transparent !== undefined) newMaterial.transparent = props.transparent;
      if (props.opacity !== undefined) newMaterial.opacity = props.opacity;
      if (props.wireframe !== undefined && 'wireframe' in newMaterial) {
        (newMaterial as any).wireframe = props.wireframe;
      }
      if (props.side !== undefined) newMaterial.side = props.side;

      // Apply material-specific properties
      if ('emissive' in newMaterial && props.emissive) {
        (newMaterial as any).emissive.set(props.emissive);
      }
      if ('emissiveIntensity' in newMaterial && props.emissiveIntensity !== undefined) {
        (newMaterial as any).emissiveIntensity = props.emissiveIntensity;
      }
      if ('metalness' in newMaterial && props.metalness !== undefined) {
        (newMaterial as any).metalness = props.metalness;
      }
      if ('roughness' in newMaterial && props.roughness !== undefined) {
        (newMaterial as any).roughness = props.roughness;
      }
      if ('transmission' in newMaterial && props.transmission !== undefined) {
        (newMaterial as any).transmission = props.transmission;
      }
      if ('thickness' in newMaterial && props.thickness !== undefined) {
        (newMaterial as any).thickness = props.thickness;
      }
      if ('ior' in newMaterial && props.ior !== undefined) {
        (newMaterial as any).ior = props.ior;
      }
      if ('clearcoat' in newMaterial && props.clearcoat !== undefined) {
        (newMaterial as any).clearcoat = props.clearcoat;
      }
      if ('clearcoatRoughness' in newMaterial && props.clearcoatRoughness !== undefined) {
        (newMaterial as any).clearcoatRoughness = props.clearcoatRoughness;
      }

      // Load and apply textures
      const texturePromises: Promise<void>[] = [];

      const loadTexture = async (propName: string, materialProp: string) => {
        if (props[propName] && currentProject) {
          try {
            const textureUrl = await window.projectAPI.getAssetUrl(currentProject.path, props[propName]);
            if (!textureUrl) return;
            const texture = await new Promise<THREE.Texture>((resolve, reject) => {
              new THREE.TextureLoader().load(textureUrl, resolve, undefined, reject);
            });
            
                         // Apply UV properties
             const uvProps = props[`${propName}Props`] || {};
             // Handle both 'scale' and 'repeat' for UV scaling (scale is the new standard)
             const uvScale = uvProps.scale || uvProps.repeat;
             if (uvScale) {
               texture.repeat.set(uvScale.x, uvScale.y);
             }
            if (uvProps.offset) {
              texture.offset.set(uvProps.offset.x, uvProps.offset.y);
            }
            if (uvProps.rotation) {
              texture.rotation = uvProps.rotation;
            }
            
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.needsUpdate = true;
            
            (newMaterial as any)[materialProp] = texture;
          } catch (error) {
            console.warn(`Failed to load texture ${propName}:`, error);
          }
        }
      };

      // Load all texture types
      texturePromises.push(loadTexture('map', 'map')); // Base color/diffuse
      texturePromises.push(loadTexture('normalMap', 'normalMap'));
      texturePromises.push(loadTexture('roughnessMap', 'roughnessMap'));
      texturePromises.push(loadTexture('metalnessMap', 'metalnessMap'));
      texturePromises.push(loadTexture('aoMap', 'aoMap'));
      texturePromises.push(loadTexture('emissiveMap', 'emissiveMap'));
      texturePromises.push(loadTexture('envMap', 'envMap'));
      texturePromises.push(loadTexture('displacementMap', 'displacementMap'));
      texturePromises.push(loadTexture('alphaMap', 'alphaMap'));
      texturePromises.push(loadTexture('bumpMap', 'bumpMap'));

      await Promise.all(texturePromises);

      // Apply texture-related properties
      if (props.normalScale && 'normalScale' in newMaterial) {
        (newMaterial as any).normalScale.set(props.normalScale, props.normalScale);
      }
      if (props.aoMapIntensity !== undefined && 'aoMapIntensity' in newMaterial) {
        (newMaterial as any).aoMapIntensity = props.aoMapIntensity;
      }

      newMaterial.needsUpdate = true;
      setMaterial(newMaterial);
    };

    createMaterial();
    
    // Cleanup
    return () => {
      if (material) {
        // Dispose of textures
        Object.values(material).forEach(value => {
          if (value instanceof THREE.Texture) {
            value.dispose();
          }
        });
        material.dispose();
      }
    };
  }, [materialProperties, currentProject]);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 16]} />
      {material && <primitive object={material} />}
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