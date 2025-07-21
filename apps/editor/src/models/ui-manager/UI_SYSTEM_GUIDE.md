# UI System User Guide

## How to Create and Edit UI Elements

### Creating UI Elements

1. **Screen Overlay (2D UI)**
   - In the scene panel, click the `+` button
   - Navigate to **User Interface** → **Screen Overlay**
   - This creates a 2D overlay positioned on the screen

2. **World Space UI (3D UI)**
   - In the scene panel, click the `+` button  
   - Navigate to **User Interface** → **World Space UI**
   - This creates a 3D UI element positioned in world space

### Editing UI Elements

When you select a UI entity in the scene, you can edit its properties in the Inspector:

#### Overlay Properties
- **Content (HTML)**: Edit the HTML content directly
- **Anchor Position**: Choose where the overlay is anchored (top-left, center, etc.)
- **Offset X/Y**: Fine-tune positioning with pixel offsets
- **Interactive**: Allow mouse interaction with the overlay
- **Follow Mouse**: Make the overlay follow the mouse cursor
- **Auto Hide**: Automatically hide after a delay
- **Auto Hide Delay**: Time in milliseconds before auto-hiding

#### World Space UI Properties
- **Content (HTML)**: Edit the HTML content directly
- **Position X/Y/Z**: 3D world position
- **Billboarding**: Make the UI always face the camera
- **Distance Scaling**: Scale based on camera distance
- **Occlusion Testing**: Hide when objects are in front
- **Max/Min Distance**: Visibility range limits
- **Interactive**: Allow mouse interaction

### Troubleshooting

If your UI elements are not showing up:

1. **Check if the game is running**: UI elements only render when the game is playing (press Play button)

2. **Open browser console**: Check for errors related to UIManager or entity creation

3. **Run debug test**: Copy and paste the debug script from `debug-test.js` into the browser console

4. **Verify UIManager integration**: Check browser console for these logs:
   ```
   ✓ GameWorld found
   ✓ UIManager found
   Camera set: ✓
   Scene set: ✓
   CSS2D Renderer: ✓
   Overlay container: ✓
   ```

5. **Check HTML content**: Make sure your HTML content is valid and has visible styling:
   ```html
   <div style="background: white; padding: 10px; color: black;">Hello World!</div>
   ```

6. **Check entity creation**: Look for console logs when creating overlay entities:
   ```
   Creating overlay entity...
   Overlay entity created: [Object]
   ```

7. **For World Space UI**: Make sure the position is within camera view and max distance

8. **Check inspector properties**: Verify that content, anchor, and offset values are correct

### Common Issues

- **No background color**: UI elements without background styling may be invisible
- **Wrong position**: Check anchor and offset values
- **Not interactive**: Verify interactive property is set to true
- **Outside viewport**: World space UI may be positioned outside camera view
- **Game not running**: UI only renders during play mode

### HTML Content Examples

#### Simple Text Overlay
```html
<div style="
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-family: system-ui;
">
  <h3 style="margin: 0 0 8px 0;">Game HUD</h3>
  <p style="margin: 0;">Health: 100%</p>
</div>
```

#### Interactive Button
```html
<button style="
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
" onclick="alert('Button clicked!')">
  Click Me
</button>
```

#### Health Bar
```html
<div style="
  background: rgba(0, 0, 0, 0.7);
  padding: 8px;
  border-radius: 4px;
">
  <div style="
    background: #333;
    height: 20px;
    border-radius: 10px;
    overflow: hidden;
  ">
    <div style="
      background: linear-gradient(90deg, #ff4444, #ffaa00, #44ff44);
      height: 100%;
      width: 75%;
      transition: width 0.3s ease;
    "></div>
  </div>
</div>
```

#### World Space Info Panel
```html
<div style="
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  min-width: 120px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
">
  <div style="font-size: 18px; margin-bottom: 4px;">🎯</div>
  <div style="font-size: 12px; font-weight: bold;">Interaction Point</div>
  <div style="font-size: 10px; opacity: 0.8;">Press E to interact</div>
</div>
```

### Live Updates

Changes made in the inspector are applied immediately:
- Editing content updates the HTML
- Changing position/anchor moves the element  
- Toggling visibility shows/hides the element

### Best Practices

1. **Keep HTML simple**: Complex layouts may not render well
2. **Use inline styles**: External CSS may not apply correctly
3. **Test interactivity**: Make sure interactive elements have proper cursor styles
4. **Consider performance**: Limit the number of world space UI elements
5. **Use semantic colors**: Consider dark/light themes in your styling

### Advanced Features

#### React Integration (Coming Soon)
The UI system is designed to support React components in the future.

#### Animation Support
Use CSS transitions for smooth animations:
```html
<div style="transition: all 0.3s ease;">Animated content</div>
```

#### Responsive Design
UI elements can adapt to screen size changes automatically.
