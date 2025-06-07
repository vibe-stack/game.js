import React from 'react'

export function RightPanel() {
  return (
    <div className="fixed right-4 top-20 bottom-4 w-80 z-10 bg-gray-900/40 backdrop-blur-md rounded-xl border border-gray-800/50 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-800/50">
        <h2 className="text-sm font-medium text-gray-300">Inspector</h2>
      </div>
      <div className="flex-1 p-4">
        <div className="text-center text-gray-500 text-sm mt-8">
          Select an object to inspect its properties
        </div>
      </div>
    </div>
  )
} 