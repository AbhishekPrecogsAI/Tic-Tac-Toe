import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000");

function App() {

  const [online, setOnline] = useState(0);
  const [roomId, setRoomId] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [status, setStatus] = useState("Click Play to Find Match");
  const [score, setScore] = useState({ X: 0, O: 0 });
  const [streak, setStreak] = useState({ X: 0, O: 0 });
  const [highlight, setHighlight] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [rematchClicked, setRematchClicked] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatRef = useRef();

  const winAudio = new Audio("/win.mp3");

  useEffect(() => {

    socket.on("onlineCount", setOnline);

    socket.on("waiting", () => {
      setStatus("⏳ Waiting for opponent...");
    });

    socket.on("matchFound", ({ roomId, symbol }) => {
      setRoomId(roomId);
      setSymbol(symbol);
    });

    socket.on("matchStarted", () => {
      setStatus("🎮 Match Started");
    });

    socket.on("gameState", (room) => {
      setBoard(room.board);
      setTurn(room.turn);
      setScore(room.score);
      setStreak(room.streak);
    });

    socket.on("gameOver", (result) => {
      setGameOver(true);
      setWinner(result);

      if (result !== "draw") {
        setHighlight(result);
        winAudio.play();
        setTimeout(() => setHighlight(null), 1500);
      }
    });

    socket.on("receiveMessage", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on("rematchStarted", () => {
      setGameOver(false);
      setWinner(null);
      setRematchClicked(false);
      setStatus("🔄 Rematch Started");
    });

    return () => socket.off();
  }, []);

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const findMatch = () => socket.emit("findMatch");

  const move = (i) => {
    if (!gameOver && board[i] == null) {
      socket.emit("makeMove", { roomId, index: i });
    }
  };

  const sendMessage = () => {
    if (input.trim()) {
      socket.emit("sendMessage", { roomId, message: input, symbol });
      setInput("");
    }
  };

  const rematch = () => {
    if (!rematchClicked) {
      socket.emit("rematch", { roomId });
      setRematchClicked(true);
      setStatus("Waiting for opponent...");
    }
  };

  return (
    <div className="container">
      <h1>Realtime Tic Tac Toe</h1>
      <h3>Online Players: {online}</h3>

      {!roomId && (
        <button
          disabled={status.includes("Waiting")}
          onClick={findMatch}
        >
          {status.includes("Waiting") ? "Searching..." : "Play"}
        </button>
      )}

      {symbol && (
        <>
          <h2>You are: {symbol}</h2>
          <h3>{status}</h3>

          <div className="scoreboard">
            <div className={`score ${highlight === "X" ? "winner" : ""}`}>
              X: {score.X}
              <div className="streak">🔥 {streak.X}</div>
            </div>

            <div className={`score ${highlight === "O" ? "winner" : ""}`}>
              O: {score.O}
              <div className="streak">🔥 {streak.O}</div>
            </div>
          </div>

          <div className="game-chat">

            <div className="game-wrapper">
              <div className={`board ${gameOver ? "disabled" : ""}`}>
                {board.map((cell, i) => (
                  <div key={i} className="cell" onClick={() => move(i)}>
                    {cell}
                  </div>
                ))}
              </div>

              {gameOver && (
                <div className="overlay">
                  <h2>{winner === "draw" ? "Draw!" : `${winner} Wins!`}</h2>
                  <button disabled={rematchClicked} onClick={rematch}>
                    {rematchClicked ? "Waiting..." : "Rematch"}
                  </button>
                </div>
              )}
            </div>

            <div className="chat-box">
              <div className="messages">
                {messages.map((msg, i) => (
                  <div key={i}>
                    <strong>{msg.sender}:</strong> {msg.message}
                  </div>
                ))}
                <div ref={chatRef}></div>
              </div>

              <div className="chat-input">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button onClick={sendMessage}>Send</button>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

export default App;