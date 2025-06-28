import * as THREE from "three/webgpu";
import { GameWorld } from "./game-world";
import { Entity } from "./entity";
import { SceneManager } from "./scene-manager";
import { SoundManager } from "./sound-manager";
import { AssetManager } from "./asset-manager";

export interface ScriptLifecycle {
  init?: (context: ScriptContext) => void | Promise<void>;
  update?: (context: ScriptContext, deltaTime: number) => void;
  fixedUpdate?: (context: ScriptContext, fixedDeltaTime: number) => void;
  destroy?: (context: ScriptContext) => void | Promise<void>;
}

export interface ScriptContext {
  // Entity reference
  entity: Entity;
  
  // Script identification
  scriptId: string;
  
  // Script parameters for this entity/script combination
  parameters: EntityScriptParameters;
  
  // Script instance state - isolated per entity-script combination
  state: Record<string, any>;
  
  // Game world access
  gameWorld: GameWorld;
  scene: THREE.Scene;
  
  // System managers
  physicsManager: ReturnType<GameWorld['getPhysicsManager']>;
  stateManager: ReturnType<GameWorld['getStateManager']>;
  cameraManager: ReturnType<GameWorld['getCameraManager']>;
  inputManager: ReturnType<GameWorld['getInputManager']>;
  
  // Optional managers (if available)
  sceneManager?: SceneManager;
  soundManager?: SoundManager;
  assetManager?: AssetManager;
  
  // Utility functions
  spawnEntity: (entity: Entity) => Entity;
  destroyEntity: (entityId: string) => void;
  findEntity: (entityId: string) => Entity | undefined;
  findEntitiesByTag: (tag: string) => Entity[];
  
  // Scene management
  switchScene?: (sceneId: string) => Promise<void>;
  
  // Sound management
  playSound?: (soundId: string, options?: any) => Promise<void>;
  stopSound?: (soundId: string) => void;
  
  // Time and frame info
  deltaTime: number;
  fixedDeltaTime: number;
  currentTime: number;
  frameCount: number;
}

export interface ScriptParameter {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'vector3' | 'select';
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[]; // For select type
  description?: string;
}

export interface ScriptConfig {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
  priority: number; // Lower numbers run first
  parameters?: ScriptParameter[];
}

export interface EntityScriptParameters {
  [parameterName: string]: any;
}

export interface CompiledScript {
  id: string;
  config: ScriptConfig;
  lifecycle: ScriptLifecycle;
  hasErrors: boolean;
  lastError?: string;
  parameters?: ScriptParameter[];
}

// NEW: Script instance that maintains per-entity state
export interface ScriptInstance {
  entityId: string;
  scriptId: string;
  lifecycle: ScriptLifecycle;
  isInitialized: boolean;
  hasErrors: boolean;
  lastError?: string;
  state: Record<string, any>; // Isolated state per instance
  parameters: EntityScriptParameters;
}

export interface EntityScriptBinding {
  entityId: string;
  scriptId: string;
  enabled: boolean;
  parameters?: EntityScriptParameters;
}

export class ScriptManager {
  private gameWorld: GameWorld;
  private sceneManager?: SceneManager;
  private soundManager?: SoundManager;
  private assetManager?: AssetManager;
  
  // Script compilation storage
  private compiledScripts = new Map<string, CompiledScript>();
  
  // NEW: Script instances per entity-script combination
  private scriptInstances = new Map<string, ScriptInstance>(); // `entityId:scriptId` -> ScriptInstance
  
  // Entity-script mappings
  private entityScripts = new Map<string, Set<string>>(); // entityId -> scriptIds
  private scriptEntities = new Map<string, Set<string>>(); // scriptId -> entityIds
  
  // Change listeners for React synchronization
  private changeListeners: Set<() => void> = new Set();
  
  // Execution tracking
  private frameCount = 0;
  private currentTime = 0;
  private lastFixedUpdateTime = 0;
  private fixedTimestep = 1/60; // 60 FPS fixed update
  private fixedAccumulator = 0;
  
  // Performance tracking
  private scriptPerformance = new Map<string, {
    totalTime: number;
    callCount: number;
    averageTime: number;
    maxTime: number;
  }>();

  constructor(gameWorld: GameWorld) {
    this.gameWorld = gameWorld;
  }

