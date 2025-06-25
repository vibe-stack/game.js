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

  // NEW: Update existing material definition
  updateMaterialDefinition(materialDefinition: MaterialDefinition): void {
    // Update the material definition in the registry
    this.materialDefinitions.set(materialDefinition.id, materialDefinition);
    
    // Clear compiled material cache to force regeneration
    this.compiledMaterials.delete(materialDefinition.id);
    
    // Update the material in its library
    for (const [libraryId, library] of this.materialLibraries) {
      const materialIndex = library.materials.findIndex(m => m.id === materialDefinition.id);
      if (materialIndex !== -1) {
        library.materials[materialIndex] = materialDefinition;
        library.metadata.modified = new Date();
        break;
      }
    }
  }

  // NEW: Add single material without creating new library
  addMaterialDefinition(materialDefinition: MaterialDefinition): void {
    // Check if material already exists
    if (this.materialDefinitions.has(materialDefinition.id)) {
      this.updateMaterialDefinition(materialDefinition);
      return;
    }

    // Add to definitions registry
    this.materialDefinitions.set(materialDefinition.id, materialDefinition);

    // Find or create user materials library
    let userLibrary = this.materialLibraries.get('user-materials');
    if (!userLibrary) {
      userLibrary = {
        id: 'user-materials',
        name: 'User Materials',
        version: '1.0.0',
        materials: [],
        sharedShaderGraphs: [],
        sharedTextures: [],
        metadata: {
          created: new Date(),
          modified: new Date()
        }
      };
      this.materialLibraries.set('user-materials', userLibrary);
    }

    // Add material to user library
    userLibrary.materials.push(materialDefinition);
    userLibrary.metadata.modified = new Date();
  }

  // NEW: Remove material definition
  removeMaterialDefinition(materialId: string): boolean {
    if (!this.materialDefinitions.has(materialId)) {
      return false;
    }

    // Remove from definitions registry
    this.materialDefinitions.delete(materialId);
    
    // Clear compiled material cache
    this.compiledMaterials.delete(materialId);

    // Remove from all libraries
    for (const [libraryId, library] of this.materialLibraries) {
      const materialIndex = library.materials.findIndex(m => m.id === materialId);
      if (materialIndex !== -1) {
        library.materials.splice(materialIndex, 1);
        library.metadata.modified = new Date();
      }
    }

    return true;
  }

  // NEW: Clean up duplicate materials by consolidating identical ones
  cleanupDuplicateMaterials(): number {
    const materialsByContent = new Map<string, MaterialDefinition[]>();
    let duplicatesRemoved = 0;

    // Group materials by their content signature
    for (const material of this.materialDefinitions.values()) {
      const signature = this.getMaterialSignature(material);
      if (!materialsByContent.has(signature)) {
        materialsByContent.set(signature, []);
      }
      materialsByContent.get(signature)!.push(material);
    }

    // Remove duplicates, keeping the oldest one (first in timestamp)
    for (const [signature, materials] of materialsByContent) {
      if (materials.length > 1) {
        // Sort by creation time, keep the first one
        materials.sort((a, b) => {
          const aTime = this.getMaterialCreationTime(a);
          const bTime = this.getMaterialCreationTime(b);
          return aTime - bTime;
        });

        const keepMaterial = materials[0];
        const duplicates = materials.slice(1);

        // Remove duplicates
        for (const duplicate of duplicates) {
          this.removeMaterialDefinition(duplicate.id);
          duplicatesRemoved++;
        }
      }
    }

    return duplicatesRemoved;
  }

  // Helper method to create material signature for duplicate detection
  private getMaterialSignature(material: MaterialDefinition): string {
    return JSON.stringify({
      type: material.type,
      properties: material.properties,
      // Exclude id, name, and timestamps from signature
    });
  }

  // Helper method to extract creation time from material
  private getMaterialCreationTime(material: MaterialDefinition): number {
    // Try to extract timestamp from ID
    const timestampMatch = material.id.match(/material-(\d+)-/);
    if (timestampMatch) {
      return parseInt(timestampMatch[1], 10);
    }
    return 0; // Default to 0 if no timestamp found
  }

  // Texture Management
  async loadTexture(asset: EnhancedAssetReference): Promise<THREE.Texture> {
    if (this.loadedTextures.has(asset.id)) {
      return this.loadedTextures.get(asset.id)!;
    }

    const loader = new THREE.TextureLoader();
    
    // Use the asset URL if available, otherwise load from path
    const url = asset.url || asset.path;
    
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
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

  // Load texture from project path
  async loadTextureFromPath(projectPath: string, texturePath: string, textureProps?: any): Promise<THREE.Texture | null> {
    try {
      // Get asset server URL for the texture
      const textureUrl = await window.projectAPI.getAssetUrl(projectPath, texturePath);
      if (!textureUrl) return null;

      const loader = new THREE.TextureLoader();
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(textureUrl, resolve, undefined, reject);
      });

      // Apply texture properties
      if (textureProps) {
        if (textureProps.repeat) texture.repeat.set(textureProps.repeat.x, textureProps.repeat.y);
        if (textureProps.offset) texture.offset.set(textureProps.offset.x, textureProps.offset.y);
        if (textureProps.rotation !== undefined) texture.rotation = textureProps.rotation;
        texture.needsUpdate = true;
      }

      return texture;
    } catch (error) {
      console.error('Failed to load texture:', error);
      return null;
    }
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
        material = await this.createBasicMaterial(definition.properties, assets);
        break;
      case 'lambert':
        material = await this.createLambertMaterial(definition.properties, assets);
        break;
      case 'phong':
        material = await this.createPhongMaterial(definition.properties, assets);
        break;
      case 'standard':
        material = await this.createStandardMaterial(definition.properties, assets);
        break;
      case 'physical':
        material = await this.createPhysicalMaterial(definition.properties, assets);
        break;
      case 'toon':
        material = await this.createToonMaterial(definition.properties, assets);
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
  private async createBasicMaterial(props: any, _assets: Map<string, EnhancedAssetReference>): Promise<THREE.MeshBasicMaterial> {
    const material = new THREE.MeshBasicMaterial();
    this.applyBaseMaterialProperties(material, props);
    
    material.color.set(props.color || '#ffffff');
    
    // Apply textures
    if (props.map && props.projectPath) {
      const texture = await this.loadTextureFromPath(props.projectPath, props.map, props.mapProps);
      if (texture) material.map = texture;
    }
    
    return material;
  }

  private async createStandardMaterial(props: any, _assets: Map<string, EnhancedAssetReference>): Promise<THREE.MeshStandardMaterial> {
    const material = new THREE.MeshStandardMaterial();
    this.applyBaseMaterialProperties(material, props);
    
    material.color.set(props.color || '#ffffff');
    material.emissive.set(props.emissive || '#000000');
    material.emissiveIntensity = props.emissiveIntensity || 0;
    material.roughness = props.roughness || 1;
    material.metalness = props.metalness || 0;
    material.envMapIntensity = props.envMapIntensity || 1;
    
    // Apply textures
    if (props.projectPath) {
      // Base color map
      if (props.map) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.map, props.mapProps);
        if (texture) material.map = texture;
      }
      
      // Normal map
      if (props.normalMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.normalMap, props.normalMapProps);
        if (texture) {
          material.normalMap = texture;
          material.normalScale.set(props.normalScale || 1, props.normalScale || 1);
        }
      }
      
      // Roughness map
      if (props.roughnessMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.roughnessMap, props.roughnessMapProps);
        if (texture) material.roughnessMap = texture;
      }
      
      // Metalness map
      if (props.metalnessMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.metalnessMap, props.metalnessMapProps);
        if (texture) material.metalnessMap = texture;
      }
      
      // Ambient occlusion map
      if (props.aoMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.aoMap, props.aoMapProps);
        if (texture) {
          material.aoMap = texture;
          material.aoMapIntensity = props.aoMapIntensity || 1;
        }
      }
      
      // Emissive map
      if (props.emissiveMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.emissiveMap, props.emissiveMapProps);
        if (texture) material.emissiveMap = texture;
      }
      
      // Environment map (if supported)
      if (props.envMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.envMap, props.envMapProps);
        if (texture) material.envMap = texture;
      }
    }
    
    return material;
  }

  private async createPhysicalMaterial(props: any, _assets: Map<string, EnhancedAssetReference>): Promise<THREE.MeshPhysicalMaterial> {
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
    
    // Apply all standard material textures
    if (props.projectPath) {
      // Base color map
      if (props.map) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.map, props.mapProps);
        if (texture) material.map = texture;
      }
      
      // Normal map
      if (props.normalMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.normalMap, props.normalMapProps);
        if (texture) {
          material.normalMap = texture;
          material.normalScale.set(props.normalScale || 1, props.normalScale || 1);
        }
      }
      
      // Roughness map
      if (props.roughnessMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.roughnessMap, props.roughnessMapProps);
        if (texture) material.roughnessMap = texture;
      }
      
      // Metalness map
      if (props.metalnessMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.metalnessMap, props.metalnessMapProps);
        if (texture) material.metalnessMap = texture;
      }
      
      // Physical material specific textures
      if (props.clearcoatMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.clearcoatMap, props.clearcoatMapProps);
        if (texture) material.clearcoatMap = texture;
      }
      
      if (props.clearcoatRoughnessMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.clearcoatRoughnessMap, props.clearcoatRoughnessMapProps);
        if (texture) material.clearcoatRoughnessMap = texture;
      }
      
      if (props.clearcoatNormalMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.clearcoatNormalMap, props.clearcoatNormalMapProps);
        if (texture) {
          material.clearcoatNormalMap = texture;
          material.clearcoatNormalScale.set(props.clearcoatNormalScale || 1, props.clearcoatNormalScale || 1);
        }
      }
      
      if (props.sheenColorMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.sheenColorMap, props.sheenColorMapProps);
        if (texture) material.sheenColorMap = texture;
      }
      
      if (props.sheenRoughnessMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.sheenRoughnessMap, props.sheenRoughnessMapProps);
        if (texture) material.sheenRoughnessMap = texture;
      }
      
      if (props.transmissionMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.transmissionMap, props.transmissionMapProps);
        if (texture) material.transmissionMap = texture;
      }
      
      if (props.thicknessMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.thicknessMap, props.thicknessMapProps);
        if (texture) material.thicknessMap = texture;
      }
      
      if (props.iridescenceMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.iridescenceMap, props.iridescenceMapProps);
        if (texture) material.iridescenceMap = texture;
      }
      
      if (props.iridescenceThicknessMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.iridescenceThicknessMap, props.iridescenceThicknessMapProps);
        if (texture) material.iridescenceThicknessMap = texture;
      }
    }
    
    return material;
  }

  private async createLambertMaterial(props: any, _assets: Map<string, EnhancedAssetReference>): Promise<THREE.MeshLambertMaterial> {
    const material = new THREE.MeshLambertMaterial();
    this.applyBaseMaterialProperties(material, props);
    
    material.color.set(props.color || '#ffffff');
    material.emissive.set(props.emissive || '#000000');
    material.emissiveIntensity = props.emissiveIntensity || 0;
    
    // Apply textures
    if (props.projectPath) {
      if (props.map) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.map, props.mapProps);
        if (texture) material.map = texture;
      }
      
      if (props.emissiveMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.emissiveMap, props.emissiveMapProps);
        if (texture) material.emissiveMap = texture;
      }
    }
    
    return material;
  }

  private async createPhongMaterial(props: any, _assets: Map<string, EnhancedAssetReference>): Promise<THREE.MeshPhongMaterial> {
    const material = new THREE.MeshPhongMaterial();
    this.applyBaseMaterialProperties(material, props);
    
    material.color.set(props.color || '#ffffff');
    material.emissive.set(props.emissive || '#000000');
    material.emissiveIntensity = props.emissiveIntensity || 0;
    material.specular.set(props.specular || '#111111');
    material.shininess = props.shininess || 30;
    
    // Apply textures
    if (props.projectPath) {
      if (props.map) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.map, props.mapProps);
        if (texture) material.map = texture;
      }
      
      if (props.emissiveMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.emissiveMap, props.emissiveMapProps);
        if (texture) material.emissiveMap = texture;
      }
      
      if (props.specularMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.specularMap, props.specularMapProps);
        if (texture) material.specularMap = texture;
      }
      
      if (props.normalMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.normalMap, props.normalMapProps);
        if (texture) {
          material.normalMap = texture;
          material.normalScale.set(props.normalScale || 1, props.normalScale || 1);
        }
      }
    }
    
    return material;
  }

  private async createToonMaterial(props: any, _assets: Map<string, EnhancedAssetReference>): Promise<THREE.MeshToonMaterial> {
    const material = new THREE.MeshToonMaterial();
    this.applyBaseMaterialProperties(material, props);
    
    material.color.set(props.color || '#ffffff');
    material.emissive.set(props.emissive || '#000000');
    material.emissiveIntensity = props.emissiveIntensity || 0;
    
    // Apply textures
    if (props.projectPath) {
      if (props.map) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.map, props.mapProps);
        if (texture) material.map = texture;
      }
      
      if (props.emissiveMap) {
        const texture = await this.loadTextureFromPath(props.projectPath, props.emissiveMap, props.emissiveMapProps);
        if (texture) material.emissiveMap = texture;
      }
    }
    
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
      version: '1.0.0',
      description: 'Built-in material presets',
      materials: [
        {
          id: 'standard-default',
          name: 'Standard Default',
          description: 'Basic PBR material',
          type: 'standard',
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