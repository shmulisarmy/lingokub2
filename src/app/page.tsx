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
import type { WordCardData, GridState, ChatMessageData, DraggedItemInfo, CardPlacedThisTurn } from '@/types';
import { Dices, PlusSquare } from 'lucide-react';

const ROWS = 5;
const COLS = 8;

// Initial game data (mocked)
const initialPlayerCards: WordCardData[] = [
  { id: 'pcard-1', word: 'THE' }, { id: 'pcard-2', word: 'QUICK' },
  { id: 'pcard-3', word: 'BROWN' }, { id: 'pcard-4', word: 'FOX' },
  { id: 'pcard-5', word: 'JUMPS' }, { id: 'pcard-6', word: 'OVER' },
];

const initialMockDeck: WordCardData[] = [
  { id: 'deck-1', word: 'LAZY' }, { id: 'deck-2', word: 'DOG' },
  { id: 'deck-3', word: 'AND' }, { id: 'deck-4', word: 'CAT' },
  { id: 'deck-5', word: 'SLEEPY' }, { id: 'deck-6', word: 'RUNS'},
];

const initialGridState = (): GridState => Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

export default function LingoKubPage() {
  const [gridState, setGridState] = useState<GridState>(initialGridState());
  const [playerCards, setPlayerCards] = useState<WordCardData[]>(initialPlayerCards);
  const [isMyTurn, setIsMyTurn] = useState<boolean>(true);
  const [opponentIsPlaying, setOpponentIsPlaying] = useState<boolean>(false);
  const [invalidCells, setInvalidCells] = useState<{ row: number; col: number }[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
  const [draggedItem, setDraggedItem] = useState<DraggedItemInfo | null>(null);
  const [cardsPlacedThisTurn, setCardsPlacedThisTurn] = useState<CardPlacedThisTurn[]>([]);
  const [mockDeck, setMockDeck] = useState<WordCardData[]>(initialMockDeck);
  const { toast } = useToast();

  const currentPlayerId = "player1"; 

  useEffect(() => {
    if (currentPlayerId === "player1") {
        addChatMessage("system", "Waiting for opponent...");
        setTimeout(() => {
            addChatMessage("system", "Player 2 joined! Your turn.");
        }, 2000);
    } else {
        addChatMessage("system", "You joined the game. Waiting for Player 1's turn.");
        setIsMyTurn(false);
    }
  }, [toast]); // Removed currentPlayerId from deps as it's constant

  useEffect(() => {
    setOpponentIsPlaying(!isMyTurn);
  }, [isMyTurn]);

  const handleDragStartPlayerCard = (event: React.DragEvent<HTMLDivElement>, card: WordCardData) => {
    if (!isMyTurn) return;
    const itemInfo: DraggedItemInfo = { card, source: 'hand' };
    event.dataTransfer.setData('application/json', JSON.stringify(itemInfo));
    setDraggedItem(itemInfo);
  };

  const handleDragStartCardInCell = (event: React.DragEvent<HTMLDivElement>, card: WordCardData, row: number, col: number) => {
    if (!isMyTurn) return;
    const itemInfo: DraggedItemInfo = { card, source: 'grid', sourceRow: row, sourceCol: col };
    event.dataTransfer.setData('application/json', JSON.stringify(itemInfo));
    setDraggedItem(itemInfo);
  };
  
  const handleDropCardToCell = (event: React.DragEvent<HTMLDivElement>, targetRow: number, targetCol: number) => {
    event.preventDefault();
    if (!isMyTurn || !draggedItem) {
      setDraggedItem(null);
      return;
    }

    const droppedCard = draggedItem.card;
    const source = draggedItem.source;
    const sourceRow = draggedItem.sourceRow;
    const sourceCol = draggedItem.sourceCol;
    
    const newGrid = gridState.map(r => r.slice());
    let newPlayerCards = [...playerCards];
    let newCardsPlacedThisTurn = [...cardsPlacedThisTurn];

    const cardCurrentlyAtTarget = newGrid[targetRow][targetCol];

    if (source === 'hand') {
      if (cardCurrentlyAtTarget) { // Trying to drop from hand onto an occupied cell
        const isTargetPlacedThisTurn = newCardsPlacedThisTurn.some(
          item => item.cardId === cardCurrentlyAtTarget.id && item.originalRowOnGrid === targetRow && item.originalColOnGrid === targetCol
        );
        if (isTargetPlacedThisTurn) { // Swap: card from hand to grid, card from grid (placed this turn) to hand
          newGrid[targetRow][targetCol] = droppedCard;
          newPlayerCards = newPlayerCards.filter(c => c.id !== droppedCard.id).concat(cardCurrentlyAtTarget);
          newCardsPlacedThisTurn = newCardsPlacedThisTurn
            .filter(item => !(item.cardId === cardCurrentlyAtTarget.id && item.originalRowOnGrid === targetRow && item.originalColOnGrid === targetCol))
            .concat({ cardId: droppedCard.id, originalRowOnGrid: targetRow, originalColOnGrid: targetCol });
        } else {
          toast({ title: "Invalid Move", description: "Cannot place on a fixed card from a previous turn.", variant: "destructive" });
          setDraggedItem(null);
          return;
        }
      } else { // Dropping from hand to an empty cell
        newGrid[targetRow][targetCol] = droppedCard;
        newPlayerCards = newPlayerCards.filter(c => c.id !== droppedCard.id);
        newCardsPlacedThisTurn.push({ cardId: droppedCard.id, originalRowOnGrid: targetRow, originalColOnGrid: targetCol });
      }
    } else if (source === 'grid' && sourceRow !== undefined && sourceCol !== undefined) { // Dragging from grid
        if (cardCurrentlyAtTarget) { // Swapping two cards on the grid
            newGrid[targetRow][targetCol] = droppedCard;
            newGrid[sourceRow][sourceCol] = cardCurrentlyAtTarget;

            // Update positions in cardsPlacedThisTurn if they were placed this turn
            const droppedCardIndex = newCardsPlacedThisTurn.findIndex(item => item.cardId === droppedCard.id && item.originalRowOnGrid === sourceRow && item.originalColOnGrid === sourceCol);
            if (droppedCardIndex !== -1) {
                newCardsPlacedThisTurn[droppedCardIndex] = { ...newCardsPlacedThisTurn[droppedCardIndex], originalRowOnGrid: targetRow, originalColOnGrid: targetCol };
            }
            const targetCardIndex = newCardsPlacedThisTurn.findIndex(item => item.cardId === cardCurrentlyAtTarget.id && item.originalRowOnGrid === targetRow && item.originalColOnGrid === targetCol);
            if (targetCardIndex !== -1) {
                newCardsPlacedThisTurn[targetCardIndex] = { ...newCardsPlacedThisTurn[targetCardIndex], originalRowOnGrid: sourceRow, originalColOnGrid: sourceCol };
            }
        } else { // Moving a card from grid to an empty cell
            newGrid[targetRow][targetCol] = droppedCard;
            newGrid[sourceRow][sourceCol] = null;
             // Update position in cardsPlacedThisTurn if it was placed this turn
            const movedCardIndex = newCardsPlacedThisTurn.findIndex(item => item.cardId === droppedCard.id && item.originalRowOnGrid === sourceRow && item.originalColOnGrid === sourceCol);
            if (movedCardIndex !== -1) {
                newCardsPlacedThisTurn[movedCardIndex] = { ...newCardsPlacedThisTurn[movedCardIndex], originalRowOnGrid: targetRow, originalColOnGrid: targetCol };
            }
        }
    }

    setGridState(newGrid);
    setPlayerCards(newPlayerCards);
    setCardsPlacedThisTurn(newCardsPlacedThisTurn);
    
    // Mock validation (can be expanded)
    if (droppedCard.word === "FOX") {
        setInvalidCells([{row: targetRow, col: targetCol}]);
        toast({ title: "Invalid Placement", description: "FOX cannot be placed here (mock rule).", variant: "destructive" });
    } else {
        setInvalidCells(prev => prev.filter(cell => !(cell.row === targetRow && cell.col === targetCol)));
    }

    setDraggedItem(null);
  };

  const handleDropCardToHandArea = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isMyTurn || !draggedItem || draggedItem.source !== 'grid') {
      setDraggedItem(null);
      return;
    }

    const { card, sourceRow, sourceCol } = draggedItem;

    // Check if the card was placed this turn
    const cardIndexInPlacedThisTurn = cardsPlacedThisTurn.findIndex(
        (item) => item.cardId === card.id && item.originalRowOnGrid === sourceRow && item.originalColOnGrid === sourceCol
    );

    if (cardIndexInPlacedThisTurn !== -1 && sourceRow !== undefined && sourceCol !== undefined) {
        // Return card to hand
        const newGrid = gridState.map(r => r.slice());
        newGrid[sourceRow][sourceCol] = null;
        setGridState(newGrid);

        setPlayerCards(prev => [...prev, card]);
        setCardsPlacedThisTurn(prev => prev.filter((_, index) => index !== cardIndexInPlacedThisTurn));
        toast({ title: "Card Returned", description: `${card.word} returned to your hand.` });
    } else {
        toast({ title: "Invalid Move", description: "This card cannot be returned to your hand.", variant: "destructive" });
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
    setTimeout(() => {
      addChatMessage("player2", "Got it!");
    }, 1000);
  };

  const handleEndTurn = () => {
    if (!isMyTurn) return;
    addChatMessage("system", `${currentPlayerId} ended their turn.`);
    toast({ title: "Turn Ended", description: "Waiting for opponent." });
    setIsMyTurn(false);
    setCardsPlacedThisTurn([]); // Clear cards placed this turn
    
    setTimeout(() => {
        addChatMessage("system", "Player 2 made a move. Your turn!");
        toast({ title: "Your Turn!", description: "Opponent has finished their move." });
        setIsMyTurn(true);
    }, 5000);
  };
  
  const handleNewGame = () => {
    setGridState(initialGridState());
    setPlayerCards(initialPlayerCards);
    setMockDeck(initialMockDeck);
    setIsMyTurn(currentPlayerId === "player1");
    setInvalidCells([]);
    setChatMessages([]);
    setCardsPlacedThisTurn([]);
    addChatMessage("system", "New game started!");
    toast({ title: "New Game", description: "The board has been reset." });
  };

  const handleDrawCard = () => {
    if (!isMyTurn || mockDeck.length === 0) {
      if(mockDeck.length === 0) {
        toast({ title: "Deck Empty", description: "No more cards to draw.", variant: "destructive"});
      }
      return;
    }
    const newDeck = [...mockDeck];
    const drawnCard = newDeck.shift();
    if (drawnCard) {
      setPlayerCards(prev => [...prev, drawnCard]);
      setMockDeck(newDeck);
      toast({ title: "Card Drawn", description: `You drew: ${drawnCard.word}`});
      addChatMessage("system", `${currentPlayerId} drew a card and ended their turn.`);
      handleEndTurn(); // Drawing a card ends the turn
    }
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
        <main className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center relative overflow-auto">
          {opponentIsPlaying && <MascotLoader />}
          <div className="w-full max-w-3xl mx-auto">
            <GameGrid
              gridState={gridState}
              invalidCells={invalidCells}
              isPlayerTurn={isMyTurn}
              onDropCardToCell={handleDropCardToCell}
              onDragStartCardInCell={handleDragStartCardInCell}
              cardsPlacedThisTurn={cardsPlacedThisTurn}
            />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={handleEndTurn} disabled={!isMyTurn || opponentIsPlaying}>
              End Turn
            </Button>
            <Button onClick={handleDrawCard} variant="outline" disabled={!isMyTurn || opponentIsPlaying || mockDeck.length === 0}>
              <PlusSquare className="mr-2 h-4 w-4" /> Draw Card &amp; End Turn
            </Button>
            <Button onClick={handleNewGame} variant="outline">
              New Game
            </Button>
          </div>
        </main>

        <aside className="w-full sm:w-72 md:w-80 lg:w-96 border-l p-2 sm:p-3 flex flex-col gap-3 bg-card/50">
          <div className="h-1/3 sm:h-2/5">
            <h2 className="text-md sm:text-lg font-headline text-primary mb-1.5 sm:mb-2">Your Cards ({playerCards.length})</h2>
            <PlayerHand 
              cards={playerCards} 
              isPlayerTurn={isMyTurn}
              onDragStartCard={handleDragStartPlayerCard}
              onDropCardToHandArea={handleDropCardToHandArea}
            />
          </div>
          <Separator />
          <div className="flex-1 min-h-0">
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
