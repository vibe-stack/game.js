import * as THREE from 'three';
import { MaterialLibrary, MaterialDefinition, TSLShaderGraph, TextureReference, EnhancedAssetReference } from '@/types/project';

// Material System Service
export class MaterialSystem {
  private materialLibraries = new Map<string, MaterialLibrary>();
  private materialDefinitions = new Map<string, MaterialDefinition>();
  private shaderGraphs = new Map<string, TSLShaderGraph>();
  private textureReferences = new Map<string, TextureReference>();
  private loadedTextures = new Map<string, THREE.Texture>();
  private compiledMaterials = new Map<string, THREE.Material>();

  // Material Library Management
  loadMaterialLibrary(library: MaterialLibrary): void {
    this.materialLibraries.set(library.id, library);
    
    // Register all materials from this library
    library.materials.forEach((material: MaterialDefinition) => {
      this.materialDefinitions.set(material.id, material);
    });

    // Register shared shader graphs
    library.sharedShaderGraphs.forEach((graph: TSLShaderGraph) => {
      this.shaderGraphs.set(graph.id, graph);
    });

    // Register shared textures
    library.sharedTextures.forEach((texture: TextureReference) => {
      this.textureReferences.set(texture.id, texture);
    });
  }

  getMaterialLibrary(libraryId: string): MaterialLibrary | undefined {
    return this.materialLibraries.get(libraryId);
  }

  // Material Definition Management
  getMaterialDefinition(materialId: string): MaterialDefinition | undefined {
    return this.materialDefinitions.get(materialId);
  }

  getAllMaterialDefinitions(): MaterialDefinition[] {
    return Array.from(this.materialDefinitions.values());
  }

  getMaterialDefinitionsByCategory(category: string): MaterialDefinition[] {
    return Array.from(this.materialDefinitions.values())
      .filter((material: MaterialDefinition) => material.metadata.category === category);
  }

