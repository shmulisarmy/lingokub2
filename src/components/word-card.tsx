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
}

export function WordCard({ wordData, isInvalid = false, onDragStart, className }: WordCardProps) {
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (onDragStart) {
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
        className
      )}
      aria-label={`Word card: ${wordData.word}${isInvalid ? ', invalid placement' : ''}`}
    >
      <CardContent className="p-0">
        <span className="font-medium text-sm sm:text-base text-primary">{wordData.word}</span>
      </CardContent>
    </Card>
  );
}
