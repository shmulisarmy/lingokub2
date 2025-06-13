
// server.js
const next = require('next');
const http = require('http');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler(); // handles all Next.js routing

const PORT = parseInt(process.env.PORT, 10) || 3000;

console.log("Custom server starting...");

const ws_state = {
  clients: new Map(), // Store clients with their playerIds: Map<WebSocket, string>
  messages: [], // Store history of CHAT_MESSAGE payloads (as stringified JSON)
  playerProfiles: {}, // Store player profiles: { [playerId: string]: { username: string, avatarUrl: string } }
  isFirstPlayerTurnAssigned: false, // Flag to track if the initial turn has been assigned

  broadcast: (messageObject) => {
    const messageString = JSON.stringify(messageObject);
    ws_state.clients.forEach((playerId, client) => {
      if (client.readyState === client.OPEN) {
        client.send(messageString);
      }
    });
  },

  sendToClient: (client, messageObject) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(messageObject));
    }
  },

  sendChatHistory: (client) => {
    ws_state.messages.forEach((chatMessagePayloadString) => {
      const chatMessage = JSON.parse(chatMessagePayloadString);
      ws_state.sendToClient(client, {
        type: 'CHAT_MESSAGE',
        payload: chatMessage
      });
    });
  },

  addClient: (client, playerId) => {
    ws_state.clients.set(client, playerId);
    console.log(`Client ${playerId} added. Total clients: ${ws_state.clients.size}`);
    
    // Send existing profiles to the new client
    ws_state.sendToClient(client, { type: 'ALL_PROFILES_UPDATE', payload: ws_state.playerProfiles });
    
    // Send chat history
    ws_state.sendChatHistory(client);

    // Assign initial turn
    if (!ws_state.isFirstPlayerTurnAssigned) {
      ws_state.sendToClient(client, { type: 'SET_INITIAL_TURN', payload: { isMyTurn: true } });
      ws_state.isFirstPlayerTurnAssigned = true;
      console.log(`Assigned initial turn to ${playerId}`);
    } else {
      ws_state.sendToClient(client, { type: 'SET_INITIAL_TURN', payload: { isMyTurn: false } });
      console.log(`Client ${playerId} is not the first player, setting isMyTurn to false.`);
    }


    // Send welcome message (delay slightly if profile is not yet set to allow profile update to arrive)
    setTimeout(() => {
        const welcomeText = ws_state.playerProfiles[playerId]?.username 
            ? `Welcome, ${ws_state.playerProfiles[playerId].username}! You are connected.`
            : `Welcome, ${playerId}! Set your profile. You are connected.`;
        ws_state.sendToClient(client, {
          type: 'SYSTEM_MESSAGE',
          payload: { text: welcomeText }
        });
    }, 500);


    // Announce new user to others (if they have a profile already)
    // This might be announced later once profile is set by client
    // if (ws_state.playerProfiles[playerId]) {
    //     ws_state.broadcast({
    //         type: 'SYSTEM_MESSAGE',
    //         payload: { text: `${ws_state.playerProfiles[playerId].username || playerId} has joined.` }
    //     });
    // }
  },

  removeClient: (client) => {
    const playerId = ws_state.clients.get(client);
    ws_state.clients.delete(client);
    console.log(`Client ${playerId} removed. Total clients: ${ws_state.clients.size}`);
    
    if (playerId && ws_state.playerProfiles[playerId]) {
      ws_state.broadcast({
        type: 'SYSTEM_MESSAGE',
        payload: { text: `${ws_state.playerProfiles[playerId].username || playerId} has left.` }
      });
    }
    // If all clients disconnect, reset the first player turn assignment flag
    if (ws_state.clients.size === 0) {
      console.log("All clients disconnected, resetting first player turn assignment.");
      ws_state.isFirstPlayerTurnAssigned = false;
    }
  }
};

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const playerId = url.searchParams.get('playerId');

    if (url.pathname === '/ws' && playerId) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req, playerId);
      });
    } else {
      console.log('Non-WS upgrade request or missing playerId, destroying socket.');
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req, playerId) => {
    console.log(`Client connected via WebSocket with playerId: ${playerId}`);
    ws_state.addClient(ws, playerId);

    ws.on('message', (messageBuffer) => {
      const messageString = messageBuffer.toString();
      try {
        const message = JSON.parse(messageString); 
        
        if (message.type === 'CHAT_MESSAGE') {
          message.payload.sender = playerId; 
          ws_state.messages.push(JSON.stringify(message.payload)); 
          ws_state.broadcast(message); 
        } else if (message.type === 'PROFILE_UPDATE') {
          const { username, avatarUrl } = message.payload;
          const profilePlayerId = message.payload.playerId;
          
          if (profilePlayerId === playerId) { 
            const oldUsername = ws_state.playerProfiles[playerId]?.username;
            const isNewProfile = !ws_state.playerProfiles[playerId];
            ws_state.playerProfiles[playerId] = { username, avatarUrl };
            ws_state.broadcast({ type: 'ALL_PROFILES_UPDATE', payload: ws_state.playerProfiles });

            if (isNewProfile || (oldUsername !== username && oldUsername)) {
                 const systemMessageText = isNewProfile 
                    ? `${username} has set their profile and joined.`
                    : `${oldUsername} is now known as ${username}.`;
                 ws_state.broadcast({
                    type: 'SYSTEM_MESSAGE',
                    payload: { text: systemMessageText }
                });
            }
          } else {
            console.warn(`Player ${playerId} attempt to update profile for ${profilePlayerId}`);
          }
        }

      } catch (error) {
        console.error('Received non-JSON message or invalid message structure:', messageString, error);
      }
    });

    ws.on('close', () => {
      console.log(`Client ${playerId} disconnected`);
      ws_state.removeClient(ws);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${playerId}:`, error);
      ws_state.removeClient(ws); 
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

