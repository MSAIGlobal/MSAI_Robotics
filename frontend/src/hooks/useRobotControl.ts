/**
 * React Hook: useRobotControl
 * Manages robot commands and control modes
 */

import { useState, useCallback, useRef } from 'react';
import { SafetyLevel, ControlMode, CommandType } from '../types/robotics';
import type {
  RobotCommand,
  CommandResponse,
} from '../types/robotics';
import { roboticsApi } from '../lib/api';
import { roboticsWs, type RoboticsEvent } from '../lib/websocket';

interface UseRobotControlOptions {
  robotId: string;
  useWebSocket?: boolean;
  commandTimeout?: number;
}

interface UseRobotControlReturn {
  // State
  currentMode: ControlMode;
  isExecuting: boolean;
  lastCommand: RobotCommand | null;
  lastResponse: CommandResponse | null;
  error: string | null;
  commandHistory: CommandResponse[];

  // Control mode
  setControlMode: (mode: ControlMode) => Promise<void>;
  emergencyStop: () => Promise<void>;

  // Movement commands
  move: (direction: string, speed?: number, duration?: number) => Promise<CommandResponse>;
  rotate: (angle: number, speed?: number) => Promise<CommandResponse>;
  stop: () => Promise<CommandResponse>;
  goToPosition: (x: number, y: number, z?: number) => Promise<CommandResponse>;

  // Actions
  gesture: (gestureName: string, parameters?: Record<string, any>) => Promise<CommandResponse>;
  speak: (text: string, voice?: string) => Promise<CommandResponse>;
  lookAt: (target: { x: number; y: number; z: number }) => Promise<CommandResponse>;
  grab: (objectId: string) => Promise<CommandResponse>;
  release: () => Promise<CommandResponse>;

  // Generic command
  sendCommand: (command: Omit<RobotCommand, 'robot_id'>) => Promise<CommandResponse>;

  // Utilities
  clearHistory: () => void;
}

