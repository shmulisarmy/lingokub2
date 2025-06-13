export interface WordCardData {
  id: string;
  word: string;
}

export type GridState = (WordCardData | null)[][];

export interface ChatMessageData {
  id: string;
  sender: string; // 'player1', 'player2', 'system'
  text: string;
  timestamp: number;
}

export interface DraggedItemInfo {
  card: WordCardData;
  source: 'hand' | 'grid';
  sourceRow?: number; // Original row if source is 'grid'
  sourceCol?: number; // Original col if source is 'grid'
}

// Represents a card placed on the grid during the current turn
export interface CardPlacedThisTurn {
  cardId: string; // ID of the card
  originalRowOnGrid: number; // The row where it currently is, if placed this turn
  originalColOnGrid: number; // The col where it currently is, if placed this turn
}
