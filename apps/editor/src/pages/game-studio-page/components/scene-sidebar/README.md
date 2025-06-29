# Scene Sidebar - Drag and Drop Implementation

This directory contains a complete drag-and-drop implementation for the scene tree using `@dnd-kit`.

## Files Added/Modified

### New Files:
- `tree-utils.ts` - Utility functions for tree manipulation and drag operations
- `sortable-entity-item.tsx` - New entity item component with drag and drop support

### Modified Files:
- `scene-tree.tsx` - Updated to use the new drag and drop system

## Features Implemented

### Full Drag and Drop Support
- **Reordering**: Drag entities to reorder them within their parent
- **Reparenting**: Drag entities to become children of other entities
- **Unparenting**: Drag entities to the scene root or different parent

### Visual Feedback
- **Drag handles**: Visible grip icons for clear drag interaction
- **Drop indicators**: Blue lines show where items will be dropped
- **Parent highlighting**: Visual feedback when dropping as a child

### Game Engine Integration
- **Real hierarchy changes**: All drag operations update the actual THREE.js scene hierarchy
- **Entity registry updates**: Proper integration with the game engine's entity system
- **Physics preservation**: Maintains physics relationships when moving entities

### Smart Validation
- **Prevents circular dependencies**: Can't drag a parent into its own children
- **Maintains tree integrity**: Ensures valid parent-child relationships
- **Expanded state handling**: Respects collapsed/expanded nodes during operations

## Usage

The drag and drop system is automatically active when entities are present in the scene. Users can:

1. **Drag by the grip handle**: The vertical grip icon (⋮⋮) on the left of each entity
2. **Drop between items**: Creates sibling relationships
3. **Drop onto items**: Creates parent-child relationships
4. **Visual feedback**: Blue indicators show drop zones

## Technical Details

### Tree Flattening
The hierarchical tree is flattened into a linear structure for `@dnd-kit` compatibility, while maintaining depth and ancestry information.

### Drop Operation Types
- **Sibling**: Insert before/after another entity at the same level
- **Child**: Make the dragged entity a child of the target entity

### Game Engine Integration
- Uses `entity.add()` and `entity.removeFromParent()` for hierarchy changes
- Maintains proper THREE.js scene graph structure
- Updates entity registry for proper cleanup and referencing

## Dependencies

- `@dnd-kit/core` - Core drag and drop functionality
- `@dnd-kit/sortable` - Sortable tree support
- `@dnd-kit/utilities` - Transform utilities

All dependencies are already installed in the project.

## Future Enhancements

- Multi-select drag and drop
- Drag and drop between different tree sections
- Undo/redo support for drag operations
- Custom drag previews with entity icons 