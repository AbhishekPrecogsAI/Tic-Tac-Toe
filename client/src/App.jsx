import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("https://tic-tac-toe-04fr.onrender.com");
// const socket = io("http://localhost:5000");

const PLAYER_CONFIG = {
  X: { avatar: null, avatarImg: "player-x.jpeg", label: "Player X", colorClass: "x" },
  O: { avatar: null, avatarImg: "player-o.jpeg", label: "Player O", colorClass: "o" },
};

const Avatar = ({ cfg, className }) => cfg.avatarImg
  ? <img src={cfg.avatarImg} alt={cfg.label} className={className} style={{objectFit:"cover",borderRadius:"inherit"}} />
  : <span>{cfg.avatar}</span>;

const MicIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08C16.39 17.43 19 14.53 19 11h-2z"/>
  </svg>
);

const MicOffIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
  </svg>
);

function App() {
  const [online, setOnline] = useState(0);
  const [roomId, setRoomId] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [score, setScore] = useState({ X: 0, O: 0 });
  const [streak, setStreak] = useState({ X: 0, O: 0 });
  const [highlight, setHighlight] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [rematchClicked, setRematchClicked] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [lobbyMode, setLobbyMode] = useState("idle"); // "idle" | "searching" | "invite" | "creating"
  const [inviteCode, setInviteCode] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [copied, setCopied] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [opponentMicOn, setOpponentMicOn] = useState(false);
  const [callConnected, setCallConnected] = useState(false);
  const chatRef = useRef();
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const winAudio = new Audio("/win.mp3");

  useEffect(() => {
    socket.on("onlineCount", setOnline);
    socket.on("waiting", () => {});
    socket.on("matchFound", ({ roomId, symbol }) => { setRoomId(roomId); setSymbol(symbol); });
    socket.on("matchStarted", () => {});
    socket.on("gameState", (room) => {
      setBoard(room.board); setTurn(room.turn);
      setScore(room.score); setStreak(room.streak);
    });
    socket.on("gameOver", (result) => {
      setGameOver(true); setWinner(result);
      if (result !== "draw") {
        setHighlight(result);
        winAudio.play();
        setTimeout(() => setHighlight(null), 1500);
      }
    });
    socket.on("receiveMessage", (msg) => setMessages(prev => [...prev, msg]));
    socket.on("rematchStarted", () => {
      setGameOver(false); setWinner(null); setRematchClicked(false);
      setBoard(Array(9).fill(null));
    });
    socket.on("privateRoomCreated", ({ code }) => { setInviteCode(code); setLobbyMode("creating"); });
    socket.on("privateRoomError", (msg) => setJoinError(msg));
    socket.on("voiceOpponentReady", () => setOpponentMicOn(true));
    socket.on("voiceOpponentMuted", () => { setOpponentMicOn(false); setCallConnected(false); });
    return () => socket.off();
  }, []);

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!roomId) return;

    const buildPeer = () => {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
      }
      pc.ontrack = (e) => {
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
        setCallConnected(true);
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit("voiceIce", { roomId, candidate: e.candidate });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setCallConnected(false);
        }
      };
      peerRef.current = pc;
      return pc;
    };

    const onCreateOffer = async () => {
      if (!localStreamRef.current) return;
      const pc = buildPeer();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("voiceOffer", { roomId, offer });
    };

    const onVoiceOffer = async ({ offer }) => {
      if (!localStreamRef.current) return;
      const pc = buildPeer();
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("voiceAnswer", { roomId, answer });
    };

    const onVoiceAnswer = ({ answer }) => {
      peerRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const onVoiceIce = ({ candidate }) => {
      peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    };

    socket.on("voiceCreateOffer", onCreateOffer);
    socket.on("voiceOffer", onVoiceOffer);
    socket.on("voiceAnswer", onVoiceAnswer);
    socket.on("voiceIce", onVoiceIce);

    return () => {
      socket.off("voiceCreateOffer", onCreateOffer);
      socket.off("voiceOffer", onVoiceOffer);
      socket.off("voiceAnswer", onVoiceAnswer);
      socket.off("voiceIce", onVoiceIce);
    };
  }, [roomId]);

  const findMatch = () => { socket.emit("findMatch"); setLobbyMode("searching"); };
  const move = (i) => { if (!gameOver && board[i] == null) socket.emit("makeMove", { roomId, index: i }); };
  const sendMessage = () => {
    if (input.trim()) { socket.emit("sendMessage", { roomId, message: input, symbol }); setInput(""); }
  };
  const rematch = () => {
    if (!rematchClicked) { socket.emit("rematch", { roomId }); setRematchClicked(true); }
  };
  const createPrivateRoom = () => socket.emit("createPrivateRoom");
  const joinPrivateRoom = () => {
    if (!joinCodeInput.trim()) return;
    setJoinError("");
    socket.emit("joinPrivateRoom", { code: joinCodeInput.trim().toUpperCase() });
  };
  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const cancelLobby = () => {
    setLobbyMode("idle");
    setInviteCode("");
    setJoinCodeInput("");
    setJoinError("");
  };

  const toggleMic = async () => {
    if (!micOn) {
      // Get mic access once; reuse the stream on subsequent unmutes
      if (!localStreamRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          localStreamRef.current = stream;
        } catch {
          return; // permission denied
        }
      }
      localStreamRef.current.getTracks().forEach(t => { t.enabled = true; });
      setMicOn(true);
      // If peer connection is still alive, just notify opponent; otherwise do full handshake
      const pc = peerRef.current;
      const alive = pc && pc.connectionState !== "closed" && pc.connectionState !== "failed";
      socket.emit(alive ? "voiceUnmuted" : "voiceReady", { roomId });
    } else {
      // Mute: disable track only — keep the peer connection alive
      localStreamRef.current?.getTracks().forEach(t => { t.enabled = false; });
      setMicOn(false);
      socket.emit("voiceMuted", { roomId });
    }
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
          padding: 8px 10px 8px;
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

        /* Lobby: centered vertically */
        .ttt-lobby {
          flex: 1;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
        }

        .lobby-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 36px 44px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          text-align: center;
          max-width: 340px;
          width: 100%;
        }

        .lobby-icon { font-size: 52px; line-height: 1; }
        .lobby-title { font-size: 17px; font-weight: 700; color: var(--text); }
        .lobby-subtitle {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: var(--muted);
          line-height: 1.6;
        }

        .searching-dots span {
          display: inline-block;
          animation: dotBounce 1.2s infinite;
          font-size: 22px;
          color: var(--accent);
        }
        .searching-dots span:nth-child(2) { animation-delay: 0.2s; }
        .searching-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-8px); opacity: 1; }
        }

        /* HEADER — fixed height, never shrinks */
        .ttt-header {
          text-align: center;
          flex-shrink: 0;
          margin-bottom: 6px;
          position: relative; z-index: 1;
        }

        .ttt-header h1 {
          font-size: clamp(15px, 4vw, 28px);
          font-weight: 800;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.45) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .online-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: var(--muted);
          margin-top: 2px;
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
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: relative; z-index: 1;
          overflow: hidden;
        }

        /* PLAYERS ROW — fixed height */
        .players-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          flex-shrink: 0;
        }

        .player-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 7px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
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
          pointer-events: none;
        }

        .player-card.active-x { border-color: rgba(0,229,255,0.35); }
        .player-card.active-x::after { background: linear-gradient(135deg, rgba(0,229,255,0.08) 0%, transparent 60%); opacity: 1; }
        .player-card.active-o { border-color: rgba(255,77,141,0.35); }
        .player-card.active-o::after { background: linear-gradient(135deg, rgba(255,77,141,0.08) 0%, transparent 60%); opacity: 1; }

        .p-avatar {
          width: 30px; height: 30px;
          border-radius: 8px;
          background: var(--surface2);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; flex-shrink: 0;
          overflow: hidden;
        }

        .p-avatar-img, .msg-av-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: inherit;
          display: block;
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
          gap: 8px;
          flex-shrink: 0;
        }

        .turn-pill {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 50px;
          padding: 5px 12px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
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
          border-radius: 10px;
          padding: 5px 10px;
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

        /* ── MAIN GRID ── */
        /* Mobile: two equal rows — board top half, chat bottom half */
        .main-grid {
          flex: 1;
          min-height: 0;
          display: grid;
          gap: 8px;
          grid-template-columns: 1fr;
          grid-template-rows: 1fr 1fr;
        }

        /* Desktop: two equal columns side by side */
        @media (min-width: 600px) {
          .main-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr;
            align-items: start;
          }
        }

        /* ── BOARD ── */
        /* Mobile: fills its half-height row, square via aspect-ratio on inner grid */
        .board-wrap {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 8px;
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 0;
        }

        /* Desktop: square */
        @media (min-width: 600px) {
          .board-wrap {
            aspect-ratio: 1 / 1;
            height: auto;
            width: 100%;
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

        /* ── CHAT ── */
        .chat-wrap {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          width: 100%;
          height: 100%;
          min-height: 0;
        }

        /* Desktop: square matching board */
        @media (min-width: 600px) {
          .chat-wrap {
            aspect-ratio: 1 / 1;
            height: auto;
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
          padding: 8px 10px;
          border-top: 1px solid var(--border);
          display: flex; gap: 8px;
          align-items: center;
          flex-shrink: 0;
        }

        .chat-input {
          flex: 1;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 50px;
          padding: 8px 14px;
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

        /* ── INVITE ── */
        .btn-row { display: flex; flex-direction: column; gap: 10px; width: 100%; }

        .play-btn.secondary {
          background: var(--surface2);
          box-shadow: none;
          border: 1px solid var(--border);
          color: var(--text);
        }
        .play-btn.secondary:hover { background: var(--surface2); box-shadow: 0 4px 16px rgba(255,255,255,0.05); }

        .invite-code-wrap {
          display: flex; align-items: center; gap: 12px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px 18px;
          width: 100%;
          justify-content: center;
        }

        .invite-code {
          font-family: 'DM Mono', monospace;
          font-size: 28px; font-weight: 700;
          letter-spacing: 6px;
          color: var(--accent);
        }

        .copy-btn {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .copy-btn:hover { border-color: var(--accent); color: var(--accent); }
        .copy-btn.copied { border-color: #22d66a; color: #22d66a; }

        .join-input {
          width: 100%;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 16px;
          color: var(--text);
          font-family: 'DM Mono', monospace;
          font-size: 22px; font-weight: 700;
          letter-spacing: 5px;
          outline: none; text-align: center;
          transition: border-color 0.2s;
          text-transform: uppercase;
        }
        .join-input:focus { border-color: rgba(124,92,252,0.5); }
        .join-input::placeholder { letter-spacing: normal; font-size: 14px; font-weight: 400; text-transform: none; color: var(--muted); }

        .join-error { color: var(--o); font-family: 'DM Mono', monospace; font-size: 12px; text-align: center; }

        .back-link {
          background: none; border: none;
          color: var(--muted);
          font-family: 'DM Mono', monospace; font-size: 11px;
          cursor: pointer; transition: color 0.2s;
        }
        .back-link:hover { color: var(--text); }

        .invite-divider {
          width: 100%; display: flex; align-items: center; gap: 10px;
        }
        .invite-divider::before, .invite-divider::after {
          content: ''; flex: 1; height: 1px; background: var(--border);
        }
        .invite-divider span {
          font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted);
        }

        /* ── VOICE CHAT ── */
        .mic-btn {
          margin-left: auto;
          background: none;
          border: 1px solid var(--border);
          border-radius: 8px;
          width: 26px; height: 26px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--muted);
          flex-shrink: 0;
          padding: 0;
        }
        .mic-btn:hover { border-color: rgba(255,255,255,0.2); color: var(--text); }
        .mic-btn.mic-on { border-color: #22d66a; color: #22d66a; box-shadow: 0 0 8px rgba(34,214,106,0.3); }
        .mic-btn.opponent-on { border-color: rgba(34,214,106,0.45); color: #22d66a; cursor: default; }
        .mic-btn.opponent-off { cursor: default; }

        .voice-pill {
          background: var(--surface);
          border: 1px solid rgba(34,214,106,0.45);
          border-radius: 50px;
          padding: 4px 10px;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #22d66a;
          display: flex; align-items: center; gap: 6px;
          animation: fadeIn 0.3s ease;
        }
      `}</style>

      <div className="ttt-app">
        <audio ref={remoteAudioRef} autoPlay style={{ display: "none" }} />

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
          <div className="ttt-lobby">
            <div className="lobby-card">

              {lobbyMode === "idle" && (
                <>
                  <div className="lobby-icon">🎮</div>
                  <div className="lobby-title">Ready to Play?</div>
                  <div className="lobby-subtitle">Challenge a random opponent or invite a friend to a private match</div>
                  <div className="btn-row">
                    <button className="play-btn" onClick={findMatch}>▶ Random Match</button>
                    <button className="play-btn secondary" onClick={() => setLobbyMode("invite")}>🔗 Invite a Friend</button>
                  </div>
                </>
              )}

              {lobbyMode === "searching" && (
                <>
                  <div className="lobby-icon">🔍</div>
                  <div className="lobby-title">Finding a match...</div>
                  <div className="lobby-subtitle">Hang tight, connecting you with an opponent</div>
                  <div className="searching-dots">
                    <span>●</span><span>●</span><span>●</span>
                  </div>
                </>
              )}

              {lobbyMode === "invite" && (
                <>
                  <div className="lobby-icon">🔗</div>
                  <div className="lobby-title">Invite a Friend</div>
                  <div className="lobby-subtitle">Create a private room and share the code, or enter a friend's code to join</div>
                  <button className="play-btn" onClick={createPrivateRoom}>+ Create Private Room</button>
                  <div className="invite-divider"><span>or join</span></div>
                  <input
                    className="join-input"
                    placeholder="Enter invite code"
                    value={joinCodeInput}
                    onChange={e => { setJoinCodeInput(e.target.value.toUpperCase()); setJoinError(""); }}
                    onKeyDown={e => e.key === "Enter" && joinPrivateRoom()}
                    maxLength={6}
                  />
                  {joinError && <div className="join-error">{joinError}</div>}
                  <button className="play-btn" onClick={joinPrivateRoom} disabled={!joinCodeInput.trim()}>Join Room</button>
                  <button className="back-link" onClick={cancelLobby}>← Back</button>
                </>
              )}

              {lobbyMode === "creating" && (
                <>
                  <div className="lobby-icon">🔗</div>
                  <div className="lobby-title">Room Created!</div>
                  <div className="lobby-subtitle">Share this code with your friend</div>
                  <div className="invite-code-wrap">
                    <div className="invite-code">{inviteCode}</div>
                    <button className={`copy-btn${copied ? " copied" : ""}`} onClick={copyCode}>
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="searching-dots">
                    <span>●</span><span>●</span><span>●</span>
                  </div>
                  <div className="lobby-subtitle">Waiting for friend to join...</div>
                  <button className="back-link" onClick={cancelLobby}>✕ Cancel</button>
                </>
              )}

            </div>
          </div>
        )}

        {/* GAME */}
        {symbol && (
          <div className="ttt-game">

            {/* PLAYERS */}
            <div className="players-row">
              {["X", "O"].map(p => {
                const cfg = PLAYER_CONFIG[p];
                const isActive = turn === p;
                const isMe = symbol === p;
                return (
                  <div key={p} className={`player-card ${isActive ? `active-${p.toLowerCase()}` : ""}`}>
                    <div className="p-avatar"><Avatar cfg={cfg} className="p-avatar-img" /></div>
                    <div>
                      <div className={`p-name ${p.toLowerCase()}`}>{cfg.label}</div>
                      <div className="p-role">{isMe ? "You" : "Opponent"}</div>
                    </div>
                    {isMe ? (
                      <button
                        className={`mic-btn${micOn ? " mic-on" : ""}`}
                        onClick={toggleMic}
                        title={micOn ? "Mute mic" : "Unmute mic"}
                      >
                        {micOn ? <MicIcon /> : <MicOffIcon />}
                      </button>
                    ) : (
                      <div
                        className={`mic-btn${opponentMicOn ? " opponent-on" : " opponent-off"}`}
                        title={opponentMicOn ? "Opponent mic on" : "Opponent muted"}
                      >
                        {opponentMicOn ? <MicIcon /> : <MicOffIcon />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* META */}
            <div className="meta-row">
              <div className="turn-pill">
                Turn: <b className={turn.toLowerCase()}>{turn}</b>
              </div>
              {callConnected && (
                <div className="voice-pill">
                  <div className="online-dot" /> Voice
                </div>
              )}
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
                        <div className="msg-av">{cfg && <Avatar cfg={cfg} className="msg-av-img" />}</div>
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