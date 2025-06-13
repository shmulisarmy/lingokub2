
// server.js
const next = require('next');
const http = require('http');
const { WebSocketServer } = require('ws');
const { createInitialBoard, initialPublicGameState } = require('./GameState'); // Assuming GameState.ts is compiled to JS or handled by ts-node/tsx

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler(); // handles all Next.js routing

const PORT = parseInt(process.env.PORT, 10) || 3000;

console.log("Custom server starting...");

// --- Mock Deck ---
const createFullDeck = () => {
  const words = ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT", "GOLF", "HOTEL", "INDIA", "JULIET",
               "KILO", "LIMA", "MIKE", "NOVEMBER", "OSCAR", "PAPA", "QUEBEC", "ROMEO", "SIERRA", "TANGO",
               "UNIFORM", "VICTOR", "WHISKEY", "XRAY", "YANKEE", "ZULU", "APPLE", "BANANA", "CHERRY", "GRAPE"];
  return words.map((word, index) => ({ id: `deck-${index + 1}`, word }));
};

// Shuffle an array
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};
// --- End Mock Deck ---


// --- Game State Management ---
let serverGameState = {
  ...initialPublicGameState, // Spread initial public state
  board: createInitialBoard(),
  playerHands: {}, // playerId -> WordCardData[]
  fullDeck: shuffleArray(createFullDeck()), // Server holds the full deck
  gameId: `game-${Date.now()}`,
};
serverGameState.deckInfo.cardsLeft = serverGameState.fullDeck.length;


