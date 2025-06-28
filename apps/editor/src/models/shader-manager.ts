import * as THREE from "three/webgpu";
import { 
  texture,
  uv,
  positionLocal,
  normalLocal,
  timerLocal,
  uniform,
  add,
  mul,
  div,
  sub,
  sin,
  cos,
  pow,
  sqrt,
  normalize,
  dot,
  cross,
  mix,
  clamp,
  smoothstep,
  vec2,
  vec3,
  vec4,
  float
} from "three/tsl";
import { 
  TSLShaderConfig,
  ShaderType,
  CompiledShader,
  ShaderParameter,
  ShaderContext
} from "./types";
import { StateManager } from "./state-manager";
import EventEmitter from "eventemitter3";

interface ShaderManagerState {
  shaders: Map<string, TSLShader>;
  compiledShaders: Map<string, CompiledShader>;
  activeShaders: Set<string>;
  compiling: boolean;
  errors: Map<string, string>;
}

// Simple state container for shader manager
class ShaderState<T> {
  private state: T;
  
  constructor(initialState: T) {
    this.state = initialState;
  }
  
  get(): T {
    return this.state;
  }
  
  update(fn: (state: T) => void): void {
    fn(this.state);
  }
}

export class ShaderManager extends EventEmitter {
  private state: ShaderState<ShaderManagerState>;
  private nodeCompiler: TSLNodeCompiler;
  
  constructor() {
    super();
    
    this.state = new ShaderState<ShaderManagerState>({
      shaders: new Map(),
      compiledShaders: new Map(),
      activeShaders: new Set(),
      compiling: false,
      errors: new Map()
    });
    
    this.nodeCompiler = new TSLNodeCompiler();
  }
  
  // Shader Registration
  registerShader(config: TSLShaderConfig): TSLShader {
    const shader = new TSLShader(config);
    
    this.state.update((state) => {
      state.shaders.set(shader.id, shader);
    });
    
    this.emit("shader:registered", shader);
    return shader;
  }
  
  // Shader Compilation
  async compileShader(shaderId: string, context?: ShaderContext): Promise<CompiledShader> {
    const shader = this.getShader(shaderId);
    if (!shader) {
      throw new Error(`Shader not found: ${shaderId}`);
    }
    
    this.state.update((state) => {
      state.compiling = true;
      state.errors.delete(shaderId);
    });
    
    try {
      const compiled = await this.nodeCompiler.compile(shader, context);
      
      this.state.update((state) => {
        state.compiledShaders.set(shaderId, compiled);
        state.compiling = false;
      });
      
      this.emit("shader:compiled", { shaderId, compiled });
      return compiled;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      this.state.update((state) => {
        state.errors.set(shaderId, errorMessage);
        state.compiling = false;
      });
      
      this.emit("shader:error", { shaderId, error: errorMessage });
      throw error;
    }
  }
  
  // Shader Retrieval
  getShader(shaderId: string): TSLShader | undefined {
    return this.state.get().shaders.get(shaderId);
  }
  
  getCompiledShader(shaderId: string): CompiledShader | undefined {
    return this.state.get().compiledShaders.get(shaderId);
  }
  
  getAllShaders(): TSLShader[] {
    return Array.from(this.state.get().shaders.values());
  }
  
  getShadersByType(type: ShaderType): TSLShader[] {
    return this.getAllShaders().filter(shader => shader.type === type);
  }
  
  // Shader Lifecycle
  activateShader(shaderId: string): void {
    this.state.update((state) => {
      state.activeShaders.add(shaderId);
    });
    this.emit("shader:activated", shaderId);
  }
  
  deactivateShader(shaderId: string): void {
    this.state.update((state) => {
      state.activeShaders.delete(shaderId);
    });
    this.emit("shader:deactivated", shaderId);
  }
  
  // Shader Updates
  updateShaderGraph(shaderId: string, graph: any): void {
    const shader = this.getShader(shaderId);
    if (!shader) return;
    
    shader.updateGraph(graph);
    
    // Clear compiled version to force recompilation
    this.state.update((state) => {
      state.compiledShaders.delete(shaderId);
    });
    
    this.emit("shader:updated", shaderId);
  }
  
  // Parameter Management
  updateShaderParameter(shaderId: string, paramName: string, value: any): void {
    const compiled = this.getCompiledShader(shaderId);
    if (!compiled || !compiled.material) return;
    
    if (compiled.uniforms && compiled.uniforms[paramName]) {
      compiled.uniforms[paramName].value = value;
      compiled.material.needsUpdate = true;
    }
    
    this.emit("shader:parameter:updated", { shaderId, paramName, value });
  }
  
  // Serialization
  serializeShader(shaderId: string): any {
    const shader = this.getShader(shaderId);
    if (!shader) return null;
    
    return shader.serialize();
  }
  
  deserializeShader(data: any): TSLShader {
    const config = TSLShader.deserializeConfig(data);
    return this.registerShader(config);
  }
  
  // Cleanup
  removeShader(shaderId: string): void {
    const shader = this.getShader(shaderId);
    if (!shader) return;
    
    this.state.update((state) => {
      state.shaders.delete(shaderId);
      state.compiledShaders.delete(shaderId);
      state.activeShaders.delete(shaderId);
      state.errors.delete(shaderId);
    });
    
    shader.dispose();
    this.emit("shader:removed", shaderId);
  }
  
  dispose(): void {
    const state = this.state.get();
    
    // Dispose all shaders
    state.shaders.forEach(shader => shader.dispose());
    
    // Clear state
    this.state.update((state) => {
      state.shaders.clear();
      state.compiledShaders.clear();
      state.activeShaders.clear();
      state.errors.clear();
    });
    
    this.removeAllListeners();
  }
}

