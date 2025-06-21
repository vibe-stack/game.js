import React from "react";
import { MessageSquare, Bot } from "lucide-react";

export function Chat() {
  return (
    <div className="flex flex-col h-full p-2">
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
        <div className="flex items-center space-x-2 text-lime-300">
          <Bot className="w-8 h-8" />
          <MessageSquare className="w-8 h-8" />
        </div>
        
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium text-white">AI Assistant Chat</h3>
          <p className="text-sm text-gray-300">
            AI-powered assistant for game development
          </p>
          <p className="text-xs text-gray-400">
            Coming soon - Integration with LLM agent
          </p>
        </div>
        
        <div className="text-center space-y-1 text-xs text-gray-400">
          <p>• Get help with game development</p>
          <p>• Ask questions about your scene</p>
          <p>• Generate code snippets</p>
          <p>• Troubleshoot issues</p>
        </div>
      </div>
      
      {/* Placeholder for future chat interface */}
      <div className="mt-4 p-3 bg-white/5 rounded border border-white/10">
        <div className="flex items-center space-x-2 text-gray-400">
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm">Chat interface will be available soon...</span>
        </div>
      </div>
    </div>
  );
} 