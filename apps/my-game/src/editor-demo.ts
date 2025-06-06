// Demo: WebSocket Editor Integration
// This shows how an editor would communicate with the running game

class EditorDemo {
  private ws: WebSocket | null = null;
  private connected = false;

  constructor() {
    this.connect();
  }

  private connect(): void {
    try {
      this.ws = new WebSocket('ws://localhost:3001');
      
      this.ws.onopen = () => {
        console.log('🎨 Editor demo connected to game');
        this.connected = true;
        this.startDemo();
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 Received from game:', data);
      };

      this.ws.onclose = () => {
        console.log('🔌 Editor demo disconnected');
        this.connected = false;
        // Try to reconnect after 2 seconds
        setTimeout(() => this.connect(), 2000);
      };

      this.ws.onerror = (error) => {
        console.log('❌ Editor WebSocket error:', error);
      };
    } catch (error) {
      console.log('⚠️  Could not connect to game WebSocket (game not running?)');
      // Try again in 5 seconds
      setTimeout(() => this.connect(), 5000);
    }
  }

  private sendUpdate(property: string, value: any, temporary = false): void {
    if (!this.connected || !this.ws) return;

    const update = {
      scenePath: '/src/app/scene.ts',
      property,
      value,
      temporary
    };

    this.ws.send(JSON.stringify(update));
    console.log(`🎛️  Sent ${temporary ? 'temporary' : 'permanent'} update:`, update);
  }

  private startDemo(): void {
    console.log('\n🎮 Starting Editor Demo - Real-time Property Updates');
    console.log('Watch the game window to see changes happen live!\n');

    // Demo 1: Simulate dragging a color picker
    setTimeout(() => {
      console.log('🎨 Demo 1: Changing cube color to red');
      this.sendUpdate('cubeColor', '#ff0000');
    }, 1000);

    // Demo 2: Simulate dragging a scale slider (temporary updates while dragging)
    setTimeout(() => {
      console.log('📏 Demo 2: Simulating scale slider drag (temporary updates)');
      this.simulateSliderDrag();
    }, 3000);

    // Demo 3: Change camera position
    setTimeout(() => {
      console.log('📹 Demo 3: Moving camera to higher position');
      this.sendUpdate('cameraY', 12);
    }, 8000);

    // Demo 4: Adjust rotation speed
    setTimeout(() => {
      console.log('🌀 Demo 4: Increasing rotation speed');
      this.sendUpdate('rotationSpeed', 3);
    }, 10000);

    // Demo 5: Reset to defaults
    setTimeout(() => {
      console.log('🔄 Demo 5: Resetting to defaults');
      this.sendUpdate('cubeColor', '#00ff00');
      this.sendUpdate('cubeScale', 1);
      this.sendUpdate('cameraY', 5);
      this.sendUpdate('rotationSpeed', 1);
    }, 13000);
  }

  private simulateSliderDrag(): void {
    let scale = 1;
    const interval = setInterval(() => {
      scale += 0.1;
      
      // Send temporary update (no file save while dragging)
      this.sendUpdate('cubeScale', scale, true);
      
      if (scale >= 2.5) {
        clearInterval(interval);
        // Final update when user releases slider (saves to file)
        this.sendUpdate('cubeScale', scale, false);
        console.log('✅ Slider drag complete - final value saved');
      }
    }, 100); // 10 updates per second while dragging
  }
}

// Auto-start demo if we're in development
if (import.meta.env.DEV) {
  console.log('🎭 Editor Demo Mode Active');
  console.log('💡 This demonstrates real-time property editing via WebSocket');
  console.log('📱 In a real editor, these would be UI controls (sliders, color pickers, etc.)');
  
  // Start demo after a short delay
  setTimeout(() => {
    new EditorDemo();
  }, 2000);
}

export { EditorDemo }; 