const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

let queue = [];
let onlinePlayers = 0;
const rooms = {};
const privatePending = {};

function generateCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function checkWinner(board) {
    const patterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
    ];

    for (let [a, b, c] of patterns) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }

    if (!board.includes(null)) return "draw";
    return null;
}

io.on("connection", (socket) => {

    onlinePlayers++;
    io.emit("onlineCount", onlinePlayers);

    // =====================
    // MATCHMAKING
    // =====================
    socket.on("findMatch", () => {

        if (queue.find(p => p.id === socket.id)) return;

        queue.push(socket);

        socket.emit("waiting");

        if (queue.length >= 2) {

            const player1 = queue.shift();
            const player2 = queue.shift();

            const roomId = `room-${player1.id}-${player2.id}`;

            rooms[roomId] = {
                players: [
                    { id: player1.id, symbol: "X" },
                    { id: player2.id, symbol: "O" }
                ],
                board: Array(9).fill(null),
                turn: "X",
                score: { X: 0, O: 0 },
                streak: { X: 0, O: 0 },
                rematchVotes: {}
            };

            player1.join(roomId);
            player2.join(roomId);

            io.to(player1.id).emit("matchFound", { roomId, symbol: "X" });
            io.to(player2.id).emit("matchFound", { roomId, symbol: "O" });

            io.to(roomId).emit("matchStarted");
            io.to(roomId).emit("gameState", rooms[roomId]);
        }
    });

    // =====================
    // GAME MOVE
    // =====================
    socket.on("makeMove", ({ roomId, index }) => {

        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (room.board[index] !== null) return;
        if (room.turn !== player.symbol) return;

        room.board[index] = player.symbol;
        room.turn = room.turn === "X" ? "O" : "X";

        const winner = checkWinner(room.board);

        if (winner) {

            if (winner !== "draw") {
                room.score[winner]++;
                room.streak[winner]++;
                room.streak[winner === "X" ? "O" : "X"] = 0;
            } else {
                room.streak.X = 0;
                room.streak.O = 0;
            }

            io.to(roomId).emit("gameState", room);
            io.to(roomId).emit("gameOver", winner);

            return;
        }

        io.to(roomId).emit("gameState", room);
    });

    // =====================
    // CHAT
    // =====================
    socket.on("sendMessage", ({ roomId, message, symbol }) => {
        if (!rooms[roomId]) return;

        io.to(roomId).emit("receiveMessage", {
            sender: symbol,
            message,
            time: new Date().toLocaleTimeString()
        });
    });

    // =====================
    // REMATCH
    // =====================
    socket.on("rematch", ({ roomId }) => {

        const room = rooms[roomId];
        if (!room) return;

        if (room.rematchVotes[socket.id]) return;

        room.rematchVotes[socket.id] = true;

        if (Object.keys(room.rematchVotes).length === 2) {

            room.board = Array(9).fill(null);
            room.turn = "X";
            room.rematchVotes = {};

            io.to(roomId).emit("rematchStarted");
            io.to(roomId).emit("gameState", room);
        }
    });

    // =====================
    // PRIVATE ROOMS
    // =====================
    socket.on("createPrivateRoom", () => {
        for (const c in privatePending) {
            if (privatePending[c].id === socket.id) delete privatePending[c];
        }
        let code;
        do { code = generateCode(); } while (privatePending[code]);
        privatePending[code] = socket;
        socket.emit("privateRoomCreated", { code });
    });

    socket.on("joinPrivateRoom", ({ code }) => {
        const normalized = code?.trim().toUpperCase();
        const host = privatePending[normalized];
        if (!host) return socket.emit("privateRoomError", "Invalid or expired invite code.");
        if (host.id === socket.id) return socket.emit("privateRoomError", "You can't join your own room.");

        delete privatePending[normalized];

        const roomId = `room-${host.id}-${socket.id}`;
        rooms[roomId] = {
            players: [
                { id: host.id, symbol: "X" },
                { id: socket.id, symbol: "O" }
            ],
            board: Array(9).fill(null),
            turn: "X",
            score: { X: 0, O: 0 },
            streak: { X: 0, O: 0 },
            rematchVotes: {}
        };

        host.join(roomId);
        socket.join(roomId);

        io.to(host.id).emit("matchFound", { roomId, symbol: "X" });
        io.to(socket.id).emit("matchFound", { roomId, symbol: "O" });
        io.to(roomId).emit("matchStarted");
        io.to(roomId).emit("gameState", rooms[roomId]);
    });

    // =====================
    // VOICE CHAT SIGNALING
    // =====================
    socket.on("voiceReady", ({ roomId }) => {
        const room = rooms[roomId];
        if (!room) return;
        if (!room.voiceReady) room.voiceReady = new Set();
        room.voiceReady.add(socket.id);
        const opponent = room.players.find(p => p.id !== socket.id);
        if (opponent) io.to(opponent.id).emit("voiceOpponentReady");
        if (room.voiceReady.size >= 2) {
            const oPlayer = room.players.find(p => p.symbol === "O");
            if (oPlayer) io.to(oPlayer.id).emit("voiceCreateOffer");
        }
    });

    socket.on("voiceMuted", ({ roomId }) => {
        const room = rooms[roomId];
        if (room?.voiceReady) room.voiceReady.delete(socket.id);
        const opponent = room?.players.find(p => p.id !== socket.id);
        if (opponent) io.to(opponent.id).emit("voiceOpponentMuted");
    });

    socket.on("voiceOffer", ({ roomId, offer }) => {
        const opponent = rooms[roomId]?.players.find(p => p.id !== socket.id);
        if (opponent) io.to(opponent.id).emit("voiceOffer", { offer });
    });

    socket.on("voiceAnswer", ({ roomId, answer }) => {
        const opponent = rooms[roomId]?.players.find(p => p.id !== socket.id);
        if (opponent) io.to(opponent.id).emit("voiceAnswer", { answer });
    });

    socket.on("voiceIce", ({ roomId, candidate }) => {
        const opponent = rooms[roomId]?.players.find(p => p.id !== socket.id);
        if (opponent) io.to(opponent.id).emit("voiceIce", { candidate });
    });

    socket.on("disconnect", () => {

        onlinePlayers--;
        io.emit("onlineCount", onlinePlayers);

        queue = queue.filter(p => p.id !== socket.id);

        for (const c in privatePending) {
            if (privatePending[c].id === socket.id) delete privatePending[c];
        }

        for (let roomId in rooms) {
            if (rooms[roomId].players.find(p => p.id === socket.id)) {
                delete rooms[roomId];
            }
        }
    });
});

app.get("/", (req, res) => {
    res.status(200).json({ message: "Tic Tac Toe Server is running!" });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});