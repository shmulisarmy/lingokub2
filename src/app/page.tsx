"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { GameGrid } from '@/components/game-grid';
import { PlayerHand } from '@/components/player-hand';
import { PlayerTurnIndicator } from '@/components/player-turn-indicator';
import { MascotLoader } from '@/components/mascot-loader';
import { ChatPanel } from '@/components/chat-panel';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import type { WordCardData, GridState, ChatMessageData, DraggedItemInfo } from '@/types';
import { Dices } from 'lucide-react';

const ROWS = 5;
const COLS = 8;

// Initial game data (mocked)
const initialPlayerCards: WordCardData[] = [
  { id: 'pcard-1', word: 'THE' }, { id: 'pcard-2', word: 'QUICK' },
  { id: 'pcard-3', word: 'BROWN' }, { id: 'pcard-4', word: 'FOX' },
  { id: 'pcard-5', word: 'JUMPS' }, { id: 'pcard-6', word: 'OVER' },
];

const initialGridState = (): GridState => Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

export default function LingoKubPage() {
  const [gridState, setGridState] = useState<GridState>(initialGridState());
  const [playerCards, setPlayerCards] = useState<WordCardData[]>(initialPlayerCards);
  const [isMyTurn, setIsMyTurn] = useState<boolean>(true);
  const [opponentIsPlaying, setOpponentIsPlaying] = useState<boolean>(false); // Derived from !isMyTurn in a real scenario
  const [invalidCells, setInvalidCells] = useState<{ row: number; col: number }[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
  const [draggedItem, setDraggedItem] = useState<DraggedItemInfo | null>(null);
  const { toast } = useToast();

  // Mock current player ID
  const currentPlayerId = "player1"; 

  useEffect(() => {
    // Simulate opponent joining and starting turn
    if (currentPlayerId === "player1") { // Assume player1 starts
        addChatMessage("system", "Waiting for opponent...");
        setTimeout(() => {
            addChatMessage("system", "Player 2 joined! Your turn.");
        }, 2000);
    } else { // Player 2 joins
        addChatMessage("system", "You joined the game. Waiting for Player 1's turn.");
        setIsMyTurn(false);
        setOpponentIsPlaying(true);
    }

    // Mock "Game Full" scenario
    // To test: change maxPlayers to 1 and try to join as a second player (conceptual)
    // This would typically be handled by backend logic on connection.
    // For demo, we can show a toast if a conceptual "third player" tries to connect.
    // Example: if (some_condition_for_third_player) toast({ title: "Game Full", description: "This room is already full."})
  }, [toast]);


  useEffect(() => {
    setOpponentIsPlaying(!isMyTurn);
  }, [isMyTurn]);

  const handleDragStartPlayerCard = (event: React.DragEvent<HTMLDivElement>, card: WordCardData) => {
    if (!isMyTurn) return;
    event.dataTransfer.setData('application/json', JSON.stringify({ card, source: 'hand' }));
    setDraggedItem({ card, source: 'hand' });
  };

  const handleDragStartCardInCell = (event: React.DragEvent<HTMLDivElement>, card: WordCardData, row: number, col: number) => {
    if (!isMyTurn) return;
    event.dataTransfer.setData('application/json', JSON.stringify({ card, source: 'grid', sourceRow: row, sourceCol: col }));
    setDraggedItem({ card, source: 'grid', sourceRow: row, sourceCol: col });
  };
  
  const handleDropCardToCell = (event: React.DragEvent<HTMLDivElement>, row: number, col: number) => {
    event.preventDefault();
    if (!isMyTurn || !draggedItem) return;

    const droppedItemInfo: DraggedItemInfo = draggedItem;
    const targetCell = gridState[row][col];

    if (targetCell) { // Cell is occupied
        // Basic swap logic for demo. Real game might have different rules (e.g., no direct swap or return to hand)
        if (droppedItemInfo.source === 'hand') {
            // Swap card from hand with card in cell
            const cardFromCell = targetCell;
            setPlayerCards(prev => [...prev.filter(c => c.id !== droppedItemInfo.card.id), cardFromCell]);
        } else if (droppedItemInfo.source === 'grid' && 
                   (droppedItemInfo.sourceRow !== row || droppedItemInfo.sourceCol !== col)) {
            // Swap card from another cell with card in this cell
            // This is complex, for now let's just overwrite if it's not the same cell
             // For a simple move, we clear the source cell. If swapping, need to place targetCell's card in source.
        } else {
            // Dropping on itself, do nothing
            setDraggedItem(null);
            return;
        }
    }


    setGridState(prevGrid => {
      const newGrid = prevGrid.map(r => r.slice());
      // Place new card
      newGrid[row][col] = droppedItemInfo.card;

      // Clear original position if dragged from grid
      if (droppedItemInfo.source === 'grid' && droppedItemInfo.sourceRow !== undefined && droppedItemInfo.sourceCol !== undefined) {
        if (targetCell && (droppedItemInfo.sourceRow !== row || droppedItemInfo.sourceCol !== col)) { // If swapping
            newGrid[droppedItemInfo.sourceRow][droppedItemInfo.sourceCol] = targetCell;
        } else { // If moving to empty cell or overwriting non-swapped
            newGrid[droppedItemInfo.sourceRow][droppedItemInfo.sourceCol] = null;
        }
      }
      return newGrid;
    });

    if (droppedItemInfo.source === 'hand' && !targetCell) { // If moved from hand to an empty cell
      setPlayerCards(prev => prev.filter(c => c.id !== droppedItemInfo.card.id));
    }
    
    // Mock validation
    if (droppedItemInfo.card.word === "FOX") {
        setInvalidCells([{row, col}]);
        toast({ title: "Invalid Placement", description: "FOX cannot be placed here (mock rule).", variant: "destructive" });
    } else {
        setInvalidCells([]);
    }

    setDraggedItem(null);
  };

  const addChatMessage = (sender: string, text: string) => {
    const newMessage: ChatMessageData = {
      id: Date.now().toString() + Math.random().toString(),
      sender,
      text,
      timestamp: Date.now(),
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = (messageText: string) => {
    addChatMessage(currentPlayerId, messageText);
    // Simulate opponent reply
    setTimeout(() => {
      addChatMessage("player2", "Got it!");
    }, 1000);
  };

  const handleEndTurn = () => {
    if (!isMyTurn) return;
    // TODO: Add backend call for board validation here
    addChatMessage("system", `${currentPlayerId} ended their turn.`);
    toast({ title: "Turn Ended", description: "Waiting for opponent." });
    setIsMyTurn(false);
    
    // Simulate opponent's turn
    setTimeout(() => {
        addChatMessage("system", "Player 2 made a move. Your turn!");
        toast({ title: "Your Turn!", description: "Opponent has finished their move." });
        setIsMyTurn(true);
    }, 5000); // Opponent takes 5 seconds
  };
  
  const handleNewGame = () => {
    setGridState(initialGridState());
    setPlayerCards(initialPlayerCards);
    setIsMyTurn(currentPlayerId === "player1"); // Reset turn based on who starts
    setInvalidCells([]);
    setChatMessages([]);
    addChatMessage("system", "New game started!");
    toast({ title: "New Game", description: "The board has been reset." });
  };


  return (
    <div className="flex h-screen max-h-screen flex-col bg-background text-foreground">
      <header className="p-3 sm:p-4 border-b flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <Dices className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-xl sm:text-2xl font-headline text-primary">LingoKub</h1>
        </div>
        <PlayerTurnIndicator isMyTurn={isMyTurn} currentPlayerName={isMyTurn ? "You" : "Opponent"} />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Game Area */}
        <main className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center relative overflow-auto">
          {opponentIsPlaying && <MascotLoader />}
          <div className="w-full max-w-3xl mx-auto">
            <GameGrid
              gridState={gridState}
              invalidCells={invalidCells}
              isPlayerTurn={isMyTurn}
              onDropCardToCell={handleDropCardToCell}
              onDragStartCardInCell={handleDragStartCardInCell}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleEndTurn} disabled={!isMyTurn || opponentIsPlaying}>
              End Turn
            </Button>
            <Button onClick={handleNewGame} variant="outline">
              New Game
            </Button>
          </div>
        </main>

        {/* Side Panel: Player Hand & Chat */}
        <aside className="w-full sm:w-72 md:w-80 lg:w-96 border-l p-2 sm:p-3 flex flex-col gap-3 bg-card/50">
          <div className="h-1/3 sm:h-2/5">
            <h2 className="text-md sm:text-lg font-headline text-primary mb-1.5 sm:mb-2">Your Cards</h2>
            <PlayerHand 
              cards={playerCards} 
              isPlayerTurn={isMyTurn}
              onDragStartCard={handleDragStartPlayerCard} 
            />
          </div>
          <Separator />
          <div className="flex-1 min-h-0"> {/* min-h-0 is important for flex item to shrink properly */}
            <ChatPanel 
              messages={chatMessages} 
              onSendMessage={handleSendMessage}
              currentPlayerId={currentPlayerId}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
