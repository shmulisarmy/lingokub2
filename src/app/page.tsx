
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
import type { 
  WordCardData, 
  GridState, // May deprecate client-side GridState if server's board is always source
  ChatMessageData, 
  DraggedItemInfo, 
  CardPlacedThisTurn, 
  PlayerProfile as ClientPlayerProfileInput, // For profile dialog
  WebSocketMessage,
  PublicGameState as PublicGameStateFromServer, // Alias for clarity
  PrivatePlayerInfo as MyPrivatePlayerStateFromServer, // Alias for clarity
  PlaceCardRequestPayload,
  EndTurnRequestPayload
} from '@/types';
import type { PublicPlayerInfo } from '@/GameState'; // Import server-defined type
import { Dices, PlusSquare, UserCircle, Shuffle } from 'lucide-react';
import { ProfileDialog } from '@/components/profile-dialog';
import { createInitialBoard } from '@/GameState'; // For initial client board state

const generatePlayerId = () => `player-${Math.random().toString(36).substring(2, 9)}`;

export default function LingoKubPage() {
  const [publicGameState, setPublicGameState] = useState<PublicGameStateFromServer | null>(null);
  const [myPrivatePlayerState, setMyPrivatePlayerState] = useState<MyPrivatePlayerStateFromServer | null>(null);
  
  const [isMyTurn, setIsMyTurn] = useState<boolean>(false); // Now fully driven by server
  const [invalidCells, setInvalidCells] = useState<{ row: number; col: number }[]>([]); // For local validation feedback
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
  const [draggedItem, setDraggedItem] = useState<DraggedItemInfo | null>(null);
  // cardsPlacedThisTurn might be less critical if server validates and sends full state, but can be useful for optimistic UI
  const [cardsPlacedThisTurnOptimistic, setCardsPlacedThisTurnOptimistic] = useState<CardPlacedThisTurn[]>([]); 
  
  const { toast } = useToast();
  
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [localPlayerProfileInput, setLocalPlayerProfileInput] = useState<ClientPlayerProfileInput>({ username: '', avatarUrl: ''});
  // PlayerProfiles for chat might be derived from publicGameState.players
  const [allPlayerProfilesForChat, setAllPlayerProfilesForChat] = useState<Record<string, {username: string, avatarUrl: string}>>({});
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState<boolean>(false);
  
  const ws = useRef<WebSocket | null>(null);

  const connectWebSocket = useCallback((playerId: string, profile: ClientPlayerProfileInput) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected.");
      return;
    }
    if (!profile.username || !profile.avatarUrl) {
      console.error("Profile not set, cannot connect WebSocket.");
      setIsProfileDialogOpen(true);
      return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Send profile info in query params for initial connection
    const wsUrl = `${wsProtocol}//${window.location.host}/ws?playerId=${playerId}&username=${encodeURIComponent(profile.username)}&avatarUrl=${encodeURIComponent(profile.avatarUrl)}`;

    console.log("Attempting to connect WebSocket to:", wsUrl);
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      toast({ title: "Connected", description: "Successfully connected to the game server." });
      // No explicit REQUEST_JOIN_GAME needed if server handles it on connection with query params
      // If server expects explicit message:
      // const joinGameMsg: WebSocketMessage = {
      //   type: 'REQUEST_JOIN_GAME',
      //   payload: { username: profile.username, avatarUrl: profile.avatarUrl }
      // };
      // ws.current?.send(JSON.stringify(joinGameMsg));
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as WebSocketMessage;
        console.log("Received message from server:", message.type, message.payload);

        switch (message.type) {
          case 'CHAT_MESSAGE':
            setChatMessages((prevMessages) => [...prevMessages, message.payload as ChatMessageData]);
            break;
          case 'SYSTEM_MESSAGE':
            const systemMessageText = (message.payload as {text: string}).text;
            setChatMessages((prevMessages) => [...prevMessages, {
              id: Date.now().toString() + Math.random().toString(),
              sender: 'system',
              text: systemMessageText,
              timestamp: Date.now()
            }]);
            break;
          case 'JOIN_GAME_CONFIRMED': {
            const { publicGameState: newPublicState, privatePlayerInfo: newPrivateState } = message.payload as { 
              publicGameState: PublicGameStateFromServer, 
              privatePlayerInfo: MyPrivatePlayerStateFromServer 
            };
            setPublicGameState(newPublicState);
            setMyPrivatePlayerState(newPrivateState);
            setIsMyTurn(newPublicState.currentTurnPlayerId === localPlayerId);
            
            const profilesForChat: Record<string, {username: string, avatarUrl: string}> = {};
            newPublicState.players.forEach(p => {
              profilesForChat[p.playerId] = { username: p.username, avatarUrl: p.avatarUrl };
            });
            setAllPlayerProfilesForChat(profilesForChat);

            toast({ title: "Game Joined!", description: `Welcome, ${newPrivateState.playerId}!` });
            break;
          }
          case 'PUBLIC_GAME_STATE_UPDATE': {
            const { publicGameState: updatedPublicState } = message.payload as { publicGameState: PublicGameStateFromServer };
            setPublicGameState(updatedPublicState);
            setIsMyTurn(updatedPublicState.currentTurnPlayerId === localPlayerId);
            
            const profilesForChat: Record<string, {username: string, avatarUrl: string}> = {};
            updatedPublicState.players.forEach(p => {
              profilesForChat[p.playerId] = { username: p.username, avatarUrl: p.avatarUrl };
            });
            setAllPlayerProfilesForChat(profilesForChat); // Update chat profiles too

            // If this client just made a move, reset optimistic placements if server confirms
            // This logic will need to be smarter once optimistic updates are fully in.
            // For now, just clear optimistic on any public state update
            setCardsPlacedThisTurnOptimistic([]); 
            setInvalidCells([]); // Clear local invalid cells on server update
            break;
          }
          case 'PRIVATE_PLAYER_STATE_UPDATE': {
            const { privatePlayerInfo: updatedPrivateState } = message.payload as { privatePlayerInfo: MyPrivatePlayerStateFromServer };
            if (updatedPrivateState.playerId === localPlayerId) {
              setMyPrivatePlayerState(updatedPrivateState);
            }
            break;
          }
          case 'PLAYER_JOINED_NOTIFICATION': {
            const { player: newPlayer } = message.payload as { player: PublicPlayerInfo };
            // PublicGameState update will handle adding the player to the list.
            // This is more for a toast/chat notification.
            toast({ title: "Player Joined", description: `${newPlayer.username} has joined the game.` });
            // The full player list update comes via PUBLIC_GAME_STATE_UPDATE if server sends it after join
            break;
          }
          case 'PLAYER_LEFT_NOTIFICATION': {
            const { playerId: leftPlayerId, newTurnPlayerId } = message.payload as { playerId: string, newTurnPlayerId: string | null };
             const leftPlayerUsername = allPlayerProfilesForChat[leftPlayerId]?.username || leftPlayerId;
            toast({ title: "Player Left", description: `${leftPlayerUsername} has left the game.` });
            // PublicGameState update will handle removing player.
            // setIsMyTurn(newTurnPlayerId === localPlayerId); // Server will also send PUBLIC_GAME_STATE_UPDATE
            break;
          }
          case 'INVALID_MOVE_NOTIFICATION': {
            const { message: errorMsg } = message.payload as { message: string };
            toast({ title: "Invalid Move", description: errorMsg, variant: "destructive" });
            // Here, you'd revert optimistic updates if they were made.
            // For now, the server's PUBLIC_GAME_STATE_UPDATE will be the source of truth.
            setCardsPlacedThisTurnOptimistic([]); // Clear optimistic placements
            break;
          }
          // SET_PLAYER_TURN might be redundant if currentTurnPlayerId in PublicGameState is always watched
          // case 'SET_PLAYER_TURN': {
          //   const { playerId: turnPlayerId } = message.payload as { playerId: string };
          //   setIsMyTurn(turnPlayerId === localPlayerId);
          //   if (turnPlayerId === localPlayerId) {
          //     toast({ title: "Your Turn!"});
          //   }
          //   break;
          // }

          default:
            console.warn("Received unhandled message type from server:", message.type);
        }

      } catch (error) {
        console.error('Failed to parse message from server or update state:', error);
      }
    };

    ws.current.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      toast({ title: "Disconnected", description: "Lost connection to the game server.", variant: "destructive" });
      setPublicGameState(null); // Clear game state
      setMyPrivatePlayerState(null);
      setIsMyTurn(false);
      // Optionally, try to reconnect or prompt user
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({ title: "Connection Error", description: "Could not connect to the game server.", variant: "destructive" });
    };
  }, [toast, localPlayerId, allPlayerProfilesForChat]); // Added allPlayerProfilesForChat to deps


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

    const storedProfileRaw = localStorage.getItem('lingokubUserProfile');
    if (storedProfileRaw) {
        try {
            const storedProfile = JSON.parse(storedProfileRaw) as ClientPlayerProfileInput;
            if (storedProfile.username && storedProfile.avatarUrl) {
                setLocalPlayerProfileInput(storedProfile);
                // Automatically connect if profile exists
                if (currentId && !ws.current) {
                     connectWebSocket(currentId, storedProfile);
                }
            } else {
              setIsProfileDialogOpen(true); // Prompt if profile is incomplete
            }
        } catch (e) {
            console.error("Error parsing stored profile on init", e);
            localStorage.removeItem('lingokubUserProfile'); 
            setIsProfileDialogOpen(true); // Prompt if error
        }
    } else {
        setIsProfileDialogOpen(true); // Prompt if no profile
    }
    
    return () => {
      ws.current?.close();
    };
  }, [connectWebSocket]); // connectWebSocket is stable due to useCallback

  useEffect(() => {
    if (publicGameState) {
      setIsMyTurn(publicGameState.currentTurnPlayerId === localPlayerId);
      
      const profilesForChat: Record<string, {username: string, avatarUrl: string}> = {};
      publicGameState.players.forEach(p => {
        profilesForChat[p.playerId] = { username: p.username, avatarUrl: p.avatarUrl };
      });
      setAllPlayerProfilesForChat(profilesForChat);
    }
  }, [publicGameState, localPlayerId]);


  const handleSaveProfile = (username: string, avatarUrl: string) => {
    const newProfile = { username, avatarUrl };
    setLocalPlayerProfileInput(newProfile);
    localStorage.setItem('lingokubUserProfile', JSON.stringify(newProfile));
    
    if (localPlayerId) {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        // If already connected, might need to send a profile update if supported mid-game
        // For now, profile is set on initial connection via query params
        console.log("Profile saved, WebSocket already open. Reconnect if profile needs to be re-sent to server.");
        // Or, implement a PROFILE_UPDATE_REQUEST message type
      } else {
        // If not connected, connect now with the new profile
        connectWebSocket(localPlayerId, newProfile);
      }
    }
    setIsProfileDialogOpen(false);
    toast({ title: "Profile Saved", description: `Welcome, ${username}!`});
  };

  const sendWsMessage = (type: WebSocketMessage['type'], payload: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, payload }));
    } else {
      toast({ title: "Error", description: "Not connected to server.", variant: "destructive" });
    }
  };

  // --- Drag and Drop Handlers (Client-side prediction, then send to server) ---
  const handleDragStartPlayerCard = (event: React.DragEvent<HTMLDivElement>, card: WordCardData) => {
    if (!isMyTurn) return;
    const itemInfo: DraggedItemInfo = { card, source: 'hand' };
    event.dataTransfer.setData('application/json', JSON.stringify(itemInfo));
    setDraggedItem(itemInfo);
  };

  const handleDragStartCardInCell = (event: React.DragEvent<HTMLDivElement>, card: WordCardData, row: number, col: number) => {
    if (!isMyTurn) return;
    // For now, assume any card on board can be moved if it's your turn.
    // Server will ultimately validate if it was a card placed this turn or a fixed one.
    const itemInfo: DraggedItemInfo = { card, source: 'grid', sourceRow: row, sourceCol: col };
    event.dataTransfer.setData('application/json', JSON.stringify(itemInfo));
    setDraggedItem(itemInfo);
  };
  
  const handleDropCardToCell = (event: React.DragEvent<HTMLDivElement>, targetRow: number, targetCol: number) => {
    event.preventDefault();
    if (!isMyTurn || !draggedItem || !publicGameState) {
      setDraggedItem(null);
      return;
    }

    const { card: droppedCard, source, sourceRow, sourceCol } = draggedItem;

    // Optimistic UI update (will be replaced/confirmed by server)
    // For Phase 1, we will directly send request to server and wait for state update.
    // Less optimistic for now, to simplify.
    
    if (source === 'hand') {
      const payload: PlaceCardRequestPayload = { cardId: droppedCard.id, targetRow, targetCol };
      sendWsMessage('PLACE_CARD_REQUEST', payload);
      // Add to optimistic placements for visual feedback
      setCardsPlacedThisTurnOptimistic(prev => [...prev, { cardId: droppedCard.id, originalRowOnGrid: targetRow, originalColOnGrid: targetCol}]);
    } else if (source === 'grid' && sourceRow !== undefined && sourceCol !== undefined) {
      // TODO: Implement MOVE_CARD_ON_BOARD_REQUEST
      toast({title: "Action", description: "Moving cards on board to be implemented via server."});
      // const payload: MoveCardOnBoardRequestPayload = { sourceRow, sourceCol, targetRow, targetCol };
      // sendWsMessage('MOVE_CARD_ON_BOARD_REQUEST', payload);
    }
    
    setDraggedItem(null);
  };

  const handleDropCardToHandArea = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isMyTurn || !draggedItem || draggedItem.source !== 'grid' || !publicGameState) {
      setDraggedItem(null);
      return;
    }
    // TODO: Implement RETURN_CARD_TO_HAND_REQUEST
    // Client needs to check if the card was part of cardsPlacedThisTurn (optimistically or from server state)
    // For now, server will handle validation.
    toast({title: "Action", description: "Returning card to hand to be implemented via server."});
    // const { card, sourceRow, sourceCol } = draggedItem;
    // const payload: ReturnCardToHandRequestPayload = { cardId: card.id, sourceRow: sourceRow!, sourceCol: sourceCol! };
    // sendWsMessage('RETURN_CARD_TO_HAND_REQUEST', payload);
    setDraggedItem(null);
  };

  const handleSendMessage = (messageText: string) => {
    if (localPlayerId) {
      const chatMessagePayload: ChatMessageData = {
        id: Date.now().toString() + Math.random().toString(),
        sender: localPlayerId,
        text: messageText,
        timestamp: Date.now(),
      };
      sendWsMessage('CHAT_MESSAGE', chatMessagePayload);
    } else {
      toast({ title: "Chat Error", description: "Player ID not set. Cannot send message.", variant: "destructive" });
    }
  };

  const handleEndTurn = () => {
    if (!isMyTurn) return;
    const payload: EndTurnRequestPayload = {};
    sendWsMessage('END_TURN_REQUEST', payload);
    // No local setIsMyTurn(false) - server will send new game state with updated turn
    toast({ title: "Turn Ended", description: "Waiting for opponent." });
    setCardsPlacedThisTurnOptimistic([]); // Clear optimistic placements on turn end
  };
  
  const handleNewGame = () => {
    // TODO: Implement NEW_GAME_REQUEST to server. Server resets its state and broadcasts.
    toast({ title: "New Game", description: "Requesting new game from server (Not Implemented Yet)." });
    // For now, local reset if server doesn't handle it:
    // setPublicGameState({ ...publicGameState!, board: createInitialBoard(), players: publicGameState!.players.map(p => ({...p, cardCount: 0, isTurn: false})) });
    // setMyPrivatePlayerState(null);
    // setCardsPlacedThisTurnOptimistic([]);
  };

  const handleDrawCard = () => {
    if (!isMyTurn) return;
    if ((publicGameState?.deckInfo.cardsLeft ?? 0) === 0) {
      toast({ title: "Deck Empty", description: "No more cards to draw.", variant: "destructive"});
      return;
    }
    sendWsMessage('DRAW_CARD_REQUEST', {});
    // Server will send PRIVATE_PLAYER_STATE_UPDATE and PUBLIC_GAME_STATE_UPDATE (for deck count)
    // And then server will auto-end turn.
  };

  // Loading state or initial prompt
  if (!localPlayerId || isProfileDialogOpen) {
    return (
      <div className="flex h-screen max-h-screen flex-col bg-background text-foreground items-center justify-center">
         <ProfileDialog 
            isOpen={isProfileDialogOpen || !localPlayerProfileInput.username} // Keep open if forced or no username
            onOpenChange={setIsProfileDialogOpen}
            currentProfile={localPlayerProfileInput}
            onSaveProfile={handleSaveProfile}
          />
        {!isProfileDialogOpen && <MascotLoader />} 
        {/* Show loader if dialog is closed but still waiting for profile/ID */}
      </div>
    );
  }

  if (!publicGameState || !myPrivatePlayerState) {
    return (
      <div className="flex h-screen max-h-screen flex-col bg-background text-foreground items-center justify-center">
        <MascotLoader />
        <p className="mt-4 text-lg">Connecting to game server and fetching state...</p>
      </div>
    );
  }

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
            allPlayers={publicGameState.players || []} // Pass all players from public game state
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center relative overflow-auto">
          {!isMyTurn && <MascotLoader />}
          <div className="w-full max-w-3xl mx-auto">
            <GameGrid
              gridState={publicGameState.board} // Use server's board state
              invalidCells={invalidCells} // Keep local for optimistic invalid UI
              isPlayerTurn={isMyTurn}
              onDropCardToCell={handleDropCardToCell}
              onDragStartCardInCell={handleDragStartCardInCell}
              cardsPlacedThisTurn={cardsPlacedThisTurnOptimistic} // For optimistic styling
            />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={handleEndTurn} disabled={!isMyTurn}>
              End Turn
            </Button>
            <Button onClick={handleDrawCard} variant="outline" disabled={!isMyTurn || (publicGameState?.deckInfo.cardsLeft ?? 0) === 0}>
              <PlusSquare className="mr-2 h-4 w-4" /> Draw Card &amp; End Turn ({publicGameState.deckInfo.cardsLeft} left)
            </Button>
            <Button onClick={handleNewGame} variant="ghost">
             <Shuffle className="mr-2 h-4 w-4" /> New Game (Server TODO)
            </Button>
          </div>
        </main>

        <aside className="w-full sm:w-72 md:w-80 lg:w-96 border-l p-2 sm:p-3 flex flex-col gap-3 bg-card/50">
          <div className="h-1/3 sm:h-2/5">
            <h2 className="text-md sm:text-lg font-headline text-primary mb-1.5 sm:mb-2">Your Cards ({myPrivatePlayerState.cards.length})</h2>
            <PlayerHand 
              cards={myPrivatePlayerState.cards} 
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
              playerProfiles={allPlayerProfilesForChat} // Use derived profiles
            />
          </div>
        </aside>
      </div>
       <ProfileDialog 
        isOpen={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
        currentProfile={localPlayerProfileInput}
        onSaveProfile={handleSaveProfile}
      />
    </div>
  );
}

