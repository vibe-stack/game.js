import Link from 'next/link'

export default function GettingStarted() {
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
              <li className="text-slate-900">Getting Started</li>
            </ol>
          </nav>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-6">
              Getting Started with Game.js
            </h1>
            
            <div className="prose prose-slate max-w-none">
              <p className="text-lg text-slate-600 mb-8">
                Welcome to Game.js! This guide will help you create your first 3D scene and get familiar with the framework.
              </p>

              <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">
                Prerequisites
              </h2>
              <p className="text-slate-600 mb-4">
                Before you begin, make sure you have the following installed:
              </p>
              <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
                <li>Node.js 18 or higher</li>
                <li>pnpm package manager</li>
                <li>A modern web browser with WebGPU support</li>
              </ul>

              <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">
                Installation
              </h2>
              <p className="text-slate-600 mb-4">
                Clone the repository and install dependencies:
              </p>
              <div className="bg-slate-900 text-slate-100 p-4 rounded-lg mb-6 overflow-x-auto">
                <pre className="text-sm">
                  <code>
{`git clone https://github.com/your-username/game.js.git
cd game.js
pnpm install`}
                  </code>
                </pre>
              </div>

              <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">
                Running the Editor
              </h2>
              <p className="text-slate-600 mb-4">
                Start the development server to launch the visual editor:
              </p>
              <div className="bg-slate-900 text-slate-100 p-4 rounded-lg mb-6 overflow-x-auto">
                <pre className="text-sm">
                  <code>
{`pnpm dev`}
                  </code>
                </pre>
              </div>
              <p className="text-slate-600 mb-6">
                This will start the Electron app with the visual editor. You can now create 3D scenes, add entities, and write scripts.
              </p>

              <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">
                Your First Scene
              </h2>
              <p className="text-slate-600 mb-4">
                Let's create a simple scene with a rotating cube:
              </p>
              
              <div className="bg-slate-900 text-slate-100 p-4 rounded-lg mb-6 overflow-x-auto">
                <pre className="text-sm">
                  <code>
{`// Create a new scene
const scene = new GameWorld();

// Add a cube entity
const cube = scene.createEntity('Cube');
cube.addComponent('mesh', {
  geometry: 'box',
  material: 'standard',
  size: [1, 1, 1]
});

// Add a script to rotate the cube
cube.addComponent('script', {
  code: \`
    export function update(deltaTime) {
      this.rotation.y += deltaTime * 0.5;
    }
  \`
});

// Add a camera
const camera = scene.createEntity('Camera');
camera.addComponent('camera', {
  position: [0, 0, 5],
  lookAt: [0, 0, 0]
});

// Add lighting
const light = scene.createEntity('Light');
light.addComponent('light', {
  type: 'directional',
  position: [5, 5, 5],
  intensity: 1
});`}
                  </code>
                </pre>
              </div>

              <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">
                Key Concepts
              </h2>
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2">Entities</h3>
                  <p className="text-slate-600 text-sm">
                    Everything in your scene is an entity. Entities can have multiple components that define their behavior and appearance.
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2">Components</h3>
                  <p className="text-slate-600 text-sm">
                    Components define what an entity can do. Common components include mesh, camera, light, and script.
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2">Scripts</h3>
                  <p className="text-slate-600 text-sm">
                    Scripts add custom behavior to entities. They run every frame and can access entity properties and components.
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2">Materials</h3>
                  <p className="text-slate-600 text-sm">
                    Materials define how surfaces look and react to light. Game.js supports various material types including PBR materials.
                  </p>
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">
                Next Steps
              </h2>
              <p className="text-slate-600 mb-6">
                Now that you have a basic understanding, explore these topics:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <Link 
                  href="/docs/core-concepts"
                  className="block p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <h3 className="font-semibold text-blue-900 mb-1">Core Concepts</h3>
                  <p className="text-blue-700 text-sm">Learn about entities, components, and the scene graph</p>
                </Link>
                <Link 
                  href="/docs/scripting"
                  className="block p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <h3 className="font-semibold text-green-900 mb-1">Scripting System</h3>
                  <p className="text-green-700 text-sm">Create interactive behaviors with scripts</p>
                </Link>
                <Link 
                  href="/docs/materials"
                  className="block p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <h3 className="font-semibold text-purple-900 mb-1">Material System</h3>
                  <p className="text-purple-700 text-sm">Create stunning visuals with materials and shaders</p>
                </Link>
                <Link 
                  href="/docs/physics"
                  className="block p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <h3 className="font-semibold text-orange-900 mb-1">Physics & Animation</h3>
                  <p className="text-orange-700 text-sm">Add realistic physics and animations</p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 