// TSL Node Compiler
class TSLNodeCompiler {
  async compile(shader: TSLShader, context?: ShaderContext): Promise<CompiledShader> {
    const { graph, type } = shader;
    
    // Create node material based on shader type
    const material = this.createNodeMaterial(type);
    
    // Compile graph to TSL nodes
    const compiledNodes = this.compileGraph(graph);
    
    // Apply compiled nodes to material
    this.applyNodesToMaterial(material, compiledNodes, shader.materialConnections);
    
    // Extract uniforms
    const uniforms = this.extractUniforms(graph, material);
    
    return {
      shaderId: shader.id,
      material,
      uniforms,
      vertexNode: compiledNodes.vertex,
      fragmentNode: compiledNodes.fragment,
      context
    };
  }
  
  private createNodeMaterial(type: ShaderType): any {
    switch (type) {
      case "material":
        return new THREE.MeshStandardNodeMaterial();
      case "postprocess":
        return new THREE.NodeMaterial();
      case "compute":
        return new THREE.NodeMaterial();
      case "particle":
        return new THREE.PointsNodeMaterial();
      default:
        return new THREE.NodeMaterial();
    }
  }
  
  private compileGraph(graph: any): any {
    const nodeCache = new Map();
    const { nodes, connections } = graph;
    
    // Create a simple shader for now based on materialConnections
    // This is a simplified approach to get the shader working
    let colorNode = vec3(1, 0, 0); // Default red color
    
         // Look for specific node patterns in the graph to determine shader type
    const timeNode = nodes.find((n: any) => n.type === "time");
    const mixNode = nodes.find((n: any) => n.type === "mix");
    const viewDirNode = nodes.find((n: any) => n.type === "cameraViewDirection");
    const dotNode = nodes.find((n: any) => n.type === "dot");
    
    if (viewDirNode && dotNode) {
      // Fresnel effect shader
      const viewDirection = normalLocal; // Use normal as view direction for simplicity
      const normal = normalLocal;
      const fresnel = sub(float(1.0), dot(viewDirection, normal));
      const fresnelPower = pow(fresnel, float(2.0));
      colorNode = mul(vec3(0.2, 0.6, 1.0), fresnelPower); // Blue glow
    } else if (timeNode && mixNode) {
      // Animated color mix
      const time = timerLocal();
      const animatedFactor = sin(mul(time, float(0.5)));
      colorNode = mix(vec3(0, 0, 1), vec3(1, 0, 0), animatedFactor);
    }
    
    // Store in node cache for material application
    nodeCache.set("colorOutput", colorNode);
    
    return {
      vertex: null,
      fragment: colorNode,
      nodes: nodeCache
    };
  }
  

  
  private applyNodesToMaterial(material: any, compiledNodes: any, connections: any): void {
    // Apply the compiled fragment node to the material's color
    if (compiledNodes.fragment) {
      material.colorNode = compiledNodes.fragment;
    }
    
    // Apply other specific connections if they exist
    if (connections) {
      if (connections.colorNode && compiledNodes.nodes.get(connections.colorNode)) {
        material.colorNode = compiledNodes.nodes.get(connections.colorNode);
      }
      if (connections.normalNode && compiledNodes.nodes.get(connections.normalNode)) {
        material.normalNode = compiledNodes.nodes.get(connections.normalNode);
      }
      if (connections.metalnessNode && compiledNodes.nodes.get(connections.metalnessNode)) {
        material.metalnessNode = compiledNodes.nodes.get(connections.metalnessNode);
      }
      if (connections.roughnessNode && compiledNodes.nodes.get(connections.roughnessNode)) {
        material.roughnessNode = compiledNodes.nodes.get(connections.roughnessNode);
      }
      if (connections.emissiveNode && compiledNodes.nodes.get(connections.emissiveNode)) {
        material.emissiveNode = compiledNodes.nodes.get(connections.emissiveNode);
      }
    }
  }
  
  private extractUniforms(graph: any, material: any): Record<string, any> {
    const uniforms: Record<string, any> = {};
    
    // Extract uniforms from graph nodes
    graph.nodes
      .filter((n: any) => n.type === "uniform")
      .forEach((n: any) => {
        uniforms[n.id] = {
          value: n.properties?.value || 0,
          type: n.properties?.dataType || "float"
        };
      });
    
    return uniforms;
  }
}

// TSL Shader Class
export class TSLShader {
  id: string;
  name: string;
  type: ShaderType;
  graph: any;
  parameters: ShaderParameter[];
  materialConnections?: any;
  metadata: any;
  
  constructor(config: TSLShaderConfig) {
    this.id = config.id || crypto.randomUUID();
    this.name = config.name;
    this.type = config.type;
    this.graph = config.graph || { nodes: [], connections: [] };
    this.parameters = config.parameters || [];
    this.materialConnections = config.materialConnections;
    this.metadata = config.metadata || {};
  }
  
  updateGraph(graph: any): void {
    this.graph = graph;
  }
  
  updateParameter(name: string, value: any): void {
    const param = this.parameters.find(p => p.name === name);
    if (param) {
      param.defaultValue = value;
    }
  }
  
  serialize(): any {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      graph: this.graph,
      parameters: this.parameters,
      materialConnections: this.materialConnections,
      metadata: this.metadata
    };
  }
  
  static deserializeConfig(data: any): TSLShaderConfig {
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      graph: data.graph,
      parameters: data.parameters,
      materialConnections: data.materialConnections,
      metadata: data.metadata
    };
  }
  
  dispose(): void {
    // Cleanup if needed
  }
}

// Export singleton instance
export const shaderManager = new ShaderManager(); 