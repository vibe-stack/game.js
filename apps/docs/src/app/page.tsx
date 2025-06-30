import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-slate-900 mb-6">
              Game.js Documentation
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              A powerful 3D game development framework built with Three.js and Electron
            </p>
          </div>

          {/* Quick Start Section */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-3xl font-semibold text-slate-900 mb-4">
              Quick Start
            </h2>
            <p className="text-slate-600 mb-6">
              Get started with Game.js in minutes. Follow our step-by-step guide to create your first 3D scene.
            </p>
            <Link 
              href="/docs/getting-started"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started →
            </Link>
          </div>

          {/* Documentation Sections */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Core Concepts
              </h3>
              <p className="text-slate-600 mb-4">
                Learn about entities, components, and the scene graph system.
              </p>
              <Link 
                href="/docs/core-concepts"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Read more →
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Scripting System
              </h3>
              <p className="text-slate-600 mb-4">
                Create interactive behaviors with our powerful scripting system.
              </p>
              <Link 
                href="/docs/scripting"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Read more →
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Material System
              </h3>
              <p className="text-slate-600 mb-4">
                Create stunning visuals with our advanced material and shader system.
              </p>
              <Link 
                href="/docs/materials"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Read more →
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Physics & Animation
              </h3>
              <p className="text-slate-600 mb-4">
                Add realistic physics and smooth animations to your games.
              </p>
              <Link 
                href="/docs/physics"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Read more →
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-semibold text-slate-900 mb-8 text-center">
              Key Features
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">High Performance</h3>
                <p className="text-slate-600 text-sm">
                  Built on Three.js with WebGPU support for optimal performance
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Visual Editor</h3>
                <p className="text-slate-600 text-sm">
                  Powerful visual editor with real-time preview and debugging
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">TypeScript</h3>
                <p className="text-slate-600 text-sm">
                  Full TypeScript support with excellent developer experience
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
