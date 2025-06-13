"use client";

import type React from 'react';
import { WordCard } from "./word-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WordCardData } from '@/types';

interface PlayerHandProps {
  cards: WordCardData[];
  isPlayerTurn: boolean;
  onDragStartCard: (event: React.DragEvent<HTMLDivElement>, card: WordCardData) => void;
}

export function PlayerHand({ cards, isPlayerTurn, onDragStartCard }: PlayerHandProps) {
  return (
    <ScrollArea className="h-full bg-accent/20 rounded-md p-2">
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
