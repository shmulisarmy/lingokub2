
import type { WordCardData } from "@/types";

// Represents a single cell on the game board
export type BoardCell = WordCardData | null;

// The 5x8 game board
export type GameBoard = BoardCell[][];

export const INITIAL_ROWS = 5;
export const INITIAL_COLS = 8;

export const createInitialBoard = (): GameBoard => 
  Array(INITIAL_ROWS).fill(null).map(() => Array(INITIAL_COLS).fill(null));

// Publicly visible information about a player
export interface PublicPlayerInfo {
    playerId: string;
    username: string;
    avatarUrl: string;
    isTurn: boolean;
    cardCount: number; // Number of cards in hand, visible to all
}

// Private information for a player, only sent to that player
export interface PrivatePlayerInfo {
    playerId: string; // For consistency, though client knows its ID
    // username: string; // Already in PublicPlayerInfo
    // avatarUrl: string; // Already in PublicPlayerInfo
    // isTurn: boolean; // Already in PublicPlayerInfo
    cards: WordCardData[]; // Actual cards in hand
}

// Information about the deck
export interface DeckInfo {
    cardsLeft: number;
}

// The complete public state of the game, broadcast to all players
export interface PublicGameState {
    board: GameBoard;
    players: PublicPlayerInfo[]; // List of all players in the game
    deckInfo: DeckInfo;
    currentTurnPlayerId: string | null; // ID of player whose turn it is
    gameId: string; // Could be useful for multiple game instances later
    // Potentially add game status: 'waiting', 'in_progress', 'finished'
}

// Server-side representation that includes all private states
export interface ServerFullGameState extends PublicGameState {
    playerHands: Record<string, WordCardData[]>; // playerId -> cards
    fullDeck: WordCardData[]; // The actual full deck of cards on the server
}

// Initial placeholder values if needed for server start before players join
export const initialPublicGameState: PublicGameState = {
    board: createInitialBoard(),
    players: [],
    deckInfo: { cardsLeft: 0 },
    currentTurnPlayerId: null,
    gameId: 'default-game',
};
