import React, { useEffect, useState, useMemo } from 'react';
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

interface EnhancedMaterialProps {
  materialRef: MaterialReference;
  textures?: Record<string, string>; // texture type -> asset path
  uniforms?: Record<string, any>; // For shader materials
  onMaterialReady?: (material: THREE.Material) => void;
}

export function EnhancedMaterial({ 
  materialRef, 
  textures = {}, 
  uniforms = {},
  onMaterialReady 
}: EnhancedMaterialProps) {
  const [material, setMaterial] = useState<THREE.Material | null>(null);
  const { materials } = useEditorStore();
  
  // Load textures
  const textureMap = useLoader(
    THREE.TextureLoader,
    Object.values(textures).filter(Boolean)
  );
  
  const loadedTextures = useMemo(() => {
    const result: Record<string, THREE.Texture> = {};
    Object.entries(textures).forEach(([type, path], index) => {
      if (path && textureMap[index]) {
        result[type] = textureMap[index];
      }
    });
    return result;
  }, [textures, textureMap]);

  useEffect(() => {
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
      onMaterialReady?.(mat);
    };

    createMaterial();
  }, [materialRef, loadedTextures, uniforms, onMaterialReady, materials]);

  if (!material) return null;

  return <primitive object={material} />;
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