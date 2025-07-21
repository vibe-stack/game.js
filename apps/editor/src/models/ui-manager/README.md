# UI System Documentation

The UI system provides comprehensive support for both screen overlays and 3D world space UI elements in your Three.js game engine.

## Features

- **Screen Overlays**: 2D UI elements that stay fixed on screen
- **3D World Space UI**: HTML elements positioned in 3D space
- **Theme System**: Customizable themes with colors, fonts, and spacing
- **Animation System**: Built-in animations and transitions
- **Layout System**: Flexbox and grid layout support
- **Event System**: Rich interaction callbacks
- **React Integration Ready**: Structure for easy React component integration

## Quick Start

### 1. Initialize the UI System

```typescript
import { UIManager, initializeUIStyles, DEFAULT_THEME } from "@/models";

// Initialize the UI manager
const uiManager = UIManager.getInstance();

// Set up default styles
initializeUIStyles();

// Apply a theme
uiManager.setTheme(DEFAULT_THEME);

// Connect to your camera and scene
uiManager.setCamera(camera);
uiManager.setScene(scene);
```

### 2. Create Screen Overlays

```typescript
// Simple notification
const notification = uiManager.createNotification(
  "Welcome to the game!", 
  "success", 
  5000
);

// Custom overlay
const hudElement = uiManager.createOverlay({
  id: "health-bar",
  type: "overlay",
  content: `
    <div class="hud-element">
      <span>Health: 100/100</span>
    </div>
  `,
  anchor: "top-left",
  offset: { x: 20, y: 20 },
  className: "ui-hud-element",
});

// Interactive overlay with events
const menu = uiManager.createOverlay({
  id: "main-menu",
  type: "overlay",
  content: `
    <div class="menu">
      <button id="start-btn">Start Game</button>
      <button id="settings-btn">Settings</button>
    </div>
  `,
  anchor: "center",
  interactive: true,
});

menu.on("click", (event) => {
  if (event.originalEvent?.target?.id === "start-btn") {
    console.log("Starting game...");
  }
});
```

### 3. Create 3D World Space UI

```typescript
// Tooltip that follows an object
const playerTooltip = uiManager.createTooltip(
  playerObject, 
  "Player Name"
);

// Progress bar in 3D space
const progressBar = uiManager.createProgressBar(
  0.75, // 75% progress
  new THREE.Vector3(0, 2, 0)
);

// Custom world space UI
const worldUI = uiManager.createWorldSpaceUI({
  id: "info-panel",
  type: "world-space",
  content: `
    <div class="info-panel">
      <h3>Interactive Object</h3>
      <p>Click to interact</p>
    </div>
  `,
  position: new THREE.Vector3(5, 1, 0),
  billboarding: true,
  distanceScaling: true,
  maxDistance: 20,
});
```

### 4. Using UI Primitives (Entity-based)

```typescript
import { Overlay, WorldSpaceUI } from "@/models";

// Create overlay entity
const overlayEntity = new Overlay({
  content: "<div>Overlay Content</div>",
  anchor: "bottom-right",
  offset: { x: -20, y: -20 },
});

// Add to scene
scene.add(overlayEntity);

// Create world space UI entity
const worldUIEntity = new WorldSpaceUI({
  content: "<div>3D UI Element</div>",
  position: new THREE.Vector3(0, 1, 0),
  billboarding: true,
});

// Add to scene
scene.add(worldUIEntity);
```

## Advanced Usage

### Custom Themes

```typescript
import { UITheme } from "@/models";

const customTheme: UITheme = {
  name: "game-theme",
  colors: {
    primary: "#ff6b35",
    secondary: "#004e89",
    success: "#00f5ff",
    warning: "#ffaa00",
    error: "#ff4757",
    background: "#1a1a2e",
    surface: "#16213e",
    text: "#ffffff",
    textSecondary: "#a0a0a0",
    border: "#eee",
  },
  fonts: {
    primary: "Orbitron, monospace",
    mono: "Fira Code, monospace",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 2,
    md: 4,
    lg: 8,
    xl: 12,
  },
  shadows: {
    sm: "0 0 10px rgba(0, 245, 255, 0.3)",
    md: "0 0 20px rgba(0, 245, 255, 0.5)",
    lg: "0 0 30px rgba(0, 245, 255, 0.7)",
  },
  breakpoints: [
    { name: "sm", minWidth: 640 },
    { name: "md", minWidth: 768 },
    { name: "lg", minWidth: 1024 },
    { name: "xl", minWidth: 1280 },
  ],
};

uiManager.setTheme(customTheme);
```

