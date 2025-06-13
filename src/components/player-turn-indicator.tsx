
"use client";

import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import type { PlayerProfile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PlayerTurnIndicatorProps {
  isMyTurn: boolean;
  currentPlayerId?: string; 
  playerProfiles: Record<string, PlayerProfile>;
}

export function PlayerTurnIndicator({ isMyTurn, currentPlayerId, playerProfiles }: PlayerTurnIndicatorProps) {
  let displayName = "Opponent";
  let avatarUrl: string | undefined = undefined;

  if (isMyTurn && currentPlayerId) {
    const profile = playerProfiles[currentPlayerId];
    displayName = profile?.username || "Your";
    avatarUrl = profile?.avatarUrl;
  } else if (!isMyTurn) {
    // In a real multiplayer game, we'd have the opponent's ID and profile
    // For now, it remains generic "Opponent"
    // If we had an opponentId, it would be:
    // const opponentProfile = playerProfiles[opponentId];
    // displayName = opponentProfile?.username || "Opponent";
    // avatarUrl = opponentProfile?.avatarUrl;
  }


  return (
    <div className="flex items-center gap-2">
      {isMyTurn && avatarUrl ? (
        <Avatar className="h-6 w-6">
          <AvatarImage src={avatarUrl} alt={displayName} data-ai-hint="abstract avatar"/>
          <AvatarFallback className="text-xs">{displayName.substring(0,1)}</AvatarFallback>
        </Avatar>
      ) : (
         <User className="w-5 h-5 text-primary" />
      )}
      <Badge variant={isMyTurn ? "default" : "secondary"} className="text-sm font-semibold whitespace-nowrap">
        {isMyTurn ? `${displayName}'s Turn` : `${displayName}'s Turn`}
      </Badge>
    </div>
  );
}
