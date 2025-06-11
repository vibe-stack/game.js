import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { getGeometryComponent } from './geometry-components';
import useEditorStore from '@/stores/editor-store';

// Enhanced Material Component for React Three Fiber Integration
interface MaterialReference {
  id?: string;
  type: 'library' | 'inline';
  materialId?: string; // For library materials
  properties?: any; // For inline materials
}

interface TextureReference {
  type: string;
  assetId: string;
  wrapS?: string;
  wrapT?: string;
  repeat?: { x: number; y: number };
  offset?: { x: number; y: number };
  rotation?: number;
  flipY?: boolean;
  generateMipmaps?: boolean;
  anisotropy?: number;
}

interface EnhancedMaterialProps {
  materialRef: MaterialReference;
  textures?: TextureReference[]; // Updated to use TextureReference array
  uniforms?: Record<string, any>; // For shader materials
  onMaterialReady?: (material: THREE.Material) => void;
}

// Texture cache to avoid repeated data URL requests
const textureCache = new Map<string, Promise<string | null>>();

// Function to clear texture cache (useful when switching projects)
export function clearTextureCache() {
  textureCache.clear();
}

// Helper hook to load texture data URLs
function useTextureDataUrls(textures: TextureReference[], assets: AssetReference[], currentProject: GameProject | null) {
  const [dataUrls, setDataUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentProject || textures.length === 0) {
      setDataUrls({});
      return;
    }

    setLoading(true);
    
    const loadDataUrls = async () => {
      const urls: Record<string, string> = {};
      
      await Promise.all(
        textures.map(async (textureRef) => {
          const asset = assets.find(a => a.id === textureRef.assetId);
          if (asset) {
            const cacheKey = `${currentProject.path}:${asset.path}`;
            
            // Check cache first
            let dataUrlPromise = textureCache.get(cacheKey);
            if (!dataUrlPromise) {
              dataUrlPromise = window.projectAPI.getAssetDataUrl(currentProject.path, asset.path);
              textureCache.set(cacheKey, dataUrlPromise);
            }
            
            const dataUrl = await dataUrlPromise;
            if (dataUrl) {
              urls[textureRef.type] = dataUrl;
            }
          }
        })
      );
      
      setDataUrls(urls);
      setLoading(false);
    };

    loadDataUrls().catch(error => {
      console.error('Failed to load texture data URLs:', error);
      setLoading(false);
    });
  }, [textures, assets, currentProject]);

  return { dataUrls, loading };
}

export function EnhancedMaterial({ 
  materialRef, 
  textures = [], 
  uniforms = {},
  onMaterialReady 
}: EnhancedMaterialProps) {
  const [material, setMaterial] = useState<THREE.Material | null>(null);
  const { materials, assets, currentProject } = useEditorStore();
  
  // Use ref to avoid dependency issues with callback
  const onMaterialReadyRef = useRef(onMaterialReady);
  onMaterialReadyRef.current = onMaterialReady;
  
  // Load texture data URLs
  const { dataUrls, loading } = useTextureDataUrls(textures, assets, currentProject);
  
  // Memoize dataUrlsArray to prevent unnecessary re-renders
  const dataUrlsArray = useMemo(() => 
    Object.values(dataUrls).filter(Boolean), 
    [dataUrls]
  );
  
  // Memoize the loader input to ensure stability
  const loaderInput = useMemo(() => {
    return dataUrlsArray.length > 0 && !loading ? dataUrlsArray : [];
  }, [dataUrlsArray, loading]);
  
  // Always call useLoader with stable input
  const textureMap = useLoader(THREE.TextureLoader, loaderInput);
  
  const loadedTextures = useMemo(() => {
    if (loading || dataUrlsArray.length === 0 || !textureMap.length) return {};
    
    const result: Record<string, THREE.Texture> = {};
    let textureIndex = 0;
    
    Object.entries(dataUrls).forEach(([type, dataUrl]) => {
      if (dataUrl && textureMap[textureIndex]) {
        // Clone the texture to avoid mutating cached instances
        const originalTexture = textureMap[textureIndex];
        const texture = originalTexture.clone();
        
        // Find the texture reference to apply its settings
        const textureRef = textures.find(t => t.type === type);
        if (textureRef) {
          // Apply texture settings to the cloned texture
          texture.wrapS = getWrapMode(textureRef.wrapS || 'repeat');
          texture.wrapT = getWrapMode(textureRef.wrapT || 'repeat');
          texture.repeat.set(textureRef.repeat?.x || 1, textureRef.repeat?.y || 1);
          texture.offset.set(textureRef.offset?.x || 0, textureRef.offset?.y || 0);
          texture.rotation = textureRef.rotation || 0;
          texture.flipY = textureRef.flipY !== false; // default true
          texture.generateMipmaps = textureRef.generateMipmaps !== false; // default true
          
          if (textureRef.anisotropy) {
            texture.anisotropy = Math.min(textureRef.anisotropy, 16); // Clamp to max supported
          }
        }
        
        result[type] = texture;
        textureIndex++;
      }
    });
    
    return result;
  }, [dataUrls, textureMap, textures, loading, dataUrlsArray]);

  useEffect(() => {
    if (loading) return; // Wait for textures to load
    
    const createMaterial = async () => {
      let mat: THREE.Material;

      if (materialRef.type === 'library' && materialRef.materialId) {
        // Load from material library using editor store
        const materialDefinition = materials.find(m => m.id === materialRef.materialId);
        if (materialDefinition) {
          mat = createInlineMaterial(materialDefinition.properties, loadedTextures, uniforms);
        } else {
          console.warn(`Material not found in library: ${materialRef.materialId}`);
          mat = new THREE.MeshStandardMaterial({ color: '#ff0000' }); // Red to indicate error
        }
      } else if (materialRef.properties) {
        // Create inline material
        mat = createInlineMaterial(materialRef.properties, loadedTextures, uniforms);
      } else {
        mat = new THREE.MeshStandardMaterial();
      }

      setMaterial(mat);
      onMaterialReadyRef.current?.(mat);
    };

    createMaterial();
  }, [materialRef, loadedTextures, uniforms, materials, loading]);

  if (!material || loading) return null;

  return <primitive object={material} />;
}

