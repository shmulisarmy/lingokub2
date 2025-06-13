// server.js
const next = require('next');
const http = require('http');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler(); // handles all Next.js routing

const PORT = parseInt(process.env.PORT, 10) || 9002; // Ensure consistency with previous dev port

console.log("Custom server starting...");

const ws_state = {
  clients: new Set(), // Use a Set for easier add/remove
  messages: [], // Store history of messages (as stringified JSON)
  broadcast: (messageString) => {
    // console.log(`Broadcasting: ${messageString} to ${ws_state.clients.size} clients`);
    ws_state.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(messageString);
      }
    });
  },
  send_all_history: (client) => {
    // console.log(`Sending history to new client: ${ws_state.messages.length} messages`);
    ws_state.messages.forEach((messageString) => {
      if (client.readyState === client.OPEN) {
        client.send(messageString);
      }
    });
  },
  add_client: (client) => {
    ws_state.clients.add(client);
    console.log(`Client added. Total clients: ${ws_state.clients.size}`);
    ws_state.send_all_history(client); // Send message history to new client
  },
  remove_client: (client) => {
    ws_state.clients.delete(client);
    console.log(`Client removed. Total clients: ${ws_state.clients.size}`);
  }
};

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    // Be sure to pass `true` as the second argument to `url.parse`.
    // This tells it to parse the query portion of the URL.
    handle(req, res); // forward all HTTP requests to Next.js
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      console.log('Non-WS upgrade request, destroying socket.');
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req) => {
    console.log('Client connected via WebSocket');
    ws_state.add_client(ws);

    // For initial messages, maybe send a welcome from server
    // ws.send(JSON.stringify({
    //   id: Date.now().toString(),
    //   sender: 'system',
    //   text: 'Welcome to LingoKub Chat!',
    //   timestamp: Date.now()
    // }));


    ws.on('message', (messageBuffer) => {
      const messageString = messageBuffer.toString();
      console.log(`Received message: ${messageString}`);
      
      // Validate if message is JSON (optional, but good practice)
      try {
        JSON.parse(messageString); // Check if it's valid JSON
        ws_state.messages.push(messageString); // Store raw string
        ws_state.broadcast(messageString);
      } catch (error) {
        console.error('Received non-JSON message:', messageString, error);
        // Optionally, send an error back to the client
        // ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      ws_state.remove_client(ws);
      // Optionally, broadcast a "user left" message
      // const leaveMessage = JSON.stringify({
      //   id: Date.now().toString(),
      //   sender: 'system',
      //   text: `A user has left the chat.`, // Could use ws.clientId if assigned
      //   timestamp: Date.now()
      // });
      // ws_state.messages.push(leaveMessage);
      // ws_state.broadcast(leaveMessage);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      // Ensure client is removed on error too
      ws_state.remove_client(ws);
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