  // Change listener methods for React synchronization
  public addChangeListener(listener: () => void): void {
    this.changeListeners.add(listener);
  }

  public removeChangeListener(listener: () => void): void {
    this.changeListeners.delete(listener);
  }

  protected emitChange(): void {
    this.changeListeners.forEach(listener => listener());
  }

  public setSceneManager(sceneManager: SceneManager): void {
    this.sceneManager = sceneManager;
  }

  public setSoundManager(soundManager: SoundManager): void {
    this.soundManager = soundManager;
  }

  public setAssetManager(assetManager: AssetManager): void {
    this.assetManager = assetManager;
  }

  /**
   * Transform ES6 export syntax to function declarations
   */
  private transformScriptCode(code: string): string {
    const transformedCode = code
      // Transform export function name(...) { ... } to name = function(...) { ... }
      .replace(/export\s+function\s+(\w+)\s*\(/g, '$1 = function(')
      // Remove any standalone export statements like export { ... }
      .replace(/^\s*export\s*{\s*[^}]*\s*}\s*;?\s*$/gm, '')
      // Remove any export default statements
      .replace(/export\s+default\s+/g, '')
      // Remove export keyword from variable declarations
      .replace(/export\s+(const|let|var)\s+/g, '$1 ')
      // Remove import statements as they can't be used in the Function context
      .replace(/import\s+(?:(?:\{[^}]*\})|(?:[^,\s]+))\s+from\s+['"][^'"]+['"];?\s*/g, '');
    
