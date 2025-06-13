
"use client";

import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { GameGrid } from '@/components/game-grid';
import { PlayerHand } from '@/components/player-hand';
import { PlayerTurnIndicator } from '@/components/player-turn-indicator';
import { MascotLoader } from '@/components/mascot-loader';
import { ChatPanel } from '@/components/chat-panel';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import type { WordCardData, GridState, ChatMessageData, DraggedItemInfo, CardPlacedThisTurn, PlayerProfile, WebSocketMessage, ProfileUpdatePayload } from '@/types';
import { Dices, PlusSquare, UserCircle } from 'lucide-react';
import { ProfileDialog } from '@/components/profile-dialog';

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

const generatePlayerId = () => `player-${Math.random().toString(36).substring(2, 9)}`;

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
  
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [localPlayerProfile, setLocalPlayerProfile] = useState<PlayerProfile>({ username: '', avatarUrl: ''});
  const [playerProfiles, setPlayerProfiles] = useState<Record<string, PlayerProfile>>({});
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState<boolean>(false);
  
  const ws = useRef<WebSocket | null>(null);

  const connectWebSocket = useCallback((playerId: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      // console.log("WebSocket already connected");
      return;
    }
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Pass playerId as a query parameter
    const wsUrl = `${wsProtocol}//${window.location.host}/ws?playerId=${playerId}`;
    // console.log("Connecting to WebSocket:", wsUrl);

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      // console.log('WebSocket connected with player ID:', playerId);
      // If profile exists from localStorage, send it.
      const storedProfileRaw = localStorage.getItem('lingokubUserProfile');
      if (storedProfileRaw) {
        try {
          const storedProfile = JSON.parse(storedProfileRaw) as PlayerProfile;
          if (storedProfile.username && storedProfile.avatarUrl) {
             setLocalPlayerProfile(storedProfile); // also update local state
             const profileUpdateMsg: WebSocketMessage = {
                type: 'PROFILE_UPDATE',
                payload: { playerId, ...storedProfile }
             };
             ws.current?.send(JSON.stringify(profileUpdateMsg));
          }
        } catch (e) { console.error("Error parsing stored profile", e); }
      } else {
        setIsProfileDialogOpen(true); // Prompt for profile if not found
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as WebSocketMessage;
        // console.log('Message from server:', message);

        if (message.type === 'CHAT_MESSAGE') {
          setChatMessages((prevMessages) => [...prevMessages, message.payload as ChatMessageData]);
        } else if (message.type === 'ALL_PROFILES_UPDATE') {
          setPlayerProfiles(message.payload as Record<string, PlayerProfile>);
        } else if (message.type === 'SYSTEM_MESSAGE') {
           const systemMessageText = (message.payload as {text: string}).text;
           setChatMessages((prevMessages) => [...prevMessages, {
             id: Date.now().toString() + Math.random().toString(),
             sender: 'system',
             text: systemMessageText,
             timestamp: Date.now()
           }]);
           // Optionally toast system messages
           // toast({ title: "System Message", description: systemMessageText });
        }

      } catch (error) {
        console.error('Failed to parse message from server or update state:', error);
      }
    };

    ws.current.onclose = () => {
      // console.log('WebSocket disconnected');
      toast({ title: "Chat Disconnected", description: "You've been disconnected from the chat.", variant: "destructive" });
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({ title: "Chat Connection Error", description: "Could not connect to the chat server.", variant: "destructive" });
    };
  }, [toast]);


  useEffect(() => {
    const playerIdFromStorage = localStorage.getItem('lingokubPlayerId');
    let currentId;
    if (playerIdFromStorage) {
      currentId = playerIdFromStorage;
    } else {
      currentId = generatePlayerId();
      localStorage.setItem('lingokubPlayerId', currentId);
    }
    setLocalPlayerId(currentId);
    // console.log("Local Player ID:", currentId);

    const storedProfileRaw = localStorage.getItem('lingokubUserProfile');
    if (storedProfileRaw) {
        try {
            const storedProfile = JSON.parse(storedProfileRaw) as PlayerProfile;
            if (storedProfile.username && storedProfile.avatarUrl) {
                setLocalPlayerProfile(storedProfile);
            } else {
                setIsProfileDialogOpen(true); // Incomplete profile, prompt again
            }
        } catch (e) {
            console.error("Error parsing stored profile on init", e);
            localStorage.removeItem('lingokubUserProfile'); // Clear corrupted data
            setIsProfileDialogOpen(true);
        }
    } else {
        setIsProfileDialogOpen(true); // No profile, prompt
    }
    
    if (currentId) {
      connectWebSocket(currentId);
    }

    return () => {
      ws.current?.close();
    };
  }, [connectWebSocket]);


  useEffect(() => {
    setOpponentIsPlaying(!isMyTurn);
  }, [isMyTurn]);


  const handleSaveProfile = (username: string, avatarUrl: string) => {
    const newProfile = { username, avatarUrl };
    setLocalPlayerProfile(newProfile);
    localStorage.setItem('lingokubUserProfile', JSON.stringify(newProfile));
    
    if (ws.current && ws.current.readyState === WebSocket.OPEN && localPlayerId) {
      const profileUpdateMsg: WebSocketMessage = {
        type: 'PROFILE_UPDATE',
        payload: { playerId: localPlayerId, username, avatarUrl }
      };
      ws.current.send(JSON.stringify(profileUpdateMsg));
    }
    setIsProfileDialogOpen(false);
    toast({ title: "Profile Saved", description: `Welcome, ${username}!`});
  };

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
    
    if (droppedCard.word === "FOX") { // Example validation
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
      const chatMessagePayload: ChatMessageData = {
        id: Date.now().toString() + Math.random().toString(),
        sender: localPlayerId,
        text: messageText,
        timestamp: Date.now(),
      };
      const wsMessage: WebSocketMessage = {
        type: 'CHAT_MESSAGE',
        payload: chatMessagePayload
      };
      ws.current.send(JSON.stringify(wsMessage));
    } else {
      toast({ title: "Chat Error", description: "Not connected to chat server. Message not sent.", variant: "destructive" });
    }
  };

  const handleEndTurn = () => {
    if (!isMyTurn) return;
    const playerDisplayName = playerProfiles[localPlayerId]?.username || localPlayerId || 'Current Player';
    const endTurnSystemMessage: WebSocketMessage = {
        type: 'SYSTEM_MESSAGE',
        payload: { text: `${playerDisplayName} ended their turn.` }
    };
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(endTurnSystemMessage));
    } else { // local fallback
      setChatMessages(prev => [...prev, {id: Date.now().toString(), sender:'system', text: `${playerDisplayName} ended their turn.`, timestamp: Date.now()}]);
    }

    toast({ title: "Turn Ended", description: "Waiting for opponent." });
    setIsMyTurn(false);
    setCardsPlacedThisTurn([]); 
    
    setTimeout(() => {
        const opponentDisplayName = 'Opponent'; // In a real game, this would be dynamic
        const opponentTurnSystemMessage: WebSocketMessage = {
            type: 'SYSTEM_MESSAGE',
            payload: { text: `${opponentDisplayName} made a move. Your turn, ${playerProfiles[localPlayerId]?.username || localPlayerId}!` }
        };
         if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(opponentTurnSystemMessage));
        } else { // local fallback
            setChatMessages(prev => [...prev, {id: Date.now().toString(), sender:'system', text: `${opponentDisplayName} made a move. Your turn, ${playerProfiles[localPlayerId]?.username || localPlayerId}!`, timestamp: Date.now()}]);
        }
        toast({ title: "Your Turn!", description: "Opponent has finished their move." });
        setIsMyTurn(true);
    }, 3000); // Reduced opponent turn time for quicker testing
  };
  
  const handleNewGame = () => {
    setGridState(initialGridState());
    setPlayerCards(initialPlayerCards);
    setMockDeck(initialMockDeck);
    setIsMyTurn(true); 
    setOpponentIsPlaying(false);
    setInvalidCells([]);
    setCardsPlacedThisTurn([]);
    const playerDisplayName = playerProfiles[localPlayerId]?.username || localPlayerId || 'A player';
    const newGameSystemMessage: WebSocketMessage = {
        type: 'SYSTEM_MESSAGE',
        payload: { text: `New game started by ${playerDisplayName}!` }
    };
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(newGameSystemMessage));
    } else {
        setChatMessages(prev => [...prev, { id: Date.now().toString(), sender: 'system', text: (newGameSystemMessage.payload as {text: string}).text, timestamp: Date.now()}]);
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
      
      const playerDisplayName = playerProfiles[localPlayerId]?.username || localPlayerId || 'Current Player';
      const drawCardSystemMessage: WebSocketMessage = {
        type: 'SYSTEM_MESSAGE',
        payload: { text: `${playerDisplayName} drew a card and ended their turn.` }
      };
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
         ws.current.send(JSON.stringify(drawCardSystemMessage));
      } else {
         setChatMessages(prev => [...prev, { id: Date.now().toString(), sender: 'system', text: (drawCardSystemMessage.payload as {text: string}).text, timestamp: Date.now()}]);
      }
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
        <div className="flex items-center gap-3">
           <Button variant="outline" size="sm" onClick={() => setIsProfileDialogOpen(true)}>
            <UserCircle className="mr-2 h-4 w-4" /> Profile
          </Button>
          <PlayerTurnIndicator 
            isMyTurn={isMyTurn} 
            currentPlayerId={localPlayerId}
            playerProfiles={playerProfiles}
          />
        </div>
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
              currentPlayerId={localPlayerId}
              playerProfiles={playerProfiles}
            />
          </div>
        </aside>
      </div>
      <ProfileDialog 
        isOpen={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
        currentProfile={localPlayerProfile}
        onSaveProfile={handleSaveProfile}
      />
    </div>
  );
}