const ws_state = {
  clients: new Map(), // Map<WebSocket, string> (client -> playerId)
  playerProfiles: {}, // Store player profiles: { [playerId: string]: { username: string, avatarUrl: string } } (used for chat initially)
  
  // --- WebSocket Communication Helpers ---
  broadcastToAll: (messageObject) => {
    const messageString = JSON.stringify(messageObject);
    ws_state.clients.forEach((playerId, client) => {
      if (client.readyState === client.OPEN) {
        client.send(messageString);
      }
    });
  },

  sendToClient: (clientWs, messageObject) => {
    if (clientWs && clientWs.readyState === clientWs.OPEN) {
      clientWs.send(JSON.stringify(messageObject));
    } else {
      console.warn("Attempted to send to a closed or undefined client");
    }
  },

  getClientByPlayerId: (playerId) => {
    for (let [client, pId] of ws_state.clients.entries()) {
        if (pId === playerId) {
            return client;
        }
    }
    return null;
  },

  // --- Player & Game Management ---
  addPlayer: (clientWs, playerId, playerProfile) => {
    ws_state.clients.set(clientWs, playerId);
    ws_state.playerProfiles[playerId] = playerProfile; 

    const newPlayerPublicInfo = {
      playerId,
      username: playerProfile.username,
      avatarUrl: playerProfile.avatarUrl,
      isTurn: false, 
      cardCount: 0,
    };
    serverGameState.players.push(newPlayerPublicInfo);

    const initialHand = [];
    const initialHandSize = 7; 
    for (let i = 0; i < initialHandSize && serverGameState.fullDeck.length > 0; i++) {
      initialHand.push(serverGameState.fullDeck.pop());
    }
    serverGameState.playerHands[playerId] = initialHand;
    newPlayerPublicInfo.cardCount = initialHand.length;
    serverGameState.deckInfo.cardsLeft = serverGameState.fullDeck.length;

    if (!serverGameState.currentTurnPlayerId && serverGameState.players.length > 0) {
      serverGameState.currentTurnPlayerId = playerId;
      const playerToUpdate = serverGameState.players.find(p => p.playerId === playerId);
      if(playerToUpdate) playerToUpdate.isTurn = true;
    } else {
        const playerToUpdate = serverGameState.players.find(p => p.playerId === playerId);
        if(playerToUpdate) playerToUpdate.isTurn = false;
    }
    
    console.log(`Player ${playerId} (${playerProfile.username}) added. Total players: ${serverGameState.players.length}`);

    const privatePlayerInfo = {
      playerId,
      cards: serverGameState.playerHands[playerId] || [],
    };
    ws_state.sendToClient(clientWs, {
      type: 'JOIN_GAME_CONFIRMED',
      payload: { publicGameState: serverGameState, privatePlayerInfo }
    });

    const playerJoinedPayload = { player: newPlayerPublicInfo };
    ws_state.clients.forEach((pid, c) => {
      if (c !== clientWs && c.readyState === c.OPEN) {
        ws_state.sendToClient(c, { type: 'PLAYER_JOINED_NOTIFICATION', payload: playerJoinedPayload });
        ws_state.sendToClient(c, { type: 'PUBLIC_GAME_STATE_UPDATE', payload: { publicGameState: serverGameState } });
      }
    });
    
    ws_state.broadcastToAll({
        type: 'SYSTEM_MESSAGE',
        payload: { text: `${playerProfile.username} has joined the game.` }
    });
  },

  removePlayer: (clientWs) => {
    const playerId = ws_state.clients.get(clientWs);
    if (!playerId) return;

    const leavingPlayerProfile = ws_state.playerProfiles[playerId]; // Get profile BEFORE deleting
    const username = leavingPlayerProfile ? leavingPlayerProfile.username : playerId;

    ws_state.clients.delete(clientWs);
    delete ws_state.playerProfiles[playerId];
    delete serverGameState.playerHands[playerId]; 

    const playerIndex = serverGameState.players.findIndex(p => p.playerId === playerId);
    if (playerIndex > -1) {
      serverGameState.players.splice(playerIndex, 1);
    }
    
    console.log(`Player ${playerId} removed. Total players: ${serverGameState.players.length}`);

    let newTurnPlayerId = null;
    if (serverGameState.currentTurnPlayerId === playerId) {
      if (serverGameState.players.length > 0) {
        const oldTurnIndex = playerIndex > -1 ? playerIndex : 0; 
        const nextTurnIndex = oldTurnIndex % serverGameState.players.length;
        newTurnPlayerId = serverGameState.players[nextTurnIndex].playerId;
        serverGameState.currentTurnPlayerId = newTurnPlayerId;
        serverGameState.players.forEach(p => p.isTurn = (p.playerId === newTurnPlayerId));
      } else {
        serverGameState.currentTurnPlayerId = null;
      }
    }
    
    const playerLeftPayload = { playerId, newTurnPlayerId: serverGameState.currentTurnPlayerId };
    ws_state.broadcastToAll({ type: 'PLAYER_LEFT_NOTIFICATION', payload: playerLeftPayload });
    ws_state.broadcastToAll({ type: 'PUBLIC_GAME_STATE_UPDATE', payload: { publicGameState: serverGameState } });
    
    ws_state.broadcastToAll({
        type: 'SYSTEM_MESSAGE',
        payload: { text: `${username} has left the game.` }
    });

    if (ws_state.clients.size === 0) {
      console.log("All clients disconnected, resetting game state (partially).");
      serverGameState.board = createInitialBoard();
      serverGameState.players = [];
      serverGameState.playerHands = {};
      serverGameState.fullDeck = shuffleArray(createFullDeck());
      serverGameState.deckInfo.cardsLeft = serverGameState.fullDeck.length;
      serverGameState.currentTurnPlayerId = null;
    }
  },

  handlePlaceCardRequest: (playerId, payload) => {
    console.log(`Player ${playerId} wants to place card:`, payload);
    
    const { cardId, targetRow, targetCol } = payload;
    const playerHand = serverGameState.playerHands[playerId];
    const cardToPlace = playerHand.find(c => c.id === cardId);

    let isValid = false;
    if (cardToPlace && serverGameState.board[targetRow]?.[targetCol] === null) {
      serverGameState.board[targetRow][targetCol] = cardToPlace;
      serverGameState.playerHands[playerId] = playerHand.filter(c => c.id !== cardId);
      
      const playerPublicInfo = serverGameState.players.find(p => p.playerId === playerId);
      if (playerPublicInfo) {
        playerPublicInfo.cardCount = serverGameState.playerHands[playerId].length;
      }
      isValid = true;
    }

    const clientWs = ws_state.getClientByPlayerId(playerId);
    if (clientWs) {
      if (isValid) {
        ws_state.sendToClient(clientWs, { 
            type: 'PRIVATE_PLAYER_STATE_UPDATE', 
            payload: { privatePlayerInfo: { playerId, cards: serverGameState.playerHands[playerId] } }
        });
        ws_state.broadcastToAll({ type: 'PUBLIC_GAME_STATE_UPDATE', payload: { publicGameState: serverGameState }});
         ws_state.sendToClient(clientWs, { type: 'SYSTEM_MESSAGE', payload: { text: `Card ${cardToPlace.word} placed.` }});
      } else {
        ws_state.sendToClient(clientWs, { type: 'INVALID_MOVE_NOTIFICATION', payload: { message: 'Invalid placement. Cell not empty or card not in hand.' }});
      }
    }
  },

  handleEndTurnRequest: (playerId) => {
    console.log(`Player ${playerId} wants to end turn.`);
    if (serverGameState.currentTurnPlayerId !== playerId) {
      const clientWs = ws_state.getClientByPlayerId(playerId);
      if (clientWs) ws_state.sendToClient(clientWs, { type: 'INVALID_MOVE_NOTIFICATION', payload: { message: "Not your turn." }});
      return;
    }

    const currentPlayerIndex = serverGameState.players.findIndex(p => p.playerId === playerId);
    if (currentPlayerIndex === -1 || serverGameState.players.length === 0) return;

    serverGameState.players[currentPlayerIndex].isTurn = false;
    const nextPlayerIndex = (currentPlayerIndex + 1) % serverGameState.players.length;
    serverGameState.currentTurnPlayerId = serverGameState.players[nextPlayerIndex].playerId;
    serverGameState.players[nextPlayerIndex].isTurn = true;

    ws_state.broadcastToAll({ type: 'PUBLIC_GAME_STATE_UPDATE', payload: { publicGameState: serverGameState }});
  },
  
  handleDrawCardRequest: (playerId) => {
    console.log(`Player ${playerId} wants to draw a card.`);
    if (serverGameState.currentTurnPlayerId !== playerId) {
        const clientWs = ws_state.getClientByPlayerId(playerId);
        if (clientWs) ws_state.sendToClient(clientWs, { type: 'INVALID_MOVE_NOTIFICATION', payload: { message: "Not your turn to draw." }});
        return;
    }
    if (serverGameState.fullDeck.length === 0) {
        const clientWs = ws_state.getClientByPlayerId(playerId);
        if (clientWs) ws_state.sendToClient(clientWs, { type: 'INVALID_MOVE_NOTIFICATION', payload: { message: "Deck is empty." }});
        return;
    }

    const drawnCard = serverGameState.fullDeck.pop();
    serverGameState.playerHands[playerId].push(drawnCard);
    serverGameState.deckInfo.cardsLeft = serverGameState.fullDeck.length;
    
    const playerPublicInfo = serverGameState.players.find(p => p.playerId === playerId);
    if (playerPublicInfo) {
        playerPublicInfo.cardCount = serverGameState.playerHands[playerId].length;
    }

    const clientWs = ws_state.getClientByPlayerId(playerId);
    if (clientWs) {
        ws_state.sendToClient(clientWs, { 
            type: 'PRIVATE_PLAYER_STATE_UPDATE', 
            payload: { privatePlayerInfo: { playerId, cards: serverGameState.playerHands[playerId] } }
        });
    }
    ws_state.broadcastToAll({ type: 'PUBLIC_GAME_STATE_UPDATE', payload: { publicGameState: serverGameState }});
    
    ws_state.handleEndTurnRequest(playerId);
  },
};


