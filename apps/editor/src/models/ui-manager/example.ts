import * as THREE from "three/webgpu";
import { 
  UIManager, 
  initializeUIStyles, 
  DEFAULT_THEME,
  Overlay,
  WorldSpaceUI,
  ANIMATION_PRESETS 
} from "../index";

/**
 * Example integration of the UI system with a Three.js scene
 * This demonstrates the basic setup and usage patterns
 */
export class UISystemExample {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGPURenderer;
  private uiManager: UIManager;
  private playerObject: THREE.Object3D;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGPURenderer();
    this.uiManager = UIManager.getInstance();
    this.playerObject = new THREE.Object3D();
    
    this.setupScene();
    this.setupUISystem();
    this.createExampleUI();
    this.startGameLoop();
  }

  private setupScene(): void {
    // Basic Three.js scene setup
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Add some basic objects
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.playerObject = new THREE.Mesh(geometry, material);
    this.scene.add(this.playerObject);

    this.camera.position.set(0, 0, 5);
  }

  private setupUISystem(): void {
    // Get UI manager instance
    this.uiManager = UIManager.getInstance();

    // Initialize default styles
    initializeUIStyles();

    // Set theme
    this.uiManager.setTheme(DEFAULT_THEME);

    // Connect camera and scene
    this.uiManager.setCamera(this.camera);
    this.uiManager.setScene(this.scene);
  }

  private createExampleUI(): void {
    // 1. Screen Overlays
    this.createScreenOverlays();

    // 2. World Space UI
    this.createWorldSpaceUI();

    // 3. Entity-based UI (using primitives)
    this.createEntityBasedUI();

    // 4. Interactive UI
    this.createInteractiveUI();
  }

  private createScreenOverlays(): void {
    // Welcome notification
    this.uiManager.createNotification(
      "Welcome to UI System Demo!",
      "success",
      5000
    );

    // HUD elements
    const hudElements = this.uiManager.createHUD([
      { content: '<div class="hud-item">Health: 100/100</div>', anchor: 'top-left' },
      { content: '<div class="hud-item">Score: 0</div>', anchor: 'top-right' },
      { content: '<div class="hud-item">⚙️ Settings</div>', anchor: 'bottom-right' },
    ]);

    // Add custom styles for HUD
    hudElements.forEach(element => {
      if (element.domElement) {
        Object.assign(element.domElement.style, {
          padding: '8px 12px',
          margin: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          borderRadius: '4px',
          fontSize: '14px',
        });
      }
    });

    // Animated overlay
    setTimeout(() => {
      const animatedOverlay = this.uiManager.createOverlay({
        id: "animated-overlay",
        type: "overlay",
        content: '<div style="padding: 20px; background: linear-gradient(45deg, #667eea, #764ba2); color: white; border-radius: 8px;">Animated UI Element</div>',
        anchor: "center",
        visible: false,
      });

      animatedOverlay.setVisible(true);
      this.uiManager.animateElement("animated-overlay", [
        ANIMATION_PRESETS.FADE_IN,
        ANIMATION_PRESETS.SCALE_IN,
      ]);
    }, 2000);
  }

  private createWorldSpaceUI(): void {
    // Tooltip for the player object
    const playerTooltip = this.uiManager.createTooltip(
      this.playerObject,
      "Player Cube"
    );

    // Progress bar in 3D space
    const progressBar = this.uiManager.createProgressBar(
      0.75,
      new THREE.Vector3(2, 1, 0)
    );

    // Custom world space info panel
    const infoPanel = this.uiManager.createWorldSpaceUI({
      id: "info-panel",
      type: "world-space",
      content: `
        <div style="
          background: rgba(255, 255, 255, 0.9);
          padding: 12px;
          border-radius: 8px;
          border: 2px solid #3b82f6;
          min-width: 150px;
          text-align: center;
        ">
          <h4 style="margin: 0 0 8px 0; color: #1e40af;">Object Info</h4>
          <p style="margin: 0; font-size: 12px; color: #64748b;">Interactive 3D Element</p>
        </div>
      `,
      position: new THREE.Vector3(-2, 1, 0),
      billboarding: true,
      distanceScaling: true,
      maxDistance: 20,
    });

    // Floating health bar
    const healthBar = this.uiManager.createWorldSpaceUI({
      id: "health-bar",
      type: "world-space",
      content: `
        <div style="
          background: rgba(0, 0, 0, 0.8);
          padding: 4px 8px;
          border-radius: 12px;
          min-width: 80px;
        ">
          <div style="
            background: #ef4444;
            height: 6px;
            border-radius: 3px;
            position: relative;
            overflow: hidden;
          ">
            <div style="
              background: #22c55e;
              height: 100%;
              width: 80%;
              border-radius: 3px;
              transition: width 0.3s ease;
            "></div>
          </div>
        </div>
      `,
      followTarget: this.playerObject,
      position: new THREE.Vector3(0, 1.5, 0),
      billboarding: true,
    });
  }

  private createEntityBasedUI(): void {
    // Overlay using Entity primitive
    const overlayEntity = new Overlay({
      id: "entity-overlay",
      content: `
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        ">
          <h3 style="margin: 0 0 8px 0;">Entity-based Overlay</h3>
          <p style="margin: 0; opacity: 0.9;">This is created using the Overlay entity primitive</p>
        </div>
      `,
      anchor: "bottom-left",
      offset: { x: 20, y: -80 },
    });

    this.scene.add(overlayEntity);

    // World space UI using Entity primitive
    const worldUIEntity = new WorldSpaceUI({
      id: "entity-world-ui",
      content: `
        <div style="
          background: rgba(34, 197, 94, 0.9);
          color: white;
          padding: 12px;
          border-radius: 6px;
          text-align: center;
          min-width: 120px;
        ">
          <div>🎯</div>
          <div style="font-size: 12px; margin-top: 4px;">Target Point</div>
        </div>
      `,
      position: new THREE.Vector3(0, -1, 2),
      billboarding: true,
    });

    this.scene.add(worldUIEntity);
  }

  private createInteractiveUI(): void {
    // Interactive menu
    const menu = this.uiManager.createOverlay({
      id: "interactive-menu",
      type: "overlay",
      content: `
        <div style="
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          padding: 8px;
          min-width: 120px;
        ">
          <button id="rotate-btn" style="
            width: 100%;
            padding: 8px;
            margin-bottom: 4px;
            border: none;
            background: #3b82f6;
            color: white;
            border-radius: 4px;
            cursor: pointer;
          ">Rotate Cube</button>
          <button id="color-btn" style="
            width: 100%;
            padding: 8px;
            margin-bottom: 4px;
            border: none;
            background: #10b981;
            color: white;
            border-radius: 4px;
            cursor: pointer;
          ">Change Color</button>
          <button id="notify-btn" style="
            width: 100%;
            padding: 8px;
            border: none;
            background: #f59e0b;
            color: white;
            border-radius: 4px;
            cursor: pointer;
          ">Show Notification</button>
        </div>
      `,
      anchor: "top-center",
      offset: { x: 0, y: 20 },
      interactive: true,
    });

    // Add event listeners
    menu.on("click", (event) => {
      const target = event.originalEvent?.target as HTMLElement;
      
      switch (target?.id) {
        case "rotate-btn":
          this.rotatePlayer();
          break;
        case "color-btn":
          this.changePlayerColor();
          break;
        case "notify-btn":
          this.showRandomNotification();
          break;
      }
    });

    // Draggable element example
    const draggableElement = this.uiManager.createOverlay({
      id: "draggable",
      type: "overlay",
      content: `
        <div style="
          background: #8b5cf6;
          color: white;
          padding: 12px;
          border-radius: 8px;
          cursor: move;
          user-select: none;
        ">
          📱 Drag me around!
        </div>
      `,
      anchor: "center",
      offset: { x: 100, y: 100 },
      interactive: true,
    });

    this.makeDraggable(draggableElement);
  }

  private rotatePlayer(): void {
    this.playerObject.rotation.y += Math.PI / 4;
    this.uiManager.createNotification("Cube rotated!", "info", 2000);
  }

  private changePlayerColor(): void {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    (this.playerObject as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: randomColor });
    this.uiManager.createNotification("Color changed!", "success", 2000);
  }

  private showRandomNotification(): void {
    const types = ['success', 'error', 'warning', 'info'] as const;
    const messages = [
      "This is a random notification!",
      "UI system working perfectly!",
      "Three.js + HTML = ❤️",
      "Interactive UI elements are awesome!"
    ];
    
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    this.uiManager.createNotification(randomMessage, randomType, 3000);
  }

  private makeDraggable(element: any): void {
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    const domElement = element.domElement;
    if (!domElement) return;

    domElement.addEventListener('mousedown', (e: MouseEvent) => {
      isDragging = true;
      const rect = domElement.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x - window.innerWidth / 2;
      const newY = e.clientY - dragOffset.y - window.innerHeight / 2;
      
      element.setOffset({ x: newX, y: newY });
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  private startGameLoop(): void {
    let lastTime = 0;

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Animate the player cube
      this.playerObject.rotation.x += 0.01;
      this.playerObject.rotation.z += 0.005;

      // Update UI system
      this.uiManager.update(deltaTime);

      // Render 3D scene
      this.renderer.render(this.scene, this.camera);

      // Render UI overlays
      this.uiManager.render();

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  // Handle window resize
  public handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Usage
export function initializeUIExample(): UISystemExample {
  const example = new UISystemExample();
  
  window.addEventListener('resize', () => {
    example.handleResize();
  });

  return example;
}