// Helper function to convert wrap mode strings to THREE.js constants
function getWrapMode(mode: string): THREE.Wrapping {
  switch (mode) {
    case 'repeat': return THREE.RepeatWrapping;
    case 'clampToEdge': return THREE.ClampToEdgeWrapping;
    case 'mirroredRepeat': return THREE.MirroredRepeatWrapping;
    default: return THREE.RepeatWrapping;
  }
}

// Create material from inline properties
function createInlineMaterial(
  properties: any, 
  textures: Record<string, THREE.Texture>,
  uniforms: Record<string, any>
): THREE.Material {
  const { type = 'standard', ...props } = properties;

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
    case 'shader':
      material = new THREE.ShaderMaterial({
        uniforms: {
          ...Object.fromEntries(
            Object.entries(uniforms).map(([key, value]) => [key, { value }])
          ),
          ...Object.fromEntries(
            Object.entries(textures).map(([key, texture]) => [key, { value: texture }])
          )
        },
        vertexShader: props.vertexShader || getDefaultVertexShader(),
        fragmentShader: props.fragmentShader || getDefaultFragmentShader(),
      });
      break;
    default:
      material = new THREE.MeshStandardMaterial();
  }

  // Apply base properties
  applyMaterialProperties(material, props, textures);

  return material;
}

// Apply properties to material based on type
function applyMaterialProperties(
  material: THREE.Material, 
  props: any, 
  textures: Record<string, THREE.Texture>
) {
  // Base material properties
  if (props.transparent !== undefined) material.transparent = props.transparent;
  if (props.opacity !== undefined) material.opacity = props.opacity;
  if (props.alphaTest !== undefined) material.alphaTest = props.alphaTest;
  if (props.side !== undefined) material.side = props.side;
  if (props.visible !== undefined) material.visible = props.visible;
  
  // Wireframe only exists on certain material types
  if ('wireframe' in material && props.wireframe !== undefined) {
    (material as any).wireframe = props.wireframe;
  }

  // Type-specific properties
  if (material instanceof THREE.MeshBasicMaterial) {
    if (props.color) material.color.set(props.color);
    if (textures.color) material.map = textures.color;
  }

  if (material instanceof THREE.MeshLambertMaterial || 
      material instanceof THREE.MeshPhongMaterial ||
      material instanceof THREE.MeshStandardMaterial ||
      material instanceof THREE.MeshPhysicalMaterial) {
    if (props.color) material.color.set(props.color);
    if (props.emissive) material.emissive.set(props.emissive);
    if (props.emissiveIntensity !== undefined) material.emissiveIntensity = props.emissiveIntensity;
    
    if (textures.color) material.map = textures.color;
    if (textures.emissive) material.emissiveMap = textures.emissive;
    if (textures.normal) material.normalMap = textures.normal;
    if (textures.ao) material.aoMap = textures.ao;
  }

  if (material instanceof THREE.MeshPhongMaterial) {
    if (props.specular) material.specular.set(props.specular);
    if (props.shininess !== undefined) material.shininess = props.shininess;
  }

  if (material instanceof THREE.MeshStandardMaterial ||
      material instanceof THREE.MeshPhysicalMaterial) {
    if (props.metalness !== undefined) material.metalness = props.metalness;
    if (props.roughness !== undefined) material.roughness = props.roughness;
    if (props.envMapIntensity !== undefined) material.envMapIntensity = props.envMapIntensity;
    
    if (textures.metalness) material.metalnessMap = textures.metalness;
    if (textures.roughness) material.roughnessMap = textures.roughness;
  }

  if (material instanceof THREE.MeshPhysicalMaterial) {
    // Physical material specific properties
    if (props.clearcoat !== undefined) material.clearcoat = props.clearcoat;
    if (props.clearcoatRoughness !== undefined) material.clearcoatRoughness = props.clearcoatRoughness;
    if (props.ior !== undefined) material.ior = props.ior;
    if (props.reflectivity !== undefined) material.reflectivity = props.reflectivity;
    if (props.transmission !== undefined) material.transmission = props.transmission;
    if (props.thickness !== undefined) material.thickness = props.thickness;
    if (props.attenuationDistance !== undefined) material.attenuationDistance = props.attenuationDistance;
    if (props.attenuationColor) material.attenuationColor.set(props.attenuationColor);
    if (props.specularIntensity !== undefined) material.specularIntensity = props.specularIntensity;
    if (props.specularColor) material.specularColor.set(props.specularColor);
    if (props.iridescence !== undefined) material.iridescence = props.iridescence;
    if (props.iridescenceIOR !== undefined) material.iridescenceIOR = props.iridescenceIOR;
    if (props.sheen !== undefined) material.sheen = props.sheen;
    if (props.sheenColor) material.sheenColor.set(props.sheenColor);
    if (props.sheenRoughness !== undefined) material.sheenRoughness = props.sheenRoughness;

    // Physical material textures
    if (textures.clearcoat) material.clearcoatMap = textures.clearcoat;
    if (textures['clearcoat-normal']) material.clearcoatNormalMap = textures['clearcoat-normal'];
    if (textures['clearcoat-roughness']) material.clearcoatRoughnessMap = textures['clearcoat-roughness'];
    if (textures.transmission) material.transmissionMap = textures.transmission;
    if (textures.thickness) material.thicknessMap = textures.thickness;
    if (textures.iridescence) material.iridescenceMap = textures.iridescence;
    if (textures['iridescence-thickness']) material.iridescenceThicknessMap = textures['iridescence-thickness'];
    if (textures.sheen) material.sheenColorMap = textures.sheen;
    if (textures['specular-intensity']) material.specularIntensityMap = textures['specular-intensity'];
    if (textures['specular-color']) material.specularColorMap = textures['specular-color'];
  }
}