app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const playerId = url.searchParams.get('playerId');
    const username = url.searchParams.get('username');
    const avatarUrl = url.searchParams.get('avatarUrl');


    if (url.pathname === '/ws' && playerId && username && avatarUrl) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req, playerId, { username, avatarUrl });
      });
    } else {
      console.log('Non-WS upgrade request or missing playerId/profile, destroying socket.');
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req, playerId, playerProfile) => {
    console.log(`Client connected via WebSocket with playerId: ${playerId}, profile: ${playerProfile.username}`);
    ws_state.addPlayer(ws, playerId, playerProfile);

    ws.on('message', (messageBuffer) => {
      const messageString = messageBuffer.toString();
      try {
        const message = JSON.parse(messageString); 
        
        if (message.type === 'CHAT_MESSAGE') {
          message.payload.sender = playerId; 
          ws_state.broadcastToAll(message); 
        } 
        else if (message.type === 'PLACE_CARD_REQUEST') {
          ws_state.handlePlaceCardRequest(playerId, message.payload);
        } else if (message.type === 'END_TURN_REQUEST') {
          ws_state.handleEndTurnRequest(playerId);
        } else if (message.type === 'DRAW_CARD_REQUEST') {
            ws_state.handleDrawCardRequest(playerId);
        }

      } catch (error) {
        console.error('Received non-JSON message or invalid message structure:', messageString, error);
      }
    });

    ws.on('close', () => {
      console.log(`Client ${playerId} disconnected`);
      ws_state.removePlayer(ws);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${playerId}:`, error);
      ws_state.removePlayer(ws); 
    });
  });

  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> WebSocket server ready on ws://localhost:${PORT}/ws`);
  });
}).catch(ex => {
  console.error(ex.stack)
  process.exit(1)
});

