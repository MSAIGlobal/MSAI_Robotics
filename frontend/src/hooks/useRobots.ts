/**
 * React Hook: useRobots
 * Manages robot state and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { RobotState, RobotStatus, ControlMode } from '../types/robotics';
import { roboticsApi } from '../lib/api';
import { roboticsWs, type RoboticsEvent } from '../lib/websocket';

interface UseRobotsOptions {
  autoConnect?: boolean;
  pollInterval?: number;
}

interface UseRobotsReturn {
  robots: RobotState[];
  selectedRobot: RobotState | null;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  selectRobot: (robotId: string | null) => void;
  refreshRobots: () => Promise<void>;
  connect: () => void;
  disconnect: () => void;
}

export function useRobots(options: UseRobotsOptions = {}): UseRobotsReturn {
  const { autoConnect = true, pollInterval = 0 } = options;

  const [robots, setRobots] = useState<RobotState[]>([]);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch robots via REST API
  const refreshRobots = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await roboticsApi.getAllRobots();
      setRobots(response.robots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch robots');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle WebSocket status updates
  const handleStatusUpdate = useCallback((event: RoboticsEvent<{ robots: RobotState[] }>) => {
    setRobots(event.data.robots);
  }, []);

  // Handle connection events
  const handleConnected = useCallback(() => {
    setIsConnected(true);
    setError(null);
  }, []);

  const handleDisconnected = useCallback(() => {
    setIsConnected(false);
  }, []);

  const handleError = useCallback((event: RoboticsEvent<{ error: string }>) => {
    setError(event.data.error);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    roboticsWs.connect();
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    roboticsWs.disconnect();
  }, []);

  // Select a robot
  const selectRobot = useCallback((robotId: string | null) => {
    setSelectedRobotId(robotId);
  }, []);

  // Get selected robot state
  const selectedRobot = robots.find(r => r.robot_id === selectedRobotId) || null;

  // Setup WebSocket subscriptions
  useEffect(() => {
    const unsubscribers = [
      roboticsWs.on('status_update', handleStatusUpdate),
      roboticsWs.on('connected', handleConnected),
      roboticsWs.on('disconnected', handleDisconnected),
      roboticsWs.on('error', handleError),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [handleStatusUpdate, handleConnected, handleDisconnected, handleError]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      refreshRobots();
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, refreshRobots, connect, disconnect]);

  // Setup polling if configured
  useEffect(() => {
    if (pollInterval > 0 && !isConnected) {
      pollTimerRef.current = setInterval(refreshRobots, pollInterval);
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [pollInterval, isConnected, refreshRobots]);

  return {
    robots,
    selectedRobot,
    isLoading,
    isConnected,
    error,
    selectRobot,
    refreshRobots,
    connect,
    disconnect,
  };
}

// ============================================
// ROBOT STATUS HELPERS
// ============================================

export function useRobotsByStatus(status: RobotStatus): RobotState[] {
  const { robots } = useRobots({ autoConnect: false });
  return robots.filter(r => r.status === status);
}

export function useOnlineRobots(): RobotState[] {
  return useRobotsByStatus('online' as RobotStatus);
}

export function useRobotCount(): { total: number; online: number; busy: number; error: number } {
  const { robots } = useRobots({ autoConnect: false });

  return {
    total: robots.length,
    online: robots.filter(r => r.status === 'online').length,
    busy: robots.filter(r => r.status === 'busy').length,
    error: robots.filter(r => r.status === 'error').length,
  };
}

export default useRobots;
