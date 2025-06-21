import * as THREE from "three/webgpu";

export interface InputState {
  keyboard: Map<string, boolean>;
  mouse: {
    position: THREE.Vector2;
    buttons: Map<number, boolean>;
    wheel: number;
  };
  touch: {
    touches: Map<number, TouchData>;
    gestures: {
      pinch: { scale: number; active: boolean };
      pan: { delta: THREE.Vector2; active: boolean };
    };
  };
  gamepad: Map<number, GamepadState>;
  virtual: Map<string, VirtualControlState>;
}

export interface TouchData {
  id: number;
  position: THREE.Vector2;
  startPosition: THREE.Vector2;
  force: number;
  timestamp: number;
}

export interface GamepadState {
  connected: boolean;
  buttons: Map<number, GamepadButtonState>;
  axes: number[];
  hapticActuators?: GamepadHapticActuator[];
}

export interface GamepadButtonState {
  pressed: boolean;
  touched: boolean;
  value: number;
}

export interface VirtualControlState {
  type: 'joystick' | 'button' | 'dpad';
  active: boolean;
  value: THREE.Vector2 | boolean;
  element?: HTMLElement;
}

export interface InputBinding {
  id: string;
  name: string;
  inputs: InputSource[];
  callback: (value: any, inputManager: InputManager) => void;
  continuous?: boolean; // Fire continuously while active
}

export interface InputSource {
  type: 'keyboard' | 'mouse' | 'touch' | 'gamepad' | 'virtual';
  key?: string; // keyboard key
  button?: number; // mouse/gamepad button
  axis?: number; // gamepad axis
  virtualId?: string; // virtual control id
  modifier?: 'shift' | 'ctrl' | 'alt' | 'meta';
}

export class InputManager {
  private inputState: InputState;
  private bindings: Map<string, InputBinding> = new Map();
  private domElement: HTMLElement;
  private isEnabled = true;
  private gamepadUpdateInterval: number | null = null;
  
  // Event listeners for cleanup
  private listeners: Array<{ element: HTMLElement | Window; event: string; handler: EventListener }> = [];

  constructor(domElement: HTMLElement) {
    this.domElement = domElement;
    this.inputState = {
      keyboard: new Map(),
      mouse: {
        position: new THREE.Vector2(),
        buttons: new Map(),
        wheel: 0,
      },
      touch: {
        touches: new Map(),
        gestures: {
          pinch: { scale: 1, active: false },
          pan: { delta: new THREE.Vector2(), active: false },
        },
      },
      gamepad: new Map(),
      virtual: new Map(),
    };

    this.initializeEventListeners();
    this.initializeGamepadPolling();
  }

  private initializeEventListeners(): void {
    // Keyboard events
    this.addListener(window, 'keydown', this.onKeyDown as EventListener);
    this.addListener(window, 'keyup', this.onKeyUp as EventListener);
    this.addListener(window, 'blur', this.onWindowBlur);

    // Mouse events
    this.addListener(this.domElement, 'mousedown', this.onMouseDown as EventListener);
    this.addListener(this.domElement, 'mouseup', this.onMouseUp as EventListener);
    this.addListener(this.domElement, 'mousemove', this.onMouseMove as EventListener);
    this.addListener(this.domElement, 'wheel', this.onMouseWheel as EventListener);
    this.addListener(this.domElement, 'contextmenu', this.onContextMenu);

    // Touch events
    this.addListener(this.domElement, 'touchstart', this.onTouchStart as EventListener);
    this.addListener(this.domElement, 'touchmove', this.onTouchMove as EventListener);
    this.addListener(this.domElement, 'touchend', this.onTouchEnd as EventListener);
    this.addListener(this.domElement, 'touchcancel', this.onTouchCancel as EventListener);

    // Gamepad events
    this.addListener(window, 'gamepadconnected', this.onGamepadConnected as EventListener);
    this.addListener(window, 'gamepaddisconnected', this.onGamepadDisconnected as EventListener);
  }

  private addListener(element: HTMLElement | Window, event: string, handler: EventListener): void {
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  }

  private initializeGamepadPolling(): void {
    // Gamepad API requires polling
    this.gamepadUpdateInterval = window.setInterval(() => {
      this.updateGamepads();
    }, 1000 / 60); // 60 FPS polling
  }

