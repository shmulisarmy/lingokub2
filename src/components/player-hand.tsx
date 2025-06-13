
"use client";

import React, { useState } from 'react'; // Changed from 'type React' to 'React, { useState }'
import { WordCard } from "./word-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WordCardData } from '@/types';
import { cn } from '@/lib/utils';

interface PlayerHandProps {
  cards: WordCardData[];
  isPlayerTurn: boolean;
  onDragStartCard: (event: React.DragEvent<HTMLDivElement>, card: WordCardData) => void;
  onDropCardToHandArea: (event: React.DragEvent<HTMLDivElement>) => void;
}

export function PlayerHand({ cards, isPlayerTurn, onDragStartCard, onDropCardToHandArea }: PlayerHandProps) {
  const [isDragOver, setIsDragOver] = useState(false); // Changed from React.useState to useState

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isPlayerTurn) {
      // Check if dragged item is from grid and can be returned
      try {
        const draggedItemData = JSON.parse(event.dataTransfer.getData('application/json'));
        if (draggedItemData.source === 'grid') {
          setIsDragOver(true);
        }
      } catch (e) {
        // Not a valid JSON, or not our item
      }
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
      onDropCardToHandArea(event);
    }
  };

  return (
    <ScrollArea 
      className={cn(
        "h-full bg-accent/20 rounded-md p-2 transition-colors",
        isDragOver && isPlayerTurn && "bg-primary/20 border-2 border-dashed border-primary"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label="Player's hand, droppable area for returning cards"
    >
      {cards.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Your hand is empty.</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {cards.map((card) => (
          <WordCard
            key={card.id}
            wordData={card}
            onDragStart={isPlayerTurn ? (e) => onDragStartCard(e, card) : undefined}
            className={!isPlayerTurn ? "opacity-70 cursor-not-allowed" : ""}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
