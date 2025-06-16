# GameJS Editor

A visual game development environment for creating Three.js-based games with the GameJS framework.

## Features

- **Project Management**: Create, open, and manage GameJS projects
- **Visual Editor**: Live editing capabilities for game scenes (coming soon)
- **Dev Server Integration**: Start and stop development servers directly from the editor
- **File System Integration**: Open project folders in your system file explorer

## Getting Started

### Development

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm start
```

### Building for Distribution

1. Build the application:
```bash
pnpm package
```

2. Create distributables:
```bash
pnpm make
```

## Creating Games

1. Click "New Project" in the editor
2. Enter a project name (e.g., "my-awesome-game")
3. The editor will create a new GameJS project with the CLI
4. Click "Open" to start editing your game
5. Use the "Start" button to run the development server

## Project Structure

GameJS projects created by the editor include:

- `src/app/` - Game scenes and logic
- `src/main.ts` - Game engine initialization
- `package.json` - Project dependencies
- `vite.config.ts` - Build configuration

## Architecture

The editor is built with:

- **Electron** - Desktop application framework
- **React** - UI components
- **TanStack Router** - Application routing
- **Tailwind CSS** - Styling
- **Shadcn UI** - Component library

The editor communicates with the GameJS CLI to create and manage projects, and integrates with the dev server to provide live editing capabilities.

## Future Features

- Visual scene editor with drag-and-drop
- Asset management
- Component property editing
- Real-time preview
- Deployment tools


# dump for prompts
i am trying to build a game engine library that wraps threejs and rapier3d for easy building of games

i think there are multiple things missing though to make a proper game with this..
- Interactivity currently is limited to mouse, but games can be played in various ways such as keyboards, touchscreen, physical controllers, touch controls (virtual joysticks, buttons)
- Scene switching, preloading OR streaming assets
- Soundmanagement and controls
- A material registry and being able to reuse them across entities/meshes
- Bringing it all together in a Mesh3D component instead of just having primitives
- 
- Scripting support: I have, on another branch, a full scripting setup that then compiles scripts, imports them and then allows me to dynamically inject them in the editor (for export builds they will all be bundled and precompiled together, but that's not something for now), but it was a different architecture and here i need the ability to fully allow scripts to interact with their entities and also different managers and the gameworld etc. so scripts are actually powerful