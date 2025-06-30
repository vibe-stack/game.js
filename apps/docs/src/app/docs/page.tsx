import Link from 'next/link'

export default function DocsIndex() {
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
              <li className="text-slate-900">Documentation</li>
            </ol>
          </nav>

          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Documentation
            </h1>
            <p className="text-lg text-slate-600">
              Learn how to build amazing 3D games and applications with Game.js
            </p>
          </div>

          {/* Getting Started Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              🚀 Getting Started
            </h2>
            <p className="text-slate-600 mb-6">
              New to Game.js? Start here to learn the basics and create your first 3D scene.
            </p>
            <Link 
              href="/docs/getting-started"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started →
            </Link>
          </div>

          {/* Documentation Categories */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Core Documentation */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                📚 Core Documentation
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    href="/docs/core-concepts"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Core Concepts
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Entities, components, and the scene graph system
                  </p>
                </li>
                <li>
                  <Link 
                    href="/docs/entities"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Entities & Components
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Understanding the entity-component architecture
                  </p>
                </li>
                <li>
                  <Link 
                    href="/docs/scene-management"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Scene Management
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Creating and managing 3D scenes
                  </p>
                </li>
              </ul>
            </div>

            {/* Development Tools */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                🛠️ Development Tools
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    href="/docs/visual-editor"
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Visual Editor
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Using the visual editor for scene creation
                  </p>
                </li>
                <li>
                  <Link 
                    href="/docs/debugging"
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Debugging
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Tools and techniques for debugging your scenes
                  </p>
                </li>
                <li>
                  <Link 
                    href="/docs/performance"
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Performance Optimization
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Tips for optimizing your 3D applications
                  </p>
                </li>
              </ul>
            </div>

            {/* Scripting & Logic */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                💻 Scripting & Logic
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    href="/docs/scripting"
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Scripting System
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Creating interactive behaviors with scripts
                  </p>
                </li>
                <li>
                  <Link 
                    href="/docs/script-api"
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Script API Reference
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Complete API reference for scripting
                  </p>
                </li>
                <li>
                  <Link 
                    href="/docs/events"
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Event System
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Handling events and communication between entities
                  </p>
                </li>
              </ul>
            </div>

            {/* Graphics & Materials */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                🎨 Graphics & Materials
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    href="/docs/materials"
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Material System
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Creating and customizing materials
                  </p>
                </li>
                <li>
                  <Link 
                    href="/docs/shaders"
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Shader System
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Writing custom shaders with TSL
                  </p>
                </li>
                <li>
                  <Link 
                    href="/docs/lighting"
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Lighting & Shadows
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Setting up lighting and shadow systems
                  </p>
                </li>
              </ul>
            </div>

            {/* Physics & Animation */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                ⚡ Physics & Animation
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    href="/docs/physics"
                    className="text-red-600 hover:text-red-700 font-medium"
                  >
                    Physics System
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Adding realistic physics to your scenes
                  </p>
                </li>
                <li>
                  <Link 
                    href="/docs/animations"
                    className="text-red-600 hover:text-red-700 font-medium"
                  >
                    Animation System
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Creating smooth animations and transitions
                  </p>
                </li>
                <li>
                  <Link 
                    href="/docs/character-controller"
                    className="text-red-600 hover:text-red-700 font-medium"
                  >
                    Character Controller
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Building character movement and controls
                  </p>
                </li>
              </ul>
            </div>

            {/* Advanced Topics */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                🔬 Advanced Topics
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    href="/docs/asset-pipeline"
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Asset Pipeline
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Managing and optimizing 3D assets
                  </p>
                </li>
                <li>
                  <Link 
                    href="/docs/exporting"
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Exporting & Deployment
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Building and deploying your applications
                  </p>
                </li>
                <li>
                  <Link 
                    href="/docs/plugins"
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Plugin System
                  </Link>
                  <p className="text-slate-600 text-sm mt-1">
                    Extending Game.js with custom plugins
                  </p>
                </li>
              </ul>
            </div>
          </div>

          {/* Examples & Tutorials */}
          <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">
              📖 Examples & Tutorials
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎮</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Game Examples</h3>
                <p className="text-slate-600 text-sm mb-4">
                  Complete game examples to learn from
                </p>
                <Link 
                  href="/docs/examples"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  View Examples →
                </Link>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Tutorials</h3>
                <p className="text-slate-600 text-sm mb-4">
                  Step-by-step tutorials for common tasks
                </p>
                <Link 
                  href="/docs/tutorials"
                  className="text-green-600 hover:text-green-700 font-medium text-sm"
                >
                  Browse Tutorials →
                </Link>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔧</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Cookbook</h3>
                <p className="text-slate-600 text-sm mb-4">
                  Common patterns and solutions
                </p>
                <Link 
                  href="/docs/cookbook"
                  className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                >
                  View Cookbook →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 