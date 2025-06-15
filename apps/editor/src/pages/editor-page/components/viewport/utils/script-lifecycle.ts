type ScriptExecuteFunction = (
  scriptComponent: ScriptComponent,
  method: keyof ScriptComponent["properties"]["eventHandlers"],
  context: any
) => Promise<void>;

interface ScriptState {
  initialized: boolean;
  component: ScriptComponent;
}

// Helper function to normalize script component properties, providing defaults
function normalizeScriptComponent(component: any): ScriptComponent {
  const defaults = {
    autoStart: true,
    eventHandlers: { init: true, update: true, lateUpdate: false, fixedUpdate: false, destroy: true },
    timeScale: 1.0,
    debugMode: false,
    parameters: {},
    scriptPath: '',
  };
  
  const properties = { ...defaults, ...(component.properties || {}) };
  properties.eventHandlers = { ...defaults.eventHandlers, ...(properties.eventHandlers || {}) };
  
  return { ...component, properties };
}

export class ScriptLifecycle {
  private isProcessingFrame = false;
  // Key: component.id, Value: the state for that script instance
  private states = new Map<string, ScriptState>();

  constructor(private executeScript: ScriptExecuteFunction) {}

  // Syncs the internal state with the components on the entity
  public updateComponents(components: ScriptComponent[]) {
    const currentIds = new Set(components.map((c) => c.id));

    // Remove states for components that are no longer present
    for (const id of this.states.keys()) {
      if (!currentIds.has(id)) {
        this.destroyScript(id).catch((e) => console.error(`Error destroying stale script ${id}`, e));
        this.states.delete(id);
      }
    }

    // Add new components or update existing ones
    for (const component of components) {
      const normalized = normalizeScriptComponent(component);
      const existing = this.states.get(normalized.id);
      if (!existing) {
        this.states.set(normalized.id, {
          initialized: false,
          component: normalized,
        });
      } else {
        // Update component definition in case properties changed
        existing.component = normalized;
      }
    }
  }

  // Initializes all uninitialized scripts
  public async initializeScripts() {
    for (const state of this.states.values()) {
      if (state.component.enabled && state.component.properties.autoStart && !state.initialized) {
        try {
          if (state.component.properties.eventHandlers.init) {
            await this.executeScript(state.component, 'init', {});
          }
          state.initialized = true; // Set initialized only after successful init
        } catch (error) {
          console.error(`Error initializing script ${state.component.properties.scriptPath}:`, error);
        }
      }
    }
  }

  // Destroys all initialized scripts and resets state for next run
  public async destroyScripts() {
    for (const state of this.states.values()) {
      if (state.initialized) {
        try {
          if (state.component.properties.eventHandlers.destroy) {
            await this.executeScript(state.component, 'destroy', {});
          }
        } catch (error) {
          console.error(`Error destroying script ${state.component.properties.scriptPath}:`, error);
        } finally {
          // Reset initialization state for next run
          state.initialized = false;
        }
      }
    }
    // Don't clear states entirely - keep them for re-initialization
  }

  private async destroyScript(id: string) {
    const state = this.states.get(id);
    if (state?.initialized) {
      try {
        if (state.component.properties.eventHandlers.destroy) {
          await this.executeScript(state.component, 'destroy', {});
        }
      } catch (error) {
        console.error(`Error destroying script ${state.component.properties.scriptPath}:`, error);
      } finally {
        state.initialized = false;
      }
    }
  }

  // Processes a single frame, preventing overlapping executions
  public async processFrame(deltaTime: number, totalTime: number) {
    if (this.isProcessingFrame) return;
    this.isProcessingFrame = true;

    try {
      const context = { deltaTime, totalTime };

      const runLifecycle = async (
        method: keyof ScriptComponent["properties"]["eventHandlers"]
      ) => {
        const promises: Promise<void>[] = [];
        for (const state of this.states.values()) {
          if (
            state.initialized &&
            state.component.enabled &&
            state.component.properties.eventHandlers[method]
          ) {
            const adjustedDeltaTime = context.deltaTime * (state.component.properties.timeScale || 1.0);
            promises.push(
              this.executeScript(state.component, method, {
                ...context,
                deltaTime: adjustedDeltaTime,
              })
            );
          }
        }
        // Use allSettled to ensure all scripts attempt to run even if one fails
        await Promise.allSettled(promises);
      };

      await runLifecycle('update');
      await runLifecycle('lateUpdate');
      await runLifecycle('fixedUpdate');
    } finally {
      this.isProcessingFrame = false;
    }
  }
}