
// server.js
const next = require('next');
const http = require('http');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler(); // handles all Next.js routing

const PORT = parseInt(process.env.PORT, 10) || 3000; // Standard Next.js dev port, was 9002

console.log("Custom server starting...");

const ws_state = {
  clients: new Map(), // Store clients with their playerIds: Map<WebSocket, string>
  messages: [], // Store history of CHAT_MESSAGE payloads (as stringified JSON)
  playerProfiles: {}, // Store player profiles: { [playerId: string]: { username: string, avatarUrl: string } }

  broadcast: (messageObject) => {
    const messageString = JSON.stringify(messageObject);
    // console.log(`Broadcasting: ${messageString} to ${ws_state.clients.size} clients`);
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
    // console.log(`Sending chat history to new client: ${ws_state.messages.length} messages`);
    ws_state.messages.forEach((chatMessagePayloadString) => {
      // Wrap historical chat messages properly before sending
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

    // Send welcome message
    ws_state.sendToClient(client, {
      type: 'SYSTEM_MESSAGE',
      payload: { text: `Welcome, ${ws_state.playerProfiles[playerId]?.username || playerId}! You are connected.` }
    });

    // Announce new user to others (if they have a profile already)
    if (ws_state.playerProfiles[playerId]) {
        ws_state.broadcast({
            type: 'SYSTEM_MESSAGE',
            payload: { text: `${ws_state.playerProfiles[playerId].username || playerId} has joined.` }
        });
    }
  },

  removeClient: (client) => {
    const playerId = ws_state.clients.get(client);
    ws_state.clients.delete(client);
    // delete ws_state.playerProfiles[playerId]; // Or keep profile for a while? For now, let's keep.
    console.log(`Client ${playerId} removed. Total clients: ${ws_state.clients.size}`);
    if (playerId && ws_state.playerProfiles[playerId]) {
      ws_state.broadcast({
        type: 'SYSTEM_MESSAGE',
        payload: { text: `${ws_state.playerProfiles[playerId].username || playerId} has left.` }
      });
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
      // console.log(`Received message from ${playerId}: ${messageString}`);
      try {
        const message = JSON.parse(messageString); // Should be WebSocketMessage
        
        if (message.type === 'CHAT_MESSAGE') {
          // Ensure sender is set correctly, even if client sends it, server authority
          message.payload.sender = playerId; 
          ws_state.messages.push(JSON.stringify(message.payload)); // Store only ChatMessageData payload
          ws_state.broadcast(message); // Broadcast the full WebSocketMessage
        } else if (message.type === 'PROFILE_UPDATE') {
          const { username, avatarUrl } = message.payload;
          const profilePlayerId = message.payload.playerId;
          
          if (profilePlayerId === playerId) { // Ensure client can only update their own profile
            const oldUsername = ws_state.playerProfiles[playerId]?.username;
            ws_state.playerProfiles[playerId] = { username, avatarUrl };
             // console.log("Updated profiles:", ws_state.playerProfiles);
            ws_state.broadcast({ type: 'ALL_PROFILES_UPDATE', payload: ws_state.playerProfiles });

            if (oldUsername !== username && oldUsername) {
                 ws_state.broadcast({
                    type: 'SYSTEM_MESSAGE',
                    payload: { text: `${oldUsername} is now known as ${username}.` }
                });
            } else if (!oldUsername) {
                 ws_state.broadcast({
                    type: 'SYSTEM_MESSAGE',
                    payload: { text: `${username} has set their profile and joined.` }
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
