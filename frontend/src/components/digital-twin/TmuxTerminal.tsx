// TMUX Terminal - Real-time training monitoring via command prompt
// WebSocket-backed terminal emulator for TMUX session streaming
import { useState, useRef, useEffect, useCallback } from 'react';

interface TerminalLine {
  id: number;
  content: string;
  timestamp: Date;
  type: 'stdout' | 'stderr' | 'system' | 'input';
}

interface TmuxSession {
  id: string;
  name: string;
  status: 'active' | 'detached' | 'dead';
  windows: number;
  created: string;
}

interface TmuxPane {
  id: string;
  title: string;
  active: boolean;
  width: number;
  height: number;
}

export function TmuxTerminal() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: 0, content: '$ tmux new-session -s training', timestamp: new Date(), type: 'input' },
    { id: 1, content: '[MOTHER TMUX] Session "training" started', timestamp: new Date(), type: 'system' },
    { id: 2, content: '[MOTHER TMUX] Connecting to training pipeline...', timestamp: new Date(), type: 'system' },
  ]);
  const [input, setInput] = useState('');
  const [sessions, setSessions] = useState<TmuxSession[]>([
    { id: 'training', name: 'training', status: 'active', windows: 3, created: new Date().toISOString() },
    { id: 'inference', name: 'inference', status: 'active', windows: 1, created: new Date().toISOString() },
    { id: 'monitoring', name: 'monitoring', status: 'detached', windows: 2, created: new Date().toISOString() },
  ]);
  const [activeSession, setActiveSession] = useState('training');
  const [panes, setPanes] = useState<TmuxPane[]>([
    { id: 'main', title: 'Training Output', active: true, width: 100, height: 80 },
    { id: 'metrics', title: 'Metrics', active: false, width: 50, height: 20 },
    { id: 'gpu', title: 'GPU Monitor', active: false, width: 50, height: 20 },
  ]);
  const [activePane, setActivePane] = useState('main');
  const [isConnected, setIsConnected] = useState(true);
  const [isFollowing, setIsFollowing] = useState(true);
  const [showSessions, setShowSessions] = useState(false);
  const [lineCounter, setLineCounter] = useState(3);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-scroll when following
  useEffect(() => {
    if (isFollowing && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines, isFollowing]);

  // Connect WebSocket for live output
  useEffect(() => {
    connectToSession(activeSession);
    return () => { wsRef.current?.close(); };
  }, [activeSession]);

  // Simulate training output for demo
  useEffect(() => {
    const interval = setInterval(() => {
      const trainingLines = [
        () => {
          const epoch = Math.floor(Math.random() * 100);
          const loss = (Math.random() * 2).toFixed(4);
          const lr = (Math.random() * 0.001).toFixed(6);
          return `[Epoch ${epoch}/100] loss=${loss} lr=${lr} gpu_mem=78.3% batch_time=0.342s`;
        },
        () => {
          const step = Math.floor(Math.random() * 50000);
          const grad = (Math.random() * 0.1).toFixed(5);
          return `Step ${step}: grad_norm=${grad} | throughput=1247 tok/s | ETA 2h 34m`;
        },
        () => `[GPU 0] Temp: ${60 + Math.floor(Math.random() * 20)}C | Util: ${70 + Math.floor(Math.random() * 30)}% | Mem: ${Math.floor(70 + Math.random() * 25)}%`,
        () => `[checkpoint] Saving model checkpoint to /models/mother-core-70b/ckpt-${Math.floor(Math.random() * 1000)}...`,
        () => {
          const val_loss = (Math.random() * 1.5).toFixed(4);
          const val_acc = (85 + Math.random() * 14).toFixed(2);
          return `[eval] val_loss=${val_loss} val_accuracy=${val_acc}% perplexity=${(Math.random() * 10 + 5).toFixed(2)}`;
        },
        () => `[MOTHER CORE] Reasoning benchmark: ${(90 + Math.random() * 9).toFixed(1)}% | Sovereignty check: PASS`,
        () => `[data] Loading batch from sovereign dataset: uk-hansard-2024-q4.jsonl (${Math.floor(Math.random() * 10000)} samples)`,
        () => `[GR00T N1] Action model sync: latency=${Math.floor(Math.random() * 50 + 10)}ms | policy_loss=${(Math.random() * 0.5).toFixed(4)}`,
      ];

      const generator = trainingLines[Math.floor(Math.random() * trainingLines.length)];
      setLineCounter(prev => {
        const newId = prev + 1;
        setLines(prevLines => [
          ...prevLines.slice(-500),
          { id: newId, content: generator(), timestamp: new Date(), type: 'stdout' },
        ]);
        return newId;
      });
    }, 1500 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, []);

  function connectToSession(sessionId: string) {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const wsUrl = backendUrl.replace('http', 'ws') + `/tmux/${sessionId}/stream`;
      wsRef.current?.close();
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => setIsConnected(false);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'output') {
            setLineCounter(prev => {
              const newId = prev + 1;
              setLines(prevLines => [
                ...prevLines.slice(-500),
                { id: newId, content: data.content, timestamp: new Date(), type: data.stream || 'stdout' },
              ]);
              return newId;
            });
          } else if (data.type === 'sessions') {
            setSessions(data.sessions);
          } else if (data.type === 'panes') {
            setPanes(data.panes);
          }
        } catch (e) {
          console.error('TMUX stream parse error:', e);
        }
      };
      wsRef.current = ws;
    } catch {
      setIsConnected(false);
    }
  }

  const executeCommand = useCallback((cmd: string) => {
    if (!cmd.trim()) return;
    const newId = lineCounter + 1;
    setLineCounter(newId);
    setLines(prev => [...prev, { id: newId, content: `$ ${cmd}`, timestamp: new Date(), type: 'input' }]);

    // Send command via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'command', command: cmd, session: activeSession, pane: activePane }));
    }

    // Handle local TMUX commands
    if (cmd.startsWith('tmux ')) {
      const tmuxCmd = cmd.replace('tmux ', '');
      const responseId = newId + 1;
      setLineCounter(responseId);
      if (tmuxCmd === 'list-sessions' || tmuxCmd === 'ls') {
        const output = sessions.map(s => `${s.name}: ${s.windows} windows (${s.status})`).join('\n');
        setLines(prev => [...prev, { id: responseId, content: output, timestamp: new Date(), type: 'system' }]);
      } else if (tmuxCmd.startsWith('select-window') || tmuxCmd.startsWith('switch-client')) {
        setLines(prev => [...prev, { id: responseId, content: `[TMUX] Switched to session/window`, timestamp: new Date(), type: 'system' }]);
      } else {
        setLines(prev => [...prev, { id: responseId, content: `[TMUX] ${tmuxCmd}`, timestamp: new Date(), type: 'system' }]);
      }
    }

    setInput('');
  }, [lineCounter, activeSession, activePane, sessions]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(input);
    }
  }

  function getLineColor(type: string): string {
    switch (type) {
      case 'stderr': return 'text-red-400';
      case 'system': return 'text-yellow-400';
      case 'input': return 'text-green-400';
      default: return 'text-gray-300';
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0e14] rounded-xl border border-gray-800 overflow-hidden font-mono">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#141a22] border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-gray-400 ml-2">TMUX</span>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSessions(!showSessions)}
            className={`px-2 py-0.5 text-xs rounded ${showSessions ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Sessions ({sessions.length})
          </button>
          <button
            onClick={() => setIsFollowing(!isFollowing)}
            className={`px-2 py-0.5 text-xs rounded ${isFollowing ? 'bg-green-500/20 text-green-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {isFollowing ? 'Following' : 'Paused'}
          </button>
          <button
            onClick={() => setLines([])}
            className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-300"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Session Tabs */}
      {showSessions && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-800/50 bg-[#0f1419]">
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                activeSession === session.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {session.name}
              <span className={`ml-1 w-1.5 h-1.5 inline-block rounded-full ${
                session.status === 'active' ? 'bg-green-500' :
                session.status === 'detached' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </button>
          ))}
        </div>
      )}

      {/* Pane Tabs */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-gray-800/30 bg-[#0c1018]">
        {panes.map(pane => (
          <button
            key={pane.id}
            onClick={() => setActivePane(pane.id)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
              activePane === pane.id
                ? 'bg-gray-700/50 text-gray-300'
                : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            {pane.title}
          </button>
        ))}
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-3 text-xs leading-5 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map(line => (
          <div key={line.id} className={`${getLineColor(line.type)} hover:bg-gray-800/30`}>
            <span className="text-gray-600 mr-2 select-none">
              {line.timestamp.toLocaleTimeString('en-GB', { hour12: false })}
            </span>
            {line.content}
          </div>
        ))}
      </div>

      {/* Input Line */}
      <div className="flex items-center px-3 py-2 border-t border-gray-800 bg-[#0c1018]">
        <span className="text-green-400 text-xs mr-2 select-none">
          {activeSession}:{activePane}$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 focus:outline-none"
          autoFocus
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#005ea8] text-[10px] text-white/80">
        <div className="flex items-center gap-3">
          <span>[{activeSession}]</span>
          <span>{panes.length} panes</span>
          <span>{lines.length} lines</span>
        </div>
        <div className="flex items-center gap-3">
          <span>MOTHER Training Pipeline</span>
          <span>{new Date().toLocaleTimeString('en-GB', { hour12: false })}</span>
        </div>
      </div>
    </div>
  );
}