### Animations

```typescript
import { ANIMATION_PRESETS } from "@/models";

// Animate an element
uiManager.animateElement("menu", [
  ANIMATION_PRESETS.FADE_IN,
  {
    property: "transform",
    from: "scale(0.8)",
    to: "scale(1)",
    duration: 300,
    easing: "ease-out",
    delay: 100,
  }
]);
```

### Layout System

```typescript
import { FLEX_LAYOUTS } from "@/models";

// Apply layout to multiple elements
uiManager.applyLayout(
  ["button-1", "button-2", "button-3"],
  {
    type: "flex",
    direction: "row",
    justify: "space-between",
    align: "center",
    gap: 16,
  }
);

// Or use presets
uiManager.applyLayout(
  ["nav-item-1", "nav-item-2"],
  FLEX_LAYOUTS.ROW_CENTER
);
```

### React Integration (Future)

```typescript
// This structure is ready for React integration
interface ReactComponentProps {
  title: string;
  onClose: () => void;
}

const MyReactComponent: React.FC<ReactComponentProps> = ({ title, onClose }) => {
  return (
    <div className="modal">
      <h2>{title}</h2>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

// Future API (placeholder)
uiManager.mountReactComponent("modal", MyReactComponent, {
  title: "Settings",
  onClose: () => uiManager.removeElement("modal"),
});
```

## Integration with Game Loop

```typescript
// In your main game loop
function animate(deltaTime: number) {
  // Update UI system
  uiManager.update(deltaTime);
  
  // Update scene
  scene.update(deltaTime);
  
  // Render 3D scene
  renderer.render(scene, camera);
  
  // Render UI overlays
  uiManager.render();
  
  requestAnimationFrame(animate);
}
```

## CSS Classes and Styling

The UI system automatically creates these CSS classes:

- `.ui-notification` - Base notification styles
- `.ui-notification--success` - Success notification variant
- `.ui-notification--error` - Error notification variant
- `.ui-notification--warning` - Warning notification variant
- `.ui-notification--info` - Info notification variant
- `.ui-tooltip` - Tooltip styles
- `.ui-hud-element` - HUD element styles
- `.ui-progress-bar` - Progress bar container
- `.ui-progress-fill` - Progress bar fill

You can override these styles or create your own:

```css
.ui-notification {
  border-left: 4px solid var(--ui-color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.custom-ui-element {
  background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

## Best Practices

1. **Performance**: Use `removeElement()` to clean up UI elements you no longer need
2. **Responsive Design**: Use the breakpoint system for responsive layouts
3. **Accessibility**: Include proper ARIA labels and keyboard navigation
4. **Theme Consistency**: Use theme colors and spacing for consistent design
5. **Event Handling**: Use the built-in event system rather than direct DOM manipulation
6. **World Space UI**: Use billboarding for UI that should always face the camera
7. **Distance Culling**: Set appropriate min/max distances for 3D UI elements

## Common Patterns

### HUD System
```typescript
function createGameHUD() {
  const elements = [
    { content: '<div id="health">Health: 100</div>', anchor: 'top-left' },
    { content: '<div id="score">Score: 0</div>', anchor: 'top-right' },
    { content: '<div id="minimap">🗺️</div>', anchor: 'bottom-right' },
  ];
  
  return uiManager.createHUD(elements);
}
```

### Interactive Object Labels
```typescript
function addObjectLabel(object: THREE.Object3D, text: string) {
  return uiManager.createWorldSpaceUI({
    id: `label-${object.uuid}`,
    type: 'world-space',
    content: `<div class="object-label">${text}</div>`,
    followTarget: object,
    billboarding: true,
    maxDistance: 15,
  });
}
```

### Dynamic Notifications
```typescript
class NotificationSystem {
  private queue: Array<{message: string, type: string}> = [];
  
  show(message: string, type = 'info') {
    this.queue.push({ message, type });
    this.processQueue();
  }
  
  private processQueue() {
    if (this.queue.length === 0) return;
    
    const { message, type } = this.queue.shift()!;
    const notification = uiManager.createNotification(message, type as any);
    
    notification.on('unmount', () => {
      setTimeout(() => this.processQueue(), 500);
    });
  }
}
```
