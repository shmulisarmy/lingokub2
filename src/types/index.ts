
import type { GameBoard, PrivatePlayerInfo, PublicGameState, PublicPlayerInfo } from '@/GameState';

export interface WordCardData {
  id: string;
  word: string;
}

export type GridState = (WordCardData | null)[][]; // Kept for local rendering if needed, but server board is source of truth

// Profile information for a player
export interface PlayerProfile { // This is mostly for client-side input before it becomes PublicPlayerInfo
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

// Payload for profile updates from client to server
export interface ProfileUpdatePayload {
  playerId: string; // This should be implicit from the WebSocket connection's context on the server
  username: string;
  avatarUrl: string;
}

// Payloads for game actions from client to server
export interface PlaceCardRequestPayload {
  cardId: string;
  targetRow: number;
  targetCol: number;
  // playerId is implicit on server
}

export interface MoveCardOnBoardRequestPayload {
  sourceRow: number;
  sourceCol: number;
  targetRow: number;
  targetCol: number;
  // playerId is implicit
}

export interface ReturnCardToHandRequestPayload {
  cardId: string;
  sourceRow: number;
  sourceCol: number;
  // playerId is implicit
}

// EndTurnRequestPayload might be empty or carry some final move info if complex rules
export interface EndTurnRequestPayload {
  // playerId is implicit
}


// Payloads for server to client messages related to game state
export interface GameStateUpdatePayload { // Full public game state
  publicGameState: PublicGameState;
}

export interface PrivatePlayerStateUpdatePayload { // Player's own private info (e.g., hand)
  privatePlayerInfo: PrivatePlayerInfo;
}

export interface PlayerJoinedPayload {
  player: PublicPlayerInfo;
}

export interface PlayerLeftPayload {
  playerId: string;
  newTurnPlayerId: string | null; // If turn changed due to player leaving
}

export interface YourTurnPayload {
  playerId: string; // Confirms whose turn it is now
}

export interface InvalidMovePayload {
  message: string;
  // Optionally, the correct state snippet if client needs to revert
  // offendingCardId?: string; 
  // correctBoard?: GameBoard; // Could be too much data
}

export interface PlaceCardResultPayload {
  isValid: boolean;
  updatedBoard?: GameBoard; // Sent if valid
  updatedHand?: WordCardData[]; // Sent if valid and card removed from hand
  errorMessage?: string; // Sent if invalid
}


export type WebSocketMessageType = 
  | 'CHAT_MESSAGE'                // Client to Server, Server to Client(s)
  | 'PROFILE_UPDATE_REQUEST'      // Client to Server (client updates their profile)
  | 'ALL_PROFILES_UPDATE'         // Server to Client(s) (broadcasts all known profiles - can be part of game state)
  | 'SYSTEM_MESSAGE'              // Server to Client(s) (e.g. join/leave, server announcements)
  
  // Game Setup & Sync
  | 'REQUEST_JOIN_GAME'           // Client to Server (includes player profile)
  | 'JOIN_GAME_CONFIRMED'         // Server to Client (includes initial PublicGameState and player's PrivatePlayerInfo, currentTurn)
  | 'PLAYER_JOINED_NOTIFICATION'  // Server to Client(s) (announces a new player)
  | 'PLAYER_LEFT_NOTIFICATION'    // Server to Client(s) (announces a player left, may include new turn holder)

  // Turn & Game Flow
  | 'SET_PLAYER_TURN'             // Server to Client(s) (indicates whose turn it is now, part of PublicGameState update)
  | 'END_TURN_REQUEST'            // Client to Server

  // Card/Board Actions - Requests from Client to Server
  | 'PLACE_CARD_REQUEST'
  | 'MOVE_CARD_ON_BOARD_REQUEST'
  | 'RETURN_CARD_TO_HAND_REQUEST'
  | 'DRAW_CARD_REQUEST'
  
  // Card/Board Actions - Responses/Updates from Server to Client(s)
  | 'PUBLIC_GAME_STATE_UPDATE'    // Server to ALL Clients (broadcasts new PublicGameState after any valid move)
  | 'PRIVATE_PLAYER_STATE_UPDATE' // Server to ONE Client (e.g., updated hand after drawing/placing a card)
  | 'INVALID_MOVE_NOTIFICATION'   // Server to ONE Client (if their action was invalid)
  | 'GAME_OVER_NOTIFICATION';     // Server to Client(s)


export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: 
    // Chat & Profile
    | ChatMessageData 
    | ProfileUpdatePayload  // For PROFILE_UPDATE_REQUEST
    | Record<string, PlayerProfile> // For ALL_PROFILES_UPDATE
    | { text: string } // For SYSTEM_MESSAGE

    // Game Setup & Sync
    | { username: string, avatarUrl: string } // For REQUEST_JOIN_GAME (player profile)
    | { publicGameState: PublicGameState, privatePlayerInfo: PrivatePlayerInfo } // For JOIN_GAME_CONFIRMED
    | PlayerJoinedPayload // For PLAYER_JOINED_NOTIFICATION
    | PlayerLeftPayload   // For PLAYER_LEFT_NOTIFICATION
    
    // Turn & Game Flow
    | { playerId: string } // For SET_PLAYER_TURN (can be part of PublicGameState)
    | EndTurnRequestPayload // For END_TURN_REQUEST (can be empty)

    // Card/Board Actions - Requests
    | PlaceCardRequestPayload
    | MoveCardOnBoardRequestPayload
    | ReturnCardToHandRequestPayload
    // DRAW_CARD_REQUEST can be empty payload or carry info if drawing specific cards

    // Card/Board Actions - Responses/Updates
    | GameStateUpdatePayload // For PUBLIC_GAME_STATE_UPDATE
    | PrivatePlayerStateUpdatePayload // For PRIVATE_PLAYER_STATE_UPDATE
    | InvalidMovePayload // For INVALID_MOVE_NOTIFICATION
    | { winner?: string, scores?: Record<string, number> }; // For GAME_OVER_NOTIFICATION
}


// For client-side drag and drop, might still be useful locally
export interface DraggedItemInfo {
  card: WordCardData;
  source: 'hand' | 'grid';
  sourceRow?: number; 
  sourceCol?: number; 
}

// For client-side tracking of cards placed optimistically
export interface CardPlacedThisTurn {
  cardId: string; 
  originalRowOnGrid: number; // Refers to the position on the grid
  originalColOnGrid: number;
  // originalHandIndex?: number; // If returned from hand
}
