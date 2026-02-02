/**
 * React Hook: useMotherRobotics
 * Integrates MOTHER AI for robotics intelligence
 */

import { useState, useCallback, useRef } from 'react';
import type {
  MotherRoboticsRequest,
  MotherRoboticsResponse,
  ChatMessage,
  RobotState,
} from '../types/robotics';
import { roboticsApi } from '../lib/api';

interface UseMotherRoboticsOptions {
  robotId?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  streaming?: boolean;
}

interface UseMotherRoboticsReturn {
  // Chat state
  messages: ChatMessage[];
  isThinking: boolean;
  error: string | null;

  // Actions
  chat: (message: string, robotContext?: RobotState) => Promise<MotherRoboticsResponse>;
  analyzeTask: (taskDescription: string) => Promise<TaskAnalysis>;
  suggestAction: (situation: string, robotState: RobotState) => Promise<ActionSuggestion>;
  generatePlan: (goal: string, constraints?: string[]) => Promise<ExecutionPlan>;
  clearMessages: () => void;

  // Streaming
  streamChat: (message: string, onChunk: (chunk: string) => void) => Promise<void>;
}

interface TaskAnalysis {
  feasibility: 'high' | 'medium' | 'low';
  steps: string[];
  estimatedDuration: number;
  requiredCapabilities: string[];
  risks: string[];
  recommendations: string[];
}

interface ActionSuggestion {
  action: string;
  commandType: string;
  parameters: Record<string, any>;
  confidence: number;
  reasoning: string;
  alternatives: Array<{
    action: string;
    confidence: number;
  }>;
}

interface ExecutionPlan {
  goal: string;
  steps: Array<{
    id: number;
    description: string;
    commandType: string;
    parameters: Record<string, any>;
    dependencies: number[];
    estimatedDuration: number;
  }>;
  totalDuration: number;
  checkpoints: number[];
}