    return transformedCode;
  }

  /**
   * Compile a script from string code
   */
  public compileScript(config: ScriptConfig): CompiledScript {

    
    try {
      // Check if script already exists and remove it first to prevent conflicts
      if (this.compiledScripts.has(config.id)) {
        this.removeScript(config.id);
      }

      // Check if this is already compiled JavaScript code
      const isAlreadyCompiled = config.code.includes('var parameters = [') || 
                                config.code.includes('export {') ||
                                config.code.includes('//# sourceMappingURL=');

      let functionStr: string;
      let extractedParameters: any[] = [];

      if (isAlreadyCompiled) {

        
        // Extract parameters from the compiled code if they exist
        const parametersMatch = config.code.match(/var parameters = (\[[\s\S]*?\]);/);
        if (parametersMatch) {
          try {
            extractedParameters = eval(parametersMatch[1]);
          } catch (error) {
            console.warn(`Failed to extract parameters from compiled code:`, error);
          }
        }

        // Remove export statements and sourcemap comments for function execution
        const cleanedCode = config.code
          .replace(/export\s*\{[^}]*\};\s*/g, '') // Remove export statements
          .replace(/\/\/# sourceMappingURL=.*$/m, ''); // Remove source map comments

        // For compiled code, we need to execute it directly and extract exports
        functionStr = `
          // Execute the compiled script code
          ${cleanedCode}
          
          // Return the lifecycle object and parameters
          return {
            init: typeof init === 'function' ? init : undefined,
            update: typeof update === 'function' ? update : undefined,
            fixedUpdate: typeof fixedUpdate === 'function' ? fixedUpdate : undefined,
            destroy: typeof destroy === 'function' ? destroy : undefined,
            parameters: typeof parameters !== 'undefined' ? parameters : []
          };
        `;
      } else {
        
        // Transform ES6 export syntax to function declarations for TypeScript source
        const transformedCode = this.transformScriptCode(config.code);
        
        functionStr = `
          // Lifecycle functions
          let init, update, fixedUpdate, destroy;
          
          // Parameters array
          let parameters;
          
          // Execute the script code in a try-catch to provide better error context
          try {
            ${transformedCode}
          } catch (error) {
            throw new Error('Script execution error: ' + error.message);
          }
          
          // Return the lifecycle object and parameters
          return {
            init: typeof init === 'function' ? init : undefined,
            update: typeof update === 'function' ? update : undefined,
            fixedUpdate: typeof fixedUpdate === 'function' ? fixedUpdate : undefined,
            destroy: typeof destroy === 'function' ? destroy : undefined,
            parameters: Array.isArray(parameters) ? parameters : []
          };
        `;
      }
      
      
      // NEW: Create a factory function that returns fresh instances
      const scriptFactory = new Function('THREE', functionStr);

      const result = scriptFactory(THREE);
      


      const compiledScript: CompiledScript = {
        id: config.id,
        config: { ...config },
        lifecycle: {
          init: result.init,
          update: result.update,
          fixedUpdate: result.fixedUpdate,
          destroy: result.destroy,
        },
        hasErrors: false,
        parameters: result.parameters?.length ? result.parameters : (config.parameters || []),
      };

      this.compiledScripts.set(config.id, compiledScript);
      this.emitChange();
      return compiledScript;

    } catch (error) {
      const detailedError = `Script compilation failed for ${config.id}: ${error instanceof Error ? error.message : String(error)}`;
      
      const compiledScript: CompiledScript = {
        id: config.id,
        config: { ...config },
        lifecycle: {},
        hasErrors: true,
        lastError: detailedError,
        parameters: config.parameters || [],
      };

      this.compiledScripts.set(config.id, compiledScript);
      this.emitChange();
      return compiledScript;
    }
  }

  /**
   * NEW: Create a script instance for an entity-script combination
   */
  private createScriptInstance(entityId: string, scriptId: string): ScriptInstance | null {
    const script = this.compiledScripts.get(scriptId);
    if (!script) return null;

    const instanceKey = `${entityId}:${scriptId}`;
    
    // Create fresh lifecycle functions for this instance
    const scriptFactory = new Function('THREE', this.getScriptFactoryCode(script.config));
    const freshLifecycle = scriptFactory(THREE);

    const instance: ScriptInstance = {
      entityId,
      scriptId,
      lifecycle: {
        init: freshLifecycle.init,
        update: freshLifecycle.update,
        fixedUpdate: freshLifecycle.fixedUpdate,
        destroy: freshLifecycle.destroy,
      },
      isInitialized: false,
      hasErrors: false,
      state: {}, // Fresh state object for this instance
      parameters: this.getScriptParametersWithDefaults(entityId, scriptId),
    };

    this.scriptInstances.set(instanceKey, instance);
    return instance;
  }

  /**
   * NEW: Get the factory code for creating fresh script instances
   */
  private getScriptFactoryCode(config: ScriptConfig): string {
    const isAlreadyCompiled = config.code.includes('var parameters = [') || 
                              config.code.includes('export {') ||
                              config.code.includes('//# sourceMappingURL=');

    if (isAlreadyCompiled) {
      const cleanedCode = config.code
        .replace(/export\s*\{[^}]*\};\s*/g, '')
        .replace(/\/\/# sourceMappingURL=.*$/m, '');

      return `
        ${cleanedCode}
        return {
          init: typeof init === 'function' ? init : undefined,
          update: typeof update === 'function' ? update : undefined,
          fixedUpdate: typeof fixedUpdate === 'function' ? fixedUpdate : undefined,
          destroy: typeof destroy === 'function' ? destroy : undefined,
          parameters: typeof parameters !== 'undefined' ? parameters : []
        };
      `;
    } else {
      const transformedCode = this.transformScriptCode(config.code);
      return `
        let init, update, fixedUpdate, destroy;
        let parameters;
        
        try {
          ${transformedCode}
        } catch (error) {
          throw new Error('Script execution error: ' + error.message);
        }
        
        return {
          init: typeof init === 'function' ? init : undefined,
          update: typeof update === 'function' ? update : undefined,
          fixedUpdate: typeof fixedUpdate === 'function' ? fixedUpdate : undefined,
          destroy: typeof destroy === 'function' ? destroy : undefined,
          parameters: Array.isArray(parameters) ? parameters : []
        };
      `;
    }
  }

  /**
   * Attach a script to an entity
   */
  public attachScript(entityId: string, scriptId: string): boolean {
    
    const script = this.compiledScripts.get(scriptId);
    if (!script) {
      console.error(`Script ${scriptId} not found`);
      return false;
    }

    const instanceKey = `${entityId}:${scriptId}`;
    
    // Check if instance already exists
    if (this.scriptInstances.has(instanceKey)) {
      return false;
    }

    // Add to entity-script mappings
    if (!this.entityScripts.has(entityId)) {
      this.entityScripts.set(entityId, new Set());
    }
    if (!this.scriptEntities.has(scriptId)) {
      this.scriptEntities.set(scriptId, new Set());
    }

    this.entityScripts.get(entityId)!.add(scriptId);
    this.scriptEntities.get(scriptId)!.add(entityId);

    // Create script instance
    const instance = this.createScriptInstance(entityId, scriptId);
    if (!instance) {
      console.error(`Failed to create script instance for ${scriptId} on entity ${entityId}`);
      return false;
    }

    // Initialize script instance if it has an init function
    if (instance.lifecycle.init) {
      this.initializeScriptInstance(instance);
    } else {
    }

    this.emitChange();
    return true;
  }

  /**
   * Detach a script from an entity
   */
  public detachScript(entityId: string, scriptId: string): boolean {
    const instanceKey = `${entityId}:${scriptId}`;
    const instance = this.scriptInstances.get(instanceKey);
    
    if (!instance) return false;

    // Call destroy if the script has it
    if (instance.lifecycle.destroy) {
      const context = this.createScriptContext(instance, 0, 0);
      if (context) {
        try {
          instance.lifecycle.destroy!(context);
        } catch (error) {
        }
      }
    }

    // Remove instance
    this.scriptInstances.delete(instanceKey);

    // Remove from mappings
    this.entityScripts.get(entityId)?.delete(scriptId);
    this.scriptEntities.get(scriptId)?.delete(entityId);

    // Clean up empty sets
    if (this.entityScripts.get(entityId)?.size === 0) {
      this.entityScripts.delete(entityId);
    }
    if (this.scriptEntities.get(scriptId)?.size === 0) {
      this.scriptEntities.delete(scriptId);
    }

    this.emitChange();
    return true;
  }

  /**
   * Get all scripts attached to an entity
   */
  public getEntityScripts(entityId: string): string[] {
    return Array.from(this.entityScripts.get(entityId) || []);
  }

  /**
   * Get all entities using a script
   */
  public getScriptEntities(scriptId: string): string[] {
    return Array.from(this.scriptEntities.get(scriptId) || []);
  }

  /**
   * NEW: Initialize a script instance
   */
  private async initializeScriptInstance(instance: ScriptInstance): Promise<void> {
    if (!instance.lifecycle.init || instance.isInitialized) return;

    const context = this.createScriptContext(instance, 0, 0);
    if (!context) return;

    try {
      await instance.lifecycle.init(context);
      instance.isInitialized = true;
    } catch (error) {
      instance.hasErrors = true;
      instance.lastError = error instanceof Error ? error.message : String(error);
      console.error(`Error initializing script ${instance.scriptId} for entity ${instance.entityId}:`, error);
    }
  }

  /**
   * Update scripts
   */
  public update(deltaTime: number): void {
    this.currentTime += deltaTime;
    this.frameCount++;
    
    // Regular update
    this.executeScriptLifecycle('update', deltaTime);
    
    // Fixed update accumulator
    this.fixedAccumulator += deltaTime;
    
    // Fixed update (multiple times if needed to catch up)
    while (this.fixedAccumulator >= this.fixedTimestep) {
      this.executeScriptLifecycle('fixedUpdate', this.fixedTimestep);
      this.fixedAccumulator -= this.fixedTimestep;
      this.lastFixedUpdateTime += this.fixedTimestep;
    }
  }

  /**
   * Execute a specific lifecycle method for all script instances
   */
  private executeScriptLifecycle(lifecycleMethod: 'update' | 'fixedUpdate', deltaTime: number): void {
    // Get all script instances and sort by priority
    const executions: Array<{ instance: ScriptInstance; priority: number }> = [];
    
    for (const [instanceKey, instance] of this.scriptInstances) {
      const script = this.compiledScripts.get(instance.scriptId);
      if (!script || !script.config.enabled || script.hasErrors || instance.hasErrors) {
        if (script?.hasErrors || instance.hasErrors) {
          console.warn(`Script ${instance.scriptId} has errors, skipping execution`);
        }
        continue;
      }
      
      const lifecycleFunction = instance.lifecycle[lifecycleMethod];
      if (!lifecycleFunction) continue;

      executions.push({
        instance,
        priority: script.config.priority,
      });
    }

    // Sort by priority (lower numbers first)
    executions.sort((a, b) => a.priority - b.priority);

    // Execute all script instances
    for (const execution of executions) {
      this.executeScriptInstance(execution.instance, lifecycleMethod, deltaTime);
    }
  }

  /**
   * Execute a specific script instance
   */
  private executeScriptInstance(
    instance: ScriptInstance,
    lifecycleMethod: 'update' | 'fixedUpdate',
    deltaTime: number
  ): void {
    const lifecycleFunction = instance.lifecycle[lifecycleMethod];
    if (!lifecycleFunction) return;

    const context = this.createScriptContext(instance, deltaTime, this.fixedTimestep);
    if (!context) return;

    const startTime = performance.now();

    try {
      lifecycleFunction(context, deltaTime);
      
      // Sync physics transform after script execution
      context.entity.syncPhysicsFromTransform();
      
      // Update performance metrics
      const executionTime = performance.now() - startTime;
      this.updatePerformanceMetrics(instance.scriptId, executionTime);
      
    } catch (error) {
      instance.hasErrors = true;
      instance.lastError = error instanceof Error ? error.message : String(error);
      console.error(`Error executing script ${instance.scriptId} ${lifecycleMethod} for entity ${instance.entityId}:`, error);
    }
  }

  /**
   * NEW: Create script context for a script instance
   */
  private createScriptContext(
    instance: ScriptInstance,
    deltaTime: number,
    fixedDeltaTime: number
  ): ScriptContext | null {
    // Find entity in the game world
    const entity = this.gameWorld.getRegistryManager()
      ?.getRegistry<Entity>("entities")
      ?.get(instance.entityId);

    if (!entity) {
      console.warn(`Entity ${instance.entityId} not found for script context`);
      return null;
    }

    const context: ScriptContext = {
      entity,
      scriptId: instance.scriptId,
      parameters: instance.parameters, // Use instance-specific parameters
      state: instance.state, // Instance-specific state object
      gameWorld: this.gameWorld,
      scene: this.gameWorld.getScene(),
      physicsManager: this.gameWorld.getPhysicsManager(),
      stateManager: this.gameWorld.getStateManager(),
      cameraManager: this.gameWorld.getCameraManager(),
      inputManager: this.gameWorld.getInputManager(),
      sceneManager: this.sceneManager,
      soundManager: this.soundManager,
      assetManager: this.assetManager,
      
      // Utility functions
      spawnEntity: (entity: Entity) => this.gameWorld.createEntity(entity),
      destroyEntity: (entityId: string) => this.destroyEntityById(entityId),
      findEntity: (entityId: string) => this.findEntityById(entityId),
      findEntitiesByTag: (tag: string) => this.gameWorld.getEntitiesByTag(tag),
      
      // Scene management
      switchScene: this.sceneManager 
        ? (sceneId: string) => this.sceneManager!.switchToScene(sceneId)
        : undefined,
      
      // Sound management
      playSound: this.soundManager
        ? (soundId: string, options?: any) => this.soundManager!.play(soundId, options)
        : undefined,
      stopSound: this.soundManager
        ? (soundId: string) => this.soundManager!.stop(soundId)
        : undefined,
      
      // Time and frame info
      deltaTime,
      fixedDeltaTime,
      currentTime: this.currentTime,
      frameCount: this.frameCount,
    };

    return context;
  }

  /**
   * Helper to destroy an entity by ID
   */
  private destroyEntityById(entityId: string): void {
    const entity = this.findEntityById(entityId);
    if (entity) {
      // First detach all scripts from this entity
      const scriptIds = this.getEntityScripts(entityId);
      for (const scriptId of scriptIds) {
        this.detachScript(entityId, scriptId);
      }
      
      // Then destroy the entity
      entity.destroy();
    }
  }

  /**
   * Helper to find an entity by ID
   */
  private findEntityById(entityId: string): Entity | undefined {
    return this.gameWorld.getRegistryManager()
      ?.getRegistry<Entity>("entities")
      ?.get(entityId);
  }

  /**
   * Update performance metrics for a script
   */
  private updatePerformanceMetrics(scriptId: string, executionTime: number): void {
    let metrics = this.scriptPerformance.get(scriptId);
    if (!metrics) {
      metrics = {
        totalTime: 0,
        callCount: 0,
        averageTime: 0,
        maxTime: 0,
      };
      this.scriptPerformance.set(scriptId, metrics);
    }

    metrics.totalTime += executionTime;
    metrics.callCount++;
    metrics.averageTime = metrics.totalTime / metrics.callCount;
    metrics.maxTime = Math.max(metrics.maxTime, executionTime);
  }

  /**
   * Remove a script completely
   */
  public removeScript(scriptId: string): void {
    // Get all entities using this script
    const entityIds = this.getScriptEntities(scriptId);
    
    // Detach from all entities first
    for (const entityId of entityIds) {
      this.detachScript(entityId, scriptId);
    }
    
    // Remove from compiled scripts
    this.compiledScripts.delete(scriptId);
    
    // Clean up performance metrics
    this.scriptPerformance.delete(scriptId);
    
    this.emitChange();
  }

  /**
   * Enable/disable a script globally
   */
  public setScriptEnabled(scriptId: string, enabled: boolean): void {
    const script = this.compiledScripts.get(scriptId);
    if (script) {
      script.config.enabled = enabled;
      this.emitChange();
    }
  }

  /**
   * Get script performance metrics
   */
  public getScriptPerformance(scriptId: string) {
    return this.scriptPerformance.get(scriptId);
  }

  /**
   * Get all script performance metrics
   */
  public getAllPerformanceMetrics() {
    return new Map(this.scriptPerformance);
  }

  /**
   * Clear script errors
   */
  public clearScriptErrors(scriptId: string): void {
    const script = this.compiledScripts.get(scriptId);
    if (script) {
      script.hasErrors = false;
      script.lastError = undefined;
    }
    
    // Also clear errors in all instances of this script
    for (const [instanceKey, instance] of this.scriptInstances) {
      if (instance.scriptId === scriptId) {
        instance.hasErrors = false;
        instance.lastError = undefined;
      }
    }
  }

  /**
   * Get script info
   */
  public getScript(scriptId: string): CompiledScript | undefined {
    return this.compiledScripts.get(scriptId);
  }

  /**
   * Get all scripts
   */
  public getAllScripts(): CompiledScript[] {
    return Array.from(this.compiledScripts.values());
  }

  /**
   * Called when an entity is destroyed
   */
  public onEntityDestroyed(entityId: string): void {
    // Get all scripts attached to this entity
    const scriptIds = this.getEntityScripts(entityId);
    
    // Detach all scripts
    for (const scriptId of scriptIds) {
      this.detachScript(entityId, scriptId);
    }
  }

  /**
   * Dispose of the script manager
   */
  public dispose(): void {
    // Call destroy on all active script instances
    for (const [instanceKey, instance] of this.scriptInstances) {
      if (instance.lifecycle.destroy) {
        const context = this.createScriptContext(instance, 0, 0);
        if (context) {
          try {
            instance.lifecycle.destroy(context);
          } catch (error) {
            console.error(`Error destroying script ${instance.scriptId}:`, error);
          }
        }
      }
    }

    // Clear all data
    this.compiledScripts.clear();
    this.scriptInstances.clear();
    this.entityScripts.clear();
    this.scriptEntities.clear();
    this.scriptPerformance.clear();
    this.changeListeners.clear();
  }

  // Parameter management methods
  public setScriptParameters(entityId: string, scriptId: string, parameters: EntityScriptParameters): void {
    const instanceKey = `${entityId}:${scriptId}`;
    const instance = this.scriptInstances.get(instanceKey);
    
    if (instance) {
      // Update the instance's parameters directly
      instance.parameters = { ...parameters };
    }
    
    this.emitChange();
  }

  public getScriptParameters(entityId: string, scriptId: string): EntityScriptParameters {
    const instanceKey = `${entityId}:${scriptId}`;
    const instance = this.scriptInstances.get(instanceKey);
    
    if (instance) {
      return { ...instance.parameters };
    }
    
    return {};
  }

  public getScriptParametersWithDefaults(entityId: string, scriptId: string): EntityScriptParameters {
    const script = this.compiledScripts.get(scriptId);
    const instanceKey = `${entityId}:${scriptId}`;
    const instance = this.scriptInstances.get(instanceKey);
    
    const currentParams = instance ? instance.parameters : {};
    const result: EntityScriptParameters = {};

    // Apply defaults from script definition
    if (script?.parameters) {
      for (const param of script.parameters) {
        result[param.name] = currentParams[param.name] !== undefined 
          ? currentParams[param.name] 
          : param.defaultValue;
      }
    }

    // Include any additional parameters
    for (const [key, value] of Object.entries(currentParams)) {
      if (!(key in result)) {
        result[key] = value;
      }
    }

    return result;
  }
} 