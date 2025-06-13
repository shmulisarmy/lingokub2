
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
  let displayText = "Opponent's Turn";

  if (isMyTurn && currentPlayerId) {
    const profile = playerProfiles[currentPlayerId];
    displayName = profile?.username || "You"; // Default to "You" if no username
    avatarUrl = profile?.avatarUrl;
    if (displayName === "You") {
      displayText = "Your Turn";
    } else {
      displayText = `${displayName}'s Turn`;
    }
  } else {
    // Potentially find an opponent's name if only two players and IDs are known
    // For now, default to "Opponent's Turn"
    const opponentIds = Object.keys(playerProfiles).filter(id => id !== currentPlayerId);
    if (opponentIds.length === 1) {
      const opponentProfile = playerProfiles[opponentIds[0]];
      if (opponentProfile && opponentProfile.username) {
        displayText = `${opponentProfile.username}'s Turn`;
        avatarUrl = opponentProfile.avatarUrl; // Show opponent avatar when it's their turn
        displayName = opponentProfile.username;
      } else {
         displayText = "Opponent's Turn";
      }
    } else if (Object.keys(playerProfiles).length > 0 && !isMyTurn) {
      // Fallback if there are other players but not a single identifiable opponent
      // or if currentPlayerId is not yet defined but it's not my turn.
      displayText = "Waiting for Player...";
    } else {
      displayText = "Opponent's Turn"; // Default if no other logic applies
    }
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
