import React from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, History } from 'lucide-react';
import { useSceneHistoryStore } from '../../../stores/scene-history-store';
import { useSceneObjectsStore } from '../../../stores/scene-objects-store';

export function HistorySection() {
  const { history, currentIndex, canUndo, canRedo } = useSceneHistoryStore();
  const { undoLastChange, redoLastChange } = useSceneObjectsStore();

  const handleUndo = () => {
    if (canUndo()) {
      undoLastChange();
    }
  };

  const handleRedo = () => {
    if (canRedo()) {
      redoLastChange();
    }
  };

  const currentEntry = history[currentIndex];

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wide">History</h3>
      
      {/* Undo/Redo Controls */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs"
          onClick={handleUndo}
          disabled={!canUndo()}
        >
          <Undo2 size={14} className="mr-1" />
          Undo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs"
          onClick={handleRedo}
          disabled={!canRedo()}
        >
          <Redo2 size={14} className="mr-1" />
          Redo
        </Button>
      </div>

      {/* Current Action Display */}
      {currentEntry && (
        <div className="text-xs text-gray-400 bg-gray-800/30 rounded p-2">
          <div className="flex items-center gap-1 mb-1">
            <History size={12} />
            <span className="font-medium">Last Action</span>
          </div>
          <div className="text-gray-300">{currentEntry.description}</div>
          <div className="text-gray-500 text-[10px] mt-1">
            {new Date(currentEntry.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* History Stats */}
      <div className="text-xs text-gray-500">
        {history.length > 0 ? (
          <>
            Action {currentIndex + 1} of {history.length}
          </>
        ) : (
          'No actions yet'
        )}
      </div>
    </div>
  );
} 