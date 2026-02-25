// import React, { useEffect, useRef, useState } from "react";
// import { io } from "socket.io-client";

// const socket = io("https://tic-tac-toe-04fr.onrender.com");

// function App() {

//   const [online, setOnline] = useState(0);
//   const [roomId, setRoomId] = useState(null);
//   const [symbol, setSymbol] = useState(null);
//   const [board, setBoard] = useState(Array(9).fill(null));
//   const [turn, setTurn] = useState("X");
//   const [status, setStatus] = useState("Click Play to Find Match");
//   const [score, setScore] = useState({ X: 0, O: 0 });
//   const [streak, setStreak] = useState({ X: 0, O: 0 });
//   const [highlight, setHighlight] = useState(null);
//   const [gameOver, setGameOver] = useState(false);
//   const [winner, setWinner] = useState(null);
//   const [rematchClicked, setRematchClicked] = useState(false);

//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const chatRef = useRef();

//   const winAudio = new Audio("/win.mp3");

//   const playerStyles = {
//     X: {
//       color: "text-sky-400",
//       glow: "shadow-[0_0_25px_rgba(56,189,248,0.6)]",
//       ring: "ring-sky-400",
//       avatar: "🧑‍🚀"
//     },
//     O: {
//       color: "text-pink-400",
//       glow: "shadow-[0_0_25px_rgba(244,114,182,0.6)]",
//       ring: "ring-pink-400",
//       avatar: "🤖"
//     }
//   };

//   useEffect(() => {

//     socket.on("onlineCount", setOnline);

//     socket.on("waiting", () => {
//       setStatus("⏳ Waiting for opponent...");
//     });

//     socket.on("matchFound", ({ roomId, symbol }) => {
//       setRoomId(roomId);
//       setSymbol(symbol);
//     });

//     socket.on("matchStarted", () => {
//       setStatus("🎮 Match Started");
//     });

//     socket.on("gameState", (room) => {
//       setBoard(room.board);
//       setTurn(room.turn);
//       setScore(room.score);
//       setStreak(room.streak);
//     });

//     socket.on("gameOver", (result) => {
//       setGameOver(true);
//       setWinner(result);

//       if (result !== "draw") {
//         setHighlight(result);
//         winAudio.play();
//         setTimeout(() => setHighlight(null), 1500);
//       }
//     });

//     socket.on("receiveMessage", (msg) => {
//       setMessages(prev => [...prev, msg]);
//     });

//     socket.on("rematchStarted", () => {
//       setGameOver(false);
//       setWinner(null);
//       setRematchClicked(false);
//       setStatus("🔄 Rematch Started");
//       setBoard(Array(9).fill(null));
//     });

//     return () => socket.off();
//   }, []);

//   useEffect(() => {
//     chatRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   const findMatch = () => socket.emit("findMatch");

//   const move = (i) => {
//     if (!gameOver && board[i] == null) {
//       socket.emit("makeMove", { roomId, index: i });
//     }
//   };

//   const sendMessage = () => {
//     if (input.trim()) {
//       socket.emit("sendMessage", { roomId, message: input, symbol });
//       setInput("");
//     }
//   };

//   const rematch = () => {
//     if (!rematchClicked) {
//       socket.emit("rematch", { roomId });
//       setRematchClicked(true);
//       setStatus("Waiting for opponent...");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 text-white flex flex-col items-center p-4">

//       {/* HEADER */}
//       <div className="text-center space-y-2 mb-6">
//         <h1 className="text-3xl md:text-4xl font-bold">Realtime Tic Tac Toe</h1>
//         <p className="text-slate-300">Online Players: {online}</p>
//       </div>

//       {!roomId && (
//         <button
//           disabled={status.includes("Waiting")}
//           onClick={findMatch}
//           className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition shadow-lg disabled:bg-slate-600"
//         >
//           {status.includes("Waiting") ? "Searching..." : "Play Match"}
//         </button>
//       )}

//       {symbol && (
//         <div className="w-full max-w-6xl">

//           {/* PLAYER AVATARS */}
//           <div className="flex justify-center gap-6 mb-6 flex-wrap">
//             {["X","O"].map(p => {
//               const isTurn = turn === p;
//               return (
//                 <div key={p}
//                   className={`flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10
//                   ${isTurn ? `ring-2 ${playerStyles[p].ring} scale-105` : ""}`}
//                 >
//                   <div className="text-2xl">{playerStyles[p].avatar}</div>
//                   <div>
//                     <div className={`font-semibold ${playerStyles[p].color}`}>
//                       Player {p}
//                     </div>
//                     <div className="text-xs text-slate-400">
//                       {symbol === p ? "You" : "Opponent"}
//                     </div>
//                   </div>
//                 </div>
//               )
//             })}
//           </div>

