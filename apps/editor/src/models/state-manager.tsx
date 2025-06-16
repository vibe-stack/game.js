// import * as THREE from "three/webgpu";
import * as React from "react";
import { GameState, StateSubscriber } from "./types";

export class StateManager {
  private state: GameState;
  private subscribers = new Map<string, StateSubscriber>();
  private nextSubscriberId = 0;

  constructor() {
    this.state = {
      entities: new Map(),
      cameras: new Map(),
      controls: new Map(),
      physics: {
        enabled: false,
      },
      interaction: {
        activeObjects: [],
      },
      scene: {
        activeCamera: "",
        activeControls: "",
      },
    };
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  setState<K extends keyof GameState>(
    key: K,
    value: GameState[K],
    notify = true
  ): void {
    this.state[key] = value;
    if (notify) {
      this.notifySubscribers();
    }
  }

  updateState(updates: Partial<GameState>, notify = true): void {
    Object.assign(this.state, updates);
    if (notify) {
      this.notifySubscribers();
    }
  }

  mergeState(updates: Partial<GameState>, notify = true): void {
    for (const [key, value] of Object.entries(updates)) {
      if (key in this.state) {
        if (
          typeof this.state[key as keyof GameState] === "object" &&
          this.state[key as keyof GameState] !== null &&
          !Array.isArray(this.state[key as keyof GameState]) &&
          !(this.state[key as keyof GameState] instanceof Map)
        ) {
          this.state[key as keyof GameState] = {
            ...this.state[key as keyof GameState],
            ...value,
          } as any;
        } else {
          this.state[key as keyof GameState] = value;
        }
      }
    }
    if (notify) {
      this.notifySubscribers();
    }
  }

  subscribe<T = GameState>(
    callback: (state: T) => void,
    filter?: (state: GameState) => boolean
  ): string {
    const id = `sub_${this.nextSubscriberId++}`;
    this.subscribers.set(id, {
      id,
      callback: callback as (state: any) => void,
      filter,
    });
    return id;
  }

  unsubscribe(id: string): boolean {
    return this.subscribers.delete(id);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((subscriber) => {
      if (!subscriber.filter || subscriber.filter(this.state)) {
        subscriber.callback(this.state);
      }
    });
  }

  createSelector<T>(selector: (state: GameState) => T): () => T {
    return () => selector(this.state);
  }

  watchProperty<K extends keyof GameState>(
    property: K,
    callback: (value: GameState[K], previousValue?: GameState[K]) => void
  ): string {
    let previousValue = this.state[property];
    
    return this.subscribe((state) => {
      const currentValue = state[property];
      if (currentValue !== previousValue) {
        callback(currentValue, previousValue);
        previousValue = currentValue;
      }
    });
  }

  emit(eventName: string, data?: any): void {
    this.setState("lastEvent" as any, { name: eventName, data, timestamp: Date.now() });
  }

  batchUpdates(fn: () => void): void {
    fn();
    this.notifySubscribers();
  }

  reset(): void {
    this.state = {
      entities: new Map(),
      cameras: new Map(),
      controls: new Map(),
      physics: {
        enabled: false,
      },
      interaction: {
        activeObjects: [],
      },
      scene: {
        activeCamera: "",
        activeControls: "",
      },
    };
    this.notifySubscribers();
  }

  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  clearSubscribers(): void {
    this.subscribers.clear();
  }
}

export const createStateHook = (stateManager: StateManager) => {
  return function useGameState<T = GameState>(
    selector?: (state: GameState) => T,
    deps?: any[]
  ): T {
    if (!React) {
      throw new Error("React is not available. Make sure to import React properly.");
    }
    
    const [state, setState] = React.useState<T>(() => {
      const currentState = stateManager.getState();
      return selector ? selector(currentState) : (currentState as T);
    });

    React.useEffect(() => {
      const subscription = stateManager.subscribe((newState: GameState) => {
        const selectedState = selector ? selector(newState) : (newState as T);
        setState(selectedState);
      });

      return () => {
        stateManager.unsubscribe(subscription);
      };
    }, deps || []);

    return state;
  };
};

export const createStateSelector = (stateManager: StateManager) => {
  return function gameStateSelector<T>(selector: (state: GameState) => T): T {
    return selector(stateManager.getState());
  };
}; 