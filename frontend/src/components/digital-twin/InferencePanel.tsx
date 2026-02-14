// Inference Window - Hybrid AI Communication Interface
// Speak with the MOTHER + GR00T N1 convergence system
import { useState, useRef, useEffect } from 'react';

interface InferenceMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  latency_ms?: number;
  tokens?: number;
  reasoning_path?: string[];
}

interface InferenceConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  use_mother_core: boolean;
  use_groot_n1: boolean;
  use_memory: boolean;
  sovereignty_mode: boolean;
}

const DEFAULT_CONFIG: InferenceConfig = {
  model: 'mother-core-70b',
  temperature: 0.7,
  max_tokens: 4096,
  system_prompt: 'You are MOTHER, a sovereign AI system integrated with NVIDIA GR00T N1 for humanoid robotics.',
  use_mother_core: true,
  use_groot_n1: true,
  use_memory: true,
  sovereignty_mode: true,
};

const AVAILABLE_MODELS = [
  { id: 'mother-core-70b', name: 'MOTHER CORE 70B', type: 'reasoning' },
  { id: 'mother-core-7b', name: 'MOTHER CORE 7B', type: 'fast' },
  { id: 'mother-defence', name: 'MOTHER DEFENCE', type: 'specialist' },
  { id: 'mother-legal', name: 'MOTHER LEGAL', type: 'specialist' },
  { id: 'mother-robotics', name: 'MOTHER ROBOTICS', type: 'specialist' },
  { id: 'groot-n1-vl', name: 'GR00T N1 VLM', type: 'vision-language' },
  { id: 'groot-n1-action', name: 'GR00T N1 Action', type: 'diffusion-policy' },
];

export function InferencePanel() {
  const [messages, setMessages] = useState<InferenceMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [config, setConfig] = useState<InferenceConfig>(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [activeModel, setActiveModel] = useState('mother-core-70b');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'streaming'>('connected');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    connectWebSocket();
    return () => { wsRef.current?.close(); };
  }, []);

  function connectWebSocket() {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const wsUrl = backendUrl.replace('http', 'ws') + '/inference/stream';
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => setConnectionStatus('connected');
      ws.onclose = () => setConnectionStatus('disconnected');
      ws.onerror = () => setConnectionStatus('disconnected');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'token') {
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant') {
                return [...prev.slice(0, -1), { ...last, content: last.content + data.token }];
              }
              return prev;
            });
          } else if (data.type === 'done') {
            setIsStreaming(false);
            setConnectionStatus('connected');
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant') {
                return [...prev.slice(0, -1), {
                  ...last,
                  latency_ms: data.latency_ms,
                  tokens: data.tokens,
                  reasoning_path: data.reasoning_path,
                }];
              }
              return prev;
            });
          }
        } catch (e) {
          console.error('Inference stream parse error:', e);
        }
      };
      wsRef.current = ws;
    } catch {
      setConnectionStatus('disconnected');
    }
  }

  async function sendMessage() {
    if (!input.trim() || isStreaming) return;

    const userMsg: InferenceMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setConnectionStatus('streaming');

    // Create placeholder assistant message
    const assistantMsg: InferenceMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      model: activeModel,
    };
    setMessages(prev => [...prev, assistantMsg]);

    // Send via WebSocket or fall back to REST
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'inference',
        model: activeModel,
        messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        config: {
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          system_prompt: config.system_prompt,
          use_mother_core: config.use_mother_core,
          use_groot_n1: config.use_groot_n1,
          use_memory: config.use_memory,
          sovereignty_mode: config.sovereignty_mode,
        },
      }));
    } else {
      // REST fallback
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/inference/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: activeModel,
            messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
            config,
          }),
        });
        const data = await response.json();
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: data.content || data.message || 'No response received.',
            latency_ms: data.latency_ms,
            tokens: data.tokens,
            reasoning_path: data.reasoning_path,
          };
          return updated;
        });
      } catch {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: 'Connection error. Ensure the inference server is running.',
          };
          return updated;
        });
      }
      setIsStreaming(false);
      setConnectionStatus('connected');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#04060a] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gradient-to-r from-gray-900/80 to-[#04060a]">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'streaming' ? 'bg-cyan-500 animate-pulse' :
            'bg-red-500'
          }`} />
          <h2 className="font-semibold text-white text-sm">Hybrid Inference</h2>
          <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
            {connectionStatus === 'streaming' ? 'Streaming...' : connectionStatus}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className={`px-2 py-1 text-xs rounded ${showReasoning ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-400'}`}
          >
            Reasoning
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`px-2 py-1 text-xs rounded ${showConfig ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-400'}`}
          >
            Config
          </button>
          <button
            onClick={() => { setMessages([]); }}
            className="px-2 py-1 text-xs bg-gray-800 text-gray-400 rounded hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Model Selector */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-800/50 overflow-x-auto">
        {AVAILABLE_MODELS.map(model => (
          <button
            key={model.id}
            onClick={() => setActiveModel(model.id)}
            className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
              activeModel === model.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-gray-800/50 text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            {model.name}
          </button>
        ))}
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="p-3 border-b border-gray-800 bg-gray-900/30 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Temperature</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature}
              onChange={e => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              className="w-full accent-cyan-500"
            />
            <span className="text-xs text-gray-400">{config.temperature}</span>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Max Tokens</label>
            <input
              type="number"
              value={config.max_tokens}
              onChange={e => setConfig(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 4096 }))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
            />
          </div>
          <div className="col-span-2 flex gap-3">
            {([
              ['use_mother_core', 'MOTHER Core'],
              ['use_groot_n1', 'GR00T N1'],
              ['use_memory', 'Memory'],
              ['sovereignty_mode', 'Sovereign'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config[key]}
                  onChange={e => setConfig(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="accent-cyan-500"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg mb-1">Hybrid Inference Engine</p>
            <p className="text-xs text-gray-600">MOTHER CORE + NVIDIA GR00T N1 Convergence</p>
            <div className="mt-4 grid grid-cols-2 gap-2 max-w-sm mx-auto text-xs">
              {['Analyse sensor data', 'Plan robot task', 'Review compliance', 'Generate trajectory'].map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
              msg.role === 'user'
                ? 'bg-cyan-500/15 text-cyan-50 rounded-br-sm'
                : 'bg-gray-800/80 text-gray-100 rounded-bl-sm'
            }`}>
              {msg.role === 'assistant' && msg.model && (
                <p className="text-[10px] text-cyan-500/60 mb-1 font-mono">{msg.model}</p>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.content || (isStreaming ? '' : '')}</p>
              {msg.content === '' && isStreaming && (
                <div className="flex gap-1 py-1">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-600">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
                {msg.latency_ms && (
                  <span className="text-[10px] text-gray-600">{msg.latency_ms}ms</span>
                )}
                {msg.tokens && (
                  <span className="text-[10px] text-gray-600">{msg.tokens} tok</span>
                )}
              </div>
              {/* Reasoning Path */}
              {showReasoning && msg.reasoning_path && msg.reasoning_path.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700/50">
                  <p className="text-[10px] text-purple-400 mb-1">Reasoning Chain:</p>
                  {msg.reasoning_path.map((step, i) => (
                    <div key={i} className="flex items-start gap-1 text-[10px] text-gray-500">
                      <span className="text-purple-500 mt-0.5">{i + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/30">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Speak with the Hybrid AI..."
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isStreaming ? 'Streaming...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
