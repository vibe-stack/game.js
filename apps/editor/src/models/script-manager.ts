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
  isInitialized: boolean;
  hasErrors: boolean;
  lastError?: string;
  parameters?: ScriptParameter[];
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
  
  // Script storage and management
  private compiledScripts = new Map<string, CompiledScript>();
  private entityScripts = new Map<string, Set<string>>(); // entityId -> scriptIds
  private scriptEntities = new Map<string, Set<string>>(); // scriptId -> entityIds
  
  // Parameter storage
  private entityScriptParameters = new Map<string, Map<string, EntityScriptParameters>>(); // entityId -> scriptId -> parameters
  
  // Track initialization status per entity-script combination
  private initializedScripts = new Map<string, Set<string>>(); // entityId -> initialized scriptIds
  
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
    // Transform export function statements to regular function declarations
    let transformedCode = code
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
    console.log(`Compiling script ${config.id}...`);
    
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
        console.log(`Script ${config.id} appears to be already compiled JavaScript`);
        
        // Extract parameters from the compiled code if they exist
        const parametersMatch = config.code.match(/var parameters = (\[[\s\S]*?\]);/);
        if (parametersMatch) {
          try {
            extractedParameters = eval(parametersMatch[1]);
            console.log(`Extracted parameters from compiled code:`, extractedParameters);
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
        console.log(`Script ${config.id} appears to be TypeScript source code`);
        
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
      
      console.log(`Transformed code for ${config.id}:`, functionStr.substring(0, 200) + '...');
      
      const scriptFunction = new Function('THREE', functionStr);

      const result = scriptFunction(THREE);
      
      console.log(`Script ${config.id} compilation result:`, {
        hasInit: !!result.init,
        hasUpdate: !!result.update,
        hasFixedUpdate: !!result.fixedUpdate,
        hasDestroy: !!result.destroy,
        parametersFromCode: result.parameters,
        parametersFromConfig: config.parameters,
        extractedParameters: extractedParameters
      });

      const compiledScript: CompiledScript = {
        id: config.id,
        config: { ...config },
        lifecycle: {
          init: result.init,
          update: result.update,
          fixedUpdate: result.fixedUpdate,
          destroy: result.destroy
        },
        isInitialized: false,
        hasErrors: false,
        parameters: result.parameters || extractedParameters || config.parameters || [],
      };

      this.compiledScripts.set(config.id, compiledScript);
      this.emitChange();
      
      console.log(`Script ${config.id} compiled successfully with ${compiledScript.parameters?.length || 0} parameters`);
      
      return compiledScript;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const detailedError = `Failed to compile script ${config.name || config.id}: ${errorMessage}`;
      
      const compiledScript: CompiledScript = {
        id: config.id,
        config: { ...config },
        lifecycle: {},
        isInitialized: false,
        hasErrors: true,
        lastError: detailedError,
        parameters: config.parameters || [],
      };

      this.compiledScripts.set(config.id, compiledScript);
      console.error(detailedError);
      console.error('Script code that failed to compile:', config.code);
      this.emitChange();
      return compiledScript;
    }
  }

  /**
   * Attach a script to an entity
   */
  public attachScript(entityId: string, scriptId: string): boolean {
    console.log(`Attaching script ${scriptId} to entity ${entityId}`);
    
    const script = this.compiledScripts.get(scriptId);
    if (!script) {
      console.error(`Script ${scriptId} not found`);
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

    console.log(`Script ${scriptId} attached. Config:`, {
      enabled: script.config.enabled,
      hasInit: !!script.lifecycle.init,
      parametersCount: script.parameters?.length || 0
    });

    // Initialize script for this entity if it has an init function
    if (script.lifecycle.init) {
      console.log(`Initializing script ${scriptId} for entity ${entityId}`);
      this.initializeScriptForEntity(scriptId, entityId);
    } else {
      console.log(`Script ${scriptId} has no init function`);
    }

    this.emitChange();
    return true;
  }

  /**
   * Detach a script from an entity
   */
  public detachScript(entityId: string, scriptId: string): boolean {
    const script = this.compiledScripts.get(scriptId);
    if (!script) return false;

    // Call destroy if the script has it
    if (script.lifecycle.destroy) {
      const context = this.createScriptContext(entityId, scriptId, 0, 0);
      if (context) {
        try {
          script.lifecycle.destroy!(context);
        } catch (error) {
          console.error(`Error in script ${scriptId} destroy:`, error);
        }
      }
    }

    // Remove from mappings
    this.entityScripts.get(entityId)?.delete(scriptId);
    this.scriptEntities.get(scriptId)?.delete(entityId);
    
    // Remove from initialization tracking
    this.initializedScripts.get(entityId)?.delete(scriptId);

    // Clean up empty sets
    if (this.entityScripts.get(entityId)?.size === 0) {
      this.entityScripts.delete(entityId);
    }
    if (this.scriptEntities.get(scriptId)?.size === 0) {
      this.scriptEntities.delete(scriptId);
    }
    if (this.initializedScripts.get(entityId)?.size === 0) {
      this.initializedScripts.delete(entityId);
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
   * Get all entities that have a specific script attached
   */
  public getScriptEntities(scriptId: string): string[] {
    return Array.from(this.scriptEntities.get(scriptId) || []);
  }

  /**
   * Initialize a script for a specific entity
   */
  private async initializeScriptForEntity(scriptId: string, entityId: string): Promise<void> {
    const script = this.compiledScripts.get(scriptId);
    if (!script || !script.lifecycle.init) return;

    // Check if already initialized for this entity
    const entityInitializedScripts = this.initializedScripts.get(entityId);
    if (entityInitializedScripts?.has(scriptId)) {
      console.log(`Script ${scriptId} already initialized for entity ${entityId}`);
      return;
    }

    const context = this.createScriptContext(entityId, scriptId, 0, 0);
    if (!context) return;

    try {
      await script.lifecycle.init(context);
      
      // Mark as initialized for this entity
      if (!this.initializedScripts.has(entityId)) {
        this.initializedScripts.set(entityId, new Set());
      }
      this.initializedScripts.get(entityId)!.add(scriptId);
      
      console.log(`Script ${scriptId} initialized successfully for entity ${entityId}`);
    } catch (error) {
      script.hasErrors = true;
      script.lastError = error instanceof Error ? error.message : String(error);
      console.error(`Error initializing script ${scriptId} for entity ${entityId}:`, error);
    }
  }

  /**
   * Update all scripts (called every frame)
   */
  public update(deltaTime: number): void {
    this.currentTime += deltaTime;
    this.frameCount++;

    // Handle fixed update timing
    this.fixedAccumulator += deltaTime;
    
    // Regular update
    this.executeScriptLifecycle('update', deltaTime);
    
    // Fixed update (multiple times if needed to catch up)
    while (this.fixedAccumulator >= this.fixedTimestep) {
      this.executeScriptLifecycle('fixedUpdate', this.fixedTimestep);
      this.fixedAccumulator -= this.fixedTimestep;
      this.lastFixedUpdateTime += this.fixedTimestep;
    }
  }

  /**
   * Execute a specific lifecycle method for all scripts
   */
  private executeScriptLifecycle(lifecycleMethod: 'update' | 'fixedUpdate', deltaTime: number): void {
    // Get all unique script-entity combinations and sort by priority
    const executions: Array<{ scriptId: string; entityId: string; priority: number }> = [];
    
    for (const [scriptId, entityIds] of this.scriptEntities) {
      const script = this.compiledScripts.get(scriptId);
      if (!script || !script.config.enabled || script.hasErrors) {
        if (script?.hasErrors) {
          console.warn(`Script ${scriptId} has errors, skipping execution`);
        }
        continue;
      }
      
      const lifecycleFunction = script.lifecycle[lifecycleMethod];
      if (!lifecycleFunction) continue;

      for (const entityId of entityIds) {
        executions.push({
          scriptId,
          entityId,
          priority: script.config.priority,
        });
      }
    }

    // Sort by priority (lower numbers first)
    executions.sort((a, b) => a.priority - b.priority);

    // Execute all scripts
    for (const execution of executions) {
      this.executeScript(execution.scriptId, execution.entityId, lifecycleMethod, deltaTime);
    }
  }

  /**
   * Execute a specific script for a specific entity
   */
  private executeScript(
    scriptId: string,
    entityId: string,
    lifecycleMethod: 'update' | 'fixedUpdate',
    deltaTime: number
  ): void {
    const script = this.compiledScripts.get(scriptId);
    if (!script) return;

    const lifecycleFunction = script.lifecycle[lifecycleMethod];
    if (!lifecycleFunction) return;

    const context = this.createScriptContext(entityId, scriptId, deltaTime, this.fixedTimestep);
    if (!context) return;

    const startTime = performance.now();

    try {
      lifecycleFunction(context, deltaTime);
      
      // Sync physics transform after script execution
      // This ensures that if scripts modify position/rotation directly,
      // the physics body stays in sync with the visual mesh
      context.entity.syncPhysicsFromTransform();
      
      // Update performance metrics
      const executionTime = performance.now() - startTime;
      this.updatePerformanceMetrics(scriptId, executionTime);
      
    } catch (error) {
      script.hasErrors = true;
      script.lastError = error instanceof Error ? error.message : String(error);
      console.error(`Error executing script ${scriptId} ${lifecycleMethod} for entity ${entityId}:`, error);
    }
  }

  /**
   * Create script context for an entity
   */
  private createScriptContext(
    entityId: string,
    scriptId: string,
    deltaTime: number,
    fixedDeltaTime: number
  ): ScriptContext | null {
    // Find entity in the game world
    const entity = this.gameWorld.getRegistryManager()
      ?.getRegistry<Entity>("entities")
      ?.get(entityId);

    if (!entity) {
      console.warn(`Entity ${entityId} not found for script context`);
      return null;
    }

    // Get script parameters with defaults
    const parameters = this.getScriptParametersWithDefaults(entityId, scriptId);

    const context: ScriptContext = {
      entity,
      scriptId,
      parameters,
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
    const script = this.compiledScripts.get(scriptId);
    if (!script) return;

    // Detach from all entities
    const entityIds = Array.from(this.scriptEntities.get(scriptId) || []);
    for (const entityId of entityIds) {
      this.detachScript(entityId, scriptId);
    }

    // Remove from compiled scripts
    this.compiledScripts.delete(scriptId);
    this.scriptPerformance.delete(scriptId);
  }

  /**
   * Enable/disable a script
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
   * Destroy when entity is destroyed
   */
  public onEntityDestroyed(entityId: string): void {
    const scriptIds = this.getEntityScripts(entityId);
    for (const scriptId of scriptIds) {
      this.detachScript(entityId, scriptId);
    }
    
    // Clean up initialization tracking
    this.initializedScripts.delete(entityId);
  }

  /**
   * Dispose of the script manager
   */
  public dispose(): void {
    // Call destroy on all active scripts
    for (const [scriptId, entityIds] of this.scriptEntities) {
      const script = this.compiledScripts.get(scriptId);
      if (script?.lifecycle.destroy) {
        for (const entityId of entityIds) {
          const context = this.createScriptContext(entityId, scriptId, 0, 0);
          if (context) {
            try {
              script.lifecycle.destroy(context);
            } catch (error) {
              console.error(`Error destroying script ${scriptId}:`, error);
            }
          }
        }
      }
    }

    // Clear all data
    this.compiledScripts.clear();
    this.entityScripts.clear();
    this.scriptEntities.clear();
    this.scriptPerformance.clear();
    this.entityScriptParameters.clear();
    this.initializedScripts.clear();
    this.changeListeners.clear();
  }

  // Parameter management methods
  public setScriptParameters(entityId: string, scriptId: string, parameters: EntityScriptParameters): void {
    if (!this.entityScriptParameters.has(entityId)) {
      this.entityScriptParameters.set(entityId, new Map());
    }
    this.entityScriptParameters.get(entityId)!.set(scriptId, parameters);
    this.emitChange();
  }

  public getScriptParameters(entityId: string, scriptId: string): EntityScriptParameters {
    const entityParams = this.entityScriptParameters.get(entityId);
    if (!entityParams) return {};
    return entityParams.get(scriptId) || {};
  }

  public getScriptParametersWithDefaults(entityId: string, scriptId: string): EntityScriptParameters {
    const script = this.compiledScripts.get(scriptId);
    const currentParams = this.getScriptParameters(entityId, scriptId);
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