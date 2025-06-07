import React, { useState } from 'react';
import { cn } from '../../../../utils/tailwind';
import { Search, Settings, Zap } from 'lucide-react';
import { InspectPanel } from './inspect-panel';
import { ScenePanel } from './scene-panel';
import { PhysicsPanel } from './physics-panel';

export function RightPanel() {
  const [activeTab, setActiveTab] = useState('Inspect');

  const tabs = [
    { name: 'Inspect', icon: Search, content: <InspectPanel /> },
    { name: 'Scene', icon: Settings, content: <ScenePanel /> },
    { name: 'Physics', icon: Zap, content: <PhysicsPanel /> },
  ];

  const activeContent = tabs.find((tab) => tab.name === activeTab)?.content;

  return (
    <div className="fixed right-4 top-32 bottom-4 w-80 z-10 bg-gray-900/40 backdrop-blur-md rounded-xl border border-gray-800/50 flex flex-col">
      <div className="flex border-b border-gray-800/50">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={cn(
                "flex-1 flex items-center justify-center p-3 text-xs font-medium transition-colors relative",
                activeTab === tab.name
                  ? "text-white bg-gray-800/50"
                  : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/30"
              )}
            >
              <IconComponent size={16} />
              {activeTab === tab.name && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {activeContent}
        </div>
      </div>
    </div>
  );
} 