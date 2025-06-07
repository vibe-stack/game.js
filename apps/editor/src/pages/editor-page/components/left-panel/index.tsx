import React, { useState } from 'react';
import { cn } from '../../../../utils/tailwind';

import { ScenesIcon, ObjectsIcon, AssetsIcon, FileTreeIcon } from './icons';
import { ScenesPanel } from './scenes-panel';
import { ObjectsPanel } from './objects-panel';
import { AssetsPanel } from './assets-panel';
import { FileTreePanel } from './file-tree-panel';

const tabs = [
  { name: 'Scenes', icon: ScenesIcon, content: <ScenesPanel /> },
  { name: 'Objects', icon: ObjectsIcon, content: <ObjectsPanel /> },
  { name: 'Assets', icon: AssetsIcon, content: <AssetsPanel /> },
  { name: 'Files', icon: FileTreeIcon, content: <FileTreePanel /> },
];

export function LeftPanel() {
  const [activeTab, setActiveTab] = useState('Scenes');

  const activeContent = tabs.find((tab) => tab.name === activeTab)?.content;

  return (
    <div className="fixed left-4 top-36 bottom-4 w-80 z-10 bg-gray-900/40 backdrop-blur-md border-none rounded-xl border border-gray-600/50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-0">
        <h2 className="text-sm font-medium text-gray-300 mb-3">Explorer</h2>
        
        {/* Horizontal Tabs */}
        <div style={{ scrollbarWidth: 'none' }} className="flex gap-1 bg-gray-800/30 rounded-lg p-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                activeTab === tab.name
                  ? 'bg-gray-700/60 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
              )}
            >
              <tab.icon size={14} />
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 pt-3 overflow-auto">
        {activeContent}
      </div>
    </div>
  );
} 