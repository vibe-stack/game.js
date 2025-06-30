import Link from 'next/link'

export default function CoreConcepts() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm text-slate-600">
              <li>
                <Link href="/" className="hover:text-slate-900">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/docs" className="hover:text-slate-900">
                  Docs
                </Link>
              </li>
              <li>/</li>
              <li className="text-slate-900">Core Concepts</li>
            </ol>
          </nav>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-6">
              Core Concepts
            </h1>
            
            <div className="prose prose-slate max-w-none">
              <p className="text-lg text-slate-600 mb-8">
                Game.js is built around a few key concepts that make it powerful and flexible. Understanding these concepts will help you build better 3D applications.
              </p>

              <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">
                Entity-Component System (ECS)
              </h2>
              <p className="text-slate-600 mb-4">
                Game.js uses an Entity-Component System architecture, which is a popular pattern in game development. This system provides flexibility and performance by separating data from behavior.
              </p>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2">Entities</h3>
                  <p className="text-slate-600 text-sm">
                    Entities are the basic objects in your scene. They can represent anything from a simple cube to a complex character with multiple behaviors.
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2">Components</h3>
                  <p className="text-slate-600 text-sm">
                    Components define what an entity can do. They contain data and behavior. An entity can have multiple components.
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2">Systems</h3>
                  <p className="text-slate-600 text-sm">
                    Systems process entities with specific components. They handle the logic and behavior of your application.
                  </p>
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">
                Scene Graph
              </h2>
              <p className="text-slate-600 mb-4">
                The scene graph is a hierarchical structure that represents the spatial relationships between entities in your 3D world.
              </p>
              
              <div className="bg-slate-900 text-slate-100 p-4 rounded-lg mb-6 overflow-x-auto">
                <pre className="text-sm">
                  <code>
{`// Scene graph example
Scene
├── Camera
├── Light
└── Player
    ├── Body
    │   ├── Head
    │   ├── Torso
    │   └── Arms
    └── Weapon
        └── Muzzle`}
                  </code>
                </pre>
              </div>

              <p className="text-slate-600 mb-6">
                When you move a parent entity, all its children move with it. This makes it easy to create complex objects and animations.
              </p>

              <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">
                Common Components
              </h2>
              <div className="space-y-6">
                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Transform Component</h3>
                  <p className="text-slate-600 mb-3">
                    Every entity has a transform component that defines its position, rotation, and scale in 3D space.
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto">
                    <pre>
                      <code>
{`entity.addComponent('transform', {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1]
});`}
                      </code>
                    </pre>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Mesh Component</h3>
                  <p className="text-slate-600 mb-3">
                    The mesh component defines the visual appearance of an entity. It includes geometry and material information.
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto">
                    <pre>
                      <code>
{`entity.addComponent('mesh', {
  geometry: 'box',
  material: 'standard',
  size: [1, 1, 1]
});`}
                      </code>
                    </pre>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Script Component</h3>
                  <p className="text-slate-600 mb-3">
                    Scripts add custom behavior to entities. They run every frame and can access entity properties and components.
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto">
                    <pre>
                      <code>
{`entity.addComponent('script', {
  code: \`
    export function update(deltaTime) {
      this.rotation.y += deltaTime * 0.5;
    }
  \`
});`}
                      </code>
                    </pre>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Camera Component</h3>
                  <p className="text-slate-600 mb-3">
                    The camera component defines how the scene is viewed. You can have multiple cameras and switch between them.
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto">
                    <pre>
                      <code>
{`entity.addComponent('camera', {
  type: 'perspective',
  fov: 75,
  near: 0.1,
  far: 1000,
  position: [0, 0, 5]
});`}
                      </code>
                    </pre>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Light Component</h3>
                  <p className="text-slate-600 mb-3">
                    Lights illuminate the scene. Game.js supports various light types including directional, point, and spot lights.
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto">
                    <pre>
                      <code>
{`entity.addComponent('light', {
  type: 'directional',
  position: [5, 5, 5],
  intensity: 1,
  color: [1, 1, 1]
});`}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">
                Game World
              </h2>
              <p className="text-slate-600 mb-4">
                The GameWorld is the main container that manages all entities, systems, and the rendering loop. It's your entry point into the Game.js framework.
              </p>
              
              <div className="bg-slate-900 text-slate-100 p-4 rounded-lg mb-6 overflow-x-auto">
                <pre className="text-sm">
                  <code>
{`import { GameWorld } from 'game.js';

// Create a new game world
const world = new GameWorld();

// Add entities to the world
const cube = world.createEntity('Cube');
cube.addComponent('mesh', { geometry: 'box' });

// Start the game loop
world.start();`}
                  </code>
                </pre>
              </div>

              <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">
                Next Steps
              </h2>
              <p className="text-slate-600 mb-6">
                Now that you understand the core concepts, you can explore more advanced topics:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <Link 
                  href="/docs/scripting"
                  className="block p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <h3 className="font-semibold text-blue-900 mb-1">Scripting System</h3>
                  <p className="text-blue-700 text-sm">Learn how to create custom behaviors with scripts</p>
                </Link>
                <Link 
                  href="/docs/materials"
                  className="block p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <h3 className="font-semibold text-green-900 mb-1">Material System</h3>
                  <p className="text-green-700 text-sm">Create stunning visuals with materials and shaders</p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 