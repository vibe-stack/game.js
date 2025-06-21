# Material Editor

A comprehensive material editor for the game engine with support for all THREE.js material types.

## Features

### ✅ Implemented Features

- **Floating Panel**: Draggable material editor that can be moved around the screen
- **Material Library**: Browse and search existing materials with category filtering
- **Material Preview**: Live preview of materials while editing
- **Property Editing**: Full support for all material types with appropriate controls
- **Type Selection**: Switch between different material types (Basic, Lambert, Phong, Standard, Physical, Toon)
- **Drag Inputs**: All numerical values use the drag-input component for smooth editing
- **Material Registry**: Integrates with the central material system
- **Modal-like Interface**: Functions like a modal without backdrop, with Cancel/Apply buttons

### 🎯 How to Use

1. **Opening the Editor**: Select any entity with materials (3D meshes), go to Properties Sidebar → Inspector → Materials section → Click "Edit" button
2. **Browsing Materials**: Use the left panel to search and filter materials by category
3. **Editing Materials**: Select a material and edit its properties in the right panel
4. **Live Preview**: See changes in real-time with the material preview sphere
5. **Applying Changes**: Click "Apply Material" to assign the material to the selected entity

## Architecture

### Component Structure

```
material-editor/
├── index.tsx                          # Main entry point
├── material-editor-dialog.tsx         # Main dialog with drag functionality
├── material-library.tsx               # Material list with search/filter
├── material-preview.tsx               # Live preview component
├── material-properties.tsx            # Property editor dispatcher
├── material-type-selector.tsx         # Material type selection
└── properties/
    ├── basic-material-properties.tsx     # Basic material editor
    ├── standard-material-properties.tsx  # Standard PBR material editor
    ├── physical-material-properties.tsx  # Physical material editor
    ├── lambert-material-properties.tsx   # Lambert material editor
    ├── phong-material-properties.tsx     # Phong material editor
    └── toon-material-properties.tsx      # Toon material editor
```

### Integration Points

- **Game Studio Store**: Material editor state management
- **Entity Properties Registry**: Materials section integration
- **Material System**: Central material registry and management
- **Preview Component**: Reuses existing material preview component

## Material Types Supported

### Basic Material
- Color
- Opacity
- Wireframe toggle
- Transparency toggle
- Side selection (Front/Back/Double)

### Lambert Material
- All Basic properties
- Emissive color & intensity

### Phong Material
- All Lambert properties
- Specular color & shininess

### Standard Material (PBR)
- All Basic properties
- Metalness & Roughness (PBR workflow)
- Emissive color & intensity
- Environment map intensity

### Physical Material (Advanced PBR)
- All Standard properties
- Clearcoat & clearcoat roughness
- Index of Refraction (IOR)
- Transmission & thickness
- Iridescence effects
- Sheen properties

### Toon Material
- All Lambert properties
- Cartoon-style shading

## Technical Details

### Drag Functionality
- Implements custom drag handling for the dialog header
- Maintains position state and provides smooth dragging experience
- Prevents interference with other UI elements during drag

### State Management
```typescript
// Store state
materialEditorOpen: boolean
materialEditorEntity: string | null

// Actions
setMaterialEditorOpen(open: boolean)
setMaterialEditorEntity(entityId: string | null)
```

### Material System Integration
- Uses singleton `materialSystem` instance
- Reads from material registry with `getAllMaterialDefinitions()`
- Supports material search and filtering
- Initializes with default materials

### Type Safety
- Full TypeScript support with proper interfaces
- Handles optional properties safely
- Uses drag-input component for consistent numerical input behavior

## Future Enhancements

### 🚧 Planned Features

- **Material Creation**: Add new materials to the library
- **Texture Support**: Load and assign textures to material properties
- **Material Saving**: Save custom materials to project
- **Multi-material Support**: Handle entities with multiple materials
- **Shader Graph Integration**: Visual shader editor for custom materials
- **Material Templates**: Preset material configurations
- **Import/Export**: Share materials between projects

### 🔧 Technical Improvements

- **Performance**: Optimize preview rendering for complex materials
- **Validation**: Add property validation and constraints
- **Undo/Redo**: Material editing history
- **Hotkeys**: Keyboard shortcuts for common operations
- **Responsive Design**: Better mobile/tablet support

## Dependencies

- THREE.js (material creation and rendering)
- React Three Fiber (preview rendering)
- Lucide React (icons)
- Tailwind CSS (styling)
- Custom UI components (DragInput, Button, etc.)

## Notes

- All numerical inputs use the DragInput component for consistent UX
- Material preview updates in real-time as properties change
- The editor is fully compatible with THREE.js and WebGPU
- Small, modular file structure with ~350 lines max per file
- No console.log debugging as per project guidelines 