  // Keyboard handlers
  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.isEnabled) return;
    this.inputState.keyboard.set(event.code, true);
    this.processBindings();
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (!this.isEnabled) return;
    this.inputState.keyboard.set(event.code, false);
    this.processBindings();
  };

  private onWindowBlur = (): void => {
    // Clear all keyboard states when window loses focus
    this.inputState.keyboard.clear();
  };

  // Mouse handlers
  private onMouseDown = (event: MouseEvent): void => {
    if (!this.isEnabled) return;
    this.inputState.mouse.buttons.set(event.button, true);
    this.processBindings();
  };

  private onMouseUp = (event: MouseEvent): void => {
    if (!this.isEnabled) return;
    this.inputState.mouse.buttons.set(event.button, false);
    this.processBindings();
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isEnabled) return;
    const rect = this.domElement.getBoundingClientRect();
    this.inputState.mouse.position.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  };

  private onMouseWheel = (event: WheelEvent): void => {
    if (!this.isEnabled) return;
    this.inputState.mouse.wheel = event.deltaY;
    this.processBindings();
    // Reset wheel after processing
    setTimeout(() => {
      this.inputState.mouse.wheel = 0;
    }, 100);
  };

  private onContextMenu = (event: Event): void => {
    event.preventDefault(); // Prevent right-click menu
  };

  // Touch handlers
  private onTouchStart = (event: TouchEvent): void => {
    if (!this.isEnabled) return;
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const rect = this.domElement.getBoundingClientRect();
      const position = new THREE.Vector2(
        ((touch.clientX - rect.left) / rect.width) * 2 - 1,
        -((touch.clientY - rect.top) / rect.height) * 2 + 1
      );
      
      this.inputState.touch.touches.set(touch.identifier, {
        id: touch.identifier,
        position: position.clone(),
        startPosition: position.clone(),
        force: touch.force || 1,
        timestamp: Date.now(),
      });
    }
    
    this.updateTouchGestures();
    this.processBindings();
  };

  private onTouchMove = (event: TouchEvent): void => {
    if (!this.isEnabled) return;
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const existingTouch = this.inputState.touch.touches.get(touch.identifier);
      if (existingTouch) {
        const rect = this.domElement.getBoundingClientRect();
        existingTouch.position.set(
          ((touch.clientX - rect.left) / rect.width) * 2 - 1,
          -((touch.clientY - rect.top) / rect.height) * 2 + 1
        );
        existingTouch.force = touch.force || 1;
      }
    }
    
    this.updateTouchGestures();
  };

  private onTouchEnd = (event: TouchEvent): void => {
    if (!this.isEnabled) return;
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.inputState.touch.touches.delete(touch.identifier);
    }
    
    this.updateTouchGestures();
    this.processBindings();
  };

  private onTouchCancel = (event: TouchEvent): void => {
    this.onTouchEnd(event);
  };

  private updateTouchGestures(): void {
    const touches = Array.from(this.inputState.touch.touches.values());
    
    // Pinch gesture
    if (touches.length === 2) {
      const distance = touches[0].position.distanceTo(touches[1].position);
      const startDistance = touches[0].startPosition.distanceTo(touches[1].startPosition);
      this.inputState.touch.gestures.pinch.scale = distance / startDistance;
      this.inputState.touch.gestures.pinch.active = true;
    } else {
      this.inputState.touch.gestures.pinch.active = false;
      this.inputState.touch.gestures.pinch.scale = 1;
    }
    
    // Pan gesture
    if (touches.length === 1) {
      const touch = touches[0];
      this.inputState.touch.gestures.pan.delta.subVectors(touch.position, touch.startPosition);
      this.inputState.touch.gestures.pan.active = true;
    } else {
      this.inputState.touch.gestures.pan.active = false;
      this.inputState.touch.gestures.pan.delta.set(0, 0);
    }
  }

  // Gamepad handlers
  private onGamepadConnected = (event: GamepadEvent): void => {
    this.updateGamepadState(event.gamepad);
  };

  private onGamepadDisconnected = (event: GamepadEvent): void => {  
    this.inputState.gamepad.delete(event.gamepad.index);
  };

  private updateGamepads(): void {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (gamepad) {
        this.updateGamepadState(gamepad);
      }
    }
  }

  private updateGamepadState(gamepad: Gamepad): void {
    const buttons = new Map<number, GamepadButtonState>();
    for (let i = 0; i < gamepad.buttons.length; i++) {
      const button = gamepad.buttons[i];
      buttons.set(i, {
        pressed: button.pressed,
        touched: button.touched,
        value: button.value,
      });
    }

    this.inputState.gamepad.set(gamepad.index, {
      connected: gamepad.connected,
      buttons,
      axes: Array.from(gamepad.axes),
      hapticActuators: gamepad.hapticActuators ? Array.from(gamepad.hapticActuators) : undefined,
    });
  }

  // Virtual controls
  public createVirtualJoystick(id: string, container: HTMLElement): VirtualControlState {
    const joystickElement = document.createElement('div');
    joystickElement.className = 'virtual-joystick';
    joystickElement.style.cssText = `
      position: absolute;
      width: 100px;
      height: 100px;
      border: 2px solid rgba(255,255,255,0.5);
      border-radius: 50%;
      background: rgba(0,0,0,0.3);
      touch-action: none;
      user-select: none;
    `;

    const knobElement = document.createElement('div');
    knobElement.className = 'virtual-joystick-knob';
    knobElement.style.cssText = `
      position: absolute;
      width: 40px;
      height: 40px;
      left: 30px;
      top: 30px;
      border-radius: 50%;
      background: rgba(255,255,255,0.8);
      pointer-events: none;
    `;

    joystickElement.appendChild(knobElement);
    container.appendChild(joystickElement);

    const virtualControl: VirtualControlState = {
      type: 'joystick',
      active: false,
      value: new THREE.Vector2(0, 0),
      element: joystickElement,
    };

    this.inputState.virtual.set(id, virtualControl);

    // Add touch/mouse handlers
    let isDragging = false;
    const center = new THREE.Vector2(50, 50);
    const maxDistance = 30;

    const onStart = () => {
      isDragging = true;
      virtualControl.active = true;
    };

    const onMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;

      const rect = joystickElement.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      
      const delta = new THREE.Vector2(localX - center.x, localY - center.y);
      const distance = Math.min(delta.length(), maxDistance);
      
      if (delta.length() > 0) {
        delta.normalize().multiplyScalar(distance);
      }

      // Update knob position
      knobElement.style.left = `${center.x + delta.x - 20}px`;
      knobElement.style.top = `${center.y + delta.y - 20}px`;

      // Update virtual control value (-1 to 1 range)
      (virtualControl.value as THREE.Vector2).set(
        delta.x / maxDistance,
        -delta.y / maxDistance // Invert Y for game coordinates
      );
    };

    const onEnd = () => {
      isDragging = false;
      virtualControl.active = false;
      (virtualControl.value as THREE.Vector2).set(0, 0);
      
      // Reset knob position
      knobElement.style.left = '30px';
      knobElement.style.top = '30px';
    };

    // Mouse events
    joystickElement.addEventListener('mousedown', (_e) => {
      onStart();
    });
    document.addEventListener('mousemove', (e) => {
      onMove(e.clientX, e.clientY);
    });
    document.addEventListener('mouseup', onEnd);

    // Touch events
    joystickElement.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onStart();
    });
    document.addEventListener('touchmove', (e) => {
      if (isDragging) {
        e.preventDefault();
        const touch = e.touches[0];
        onMove(touch.clientX, touch.clientY);
      }
    });
    document.addEventListener('touchend', (e) => {
      if (isDragging) {
        e.preventDefault();
        onEnd();
      }
    });

    return virtualControl;
  }

  public createVirtualButton(id: string, container: HTMLElement, label: string): VirtualControlState {
    const buttonElement = document.createElement('button');
    buttonElement.className = 'virtual-button';
    buttonElement.textContent = label;
    buttonElement.style.cssText = `
      padding: 10px 20px;
      border: 2px solid rgba(255,255,255,0.5);
      border-radius: 8px;
      background: rgba(0,0,0,0.3);
      color: white;
      font-family: monospace;
      touch-action: none;
      user-select: none;
    `;

    container.appendChild(buttonElement);

    const virtualControl: VirtualControlState = {
      type: 'button',
      active: false,
      value: false,
      element: buttonElement,
    };

    this.inputState.virtual.set(id, virtualControl);

    const onStart = () => {
      virtualControl.active = true;
      virtualControl.value = true;
      buttonElement.style.background = 'rgba(255,255,255,0.3)';
      this.processBindings();
    };

    const onEnd = () => {
      virtualControl.active = false;
      virtualControl.value = false;
      buttonElement.style.background = 'rgba(0,0,0,0.3)';
      this.processBindings();
    };

    buttonElement.addEventListener('mousedown', onStart);
    buttonElement.addEventListener('mouseup', onEnd);
    buttonElement.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onStart();
    });
    buttonElement.addEventListener('touchend', (e) => {
      e.preventDefault();
      onEnd();
    });

    return virtualControl;
  }

  // Input binding system
  public addBinding(binding: InputBinding): void {
    this.bindings.set(binding.id, binding);
  }

  public removeBinding(id: string): boolean {
    return this.bindings.delete(id);
  }

  private processBindings(): void {
    this.bindings.forEach((binding) => {
      const isActive = this.isBindingActive(binding);
      if (isActive) {
        const value = this.getBindingValue(binding);
        binding.callback(value, this);
      }
    });
  }

  private isBindingActive(binding: InputBinding): boolean {
    return binding.inputs.some(input => {
      switch (input.type) {
        case 'keyboard':
          return input.key && this.inputState.keyboard.get(input.key) === true;
        case 'mouse':
          return input.button !== undefined && this.inputState.mouse.buttons.get(input.button) === true;
        case 'gamepad': {
          const gamepad = Array.from(this.inputState.gamepad.values())[0]; // Use first gamepad
          if (!gamepad || !gamepad.connected) return false;
          if (input.button !== undefined) {
            return gamepad.buttons.get(input.button)?.pressed === true;
          }
          return false;
        }
        case 'virtual': {
          const virtualControl = input.virtualId ? this.inputState.virtual.get(input.virtualId) : null;
          return virtualControl ? virtualControl.active : false;
        }
        default:
          return false;
      }
    });
  }

  private getBindingValue(binding: InputBinding): any {
    // Return the value from the first active input source
    for (const input of binding.inputs) {
      switch (input.type) {
        case 'gamepad': {
          const gamepad = Array.from(this.inputState.gamepad.values())[0];
          if (gamepad && gamepad.connected) {
            if (input.axis !== undefined) {
              return gamepad.axes[input.axis] || 0;
            }
            if (input.button !== undefined) {
              return gamepad.buttons.get(input.button)?.value || 0;
            }
          }
          break;
        }
        case 'virtual': {
          const virtualControl = input.virtualId ? this.inputState.virtual.get(input.virtualId) : null;
          if (virtualControl && virtualControl.active) {
            return virtualControl.value;
          }
          break;
        }
      }
    }
    return true; // Default for simple button presses
  }

  // Public API
  public getInputState(): InputState {
    return this.inputState;
  }

  public isKeyPressed(key: string): boolean {
    return this.inputState.keyboard.get(key) === true;
  }

  public isMouseButtonPressed(button: number): boolean {
    return this.inputState.mouse.buttons.get(button) === true;
  }

  public getMousePosition(): THREE.Vector2 {
    return this.inputState.mouse.position.clone();
  }

  public isGamepadButtonPressed(gamepadIndex: number, button: number): boolean {
    const gamepad = this.inputState.gamepad.get(gamepadIndex);
    return gamepad?.buttons.get(button)?.pressed === true;
  }

  public getGamepadAxis(gamepadIndex: number, axis: number): number {
    const gamepad = this.inputState.gamepad.get(gamepadIndex);
    return gamepad?.axes[axis] || 0;
  }

  public vibrate(gamepadIndex: number, duration: number, weakMagnitude: number = 0.5): void {
    const gamepad = this.inputState.gamepad.get(gamepadIndex);
    if (gamepad?.hapticActuators && gamepad.hapticActuators.length > 0) {
      gamepad.hapticActuators[0].pulse(weakMagnitude, duration);
    }
  }

  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
    // Clear all input states
    this.inputState.keyboard.clear();
    this.inputState.mouse.buttons.clear();
    this.inputState.touch.touches.clear();
  }

  public dispose(): void {
    this.disable();
    
    // Remove all event listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners.length = 0; // Clear the array

    // Clear gamepad polling
    if (this.gamepadUpdateInterval) {
      clearInterval(this.gamepadUpdateInterval);
      this.gamepadUpdateInterval = null;
    }

    // Remove virtual controls
    this.inputState.virtual.forEach((control) => {
      if (control.element) {
        control.element.remove();
      }
    });
    this.inputState.virtual.clear();

    this.bindings.clear();
  }
} 