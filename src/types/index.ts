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
  sourceRow?: number;
  sourceCol?: number;
}