  searchMaterialDefinitions(query: string): MaterialDefinition[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.materialDefinitions.values())
      .filter((material: MaterialDefinition) => 
        material.name.toLowerCase().includes(lowerQuery) ||
        material.description?.toLowerCase().includes(lowerQuery) ||
        material.metadata.tags.some((tag: string) => tag.toLowerCase().includes(lowerQuery))
      );
  }

  // Texture Management
  async loadTexture(asset: EnhancedAssetReference): Promise<THREE.Texture> {
    if (this.loadedTextures.has(asset.id)) {
      return this.loadedTextures.get(asset.id)!;
    }

    const loader = new THREE.TextureLoader();
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(asset.path, resolve, undefined, reject);
    });

    // Apply texture properties
    if (asset.textureProperties) {
      const props = asset.textureProperties;
      if (props.flipY !== undefined) texture.flipY = props.flipY;
      if (props.generateMipmaps !== undefined) texture.generateMipmaps = props.generateMipmaps;
      if (props.premultiplyAlpha !== undefined) texture.premultiplyAlpha = props.premultiplyAlpha;
      if (props.unpackAlignment !== undefined) texture.unpackAlignment = props.unpackAlignment;
      
      // Set color space
      switch (props.colorSpace) {
        case 'sRGB':
          texture.colorSpace = THREE.SRGBColorSpace;
          break;
        case 'Linear':
          texture.colorSpace = THREE.LinearSRGBColorSpace;
          break;
        // Note: Rec2020 and DisplayP3 might not be available in current Three.js version
        default:
          texture.colorSpace = THREE.SRGBColorSpace;
          break;
      }
    }

    this.loadedTextures.set(asset.id, texture);
    return texture;
  }

  getTextureReference(textureId: string): TextureReference | undefined {
    return this.textureReferences.get(textureId);
  }

  // TSL Shader Graph Management
  getShaderGraph(graphId: string): TSLShaderGraph | undefined {
    return this.shaderGraphs.get(graphId);
  }

  // TSL to Three.js Material Compilation
  async compileTSLShaderGraph(graph: TSLShaderGraph, assets: Map<string, EnhancedAssetReference>): Promise<THREE.ShaderMaterial> {
    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: this.generateVertexShader(graph),
      fragmentShader: this.generateFragmentShader(graph),
    });

    // Process texture nodes and load textures
    const textureNodes = graph.nodes.filter((node: any) => node.type === 'texture');
    for (const textureNode of textureNodes) {
      if (textureNode.textureReference) {
        const textureRef = this.textureReferences.get(textureNode.textureReference);
        if (textureRef) {
          const asset = assets.get(textureRef.assetId);
          if (asset) {
            const texture = await this.loadTexture(asset);
            // Apply texture reference properties
            texture.wrapS = this.getThreeWrapMode(textureRef.wrapS || 'repeat');
            texture.wrapT = this.getThreeWrapMode(textureRef.wrapT || 'repeat');
            if (textureRef.repeat) texture.repeat.set(textureRef.repeat.x, textureRef.repeat.y);
            if (textureRef.offset) texture.offset.set(textureRef.offset.x, textureRef.offset.y);
            if (textureRef.rotation !== undefined) texture.rotation = textureRef.rotation;
            if (textureRef.anisotropy !== undefined) texture.anisotropy = textureRef.anisotropy;
            
            material.uniforms[`texture_${textureNode.id}`] = { value: texture };
          }
        }
      }
    }

    // Process uniform nodes
    const uniformNodes = graph.nodes.filter((node: any) => node.type === 'uniform');
    uniformNodes.forEach((uniformNode: any) => {
      if (uniformNode.uniformValue !== undefined) {
        material.uniforms[`uniform_${uniformNode.id}`] = { 
          value: uniformNode.uniformValue 
        };
      }
    });

    return material;
  }

  // Three.js Material Creation
  async createMaterial(materialId: string, assets: Map<string, EnhancedAssetReference>): Promise<THREE.Material> {
    if (this.compiledMaterials.has(materialId)) {
      return this.compiledMaterials.get(materialId)!.clone();
    }

    const definition = this.materialDefinitions.get(materialId);
    if (!definition) {
      throw new Error(`Material definition not found: ${materialId}`);
    }

    let material: THREE.Material;

    switch (definition.properties.type) {
      case 'basic':
        material = this.createBasicMaterial(definition.properties, assets);
        break;
      case 'lambert':
        material = this.createLambertMaterial(definition.properties, assets);
        break;
      case 'phong':
        material = this.createPhongMaterial(definition.properties, assets);
        break;
      case 'standard':
        material = this.createStandardMaterial(definition.properties, assets);
        break;
      case 'physical':
        material = this.createPhysicalMaterial(definition.properties, assets);
        break;
      case 'toon':
        material = this.createToonMaterial(definition.properties, assets);
        break;
      case 'shader':
        if (definition.properties.shaderGraph) {
          const graph = this.shaderGraphs.get(definition.properties.shaderGraph);
          if (graph) {
            material = await this.compileTSLShaderGraph(graph, assets);
          } else {
            material = this.createShaderMaterial(definition.properties, assets);
          }
        } else {
          material = this.createShaderMaterial(definition.properties, assets);
        }
        break;
      default:
        material = new THREE.MeshStandardMaterial();
    }

    this.compiledMaterials.set(materialId, material);
    return material.clone();
  }

  // Helper Methods for Material Creation
  private createBasicMaterial(props: any, _assets: Map<string, EnhancedAssetReference>): THREE.MeshBasicMaterial {
    const material = new THREE.MeshBasicMaterial();
    this.applyBaseMaterialProperties(material, props);
    
    material.color.set(props.color || '#ffffff');
    // Apply textures...
    
    return material;
  }

  private createStandardMaterial(props: any, _assets: Map<string, EnhancedAssetReference>): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial();
    this.applyBaseMaterialProperties(material, props);
    
    material.color.set(props.color || '#ffffff');
    material.emissive.set(props.emissive || '#000000');
    material.emissiveIntensity = props.emissiveIntensity || 0;
    material.roughness = props.roughness || 1;
    material.metalness = props.metalness || 0;
    material.envMapIntensity = props.envMapIntensity || 1;
    
    // Apply textures...
    
    return material;
  }

  private createPhysicalMaterial(props: any, _assets: Map<string, EnhancedAssetReference>): THREE.MeshPhysicalMaterial {
    const material = new THREE.MeshPhysicalMaterial();
    this.applyBaseMaterialProperties(material, props);
    
    // Apply standard material properties
    material.color.set(props.color || '#ffffff');
    material.emissive.set(props.emissive || '#000000');
    material.emissiveIntensity = props.emissiveIntensity || 0;
    material.roughness = props.roughness || 1;
    material.metalness = props.metalness || 0;
    material.envMapIntensity = props.envMapIntensity || 1;
    
    // Apply physical material properties
    material.clearcoat = props.clearcoat || 0;
    material.clearcoatRoughness = props.clearcoatRoughness || 0;
    material.ior = props.ior || 1.5;
    material.reflectivity = props.reflectivity || 0.5;
    material.iridescence = props.iridescence || 0;
    material.iridescenceIOR = props.iridescenceIOR || 1.3;
    material.sheen = props.sheen || 0;
    material.sheenColor.set(props.sheenColor || '#ffffff');
    material.sheenRoughness = props.sheenRoughness || 1;
    material.transmission = props.transmission || 0;
    material.thickness = props.thickness || 0;
    material.attenuationDistance = props.attenuationDistance || Infinity;
    material.attenuationColor.set(props.attenuationColor || '#ffffff');
    material.specularIntensity = props.specularIntensity || 1;
    material.specularColor.set(props.specularColor || '#ffffff');
    
    return material;
  }

  private createLambertMaterial(props: any, _assets: Map<string, EnhancedAssetReference>): THREE.MeshLambertMaterial {
    const material = new THREE.MeshLambertMaterial();
    this.applyBaseMaterialProperties(material, props);
    
    material.color.set(props.color || '#ffffff');
    material.emissive.set(props.emissive || '#000000');
    material.emissiveIntensity = props.emissiveIntensity || 0;
    
    return material;
  }

  private createPhongMaterial(props: any, _assets: Map<string, EnhancedAssetReference>): THREE.MeshPhongMaterial {
    const material = new THREE.MeshPhongMaterial();
    this.applyBaseMaterialProperties(material, props);
    
    material.color.set(props.color || '#ffffff');
    material.emissive.set(props.emissive || '#000000');
    material.emissiveIntensity = props.emissiveIntensity || 0;
    material.specular.set(props.specular || '#111111');
    material.shininess = props.shininess || 30;
    
    return material;
  }

  private createToonMaterial(props: any, _assets: Map<string, EnhancedAssetReference>): THREE.MeshToonMaterial {
    const material = new THREE.MeshToonMaterial();
    this.applyBaseMaterialProperties(material, props);
    
    material.color.set(props.color || '#ffffff');
    material.emissive.set(props.emissive || '#000000');
    material.emissiveIntensity = props.emissiveIntensity || 0;
    
    return material;
  }

  private createShaderMaterial(props: any, _assets: Map<string, EnhancedAssetReference>): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      uniforms: props.uniforms || {},
      vertexShader: props.vertexShader || this.getDefaultVertexShader(),
      fragmentShader: props.fragmentShader || this.getDefaultFragmentShader(),
      lights: props.lights || false,
    });
    
    this.applyBaseMaterialProperties(material, props);
    return material;
  }

  private applyBaseMaterialProperties(material: THREE.Material, props: any): void {
    material.transparent = props.transparent || false;
    material.opacity = props.opacity || 1;
    material.alphaTest = props.alphaTest || 0;
    material.side = props.side || THREE.FrontSide;
    material.visible = props.visible !== false;
    material.depthTest = props.depthTest !== false;
    material.depthWrite = props.depthWrite !== false;
    if ('fog' in material) (material as any).fog = props.fog !== false;
    // Add more base properties as needed...
  }

  private getThreeWrapMode(wrap: string): THREE.Wrapping {
    switch (wrap) {
      case 'repeat': return THREE.RepeatWrapping;
      case 'clampToEdge': return THREE.ClampToEdgeWrapping;
      case 'mirroredRepeat': return THREE.MirroredRepeatWrapping;
      default: return THREE.RepeatWrapping;
    }
  }

  // TSL Code Generation Methods
  private generateVertexShader(graph: TSLShaderGraph): string {
    // Basic vertex shader - would be expanded with TSL compilation
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

  private generateFragmentShader(graph: TSLShaderGraph): string {
    // This would be a full TSL-to-GLSL compiler
    // For now, returning a basic fragment shader
    return `
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0);
      }
    `;
  }

  private getDefaultVertexShader(): string {
    return `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
  }

  private getDefaultFragmentShader(): string {
    return `
      void main() {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
      }
    `;
  }

  // Preset Material Creation
  createPresetMaterials(): void {
    // Create some default materials
    const defaultLibrary: MaterialLibrary = {
      id: 'default',
      name: 'Default Materials',
      description: 'Built-in material presets',
      materials: [
        {
          id: 'standard-default',
          name: 'Standard Default',
          description: 'Basic PBR material',
          properties: {
            type: 'standard',
            color: '#ffffff',
            emissive: '#000000',
            emissiveIntensity: 0,
            roughness: 0.5,
            metalness: 0,
            transparent: false,
            opacity: 1,
            alphaTest: 0,
            side: 0,
            visible: true,
            depthTest: true,
            depthWrite: true,
            blending: 'normal',
            premultipliedAlpha: false,
            dithering: false,
            fog: true,
            wireframe: false,
            vertexColors: false,
            clipIntersection: false,
            clipShadows: false,
            colorWrite: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            polygonOffsetUnits: 0,
            alphaHash: false,
            stencilWrite: false,
            stencilFunc: 519,
            stencilRef: 0,
            stencilFuncMask: 255,
            stencilFail: 7680,
            stencilZFail: 7680,
            stencilZPass: 7680,
            stencilWriteMask: 255,
            lightMapIntensity: 1,
            aoMapIntensity: 1,
            bumpScale: 1,
            normalMapType: 'tangentSpace',
            normalScale: { x: 1, y: 1 },
            displacementScale: 1,
            displacementBias: 0,
            envMapIntensity: 1
          },
          textures: [],
          shaderGraphs: [],
          previewSettings: {
            geometry: 'sphere',
            lighting: 'studio'
          },
          metadata: {
            tags: ['default', 'pbr'],
            category: 'standard'
          }
        }
      ],
      sharedTextures: [],
      sharedShaderGraphs: [],
      metadata: {
        created: new Date(),
        modified: new Date()
      }
    };

    this.loadMaterialLibrary(defaultLibrary);
  }
}

// Singleton instance
export const materialSystem = new MaterialSystem();

// Initialize with default materials
materialSystem.createPresetMaterials(); 