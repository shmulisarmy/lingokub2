"use client";

import React, { useState } from 'react'; // Import React for useState
import { cn } from "@/lib/utils";
import type { WordCardData } from '@/types';
import { WordCard } from './word-card';

interface GridCellProps {
  row: number;
  col: number;
  card: WordCardData | null;
  isInvalid?: boolean;
  isPlayerTurn: boolean;
  onDrop: (event: React.DragEvent<HTMLDivElement>, row: number, col: number) => void;
  onDragStartCardInCell: (event: React.DragEvent<HTMLDivElement>, card: WordCardData, row: number, col: number) => void;
  isPlacedThisTurn?: boolean; // To indicate if the card in this cell was placed this turn
}

export function GridCell({
  row,
  col,
  card,
  isInvalid = false,
  isPlayerTurn,
  onDrop,
  onDragStartCardInCell,
  isPlacedThisTurn = false,
}: GridCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isPlayerTurn) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    if (isPlayerTurn) {
      onDrop(event, row, col);
    }
  };

  const handleCardDragStart = (event: React.DragEvent<HTMLDivElement>, currentCard: WordCardData) => {
    if (isPlayerTurn) {
      onDragStartCardInCell(event, currentCard, row, col);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "w-full aspect-[3/2] sm:aspect-square rounded-md border border-dashed flex items-center justify-center transition-colors",
        isInvalid ? "border-destructive bg-destructive/10 ring-1 ring-destructive" : "border-accent/50",
        isDragOver && isPlayerTurn ? "bg-accent/70 border-primary" : "bg-accent/30 hover:bg-accent/50",
        !isPlayerTurn && "cursor-not-allowed"
      )}
      aria-label={`Grid cell ${row}, ${col}. ${card ? `Contains word ${card.word}` : 'Empty.'}${isInvalid ? ' Invalid placement.' : ''}`}
      data-testid={`grid-cell-${row}-${col}`}
    >
      {card && (
        <WordCard
          wordData={card}
          isInvalid={isInvalid}
          onDragStart={isPlayerTurn ? (e) => handleCardDragStart(e, card) : undefined}
          className="w-full h-full"
          isPlacedThisTurn={isPlacedThisTurn} // Pass to WordCard for potential styling
        />
      )}
    </div>
  );
}
