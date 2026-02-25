import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

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

  const playerStyles = {
    X: {
      color: "text-sky-400",
      glow: "shadow-[0_0_25px_rgba(56,189,248,0.6)]",
      ring: "ring-sky-400",
      avatar: "🧑‍🚀"
    },
    O: {
      color: "text-pink-400",
      glow: "shadow-[0_0_25px_rgba(244,114,182,0.6)]",
      ring: "ring-pink-400",
      avatar: "🤖"
    }
  };

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
      setBoard(Array(9).fill(null));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 text-white flex flex-col items-center p-4">

      {/* HEADER */}
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-3xl md:text-4xl font-bold">Realtime Tic Tac Toe</h1>
        <p className="text-slate-300">Online Players: {online}</p>
      </div>

      {!roomId && (
        <button
          disabled={status.includes("Waiting")}
          onClick={findMatch}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition shadow-lg disabled:bg-slate-600"
        >
          {status.includes("Waiting") ? "Searching..." : "Play Match"}
        </button>
      )}

      {symbol && (
        <div className="w-full max-w-6xl">

          {/* PLAYER AVATARS */}
          <div className="flex justify-center gap-6 mb-6 flex-wrap">
            {["X","O"].map(p => {
              const isTurn = turn === p;
              return (
                <div key={p}
                  className={`flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10
                  ${isTurn ? `ring-2 ${playerStyles[p].ring} scale-105` : ""}`}
                >
                  <div className="text-2xl">{playerStyles[p].avatar}</div>
                  <div>
                    <div className={`font-semibold ${playerStyles[p].color}`}>
                      Player {p}
                    </div>
                    <div className="text-xs text-slate-400">
                      {symbol === p ? "You" : "Opponent"}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* TURN INDICATOR */}
          <div className="flex justify-center mb-4">
            <div className={`px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 ${playerStyles[turn].glow}`}>
              Turn: <span className={`font-bold ${playerStyles[turn].color}`}>{turn}</span>
            </div>
          </div>

          {/* SCOREBOARD */}
          <div className="flex justify-center gap-4 mb-6 flex-wrap">
            {["X","O"].map(s => (
              <div key={s}
                className={`px-6 py-3 rounded-2xl bg-white/10 border border-white/10
                ${highlight === s ? "ring-2 ring-yellow-400 scale-105" : ""}`}>
                <div className="text-lg font-semibold">{s}: {score[s]}</div>
                <div className="text-sm text-orange-300">🔥 {streak[s]}</div>
              </div>
            ))}
          </div>

          {/* MAIN GRID */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* BOARD */}
            <div className="relative flex justify-center">
              <div className="grid grid-cols-3 gap-3 p-4 rounded-3xl bg-white/5 backdrop-blur-md shadow-2xl">
                {board.map((cell,i)=>(
                  <div key={i}
                    onClick={()=>move(i)}
                    className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center text-3xl font-bold rounded-xl bg-slate-800 hover:bg-slate-700 cursor-pointer">
                    {cell && (
                      <span className={`animate-pop ${playerStyles[cell].color}`}>
                        {cell}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {gameOver && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-3xl space-y-4">
                  <h2 className="text-2xl font-bold">
                    {winner === "draw" ? "Draw!" : `${winner} Wins!`}
                  </h2>
                  <button
                    disabled={rematchClicked}
                    onClick={rematch}
                    className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition disabled:bg-slate-600">
                    {rematchClicked ? "Waiting..." : "Rematch"}
                  </button>
                </div>
              )}
            </div>

            {/* CHAT */}
            <div className="flex flex-col rounded-3xl bg-white/5 backdrop-blur-md shadow-xl border border-white/10 overflow-hidden">
              <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[350px]">
                {messages.map((msg,i)=>(
                  <div key={i} className="text-sm">
                    <span className="text-indigo-300 font-semibold">{msg.sender}:</span> {msg.message}
                  </div>
                ))}
                <div ref={chatRef}></div>
              </div>

              <div className="p-3 border-t border-white/10 flex gap-2">
                <input
                  value={input}
                  onChange={(e)=>setInput(e.target.value)}
                  onKeyDown={(e)=>e.key==="Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={sendMessage}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition">
                  Send
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default App;