// Default shaders for custom materials
function getDefaultVertexShader(): string {
  return `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
}

function getDefaultFragmentShader(): string {
  return `
    varying vec2 vUv;
    
    void main() {
      gl_FragColor = vec4(vUv, 0.5, 1.0);
    }
  `;
}

// Updated mesh renderer component using enhanced materials
interface EnhancedMeshRendererProps {
  component: any; // GameObjectComponent
  children?: React.ReactNode;
}

export function EnhancedMeshRenderer({ 
  component, 
  children
}: EnhancedMeshRendererProps) {
  const {
    geometry = "box",
    materialRef = { type: 'inline', properties: { type: 'standard', color: '#ffffff' } },
    textures = {},
    uniforms = {},
    geometryProps = {},
    castShadow = false,
    receiveShadow = false,
  } = component.properties;

  if (!component.enabled) return <>{children}</>;

  // Get geometry component (reuse existing logic)
  const GeometryComponent = getGeometryComponent(geometry);

  return (
    <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
      <GeometryComponent {...geometryProps} />
      <EnhancedMaterial 
        materialRef={materialRef}
        textures={textures}
        uniforms={uniforms}
      />
      {children}
    </mesh>
  );
}

// Material presets for quick access
export const MaterialPresets = {
  // PBR Materials
  chrome: {
    id: 'chrome-preset',
    type: 'inline' as const,
    properties: {
      type: 'physical',
      color: '#ffffff',
      metalness: 1.0,
      roughness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      ior: 1.5
    }
  },
  
  gold: {
    id: 'gold-preset',
    type: 'inline' as const,
    properties: {
      type: 'physical',
      color: '#ffd700',
      metalness: 1.0,
      roughness: 0.1,
      clearcoat: 0.3,
      clearcoatRoughness: 0.1
    }
  },

  glass: {
    id: 'glass-preset',
    type: 'inline' as const,
    properties: {
      type: 'physical',
      color: '#ffffff',
      metalness: 0.0,
      roughness: 0.0,
      transmission: 1.0,
      thickness: 0.5,
      ior: 1.52,
      transparent: true,
      opacity: 0.1
    }
  },

  // TSL Shader Example
  detailMapped: {
    id: 'detail-mapped-preset',
    type: 'inline' as const,
    properties: {
      type: 'shader',
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          vUv = uv;
          vPosition = position;
          vNormal = normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D baseTexture;
        uniform sampler2D detailTexture;
        uniform float detailScale;
        
        varying vec2 vUv;
        
        void main() {
          vec4 baseColor = texture2D(baseTexture, vUv);
          vec4 detailColor = texture2D(detailTexture, vUv * detailScale);
          
          // Simple multiply blend
          gl_FragColor = baseColor * detailColor;
        }
      `
    }
  }
};

// Usage example component
export function MaterialShowcase() {
  return (
    <group>
      {/* Chrome sphere */}
      <mesh position={[-2, 0, 0]}>
        <sphereGeometry />
        <EnhancedMaterial materialRef={MaterialPresets.chrome} />
      </mesh>

      {/* Gold cube */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry />
        <EnhancedMaterial materialRef={MaterialPresets.gold} />
      </mesh>

      {/* Glass torus */}
      <mesh position={[2, 0, 0]}>
        <torusGeometry />
        <EnhancedMaterial materialRef={MaterialPresets.glass} />
      </mesh>
    </group>
  );
} 