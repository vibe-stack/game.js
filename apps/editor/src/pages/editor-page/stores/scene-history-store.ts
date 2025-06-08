import { create } from 'zustand';

export interface SceneDiff {
  type: 'matrix' | 'name' | 'visible' | 'material';
  objectId: string;
  property: string;
  oldValue: number[] | string | boolean | object | null;
  newValue: number[] | string | boolean | object | null;
  timestamp: number;
}

export interface HistoryEntry {
  id: string;
  description: string;
  diffs: SceneDiff[];
  timestamp: number;
}

interface SceneHistoryStore {
  history: HistoryEntry[];
  currentIndex: number;
  maxHistorySize: number;
  
  // Actions
  pushHistory: (entry: HistoryEntry) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  setMaxHistorySize: (size: number) => void;
}

export const useSceneHistoryStore = create<SceneHistoryStore>((set, get) => ({
  history: [],
  currentIndex: -1,
  maxHistorySize: 50,

  pushHistory: (entry: HistoryEntry) => {
    const { history, currentIndex, maxHistorySize } = get();
    
    // Remove any history after current index (when doing new action after undo)
    const newHistory = history.slice(0, currentIndex + 1);
    
    // Add new entry
    newHistory.push(entry);
    
    // Trim history if it exceeds max size
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }
    
    set({
      history: newHistory,
      currentIndex: newHistory.length - 1
    });
  },

  undo: () => {
    const { history, currentIndex } = get();
    
    if (currentIndex >= 0) {
      const entry = history[currentIndex];
      set({ currentIndex: currentIndex - 1 });
      return entry;
    }
    
    return null;
  },

  redo: () => {
    const { history, currentIndex } = get();
    
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      const entry = history[newIndex];
      set({ currentIndex: newIndex });
      return entry;
    }
    
    return null;
  },

  canUndo: () => {
    const { currentIndex } = get();
    return currentIndex >= 0;
  },

  canRedo: () => {
    const { history, currentIndex } = get();
    return currentIndex < history.length - 1;
  },

  clearHistory: () => {
    set({ history: [], currentIndex: -1 });
  },

  setMaxHistorySize: (size: number) => {
    const { history } = get();
    set({ 
      maxHistorySize: size,
      history: history.slice(-size),
      currentIndex: Math.min(get().currentIndex, size - 1)
    });
  },
})); 