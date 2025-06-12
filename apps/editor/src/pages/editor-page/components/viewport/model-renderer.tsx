import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import useEditorStore from '@/stores/editor-store';
import { MaterialRenderer } from './material-compatibility';

interface ModelRendererProps {
  component: GameObjectComponent;
  children?: React.ReactNode;
}

function ModelLoader({ 
  url, 
  scale = [1, 1, 1], 
  component, 
  renderType = "solid" 
}: { 
  url: string; 
  scale?: [number, number, number]; 
  component: GameObjectComponent;
  renderType?: string;
}) {
  const { scene } = useGLTF(url);
  
  const processedModel = useMemo(() => {
    const cloned = scene.clone();
    
    // Collect all meshes from the model with their world transforms
    const meshes: Array<{ mesh: THREE.Mesh; worldMatrix: THREE.Matrix4 }> = [];
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Update world matrix to get proper transform
        child.updateMatrixWorld(true);
        meshes.push({ 
          mesh: child, 
          worldMatrix: child.matrixWorld.clone() 
        });
      }
    });
    
    return meshes;
  }, [scene]);
  
  return (
    <group scale={scale}>
      {/* Render each mesh with custom material */}
      {processedModel.map((item, index) => (
        <mesh
          key={index}
          geometry={item.mesh.geometry}
          matrix={item.worldMatrix}
          matrixAutoUpdate={false}
          castShadow={component.properties.castShadow || false}
          receiveShadow={component.properties.receiveShadow || false}
        >
          <MaterialRenderer component={component} renderType={renderType} />
        </mesh>
      ))}
    </group>
  );
}

function Model({ 
  assetPath, 
  scale = [1, 1, 1], 
  component, 
  renderType = "solid" 
}: { 
  assetPath: string; 
  scale?: [number, number, number]; 
  component: GameObjectComponent;
  renderType?: string;
}) {
  const { currentProject } = useEditorStore();
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!currentProject || !assetPath) {
      setModelUrl(null);
      setLoading(false);
      return;
    }

    const loadAssetUrl = async () => {
      try {
        setLoading(true);
        // Use getAssetUrl which handles both single files (GLB) and multi-file formats (GLTF+bin)
        const url = await window.projectAPI.getAssetUrl(currentProject.path, assetPath);
        setModelUrl(url);
      } catch (error) {
        console.error('Failed to load asset URL:', error);
        setModelUrl(null);
      } finally {
        setLoading(false);
      }
    };

    loadAssetUrl();
  }, [currentProject, assetPath]);
  
  if (loading || !modelUrl) {
    return null; // Will show fallback from Suspense
  }
  
  return <ModelLoader url={modelUrl} scale={scale} component={component} renderType={renderType} />;
}

export function ModelRenderer({ 
  component,
  children
}: ModelRendererProps) {
  const { assets } = useEditorStore();
  const {
    geometryProps = {},
    castShadow = false,
    receiveShadow = false,
    renderType = "solid"
  } = component.properties;

  if (!component.enabled) return <>{children}</>;

  const assetId = geometryProps.assetId;
  const assetPath = geometryProps.assetPath;
  
  // Find the asset to get its path
  const asset = assetId ? assets.find(a => a.id === assetId) : null;
  const modelPath = asset?.path || assetPath;

  if (!modelPath) {
    // Fallback to a box if no model is specified
    return (
      <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
        <boxGeometry args={[1, 1, 1]} />
        <MaterialRenderer component={component} renderType={renderType} />
        {children}
      </mesh>
    );
  }

  return (
    <Suspense fallback={
      <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
        <boxGeometry args={[1, 1, 1]} />
        <MaterialRenderer component={component} renderType={renderType} />
      </mesh>
    }>
      <group>
        <Model 
          assetPath={modelPath}
          scale={[
            geometryProps.scale?.x || 1,
            geometryProps.scale?.y || 1,
            geometryProps.scale?.z || 1
          ]}
          component={component}
          renderType={renderType}
        />
        {children}
      </group>
    </Suspense>
  );
} 