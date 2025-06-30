import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="font-semibold text-slate-900">Game.js</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/docs"
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              Documentation
            </Link>
            <Link 
              href="/docs/getting-started"
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              Getting Started
            </Link>
            <Link 
              href="https://github.com/your-username/game.js"
              className="text-slate-600 hover:text-slate-900 font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
} 