export function useRobotControl(options: UseRobotControlOptions): UseRobotControlReturn {
  const { robotId, useWebSocket = true, commandTimeout = 10000 } = options;

  const [currentMode, setCurrentMode] = useState<ControlMode>(ControlMode.SUPERVISED);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastCommand, setLastCommand] = useState<RobotCommand | null>(null);
  const [lastResponse, setLastResponse] = useState<CommandResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<CommandResponse[]>([]);

  const pendingCommandRef = useRef<{
    resolve: (response: CommandResponse) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  } | null>(null);

  // Handle command responses from WebSocket
  const handleCommandResponse = useCallback((event: RoboticsEvent<CommandResponse>) => {
    if (pendingCommandRef.current) {
      clearTimeout(pendingCommandRef.current.timeout);
      pendingCommandRef.current.resolve(event.data);
      pendingCommandRef.current = null;
    }

    setLastResponse(event.data);
    setCommandHistory(prev => [...prev.slice(-99), event.data]);
    setIsExecuting(false);
  }, []);

  // Generic command sender
  const sendCommand = useCallback(async (
    command: Omit<RobotCommand, 'robot_id'>
  ): Promise<CommandResponse> => {
    const fullCommand: RobotCommand = {
      robot_id: robotId,
      ...command,
    };

    setLastCommand(fullCommand);
    setIsExecuting(true);
    setError(null);

    try {
      if (useWebSocket && roboticsWs.connected) {
        // Send via WebSocket for lower latency
        const sent = roboticsWs.sendCommand(
          robotId,
          command.command_type,
          command.parameters
        );

        if (!sent) {
          throw new Error('Failed to send command via WebSocket');
        }

        // Wait for response with timeout
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            if (pendingCommandRef.current) {
              pendingCommandRef.current = null;
              setIsExecuting(false);
              reject(new Error('Command timeout'));
            }
          }, commandTimeout);

          pendingCommandRef.current = { resolve, reject, timeout };

          // Subscribe to response
          const unsubscribe = roboticsWs.on('command_response', handleCommandResponse);

          // Cleanup on timeout
          setTimeout(() => unsubscribe(), commandTimeout + 1000);
        });
      } else {
        // Fallback to REST API
        const response = await roboticsApi.sendCommand(fullCommand);
        setLastResponse(response);
        setCommandHistory(prev => [...prev.slice(-99), response]);
        setIsExecuting(false);
        return response;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Command failed';
      setError(errorMessage);
      setIsExecuting(false);
      throw err;
    }
  }, [robotId, useWebSocket, commandTimeout, handleCommandResponse]);

  // Set control mode
  const setControlModeAsync = useCallback(async (mode: ControlMode) => {
    try {
      await roboticsApi.setControlMode(robotId, mode);
      setCurrentMode(mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set control mode');
      throw err;
    }
  }, [robotId]);

  // Emergency stop
  const emergencyStop = useCallback(async () => {
    try {
      // Set mode first via API
      await roboticsApi.setControlMode(robotId, ControlMode.EMERGENCY_STOP);
      setCurrentMode(ControlMode.EMERGENCY_STOP);

      // Also send stop command
      await sendCommand({
        command_type: CommandType.EMERGENCY_STOP,
        parameters: {},
        priority: 10,
        timeout_ms: 1000,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Emergency stop failed');
      throw err;
    }
  }, [robotId, sendCommand]);

  // Movement commands
  const move = useCallback(async (
    direction: string,
    speed: number = 0.5,
    duration: number = 1000
  ) => {
    return sendCommand({
      command_type: CommandType.MOVE,
      parameters: { direction, speed, duration_ms: duration },
      priority: 5,
      timeout_ms: duration + 2000,
    });
  }, [sendCommand]);

  const rotate = useCallback(async (angle: number, speed: number = 0.5) => {
    const duration = Math.abs(angle) / speed * 100;
    return sendCommand({
      command_type: CommandType.ROTATE,
      parameters: { angle, speed },
      priority: 5,
      timeout_ms: duration + 2000,
    });
  }, [sendCommand]);

  const stop = useCallback(async () => {
    return sendCommand({
      command_type: CommandType.STOP,
      parameters: {},
      priority: 8,
      timeout_ms: 1000,
    });
  }, [sendCommand]);

  const goToPosition = useCallback(async (x: number, y: number, z: number = 0) => {
    return sendCommand({
      command_type: CommandType.GO_TO_POSITION,
      parameters: { x, y, z },
      priority: 5,
      timeout_ms: 30000,
    });
  }, [sendCommand]);

  // Action commands
  const gesture = useCallback(async (
    gestureName: string,
    parameters: Record<string, any> = {}
  ) => {
    return sendCommand({
      command_type: CommandType.GESTURE,
      parameters: { gesture_name: gestureName, ...parameters },
      priority: 4,
      timeout_ms: 10000,
    });
  }, [sendCommand]);

  const speak = useCallback(async (text: string, voice: string = 'default') => {
    return sendCommand({
      command_type: CommandType.SPEAK,
      parameters: { text, voice },
      priority: 4,
      timeout_ms: 30000,
    });
  }, [sendCommand]);

  const lookAt = useCallback(async (target: { x: number; y: number; z: number }) => {
    return sendCommand({
      command_type: CommandType.LOOK_AT,
      parameters: { target },
      priority: 5,
      timeout_ms: 5000,
    });
  }, [sendCommand]);

  const grab = useCallback(async (objectId: string) => {
    return sendCommand({
      command_type: CommandType.GRAB,
      parameters: { object_id: objectId },
      priority: 5,
      timeout_ms: 10000,
    });
  }, [sendCommand]);

  const release = useCallback(async () => {
    return sendCommand({
      command_type: CommandType.RELEASE,
      parameters: {},
      priority: 5,
      timeout_ms: 5000,
    });
  }, [sendCommand]);

  // Clear command history
  const clearHistory = useCallback(() => {
    setCommandHistory([]);
    setLastCommand(null);
    setLastResponse(null);
    setError(null);
  }, []);

  return {
    currentMode,
    isExecuting,
    lastCommand,
    lastResponse,
    error,
    commandHistory,
    setControlMode: setControlModeAsync,
    emergencyStop,
    move,
    rotate,
    stop,
    goToPosition,
    gesture,
    speak,
    lookAt,
    grab,
    release,
    sendCommand,
    clearHistory,
  };
}

// ============================================
// SAFETY HOOKS
// ============================================

interface SafetyAlert {
  robot_id: string;
  alert_type: string;
  severity: SafetyLevel;
  message: string;
  timestamp: Date;
}

export function useSafetyAlerts(robotId?: string) {
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);

  const handleSafetyAlert = useCallback((event: RoboticsEvent<SafetyAlert>) => {
    if (robotId && event.data.robot_id !== robotId) return;

    setAlerts(prev => [...prev.slice(-99), {
      ...event.data,
      timestamp: new Date(event.timestamp),
    }]);
  }, [robotId]);

  // Subscribe to safety alerts
  useState(() => {
    const unsubscribe = roboticsWs.on('safety_alert', handleSafetyAlert);
    return () => unsubscribe();
  });

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const criticalAlerts = alerts.filter(a => a.severity === SafetyLevel.CRITICAL);
  const warningAlerts = alerts.filter(a => a.severity === SafetyLevel.WARNING);

  return {
    alerts,
    criticalAlerts,
    warningAlerts,
    hasCritical: criticalAlerts.length > 0,
    clearAlerts,
  };
}

export default useRobotControl;
