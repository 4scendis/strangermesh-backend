const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let queue = [];

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  socket.on('join', (location) => {
    socket.location = location;
    queue.push(socket);
    matchStrangers();
  });

  socket.on('message', (msg) => {
    if (socket.partner) {
      socket.partner.emit('message', msg);
    }
  });

  socket.on('typing', () => {
    if (socket.partner) {
      socket.partner.emit('typing');
    }
  });

  socket.on('next', () => {
    disconnect(socket);
    socket.emit('message', '🔄 Finding new stranger...');
    queue.push(socket);
    matchStrangers();
  });

  socket.on('disconnect', () => {
    disconnect(socket);
  });
});

function matchStrangers() {
  for (let i = 0; i < queue.length - 1; i++) {
    const A = queue[i];
    for (let j = i + 1; j < queue.length; j++) {
      const B = queue[j];
      if (A.location === B.location || A.location === 'Global' || B.location === 'Global') {
        A.partner = B;
        B.partner = A;
        queue.splice(j, 1);
        queue.splice(i, 1);
        A.emit('message', '🟢 Connected to a stranger!');
        B.emit('message', '🟢 Connected to a stranger!');
        return;
      }
    }
  }
}

function disconnect(socket) {
  if (socket.partner) {
    socket.partner.emit('message', '❌ Stranger disconnected');
    socket.partner.partner = null;
  }
  queue = queue.filter(s => s !== socket && s.partner !== socket);
}

server.listen(process.env.PORT || 3000, () => {
  console.log('✅ StrangerMesh backend running on port', process.env.PORT || 3000);
});
