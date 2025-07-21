# UI System Integration Guide

## Quick Integration Steps

### 1. Initialize in your Scene

```typescript
import { UIManager, initializeUIStyles, DEFAULT_THEME } from "@/models";

export default class MyScene extends Scene {
  private uiManager: UIManager;

  async init(): Promise<void> {
    // Get UI manager instance
    this.uiManager = UIManager.getInstance();
    
    // Initialize default styles
    initializeUIStyles();
    
    // Set theme
    this.uiManager.setTheme(DEFAULT_THEME);
    
    // Connect camera and scene
    this.uiManager.setCamera(this.camera);
    this.uiManager.setScene(this.scene);
    
    // Create your UI elements
    this.createUI();
  }

  private createUI(): void {
    // Create a simple HUD
    this.uiManager.createHUD([
      { content: '<div>Health: 100</div>', anchor: 'top-left' },
      { content: '<div>Score: 0</div>', anchor: 'top-right' },
    ]);
    
    // Welcome notification
    this.uiManager.createNotification("Game Started!", "success");
  }

  update(deltaTime: number): void {
    // Update UI system
    this.uiManager.update(deltaTime);
    
    // Your scene update logic...
  }

  // Add this to your render loop
  render(): void {
    // Render 3D scene first
    this.renderer.render(this.scene, this.camera);
    
    // Then render UI overlays
    this.uiManager.render();
  }
}
```

### 2. Using Entity Primitives

```typescript
import { Overlay, WorldSpaceUI } from "@/models";

// Create overlay entity
const healthBar = new Overlay({
  content: '<div class="health-bar">Health: 100/100</div>',
  anchor: 'top-left',
  offset: { x: 20, y: 20 },
});

// Add to scene
this.scene.add(healthBar);

// Create 3D world UI
const nameTag = new WorldSpaceUI({
  content: '<div class="name-tag">Player</div>',
  position: new THREE.Vector3(0, 2, 0),
  billboarding: true,
  followTarget: playerObject,
});

this.scene.add(nameTag);
```

### 3. Common Patterns

#### Dynamic Health Bar
```typescript
class HealthBarUI {
  private healthBar: ReturnType<UIManager['createOverlay']>;
  
  constructor(private uiManager: UIManager) {
    this.healthBar = this.uiManager.createOverlay({
      id: 'health-bar',
      type: 'overlay',
      content: this.createHealthBarHTML(100),
      anchor: 'top-left',
      offset: { x: 20, y: 20 },
    });
  }
  
  updateHealth(health: number, maxHealth: number = 100): void {
    this.healthBar.updateContent(this.createHealthBarHTML(health, maxHealth));
  }
  
  private createHealthBarHTML(health: number, maxHealth: number = 100): string {
    const percentage = (health / maxHealth) * 100;
    return `
      <div style="
        background: rgba(0, 0, 0, 0.8);
        padding: 8px 12px;
        border-radius: 6px;
        color: white;
        font-family: monospace;
      ">
        <div>Health: ${health}/${maxHealth}</div>
        <div style="
          background: #333;
          height: 4px;
          border-radius: 2px;
          margin-top: 4px;
          overflow: hidden;
        ">
          <div style="
            background: ${percentage > 30 ? '#22c55e' : '#ef4444'};
            height: 100%;
            width: ${percentage}%;
            transition: width 0.3s ease;
          "></div>
        </div>
      </div>
    `;
  }
}
```

#### Interactive Object Labels
```typescript
function addInteractiveLabel(object: THREE.Object3D, text: string, onInteract: () => void) {
  const label = uiManager.createWorldSpaceUI({
    id: `label-${object.uuid}`,
    type: 'world-space',
    content: `
      <div class="interactive-label" style="
        background: rgba(59, 130, 246, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
      ">
        ${text}
      </div>
    `,
    followTarget: object,
    billboarding: true,
    maxDistance: 10,
    interactive: true,
  });
  
  label.on('click', onInteract);
  
  // Add hover effects
  label.on('hover', () => {
    if (label.domElement) {
      label.domElement.style.transform = 'scale(1.1)';
      label.domElement.style.background = 'rgba(59, 130, 246, 1)';
    }
  });
  
  return label;
}
```

#### Notification System
```typescript
class NotificationManager {
  private notifications: Array<{id: string, element: any}> = [];
  
  constructor(private uiManager: UIManager) {}
  
  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 5000) {
    const id = `notification-${Date.now()}`;
    const notification = this.uiManager.createOverlay({
      id,
      type: 'overlay',
      content: `
        <div class="notification notification--${type}" style="
          background: ${this.getTypeColor(type)};
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transform: translateX(100%);
          transition: transform 0.3s ease;
        ">
          ${message}
        </div>
      `,
      anchor: 'top-right',
      offset: { x: -20, y: 20 + (this.notifications.length * 60) },
    });
    
    // Animate in
    setTimeout(() => {
      if (notification.domElement) {
        notification.domElement.style.transform = 'translateX(0)';
      }
    }, 100);
    
    this.notifications.push({ id, element: notification });
    
    // Auto remove
    setTimeout(() => {
      this.remove(id);
    }, duration);
    
    return notification;
  }
  
  private remove(id: string) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) return;
    
    const notification = this.notifications[index];
    
    // Animate out
    if (notification.element.domElement) {
      notification.element.domElement.style.transform = 'translateX(100%)';
    }
    
    setTimeout(() => {
      this.uiManager.removeElement(id);
      this.notifications.splice(index, 1);
      this.repositionNotifications();
    }, 300);
  }
  
  private repositionNotifications() {
    this.notifications.forEach((notification, index) => {
      notification.element.setOffset({ 
        x: -20, 
        y: 20 + (index * 60) 
      });
    });
  }
  
  private getTypeColor(type: string): string {
    const colors = {
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    };
    return colors[type as keyof typeof colors] || colors.info;
  }
}
```

## CSS Integration

Add these styles to your global CSS:

```css
/* UI Component Styles */
.interactive-label:hover {
  transform: scale(1.05) !important;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.health-bar {
  font-family: 'Courier New', monospace;
  user-select: none;
}

.notification {
  position: relative;
  overflow: hidden;
}

.notification::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 4px;
  background: rgba(255, 255, 255, 0.3);
}

/* Responsive UI */
@media (max-width: 768px) {
  .ui-hud-element {
    font-size: 12px;
    padding: 6px 8px;
  }
}
```

## TypeScript Integration

```typescript
// Extend the UI system for your game
interface GameUIConfig {
  showHealthBar: boolean;
  showMinimap: boolean;
  showInventory: boolean;
}

class GameUI {
  constructor(
    private uiManager: UIManager,
    private config: GameUIConfig
  ) {}
  
  initialize() {
    if (this.config.showHealthBar) {
      this.createHealthBar();
    }
    // ... other UI elements
  }
  
  // Type-safe UI creation methods
  createHealthBar(): HealthBarUI {
    return new HealthBarUI(this.uiManager);
  }
}
```

This UI system provides a solid foundation for both simple HUD elements and complex 3D UI interactions. The modular design makes it easy to extend and customize for your specific game needs.
