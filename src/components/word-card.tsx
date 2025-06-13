"use client";

import type React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WordCardData } from '@/types';

interface WordCardProps {
  wordData: WordCardData;
  isInvalid?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>, card: WordCardData) => void;
  className?: string;
  isPlacedThisTurn?: boolean; // New prop
}

export function WordCard({ wordData, isInvalid = false, onDragStart, className, isPlacedThisTurn = false }: WordCardProps) {
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (onDragStart) {
      // Important: Store card data and source in dataTransfer
      // The actual 'card' object from props is what we need.
      event.dataTransfer.setData('application/json', JSON.stringify({ card: wordData, /* source will be added by caller */ }));
      onDragStart(event, wordData);
    }
  };

  return (
    <Card
      draggable={!!onDragStart}
      onDragStart={handleDragStart}
      className={cn(
        "cursor-grab active:cursor-grabbing p-2 min-h-[60px] flex items-center justify-center text-center shadow-md hover:shadow-lg transition-shadow select-none",
        isInvalid ? "border-destructive ring-2 ring-destructive bg-destructive/10" : "border-accent",
        isPlacedThisTurn && "ring-2 ring-offset-1 ring-offset-background ring-green-500", // Style for cards placed this turn
        className
      )}
      aria-label={`Word card: ${wordData.word}${isInvalid ? ', invalid placement' : ''}${isPlacedThisTurn ? ', placed this turn' : ''}`}
    >
      <CardContent className="p-0">
        <span className="font-medium text-sm sm:text-base text-primary">{wordData.word}</span>
      </CardContent>
    </Card>
  );
}
