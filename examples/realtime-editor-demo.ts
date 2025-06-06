// This demonstrates the real-time editor approach
// No hundreds of API calls - just fast WebSocket updates!

interface EditorConnection {
  ws: WebSocket;
  sendUpdate(property: string, value: any, temporary?: boolean): void;
}

class RealtimeEditorDemo {
  private connection: EditorConnection;
  private currentScene: any;

  constructor() {
    this.setupConnection();
  }

  private setupConnection(): void {
    const ws = new WebSocket('ws://localhost:3001');
    
    this.connection = {
      ws,
      sendUpdate: (property: string, value: any, temporary = false) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            scenePath: '/src/app/scene.ts',
            property,
            value,
            temporary // If true, only live update - don't save to file
          }));
        }
      }
    };

    ws.onopen = () => {
      console.log('Connected to game via WebSocket');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received from game:', data);
    };
  }

  // Simulate different editor interactions
  simulatePropertyEditing(): void {
    console.log('=== Real-time Property Editing Demo ===');

    // 1. Slider dragging (temporary updates - no file saves)
    this.simulateSliderDrag();

    // 2. Color picker changes (immediate + final save)
    setTimeout(() => this.simulateColorPicker(), 2000);

    // 3. Batch updates for multiple properties
    setTimeout(() => this.simulateBatchUpdate(), 4000);
  }

  private simulateSliderDrag(): void {
    console.log('📍 Simulating position slider drag...');
    
    // Simulate dragging a position slider left to right
    // Each mouse move = one WebSocket message (very fast)
    let x = 0;
    const dragInterval = setInterval(() => {
      x += 0.1;
      
      // Send temporary update (immediate visual feedback, no file save)
      this.connection.sendUpdate('objects.cube.position', [x, 0, 0], true);
      
      if (x >= 2) {
        clearInterval(dragInterval);
        
        // Final update when user releases mouse (save to file)
        this.connection.sendUpdate('objects.cube.position', [x, 0, 0], false);
        console.log('🎯 Slider drag complete - final position saved');
      }
    }, 16); // ~60fps updates while dragging
  }

  private simulateColorPicker(): void {
    console.log('🎨 Simulating color picker...');
    
    // Color picker can send immediate updates
    this.connection.sendUpdate('cubeColor', '#ff0000', false);
    console.log('🎯 Color changed and saved immediately');
  }

  private simulateBatchUpdate(): void {
    console.log('📦 Simulating batch update...');
    
    // When loading a preset or undoing, send multiple updates at once
    const updates = [
      { property: 'cameraPosition', value: [5, 5, 5] },
      { property: 'ambientIntensity', value: 1.5 },
      { property: 'objects.cube.scale', value: [2, 2, 2] }
    ];

    updates.forEach(update => {
      this.connection.sendUpdate(update.property, update.value, false);
    });
    
    console.log('🎯 Batch update complete');
  }
}

// Example of how the game side would handle updates
class GameSideDemo {
  private ws: WebSocket | null = null;
  private scene: any = {}; // Mock scene object

  constructor() {
    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    // In development, connect to editor WebSocket
    if (process.env.NODE_ENV === 'development') {
      this.ws = new WebSocket('ws://localhost:3001');
      
      this.ws.onmessage = (event) => {
        const update = JSON.parse(event.data);
        this.applyUpdate(update);
      };
    }
  }

  private applyUpdate(update: any): void {
    console.log(`🎮 Game applying update: ${update.property} = ${JSON.stringify(update.value)}`);
    
    // Apply the update immediately to the running game
    if (update.property.startsWith('objects.')) {
      this.updateThreeJSObject(update);
    } else {
      this.updateSceneProperty(update);
    }
  }

  private updateThreeJSObject(update: any): void {
    // Example: objects.cube.position -> find cube, update position
    const [, objectName, propertyPath] = update.property.split('.', 3);
    console.log(`  📦 Updating ${objectName}.${propertyPath}`);
    
    // In real implementation, this would update the actual Three.js object
    // object.position.fromArray(update.value);
  }

  private updateSceneProperty(update: any): void {
    // Example: cameraPosition -> update camera
    console.log(`  🎬 Updating scene property: ${update.property}`);
    
    // In real implementation, this would update the scene
    // this.camera.position.fromArray(update.value);
  }
}

// Performance comparison
console.log(`
🚀 Performance Comparison:

❌ HTTP API approach:
- Slider drag: 100+ HTTP requests per second
- Latency: 10-50ms per request
- Server load: High
- User experience: Laggy

✅ WebSocket approach:
- Slider drag: 60 WebSocket messages per second
- Latency: 1-5ms per message
- Server load: Minimal
- User experience: Buttery smooth

💾 Smart saving:
- Live updates: WebSocket (immediate feedback)
- File saves: Debounced (only when user stops editing)
- Best of both worlds!
`);

// Run the demo
const editorDemo = new RealtimeEditorDemo();
const gameDemo = new GameSideDemo();

setTimeout(() => {
  editorDemo.simulatePropertyEditing();
}, 1000); 