//           {/* TURN INDICATOR */}
//           <div className="flex justify-center mb-4">
//             <div className={`px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 ${playerStyles[turn].glow}`}>
//               Turn: <span className={`font-bold ${playerStyles[turn].color}`}>{turn}</span>
//             </div>
//           </div>

//           {/* SCOREBOARD */}
//           <div className="flex justify-center gap-4 mb-6 flex-wrap">
//             {["X","O"].map(s => (
//               <div key={s}
//                 className={`px-6 py-3 rounded-2xl bg-white/10 border border-white/10
//                 ${highlight === s ? "ring-2 ring-yellow-400 scale-105" : ""}`}>
//                 <div className="text-lg font-semibold">{s}: {score[s]}</div>
//                 <div className="text-sm text-orange-300">🔥 {streak[s]}</div>
//               </div>
//             ))}
//           </div>

//           {/* MAIN GRID */}
//           <div className="grid md:grid-cols-2 gap-6">

//             {/* BOARD */}
//             <div className="relative flex justify-center">
//               <div className="grid grid-cols-3 gap-3 p-4 rounded-3xl bg-white/5 backdrop-blur-md shadow-2xl">
//                 {board.map((cell,i)=>(
//                   <div key={i}
//                     onClick={()=>move(i)}
//                     className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center text-3xl font-bold rounded-xl bg-slate-800 hover:bg-slate-700 cursor-pointer">
//                     {cell && (
//                       <span className={`animate-pop ${playerStyles[cell].color}`}>
//                         {cell}
//                       </span>
//                     )}
//                   </div>
//                 ))}
//               </div>

//               {gameOver && (
//                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-3xl space-y-4">
//                   <h2 className="text-2xl font-bold">
//                     {winner === "draw" ? "Draw!" : `${winner} Wins!`}
//                   </h2>
//                   <button
//                     disabled={rematchClicked}
//                     onClick={rematch}
//                     className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition disabled:bg-slate-600">
//                     {rematchClicked ? "Waiting..." : "Rematch"}
//                   </button>
//                 </div>
//               )}
//             </div>

//             {/* CHAT */}
//             <div className="flex flex-col rounded-3xl bg-white/5 backdrop-blur-md shadow-xl border border-white/10 overflow-hidden">
//               <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[350px]">
//                 {messages.map((msg,i)=>(
//                   <div key={i} className="text-sm">
//                     <span className="text-indigo-300 font-semibold">{msg.sender}:</span> {msg.message}
//                   </div>
//                 ))}
//                 <div ref={chatRef}></div>
//               </div>

//               <div className="p-3 border-t border-white/10 flex gap-2">
//                 <input
//                   value={input}
//                   onChange={(e)=>setInput(e.target.value)}
//                   onKeyDown={(e)=>e.key==="Enter" && sendMessage()}
//                   placeholder="Type a message..."
//                   className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
//                 />
//                 <button onClick={sendMessage}
//                   className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition">
//                   Send
//                 </button>
//               </div>
//             </div>

//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;


import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("https://tic-tac-toe-04fr.onrender.com");

