
"use client";

import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import type { PublicPlayerInfo } from '@/GameState'; // Use server-defined type
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PlayerTurnIndicatorProps {
  isMyTurn: boolean;
  currentPlayerId?: string; 
  allPlayers: PublicPlayerInfo[]; // Now receives all players
}

export function PlayerTurnIndicator({ isMyTurn, currentPlayerId, allPlayers }: PlayerTurnIndicatorProps) {
  let displayName = "Opponent";
  let avatarUrl: string | undefined = undefined;
  let displayText = "Waiting for players..."; // Default text

  const turnPlayer = allPlayers.find(p => p.isTurn);

  if (turnPlayer) {
    if (turnPlayer.playerId === currentPlayerId) {
      displayName = turnPlayer.username || "You";
      avatarUrl = turnPlayer.avatarUrl;
      displayText = "Your Turn";
    } else {
      displayName = turnPlayer.username || "Opponent";
      avatarUrl = turnPlayer.avatarUrl;
      displayText = `${displayName}'s Turn`;
    }
  } else if (allPlayers.length > 0) {
    displayText = "Waiting for turn..."; // Game started, but turn not clear
  }


  return (
    <div className="flex items-center gap-2">
      {avatarUrl ? (
        <Avatar className="h-6 w-6">
          <AvatarImage src={avatarUrl} alt={displayName} data-ai-hint="abstract avatar"/>
          <AvatarFallback className="text-xs">{displayName.substring(0,1).toUpperCase()}</AvatarFallback>
        </Avatar>
      ) : (
         <User className="w-5 h-5 text-primary" />
      )}
      <Badge variant={isMyTurn ? "default" : "secondary"} className="text-sm font-semibold whitespace-nowrap">
        {displayText}
      </Badge>
    </div>
  );
}
