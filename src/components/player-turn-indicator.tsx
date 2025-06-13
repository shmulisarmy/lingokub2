"use client";

import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

interface PlayerTurnIndicatorProps {
  isMyTurn: boolean;
  currentPlayerName?: string; // Optional, could display generic "Opponent"
}

export function PlayerTurnIndicator({ isMyTurn, currentPlayerName = "Opponent" }: PlayerTurnIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <User className="w-5 h-5 text-primary" />
      <Badge variant={isMyTurn ? "default" : "secondary"} className="text-sm font-semibold">
        {isMyTurn ? "Your Turn" : `${currentPlayerName}'s Turn`}
      </Badge>
    </div>
  );
}
