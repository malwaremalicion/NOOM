const http = require('http');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('NOOM Multiplayer Server Running\n');
});

const wss = new WebSocket.Server({ server });
const rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

wss.on('connection', (ws) => {
  ws.roomId = null;
  ws.isHost = false;
  const clientId = Math.random().toString(36).substring(2, 9);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'CREATE_ROOM') {
        const code = generateRoomCode();
        rooms[code] = {
          host: ws,
          clients: [ws],
          gameState: 'MENU',
          players: {},
          enemies: [],
          pickups: [],
          kills: 0,
          loopCount: 1
        };
        ws.roomId = code;
        ws.isHost = true;
        ws.send(JSON.stringify({ type: 'ROOM_CREATED', code }));
        console.log(`Room created: ${code}`);

      } else if (data.type === 'JOIN_ROOM') {
        const code = data.code.toUpperCase();
        const room = rooms[code];

        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found!' }));
          return;
        }
        if (room.gameState !== 'MENU') {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Game already in progress! Cannot join.' }));
          return;
        }

        room.clients.push(ws);
        ws.roomId = code;
        ws.isHost = false;
        ws.send(JSON.stringify({ type: 'JOINED_SUCCESS', code }));
        room.host.send(JSON.stringify({ type: 'PLAYER_JOINED' }));
        console.log(`Player joined room: ${code}`);

      } else if (data.type === 'START_GAME') {
        const room = rooms[ws.roomId];
        if (room && ws.isHost && room.gameState === 'MENU') {
          room.gameState = 'PLAYING';
          room.clients.forEach(client => client.send(JSON.stringify({ type: 'START_GAME_CLIENT' })));
        }

      } else if (data.type === 'UPDATE_STATE') {
        const room = rooms[ws.roomId];
        if (room) {
          room.players[clientId] = data.player;
          room.enemies = data.enemies;
          if (data.pickups) room.pickups = data.pickups;
          room.kills = data.kills;
          room.loopCount = data.loopCount;
          room.gameState = data.gameState;

          room.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'STATE_SYNC',
                players: room.players,
                enemies: room.enemies,
                pickups: room.pickups,
                kills: room.kills,
                loopCount: room.loopCount,
                gameState: room.gameState
              }));
            }
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  });

  ws.on('close', () => {
    if (ws.roomId && rooms[ws.roomId]) {
      const room = rooms[ws.roomId];
      room.clients = room.clients.filter(c => c !== ws);
      delete room.players[clientId];
      if (ws.isHost || room.clients.length === 0) {
        delete rooms[ws.roomId];
        console.log(`Room closed: ${ws.roomId}`);
      }
    }
  });
});

server.listen(3000, () => {
  console.log('NOOM Server running on http://localhost:3000');
});const http = require('http');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('NOOM Multiplayer Server Running\n');
});

const wss = new WebSocket.Server({ server });
const rooms = {}; // roomId -> { hostWs, clients: [], gameState: 'MENU', players: {}, enemies: [], kills: 0, loopCount: 1 }

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

wss.on('connection', (ws) => {
  ws.roomId = null;
  ws.isHost = false;
  const clientId = Math.random().toString(36).substring(2, 9);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'CREATE_ROOM') {
        const code = generateRoomCode();
        rooms[code] = {
          host: ws,
          clients: [ws],
          gameState: 'MENU',
          players: {},
          enemies: [],
          kills: 0,
          loopCount: 1
        };
        ws.roomId = code;
        ws.isHost = true;
        ws.send(JSON.stringify({ type: 'ROOM_CREATED', code }));
        console.log(`Room created: ${code}`);

      } else if (data.type === 'JOIN_ROOM') {
        const code = data.code.toUpperCase();
        const room = rooms[code];

        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found!' }));
          return;
        }
        if (room.gameState !== 'MENU') {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Game already in progress! Cannot join.' }));
          return;
        }

        room.clients.push(ws);
        ws.roomId = code;
        ws.isHost = false;
        ws.send(JSON.stringify({ type: 'JOINED_SUCCESS', code }));
        room.host.send(JSON.stringify({ type: 'PLAYER_JOINED' }));
        console.log(`Player joined room: ${code}`);

      } else if (data.type === 'START_GAME') {
        const room = rooms[ws.roomId];
        if (room && ws.isHost && room.gameState === 'MENU') {
          room.gameState = 'PLAYING';
          room.clients.forEach(client => client.send(JSON.stringify({ type: 'START_GAME_CLIENT' })));
        }

      } else if (data.type === 'UPDATE_STATE') {
        const room = rooms[ws.roomId];
        if (room) {
          room.players[clientId] = data.player;
          room.enemies = data.enemies;
          room.kills = data.kills;
          room.loopCount = data.loopCount;
          room.gameState = data.gameState;

          // Broadcast state to all other clients in the room
          room.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'STATE_SYNC',
                players: room.players,
                enemies: room.enemies,
                kills: room.kills,
                loopCount: room.loopCount,
                gameState: room.gameState
              }));
            }
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  });

  ws.on('close', () => {
    if (ws.roomId && rooms[ws.roomId]) {
      const room = rooms[ws.roomId];
      room.clients = room.clients.filter(c => c !== ws);
      delete room.players[clientId];
      if (ws.isHost || room.clients.length === 0) {
        delete rooms[ws.roomId];
        console.log(`Room closed: ${ws.roomId}`);
      }
    }
  });
});

server.listen(3000, () => {
  console.log('NOOM Server running on http://localhost:3000');
});
