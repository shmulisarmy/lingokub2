
export interface WordCardData {
  id: string;
  word: string;
}

export type GridState = (WordCardData | null)[][];

// Profile information for a player
export interface PlayerProfile {
  username: string;
  avatarUrl: string;
}

// Structure for chat messages (payload for CHAT_MESSAGE type)
export interface ChatMessageData {
  id: string; 
  sender: string; // playerId
  text: string;
  timestamp: number;
}

// Payload for profile updates
export interface ProfileUpdatePayload {
  playerId: string;
  username: string;
  avatarUrl: string;
}

// Wrapper for all WebSocket communications
export type WebSocketMessageType = 
  | 'CHAT_MESSAGE' 
  | 'PROFILE_UPDATE' 
  | 'ALL_PROFILES_UPDATE'
  | 'SYSTEM_MESSAGE' // For server-side system messages like join/leave
  | 'SET_INITIAL_TURN'; // For server to tell client if it's their turn initially

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: 
    | ChatMessageData 
    | ProfileUpdatePayload 
    | Record<string, PlayerProfile> 
    | { text: string }
    | { isMyTurn: boolean };
}

export interface DraggedItemInfo {
  card: WordCardData;
  source: 'hand' | 'grid';
  sourceRow?: number; 
  sourceCol?: number; 
}

export interface CardPlacedThisTurn {
  cardId: string; 
  originalRowOnGrid: number; 
  originalColOnGrid: number; 
}
