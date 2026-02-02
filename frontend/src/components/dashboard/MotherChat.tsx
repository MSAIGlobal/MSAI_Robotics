/**
 * MotherChat Component
 * MOTHER AI chat interface for robotics control
 */

import { useState, useRef, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import type { ChatMessage, RobotState } from '../../types/robotics';
import { useMotherRobotics } from '../../hooks/useMotherRobotics';

interface MotherChatProps {
  robotContext?: RobotState;
  onCommandSuggested?: (command: { type: string; parameters: Record<string, any> }) => void;
}

export const MotherChat: FC<MotherChatProps> = ({
  robotContext,
  onCommandSuggested,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isThinking,
    error,
    chat,
    suggestAction,
    clearMessages,
  } = useMotherRobotics({
    robotId: robotContext?.robot_id,
    systemPrompt: `You are MOTHER Robotics, an advanced AI for humanoid robot control.
Current robot: ${robotContext?.robot_id || 'No robot selected'}
Status: ${robotContext?.status || 'Unknown'}
Mode: ${robotContext?.control_mode || 'Unknown'}

Help the operator with robot control, diagnostics, and task planning.
When suggesting commands, format them clearly so they can be executed.`,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const message = input.trim();
    setInput('');

    try {
      await chat(message, robotContext);
    } catch (err) {
      console.error('Chat error:', err);
    }
  };

  const handleQuickAction = async (action: string) => {
    if (!robotContext) return;

    switch (action) {
      case 'suggest':
        const suggestion = await suggestAction('What should the robot do next?', robotContext);
        if (onCommandSuggested) {
          onCommandSuggested({
            type: suggestion.commandType,
            parameters: suggestion.parameters,
          });
        }
        break;

      case 'plan':
        setInput('Generate a plan to: ');
        break;

      case 'diagnose':
        await chat(`Analyze the current state of robot ${robotContext.robot_id} and identify any issues.`, robotContext);
        break;
    }
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    if (isSystem) return null;

    return (
      <div
        key={index}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      >
        <div
          className={`
            max-w-[80%] rounded-lg p-3
            ${isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-100'}
          `}
        >
          {/* Avatar */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">
              {isUser ? '👤' : '🤖'}
            </span>
            <span className="text-xs opacity-70">
              {isUser ? 'You' : 'MOTHER'}
            </span>
          </div>

          {/* Content */}
          <div className="text-sm whitespace-pre-wrap">
            {message.content}
          </div>

          {/* Timestamp */}
          <div className="text-[10px] opacity-50 mt-1">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <h3 className="font-bold text-white">MOTHER Robotics</h3>
            <span className="text-xs text-gray-400">
              {robotContext ? `Robot: ${robotContext.robot_id}` : 'No robot selected'}
            </span>
          </div>
        </div>

        <button
          onClick={clearMessages}
          className="text-xs text-gray-400 hover:text-white"
        >
          Clear
        </button>
      </div>

      {/* Quick Actions */}
      {robotContext && (
        <div className="flex gap-2 p-2 border-b border-gray-700">
          <button
            onClick={() => handleQuickAction('suggest')}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
          >
            💡 Suggest Action
          </button>
          <button
            onClick={() => handleQuickAction('plan')}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
          >
            📋 Create Plan
          </button>
          <button
            onClick={() => handleQuickAction('diagnose')}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
          >
            🔍 Diagnose
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <span className="text-4xl block mb-2">🤖</span>
            <p className="text-sm">
              Hi! I'm MOTHER Robotics. Ask me anything about robot control, diagnostics, or task planning.
            </p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="animate-pulse">🤖</span>
                <span className="text-sm text-gray-300">MOTHER is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 text-red-300 p-2 rounded text-sm mb-3">
            ⚠️ {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={robotContext ? 'Ask MOTHER about this robot...' : 'Select a robot to chat...'}
            disabled={!robotContext || isThinking}
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || !robotContext || isThinking}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default MotherChat;
