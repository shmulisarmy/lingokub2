"use client";

import type React from 'react';
import type { GridState, WordCardData, CardPlacedThisTurn } from '@/types';
import { GridCell } from './grid-cell';

interface GameGridProps {
  gridState: GridState;
  invalidCells: { row: number; col: number }[];
  isPlayerTurn: boolean;
  onDropCardToCell: (event: React.DragEvent<HTMLDivElement>, row: number, col: number) => void;
  onDragStartCardInCell: (event: React.DragEvent<HTMLDivElement>, card: WordCardData, row: number, col: number) => void;
  cardsPlacedThisTurn: CardPlacedThisTurn[]; // Added to pass down for styling/logic if needed
}

const ROWS = 5;
const COLS = 8;

export function GameGrid({ 
  gridState, 
  invalidCells, 
  isPlayerTurn,
  onDropCardToCell,
  onDragStartCardInCell,
  cardsPlacedThisTurn 
}: GameGridProps) {
  return (
    <div 
      className="grid gap-1 sm:gap-2 p-1 sm:p-2 bg-card rounded-lg shadow-lg"
      style={{
        gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
      }}
      aria-label="Game Grid"
    >
      {gridState.map((rowItems, rowIndex) =>
        rowItems.map((card, colIndex) => {
          const isPlacedThisTurn = card ? cardsPlacedThisTurn.some(
            item => item.cardId === card.id && item.originalRowOnGrid === rowIndex && item.originalColOnGrid === colIndex
          ) : false;
          
          return (
            <GridCell
              key={`${rowIndex}-${colIndex}`}
              row={rowIndex}
              col={colIndex}
              card={card}
              isInvalid={invalidCells.some(cell => cell.row === rowIndex && cell.col === colIndex)}
              isPlayerTurn={isPlayerTurn}
              onDrop={onDropCardToCell}
              onDragStartCardInCell={onDragStartCardInCell}
              isPlacedThisTurn={isPlacedThisTurn} // Pass this down to GridCell
            />
          );
        })
      )}
    </div>
  );
}