const PLAYER_CONFIG = {
  X: { avatar: "🧑‍🚀", label: "Player X", colorClass: "x" },
  O: { avatar: "🤖", label: "Player O", colorClass: "o" },
};

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

  useEffect(() => {
    socket.on("onlineCount", setOnline);
    socket.on("waiting", () => setStatus("⏳ Waiting for opponent..."));
    socket.on("matchFound", ({ roomId, symbol }) => { setRoomId(roomId); setSymbol(symbol); });
    socket.on("matchStarted", () => setStatus("🎮 Match Started"));
    socket.on("gameState", (room) => {
      setBoard(room.board); setTurn(room.turn);
      setScore(room.score); setStreak(room.streak);
    });
    socket.on("gameOver", (result) => {
      setGameOver(true); setWinner(result);
      if (result !== "draw") {
        setHighlight(result);
        setTimeout(() => setHighlight(null), 1500);
      }
    });
    socket.on("receiveMessage", (msg) => setMessages(prev => [...prev, msg]));
    socket.on("rematchStarted", () => {
      setGameOver(false); setWinner(null); setRematchClicked(false);
      setStatus("🔄 Rematch Started"); setBoard(Array(9).fill(null));
    });
    return () => socket.off();
  }, []);

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const findMatch = () => socket.emit("findMatch");
  const move = (i) => { if (!gameOver && board[i] == null) socket.emit("makeMove", { roomId, index: i }); };
  const sendMessage = () => {
    if (input.trim()) { socket.emit("sendMessage", { roomId, message: input, symbol }); setInput(""); }
  };
  const rematch = () => {
    if (!rematchClicked) { socket.emit("rematch", { roomId }); setRematchClicked(true); setStatus("Waiting for opponent..."); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

        :root {
          --bg: #080b14;
          --surface: #0f1422;
          --surface2: #161c30;
          --border: rgba(255,255,255,0.07);
          --x: #00e5ff;
          --o: #ff4d8d;
          --text: #e8eaf0;
          --muted: #5a6180;
          --accent: #7c5cfc;
          --radius: 16px;
        }

        html, body, #root {
          height: 100%;
          overflow: hidden;
          background: var(--bg);
          color: var(--text);
          font-family: 'Syne', sans-serif;
        }

        /* ── APP SHELL: full viewport, no scroll ── */
        .ttt-app {
          height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 12px 12px;
          overflow: hidden;
          position: relative;
        }

        .ttt-app::before {
          content: '';
          position: fixed;
          top: -120px; left: 50%;
          transform: translateX(-50%);
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(124,92,252,0.12) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        /* HEADER — fixed height, never shrinks */
        .ttt-header {
          text-align: center;
          flex-shrink: 0;
          margin-bottom: 8px;
          position: relative; z-index: 1;
        }

        .ttt-header h1 {
          font-size: clamp(18px, 4vw, 28px);
          font-weight: 800;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.45) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .online-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: var(--muted);
          margin-top: 4px;
        }

        .online-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22d66a;
          box-shadow: 0 0 8px #22d66a;
          animation: blink 2s infinite;
        }

        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.35} }

        /* PLAY BUTTON */
        .play-btn {
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 50px;
          padding: 14px 40px;
          font-family: 'Syne', sans-serif;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 8px 32px rgba(124,92,252,0.35);
          position: relative; z-index: 1;
        }

        .play-btn:hover { transform: translateY(-1px); box-shadow: 0 12px 40px rgba(124,92,252,0.5); }
        .play-btn:active { transform: scale(0.97); }
        .play-btn:disabled { background: var(--surface2); box-shadow: none; cursor: default; }

        /* ── GAME: fills remaining height, never overflows ── */
        .ttt-game {
          width: 100%;
          max-width: 900px;
          flex: 1;
          min-height: 0;           /* critical for flex children */
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative; z-index: 1;
          overflow: hidden;
        }

        /* PLAYERS ROW — fixed height */
        .players-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          flex-shrink: 0;
        }

        .player-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }

        .player-card::after {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .player-card.active-x { border-color: rgba(0,229,255,0.35); }
        .player-card.active-x::after { background: linear-gradient(135deg, rgba(0,229,255,0.08) 0%, transparent 60%); opacity: 1; }
        .player-card.active-o { border-color: rgba(255,77,141,0.35); }
        .player-card.active-o::after { background: linear-gradient(135deg, rgba(255,77,141,0.08) 0%, transparent 60%); opacity: 1; }

        .p-avatar {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: var(--surface2);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }

        .p-name { font-size: 12px; font-weight: 700; }
        .p-name.x { color: var(--x); }
        .p-name.o { color: var(--o); }
        .p-role { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); margin-top: 1px; }

        /* META ROW — fixed height */
        .meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-shrink: 0;
        }

        .turn-pill {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 50px;
          padding: 8px 16px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: var(--muted);
          white-space: nowrap;
        }

        .turn-pill b { font-weight: 700; }
        .turn-pill b.x { color: var(--x); }
        .turn-pill b.o { color: var(--o); }

        .scores { display: flex; gap: 8px; }

        .score-chip {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 8px 14px;
          text-align: center;
          transition: all 0.3s;
          font-family: 'DM Mono', monospace;
        }

        .score-chip.glow-x { border-color: rgba(0,229,255,0.5); box-shadow: 0 0 16px rgba(0,229,255,0.25); }
        .score-chip.glow-o { border-color: rgba(255,77,141,0.5); box-shadow: 0 0 16px rgba(255,77,141,0.25); }

        .sc-label { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
        .sc-val { font-size: 18px; font-weight: 700; line-height: 1.1; margin: 1px 0; }
        .sc-val.x { color: var(--x); }
        .sc-val.o { color: var(--o); }
        .sc-streak { font-size: 10px; color: #f97316; }

        /* ── MAIN GRID: fills all remaining height ── */
        .main-grid {
          flex: 1;
          min-height: 0;
          display: grid;
          gap: 10px;
          /* Mobile: single column — board natural size, chat fixed below */
          grid-template-columns: 1fr;
          grid-template-rows: auto 1fr;
        }

        /* Desktop: two equal columns, both stretch to same height */
        @media (min-width: 600px) {
          .main-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto;
            align-items: start;
            justify-content: center;
          }
        }

        /* ── BOARD: always square ── */
        .board-wrap {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 10px;
          position: relative;
          aspect-ratio: 1 / 1;
          width: 100%;
          max-width: 380px;
          justify-self: center;
        }

        @media (min-width: 600px) {
          .board-wrap {
            max-width: 100%;
            justify-self: stretch;
          }
        }

        .board-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(3, 1fr);
          gap: 8px;
          position: absolute;
          inset: 10px;
        }

        .cell {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: clamp(22px, 5vw, 38px);
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s;
          user-select: none;
          width: 100%;
          height: 100%;
        }

        .cell:active { transform: scale(0.93); }
        .cell:hover:not(.filled) { background: rgba(255,255,255,0.05); }

        .cell.x { color: var(--x); border-color: rgba(0,229,255,0.2); text-shadow: 0 0 18px rgba(0,229,255,0.55); }
        .cell.o { color: var(--o); border-color: rgba(255,77,141,0.2); text-shadow: 0 0 18px rgba(255,77,141,0.55); }

        .cell.win.x { background: rgba(0,229,255,0.1); border-color: rgba(0,229,255,0.6); animation: glowX 0.9s ease infinite alternate; }
        .cell.win.o { background: rgba(255,77,141,0.1); border-color: rgba(255,77,141,0.6); animation: glowO 0.9s ease infinite alternate; }

        @keyframes glowX { from{box-shadow:0 0 8px rgba(0,229,255,0.2)} to{box-shadow:0 0 28px rgba(0,229,255,0.6)} }
        @keyframes glowO { from{box-shadow:0 0 8px rgba(255,77,141,0.2)} to{box-shadow:0 0 28px rgba(255,77,141,0.6)} }

        @keyframes popIn { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        .cell-symbol { animation: popIn 0.2s ease forwards; }

        /* Win overlay */
        .win-overlay {
          position: absolute;
          inset: 0;
          border-radius: 20px;
          background: rgba(8,11,20,0.85);
          backdrop-filter: blur(6px);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 18px;
          animation: fadeIn 0.3s ease;
          z-index: 10;
        }

        @keyframes fadeIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }

        .win-title {
          font-size: clamp(24px, 6vw, 32px);
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .win-title.x { color: var(--x); text-shadow: 0 0 30px rgba(0,229,255,0.7); }
        .win-title.o { color: var(--o); text-shadow: 0 0 30px rgba(255,77,141,0.7); }
        .win-title.draw { color: var(--text); }

        .rematch-btn {
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 50px;
          padding: 12px 30px;
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 6px 24px rgba(124,92,252,0.4);
        }

        .rematch-btn:active { transform: scale(0.96); }
        .rematch-btn:disabled { background: var(--surface2); box-shadow: none; cursor: default; }

        /* ── CHAT: same square shape as board ── */
        .chat-wrap {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 200px;
        }

        /* Desktop: force same aspect-ratio as board so they match */
        @media (min-width: 600px) {
          .main-grid { align-items: start; }
          .chat-wrap {
            aspect-ratio: 1 / 1;
            width: 100%;
            min-height: 0;
          }
        }

        .chat-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 1.5px;
          color: var(--muted);
          text-transform: uppercase;
          display: flex; align-items: center; gap: 8px;
        }

        .chat-header::before {
          content: '';
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22d66a;
          box-shadow: 0 0 6px #22d66a;
          animation: blink 2s infinite;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 0;
          scrollbar-width: thin;
          scrollbar-color: var(--surface2) transparent;
        }

        .chat-messages::-webkit-scrollbar { width: 3px; }
        .chat-messages::-webkit-scrollbar-thumb { background: var(--surface2); border-radius: 10px; }

        .msg {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          animation: slideUp 0.2s ease;
        }

        @keyframes slideUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .msg.me { flex-direction: row-reverse; }

        .msg-av {
          width: 28px; height: 28px;
          border-radius: 8px;
          background: var(--surface2);
          font-size: 16px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .msg-body { max-width: 72%; }
        .msg-sender { font-family: 'DM Mono', monospace; font-size: 9px; color: var(--muted); margin-bottom: 3px; }
        .msg.me .msg-sender { text-align: right; }

        .msg-bubble {
          padding: 8px 12px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.45;
          word-break: break-word;
        }

        .msg.them .msg-bubble {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-bottom-left-radius: 4px;
        }

        .msg.me .msg-bubble {
          background: var(--accent);
          color: #fff;
          border-bottom-right-radius: 4px;
        }

        .chat-input-row {
          padding: 10px 12px;
          border-top: 1px solid var(--border);
          display: flex; gap: 8px;
          align-items: center;
        }

        .chat-input {
          flex: 1;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 50px;
          padding: 10px 16px;
          color: var(--text);
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }

        .chat-input::placeholder { color: var(--muted); }
        .chat-input:focus { border-color: rgba(124,92,252,0.5); }

        .send-btn {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: var(--accent);
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(124,92,252,0.35);
        }

        .send-btn:active { transform: scale(0.92); }

        .send-icon { width: 16px; height: 16px; fill: #fff; }
      `}</style>

      <div className="ttt-app">
        {/* HEADER */}
        <div className="ttt-header">
          <h1>Tic Tac Toe</h1>
          <div className="online-badge">
            <div className="online-dot" />
            {online} players online
          </div>
        </div>

        {/* LOBBY */}
        {!roomId && (
          <button
            className="play-btn"
            disabled={status.includes("Waiting")}
            onClick={findMatch}
          >
            {status.includes("Waiting") ? "Searching..." : "▶ Play Match"}
          </button>
        )}

        {/* GAME */}
        {symbol && (
          <div className="ttt-game">

            {/* PLAYERS */}
            <div className="players-row">
              {["X", "O"].map(p => {
                const cfg = PLAYER_CONFIG[p];
                const isActive = turn === p;
                return (
                  <div key={p} className={`player-card ${isActive ? `active-${p.toLowerCase()}` : ""}`}>
                    <div className="p-avatar">{cfg.avatar}</div>
                    <div>
                      <div className={`p-name ${p.toLowerCase()}`}>{cfg.label}</div>
                      <div className="p-role">{symbol === p ? "You" : "Opponent"}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* META */}
            <div className="meta-row">
              <div className="turn-pill">
                Turn: <b className={turn.toLowerCase()}>{turn}</b>
              </div>
              <div className="scores">
                {["X", "O"].map(s => (
                  <div key={s} className={`score-chip ${highlight === s ? `glow-${s.toLowerCase()}` : ""}`}>
                    <div className="sc-label">{s}</div>
                    <div className={`sc-val ${s.toLowerCase()}`}>{score[s]}</div>
                    <div className="sc-streak">🔥 {streak[s]}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* BOARD + CHAT */}
            <div className="main-grid">

              {/* BOARD */}
              <div className="board-wrap">
                <div className="board-grid">
                  {board.map((cell, i) => (
                    <div
                      key={i}
                      className={`cell ${cell ? cell.toLowerCase() + " filled" : ""}`}
                      onClick={() => move(i)}
                    >
                      {cell && (
                        <span className="cell-symbol">{cell}</span>
                      )}
                    </div>
                  ))}
                </div>

                {gameOver && (
                  <div className="win-overlay">
                    <div className={`win-title ${winner === "draw" ? "draw" : winner?.toLowerCase()}`}>
                      {winner === "draw" ? "It's a Draw!" : `${winner} Wins! 🎉`}
                    </div>
                    <button
                      className="rematch-btn"
                      disabled={rematchClicked}
                      onClick={rematch}
                    >
                      {rematchClicked ? "Waiting..." : "Rematch"}
                    </button>
                  </div>
                )}
              </div>

              {/* CHAT */}
              <div className="chat-wrap">
                <div className="chat-header">Live Chat</div>

                <div className="chat-messages">
                  {messages.map((msg, i) => {
                    const isMe = msg.sender === symbol;
                    const cfg = PLAYER_CONFIG[msg.sender];
                    return (
                      <div key={i} className={`msg ${isMe ? "me" : "them"}`}>
                        <div className="msg-av">{cfg?.avatar}</div>
                        <div className="msg-body">
                          <div className="msg-sender">{msg.sender}</div>
                          <div className="msg-bubble">{msg.message}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatRef} />
                </div>

                <div className="chat-input-row">
                  <input
                    className="chat-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                  />
                  <button className="send-btn" onClick={sendMessage}>
                    <svg className="send-icon" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;