export function useMotherRobotics(options: UseMotherRoboticsOptions = {}): UseMotherRoboticsReturn {
  const {
    robotId,
    systemPrompt = `You are MOTHER Robotics, an advanced AI assistant specialized in humanoid robot control and coordination.
You help operators manage robots safely and efficiently. Always prioritize safety and provide clear, actionable guidance.
When suggesting robot actions, format them as structured commands that can be executed.`,
    maxTokens = 1000,
    temperature = 0.7,
    streaming = false,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Add system message on first interaction
  const ensureSystemMessage = useCallback(() => {
    if (messages.length === 0 || messages[0].role !== 'system') {
      setMessages(prev => [{
        role: 'system',
        content: systemPrompt,
        timestamp: new Date(),
      }, ...prev]);
    }
  }, [messages, systemPrompt]);

  // Main chat function
  const chat = useCallback(async (
    message: string,
    robotContext?: RobotState
  ): Promise<MotherRoboticsResponse> => {
    ensureSystemMessage();

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    setIsThinking(true);
    setError(null);

    try {
      // Build context-aware prompt
      let contextualMessage = message;
      if (robotContext) {
        contextualMessage = `[Robot Context]
Robot ID: ${robotContext.robot_id}
Status: ${robotContext.status}
Control Mode: ${robotContext.control_mode}
Battery: ${robotContext.battery_percent}%
Position: x=${robotContext.position.x}, y=${robotContext.position.y}, z=${robotContext.position.z}
Current Task: ${robotContext.current_task || 'None'}

[User Message]
${message}`;
      }

      const response = await roboticsApi.chatWithMother({
        messages: [...messages, { ...userMessage, content: contextualMessage }],
        max_tokens: maxTokens,
        temperature,
        robot_context: robotContext ? {
          robot_id: robotContext.robot_id,
          status: robotContext.status,
          position: robotContext.position,
          battery_percent: robotContext.battery_percent,
        } : undefined,
      });

      // Add assistant response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Chat failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsThinking(false);
    }
  }, [messages, ensureSystemMessage, maxTokens, temperature]);

  // Analyze a task for feasibility
  const analyzeTask = useCallback(async (taskDescription: string): Promise<TaskAnalysis> => {
    const prompt = `Analyze the following robotics task and provide a structured assessment:

Task: ${taskDescription}

Respond in JSON format with:
- feasibility: "high", "medium", or "low"
- steps: array of step descriptions
- estimatedDuration: in seconds
- requiredCapabilities: array of required robot capabilities
- risks: array of potential risks
- recommendations: array of recommendations`;

    const response = await roboticsApi.chatWithMother({
      messages: [
        { role: 'system', content: 'You are a robotics task analyst. Respond only with valid JSON.', timestamp: new Date() },
        { role: 'user', content: prompt, timestamp: new Date() },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    try {
      return JSON.parse(response.response);
    } catch {
      throw new Error('Failed to parse task analysis');
    }
  }, []);

  // Suggest action based on situation
  const suggestAction = useCallback(async (
    situation: string,
    robotState: RobotState
  ): Promise<ActionSuggestion> => {
    const prompt = `Given the current robot state and situation, suggest the best action:

Robot State:
- ID: ${robotState.robot_id}
- Status: ${robotState.status}
- Mode: ${robotState.control_mode}
- Battery: ${robotState.battery_percent}%
- Position: (${robotState.position.x}, ${robotState.position.y}, ${robotState.position.z})
- Current Task: ${robotState.current_task || 'None'}

Situation: ${situation}

Respond in JSON format with:
- action: description of suggested action
- commandType: the command type to execute
- parameters: object with command parameters
- confidence: 0-1 confidence score
- reasoning: explanation of why this action
- alternatives: array of alternative actions with confidence scores`;

    const response = await roboticsApi.chatWithMother({
      messages: [
        { role: 'system', content: 'You are a robotics action advisor. Respond only with valid JSON.', timestamp: new Date() },
        { role: 'user', content: prompt, timestamp: new Date() },
      ],
      max_tokens: 800,
      temperature: 0.4,
    });

    try {
      return JSON.parse(response.response);
    } catch {
      throw new Error('Failed to parse action suggestion');
    }
  }, []);

  // Generate execution plan
  const generatePlan = useCallback(async (
    goal: string,
    constraints: string[] = []
  ): Promise<ExecutionPlan> => {
    const constraintText = constraints.length > 0
      ? `\nConstraints:\n${constraints.map(c => `- ${c}`).join('\n')}`
      : '';

    const prompt = `Generate an execution plan for a humanoid robot to achieve the following goal:

Goal: ${goal}${constraintText}

Respond in JSON format with:
- goal: the original goal
- steps: array of objects with:
  - id: step number
  - description: what this step does
  - commandType: robot command type
  - parameters: command parameters object
  - dependencies: array of step IDs this depends on
  - estimatedDuration: in seconds
- totalDuration: total estimated time in seconds
- checkpoints: array of step IDs that are checkpoints`;

    const response = await roboticsApi.chatWithMother({
      messages: [
        { role: 'system', content: 'You are a robotics motion planner. Respond only with valid JSON.', timestamp: new Date() },
        { role: 'user', content: prompt, timestamp: new Date() },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    try {
      return JSON.parse(response.response);
    } catch {
      throw new Error('Failed to parse execution plan');
    }
  }, []);

  // Streaming chat
  const streamChat = useCallback(async (
    message: string,
    onChunk: (chunk: string) => void
  ): Promise<void> => {
    ensureSystemMessage();

    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    setIsThinking(true);
    setError(null);

    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/mother/robotics/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          max_tokens: maxTokens,
          temperature,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let fullResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            fullResponse += content;
            onChunk(content);
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Add complete response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Stream failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsThinking(false);
      abortControllerRef.current = null;
    }
  }, [messages, ensureSystemMessage, maxTokens, temperature]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    messages,
    isThinking,
    error,
    chat,
    analyzeTask,
    suggestAction,
    generatePlan,
    clearMessages,
    streamChat,
  };
}

export default useMotherRobotics;
