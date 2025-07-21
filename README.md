# DISCLAIMER
> This project was 99.9% vibe coded. I am releasing it now since cursor's new pricing update is completely and unreasonably out of my budget and i am unable to continue working on this. I could manually code, but this was from the very beginning my personal experiment to push vibe coding to it's (my own) limits.
> I will eventually bring this into a full working state, but the result may look different than what you see today.
> I am absolutely sorry to everyone that hoped to build production ready games with this asap, but i will make that promise come true eventually.

> I have since started working on an agentic IDE called vCode (short for vibe Code) which is exclusive to grok and also MIT licensed.
available under https://github.com/vibe-stack/vcode
> The following of the readme has also been vibe written, so read it or just let your ai agent run wild on it.


# GameJS Editor

A visual game development environment for creating Three.js-based games with the GameJS framework.

## Status

### Working
- Project management: create/open GameJS projects
- Dev server integration: start/stop dev server from editor
- File system integration: open project folders in system file explorer
- Asset and material management (basic)
- Camera and physics managers
- Scripting for entities

### Experimental
- UI Framework
- Material library and preview components
- Integrated code editor
- Settings dialog
- Template system for prototyping

### Missing / Planned
- Visual scene editor (live editing)
- Interactivity beyond mouse (keyboard, touch, controllers)
- Scene switching, asset preloading/streaming
- Sound management and controls
- Material registry for reuse across entities/meshes
- Mesh3D component for unified entity/mesh management
- UI framework for overlays/HUDs
- Runtime/export for full games

## Getting Started

### Development
0. Open the editor folder:
```sh
 cd apps/editor
```

1. Install dependencies:
   ```sh
   pnpm install
   ```
2. Start the development server:
   ```sh
   pnpm start
   ```

### Building for Distribution
1. Build the application:
   ```sh
   pnpm package
   ```
2. Create distributables:
   ```sh
   pnpm make
   ```

## Creating Games
1. Click "New Project" in the editor
2. Enter a project name (e.g., "my-awesome-game")
3. The editor will create a new GameJS project with the CLI
4. Click "Open" to start editing your game
5. Use the "Start" button to run the development server

## Project Structure

- `src/app/` — Game scenes and logic
- `src/main.ts` — Game engine initialization
- `package.json` — Project dependencies
- `vite.config.ts` — Build configuration
- `docs/` — Guides and documentation
- `helpers/` — Utility functions
- `models/` — Core data models (assets, camera, physics, etc.)
- `examples/` — Example scripts and scenes
- `localization/` — Language and i18n files
- `images/` — Demo images and assets

## Architecture

- **Electron** — Desktop application framework
- **React** — UI components
- **TanStack Router** — Application routing
- **Tailwind CSS** — Styling
- **Shadcn UI** — Component library

## Documentation

See the `docs/` folder for guides on geometry rebuilding, material systems, scripting, and more.

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements, bug fixes, or new features.

## License

This project is licensed under the MIT License. See `LICENSE` for details.

## Documentation

See the `docs/` folder for guides on geometry rebuilding, material systems, scripting, and more.

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements, bug fixes, or new features.

## License

This project is licensed under the MIT License. See `LICENSE` for details.
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

# Current Limitations
i am trying to build a game engine library that wraps threejs and rapier3d for easy building of games

i think there are multiple things missing though to make a proper game with this..
- Interactivity currently is limited to mouse, but games can be played in various ways such as keyboards, touchscreen, physical controllers, touch controls (virtual joysticks, buttons)
- Scene switching, preloading OR streaming assets
- Soundmanagement and controls
- A material registry and being able to reuse them across entities/meshes
- Bringing it all together in a Mesh3D component instead of just having primitives
- A UI Framework for overlays, HUDs and more
- A proper runtime for exporting full games