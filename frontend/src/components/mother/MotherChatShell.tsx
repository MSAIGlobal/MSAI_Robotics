// MotherChatShell - AI Chat Interface with Memory
// Conversation history + Content Story Vector Memory
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    tokens?: number;
    model?: string;
    context_used?: string[];
  };
}

interface ChatMemory {
  conversation_id: string;
  messages: Message[];
  summary?: string;
  vectors?: VectorMemory[];
}

interface VectorMemory {
  id: string;
  content: string;
  embedding?: number[];
  type: 'fact' | 'preference' | 'context' | 'story';
  created_at: string;
}

interface MotherChatShellProps {
  userId?: string;
  projectId?: string;
  onMessageSent?: (message: Message) => void;
  systemPrompt?: string;
  apiEndpoint?: string;
}

export function MotherChatShell({
  userId = 'default',
  projectId,
  onMessageSent,
  systemPrompt = 'You are MOTHER, an advanced AI assistant.',
  apiEndpoint = '/api/chat',
}: MotherChatShellProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [memories, setMemories] = useState<VectorMemory[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversation history
  useEffect(() => {
    loadConversation();
  }, [userId, projectId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async () => {
    try {
      const stored = localStorage.getItem(`mother_chat_${userId}_${projectId || 'default'}`);
      if (stored) {
        const data: ChatMemory = JSON.parse(stored);
        setMessages(data.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
        setMemories(data.vectors || []);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const saveConversation = useCallback((msgs: Message[], vecs: VectorMemory[]) => {
    const data: ChatMemory = {
      conversation_id: `${userId}_${projectId || 'default'}`,
      messages: msgs,
      vectors: vecs,
    };
    localStorage.setItem(`mother_chat_${userId}_${projectId || 'default'}`, JSON.stringify(data));
  }, [userId, projectId]);

  const extractMemories = (content: string): VectorMemory[] => {
    // Simple memory extraction - in production, use embeddings API
    const newMemories: VectorMemory[] = [];

    // Extract facts (statements with "is", "are", "was", "were")
    const factPatterns = content.match(/(?:^|\.\s)([A-Z][^.]*(?:is|are|was|were)[^.]+\.)/g);
    factPatterns?.forEach(fact => {
      newMemories.push({
        id: crypto.randomUUID(),
        content: fact.trim(),
        type: 'fact',
        created_at: new Date().toISOString(),
      });
    });

    return newMemories;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    onMessageSent?.(userMessage);

    try {
      // Build context from memories
      const relevantMemories = memories.slice(-10).map(m => m.content).join('\n');

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: `${systemPrompt}\n\nRelevant context:\n${relevantMemories}` },
            ...messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: input.trim() },
          ],
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content || data.message || 'I apologize, I could not generate a response.',
        timestamp: new Date(),
        metadata: {
          tokens: data.usage?.total_tokens,
          model: data.model,
        },
      };

      // Extract and save memories
      const newMemories = extractMemories(assistantMessage.content);
      const updatedMemories = [...memories, ...newMemories].slice(-100);

      setMessages(prev => {
        const updated = [...prev, assistantMessage];
        saveConversation(updated, updatedMemories);
        return updated;
      });
      setMemories(updatedMemories);

    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Connection error. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setMemories([]);
    localStorage.removeItem(`mother_chat_${userId}_${projectId || 'default'}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#04060a] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
          <h2 className="font-semibold text-white">MOTHER Chat</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMemory(!showMemory)}
            className={`px-3 py-1 text-xs rounded ${showMemory ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-400'}`}
          >
            Memory ({memories.length})
          </button>
          <button
            onClick={clearConversation}
            className="px-3 py-1 text-xs bg-gray-800 text-gray-400 rounded hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Memory Panel */}
      {showMemory && (
        <div className="p-3 border-b border-gray-800 bg-gray-900/30 max-h-40 overflow-y-auto">
          <p className="text-xs text-gray-500 mb-2">Vector Memory ({memories.length} items)</p>
          {memories.slice(-10).map(m => (
            <div key={m.id} className="text-xs text-gray-400 py-1 border-b border-gray-800/50">
              <span className={`px-1 rounded mr-2 ${
                m.type === 'fact' ? 'bg-blue-500/20 text-blue-400' :
                m.type === 'story' ? 'bg-purple-500/20 text-purple-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>{m.type}</span>
              {m.content.slice(0, 100)}...
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <p className="text-lg mb-2">👋 Hello! I'm MOTHER.</p>
            <p className="text-sm">How can I assist you today?</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-cyan-500/20 text-cyan-50 rounded-br-md'
                  : 'bg-gray-800 text-gray-100 rounded-bl-md'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className="text-xs text-gray-500 mt-1">
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message MOTHER..."
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default MotherChatShell;
