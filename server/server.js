const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const rooms = {};

function checkWinner(board) {
  const patterns = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];

  for (let [a,b,c] of patterns) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (!board.includes(null)) return "draw";
  return null;
}

io.on("connection", (socket) => {

  socket.on("joinRoom", (roomId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        board: Array(9).fill(null),
        turn: "X",
      };
    }

    const room = rooms[roomId];

    if (room.players.length >= 2) {
      socket.emit("roomFull");
      return;
    }

    const symbol = room.players.length === 0 ? "X" : "O";

    room.players.push({
      id: socket.id,
      symbol,
    });

    socket.join(roomId);

    socket.emit("playerAssigned", symbol);
    io.to(roomId).emit("gameState", room);

  });

  socket.on("makeMove", ({ roomId, index }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    if (room.board[index] || room.turn !== player.symbol) return;

    room.board[index] = player.symbol;
    room.turn = room.turn === "X" ? "O" : "X";

    const winner = checkWinner(room.board);

    if (winner) {
      io.to(roomId).emit("gameOver", winner);

      // reset game
      room.board = Array(9).fill(null);
      room.turn = "X";
    }

    io.to(roomId).emit("gameState", room);
  });

  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      rooms[roomId].players =
        rooms[roomId].players.filter(p => p.id !== socket.id);
    }
  });

});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});