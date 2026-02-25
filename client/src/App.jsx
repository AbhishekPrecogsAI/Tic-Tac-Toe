import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000");

function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [symbol, setSymbol] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [message, setMessage] = useState("");

  useEffect(() => {
    socket.on("playerAssigned", (sym) => {
      setSymbol(sym);
      setJoined(true);
    });

    socket.on("gameState", (room) => {
      setBoard(room.board);
      setTurn(room.turn);
    });

    socket.on("gameOver", (winner) => {
      if (winner === "draw") {
        setMessage("Draw!");
      } else {
        setMessage(`${winner} Wins!`);
      }

      setTimeout(() => {
        setMessage("");
      }, 2000);
    });

    socket.on("roomFull", () => {
      alert("Room is full!");
    });

    return () => {
      socket.off();
    };
  }, []);

  const joinRoom = () => {
    if (roomId.trim()) {
      socket.emit("joinRoom", roomId);
    }
  };

  const handleClick = (index) => {
    socket.emit("makeMove", { roomId, index });
  };

  if (!joined) {
    return (
      <div className="container">
        <h1>Realtime Tic Tac Toe</h1>
        <input
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={joinRoom}>Join Room</button>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>You are: {symbol}</h2>
      <h3>Turn: {turn}</h3>
      <h3>{message}</h3>

      <div className="board">
        {board.map((cell, i) => (
          <div
            key={i}
            className="cell"
            onClick={() => handleClick(i)}
          >
            {cell}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;