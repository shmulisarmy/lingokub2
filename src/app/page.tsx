
"use client";

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
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
  const [isMyTurn, setIsMyTurn] = useState<boolean>(true); // This will need to be managed by server in full MP
  const [opponentIsPlaying, setOpponentIsPlaying] = useState<boolean>(false);
  const [invalidCells, setInvalidCells] = useState<{ row: number; col: number }[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
  const [draggedItem, setDraggedItem] = useState<DraggedItemInfo | null>(null);
  const [cardsPlacedThisTurn, setCardsPlacedThisTurn] = useState<CardPlacedThisTurn[]>([]);
  const [mockDeck, setMockDeck] = useState<WordCardData[]>(initialMockDeck);
  const { toast } = useToast();
  
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Generate a unique ID for this client session for chat
    const generatedId = `player-${Math.random().toString(36).substring(2, 7)}`;
    setLocalPlayerId(generatedId);
    console.log("Local Player ID:", generatedId);

    // Determine WebSocket protocol based on window.location.protocol
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    console.log("Connecting to WebSocket:", wsUrl);

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      // Send a "joined" message - this is optional, server already logs connection
      // const joinMessage: ChatMessageData = {
      //   id: Date.now().toString(),
      //   sender: generatedId, // Use the generated ID
      //   text: `${generatedId} has joined the chat.`,
      //   timestamp: Date.now(),
      // };
      // ws.current?.send(JSON.stringify(joinMessage));
      // Or a system message can be added locally or sent by server
       setChatMessages(prev => [...prev, {
         id: Date.now().toString(),
         sender: 'system',
         text: 'Connected to chat. Welcome!',
         timestamp: Date.now()
       }]);
    };

    ws.current.onmessage = (event) => {
      try {
        const receivedMsg = JSON.parse(event.data as string) as ChatMessageData;
        // console.log('Message from server:', receivedMsg);
        setChatMessages((prevMessages) => [...prevMessages, receivedMsg]);
      } catch (error) {
        console.error('Failed to parse message from server or update chat:', error);
         setChatMessages(prev => [...prev, {
           id: Date.now().toString(),
           sender: 'system',
           text: 'Received an unreadable message.',
           timestamp: Date.now()
         }]);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      toast({ title: "Chat Disconnected", description: "You've been disconnected from the chat.", variant: "destructive" });
       setChatMessages(prev => [...prev, {
         id: Date.now().toString(),
         sender: 'system',
         text: 'Disconnected from chat server.',
         timestamp: Date.now()
       }]);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({ title: "Chat Connection Error", description: "Could not connect to the chat server.", variant: "destructive" });
    };

    // Cleanup WebSocket connection on component unmount
    return () => {
      ws.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); // localPlayerId is set once, toast for notifications

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
      if (cardCurrentlyAtTarget) { 
        const isTargetPlacedThisTurn = newCardsPlacedThisTurn.some(
          item => item.cardId === cardCurrentlyAtTarget.id && item.originalRowOnGrid === targetRow && item.originalColOnGrid === targetCol
        );
        if (isTargetPlacedThisTurn) { 
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
      } else { 
        newGrid[targetRow][targetCol] = droppedCard;
        newPlayerCards = newPlayerCards.filter(c => c.id !== droppedCard.id);
        newCardsPlacedThisTurn.push({ cardId: droppedCard.id, originalRowOnGrid: targetRow, originalColOnGrid: targetCol });
      }
    } else if (source === 'grid' && sourceRow !== undefined && sourceCol !== undefined) { 
        if (cardCurrentlyAtTarget) { 
            newGrid[targetRow][targetCol] = droppedCard;
            newGrid[sourceRow][sourceCol] = cardCurrentlyAtTarget;

            const droppedCardIndex = newCardsPlacedThisTurn.findIndex(item => item.cardId === droppedCard.id && item.originalRowOnGrid === sourceRow && item.originalColOnGrid === sourceCol);
            if (droppedCardIndex !== -1) {
                newCardsPlacedThisTurn[droppedCardIndex] = { ...newCardsPlacedThisTurn[droppedCardIndex], originalRowOnGrid: targetRow, originalColOnGrid: targetCol };
            }
            const targetCardIndex = newCardsPlacedThisTurn.findIndex(item => item.cardId === cardCurrentlyAtTarget.id && item.originalRowOnGrid === targetRow && item.originalColOnGrid === targetCol);
            if (targetCardIndex !== -1) {
                newCardsPlacedThisTurn[targetCardIndex] = { ...newCardsPlacedThisTurn[targetCardIndex], originalRowOnGrid: sourceRow, originalColOnGrid: sourceCol };
            }
        } else { 
            newGrid[targetRow][targetCol] = droppedCard;
            newGrid[sourceRow][sourceCol] = null;
            const movedCardIndex = newCardsPlacedThisTurn.findIndex(item => item.cardId === droppedCard.id && item.originalRowOnGrid === sourceRow && item.originalColOnGrid === sourceCol);
            if (movedCardIndex !== -1) {
                newCardsPlacedThisTurn[movedCardIndex] = { ...newCardsPlacedThisTurn[movedCardIndex], originalRowOnGrid: targetRow, originalColOnGrid: targetCol };
            }
        }
    }

    setGridState(newGrid);
    setPlayerCards(newPlayerCards);
    setCardsPlacedThisTurn(newCardsPlacedThisTurn);
    
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

    const cardIndexInPlacedThisTurn = cardsPlacedThisTurn.findIndex(
        (item) => item.cardId === card.id && item.originalRowOnGrid === sourceRow && item.originalColOnGrid === sourceCol
    );

    if (cardIndexInPlacedThisTurn !== -1 && sourceRow !== undefined && sourceCol !== undefined) {
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

  const handleSendMessage = (messageText: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && localPlayerId) {
      const newMessage: ChatMessageData = {
        id: Date.now().toString() + Math.random().toString(), // Client generates unique ID
        sender: localPlayerId,
        text: messageText,
        timestamp: Date.now(),
      };
      ws.current.send(JSON.stringify(newMessage));
    } else {
      toast({ title: "Chat Error", description: "Not connected to chat server. Message not sent.", variant: "destructive" });
    }
  };

  const handleEndTurn = () => {
    if (!isMyTurn) return;
    // This would eventually be a message to the server
    // For now, simulate opponent turn
    const endTurnMessage: ChatMessageData = {
        id: Date.now().toString(),
        sender: 'system',
        text: `${localPlayerId} ended their turn.`,
        timestamp: Date.now()
    };
    // Broadcast this system message via WebSocket if desired, or handle locally
    // For now, let's assume server might send such system messages, or game master client
    // If sending via ws: ws.current?.send(JSON.stringify(endTurnMessage));
    // If local: setChatMessages(prev => [...prev, endTurnMessage]);

    toast({ title: "Turn Ended", description: "Waiting for opponent." });
    setIsMyTurn(false);
    setCardsPlacedThisTurn([]); 
    
    // Simulated opponent turn
    setTimeout(() => {
        const opponentTurnMessage: ChatMessageData = {
            id: Date.now().toString(),
            sender: 'system',
            text: `Opponent made a move. Your turn, ${localPlayerId}!`,
            timestamp: Date.now()
        };
        // If sending via ws: ws.current?.send(JSON.stringify(opponentTurnMessage));
        // If local: setChatMessages(prev => [...prev, opponentTurnMessage]);
        setChatMessages(prev => [...prev, opponentTurnMessage]); // Keep local for now
        toast({ title: "Your Turn!", description: "Opponent has finished their move." });
        setIsMyTurn(true);
    }, 5000);
  };
  
  const handleNewGame = () => {
    setGridState(initialGridState());
    setPlayerCards(initialPlayerCards);
    setMockDeck(initialMockDeck);
    setIsMyTurn(true); // Reset turn to player 1 (or based on actual player logic)
    setOpponentIsPlaying(false);
    setInvalidCells([]);
    // setChatMessages([]); // Keep chat history or clear? For now, let's keep it.
    setCardsPlacedThisTurn([]);

    const newGameMessage: ChatMessageData = {
        id: Date.now().toString(),
        sender: 'system',
        text: `New game started by ${localPlayerId}!`,
        timestamp: Date.now()
    };
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(newGameMessage));
    } else {
        setChatMessages(prev => [...prev, newGameMessage]); // show locally if WS fails
    }
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
      
      const drawCardMessage: ChatMessageData = {
        id: Date.now().toString(),
        sender: 'system',
        text: `${localPlayerId} drew a card and ended their turn.`,
        timestamp: Date.now()
      };
      // if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      //   ws.current.send(JSON.stringify(drawCardMessage));
      // } else {
      //   setChatMessages(prev => [...prev, drawCardMessage]);
      // }
      setChatMessages(prev => [...prev, drawCardMessage]); // Keep local for now
      handleEndTurn(); 
    }
  };

  return (
    <div className="flex h-screen max-h-screen flex-col bg-background text-foreground">
      <header className="p-3 sm:p-4 border-b flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <Dices className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-xl sm:text-2xl font-headline text-primary">LingoKub</h1>
        </div>
        <PlayerTurnIndicator isMyTurn={isMyTurn} currentPlayerName={isMyTurn ? localPlayerId || "You" : "Opponent"} />
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
              currentPlayerId={localPlayerId} // Use localPlayerId for styling self-messages
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
