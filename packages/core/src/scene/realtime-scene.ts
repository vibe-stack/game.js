import * as THREE from 'three';
import { Scene } from './scene';

export abstract class RealtimeScene extends Scene {
  private wsConnection: WebSocket | null = null;
  private pendingUpdates: Map<string, any> = new Map();

  constructor() {
    super();
    this.setupWebSocketConnection();
    this.setupHMRListener();
  }

  private setupWebSocketConnection(): void {
    // Only setup WebSocket in development
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      try {
        this.wsConnection = new WebSocket('ws://localhost:3001');
        
        this.wsConnection.onopen = () => {
          console.log('Connected to editor WebSocket');
        };

        this.wsConnection.onmessage = (event) => {
          const update = JSON.parse(event.data);
          this.applyRealTimeUpdate(update);
        };

        this.wsConnection.onclose = () => {
          console.log('Disconnected from editor WebSocket');
          // Attempt to reconnect after 2 seconds
          setTimeout(() => this.setupWebSocketConnection(), 2000);
        };
      } catch (error) {
        console.warn('Could not connect to editor WebSocket:', error);
      }
    }
  }

  private setupHMRListener(): void {
    // Listen for Vite HMR updates in development only
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      // This would be handled by the Vite plugin in actual implementation
      console.log('HMR listener setup for scene');
    }
  }

  private applyRealTimeUpdate(update: any): void {
    if (update.property.startsWith('objects.')) {
      // Handle Three.js object property updates
      const [, objectName, ...propertyPath] = update.property.split('.');
      const obj = this.getObject(objectName);
      
      if (obj) {
        this.updateObjectProperty(objectName, propertyPath.join('.'), update.value);
      }
    } else {
      // Handle @Editable property updates
      if (this.hasOwnProperty(update.property)) {
        (this as any)[update.property] = update.value;
        this.onPropertyChanged(update.property, update.value);
      }
    }
  }

  // Override to notify editor of changes
  updateObjectProperty(objectName: string, propertyPath: string, value: any): void {
    super.updateObjectProperty(objectName, propertyPath, value);
    
    // Notify editor that the property was updated
    this.notifyEditor('object-updated', {
      objectName,
      property: propertyPath,
      value
    });
  }

  // Hook for when @Editable properties change
  protected onPropertyChanged(property: string, value: any): void {
    // Override in your scene to handle specific property changes
    // This is called for immediate updates during editing
  }

  private notifyEditor(event: string, data: any): void {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({ event, data }));
    }
  }

  // Batch multiple updates for performance
  batchUpdate(updates: Array<{ property: string; value: any }>): void {
    updates.forEach(update => {
      this.applyRealTimeUpdate(update);
    });
  }

  // Get current state for editor synchronization
  getEditorState(): any {
    return {
      properties: this.getEditableProperties(),
      objects: this.getEditableObjects(),
      overrides: this.getEditorOverrides()
    };
  }
} 