import React, { createContext, useContext, ReactNode } from 'react';
import { GameWorld } from './game-world';

interface GameWorldContextType {
  gameWorld: GameWorld;
}

const GameWorldContext = createContext<GameWorldContextType | null>(null);

interface GameWorldProviderProps {
  children: ReactNode;
  gameWorld: GameWorld;
}

export function GameWorldProvider({ children, gameWorld }: GameWorldProviderProps) {
  return (
    <GameWorldContext.Provider value={{ gameWorld }}>
      {children}
    </GameWorldContext.Provider>
  );
}

export function useGameWorld(): GameWorld {
  const context = useContext(GameWorldContext);
  if (!context) {
    throw new Error('useGameWorld must be used within a GameWorldProvider');
  }
  return context.gameWorld;
} 