/**
 * React Hook: useTelemetry
 * Manages robot telemetry data and real-time streams
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { TelemetryPoint, TelemetryChartData } from '../types/robotics';
import { roboticsApi } from '../lib/api';
import { roboticsWs, type RoboticsEvent } from '../lib/websocket';

interface UseTelemetryOptions {
  robotId: string;
  bufferSize?: number;
  metrics?: string[];
  autoSubscribe?: boolean;
}

interface UseTelemetryReturn {
  telemetry: TelemetryPoint[];
  latestPoint: TelemetryPoint | null;
  chartData: TelemetryChartData;
  isLoading: boolean;
  error: string | null;
  fetchHistory: (startTime?: Date, endTime?: Date) => Promise<void>;
  clearBuffer: () => void;
}

export function useTelemetry(options: UseTelemetryOptions): UseTelemetryReturn {
  const {
    robotId,
    bufferSize = 500,
    metrics = ['cpu', 'memory', 'battery', 'temperature'],
    autoSubscribe = true
  } = options;

  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bufferRef = useRef<TelemetryPoint[]>([]);

  // Handle incoming telemetry
  const handleTelemetry = useCallback((event: RoboticsEvent<TelemetryPoint>) => {
    if (event.data.robot_id !== robotId) return;

    bufferRef.current.push(event.data);

    // Trim buffer if too large
    while (bufferRef.current.length > bufferSize) {
      bufferRef.current.shift();
    }

    setTelemetry([...bufferRef.current]);
  }, [robotId, bufferSize]);

  // Fetch historical telemetry
  const fetchHistory = useCallback(async (startTime?: Date, endTime?: Date) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await roboticsApi.getTelemetry(robotId, startTime, endTime);
      bufferRef.current = response.data;
      setTelemetry([...bufferRef.current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch telemetry');
    } finally {
      setIsLoading(false);
    }
  }, [robotId]);

  // Clear telemetry buffer
  const clearBuffer = useCallback(() => {
    bufferRef.current = [];
    setTelemetry([]);
  }, []);

  // Subscribe to telemetry events
  useEffect(() => {
    if (!autoSubscribe) return;

    const unsubscribe = roboticsWs.on('telemetry', handleTelemetry);

    // Also get telemetry from WebSocket buffer
    const wsBuffer = roboticsWs.getTelemetry(robotId);
    if (wsBuffer.length > 0) {
      bufferRef.current = wsBuffer;
      setTelemetry([...bufferRef.current]);
    }

    return () => {
      unsubscribe();
    };
  }, [autoSubscribe, handleTelemetry, robotId]);

  // Get latest telemetry point
  const latestPoint = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;

  // Transform telemetry to chart data
  const chartData = useMemo((): TelemetryChartData => {
    const result: TelemetryChartData = {
      timestamps: [],
      series: {},
    };

    for (const metric of metrics) {
      result.series[metric] = [];
    }

    for (const point of telemetry) {
      result.timestamps.push(new Date(point.timestamp));

      for (const metric of metrics) {
        const value = point.metrics[metric] ?? null;
        result.series[metric].push(value);
      }
    }

    return result;
  }, [telemetry, metrics]);

  return {
    telemetry,
    latestPoint,
    chartData,
    isLoading,
    error,
    fetchHistory,
    clearBuffer,
  };
}

// ============================================
// SPECIALIZED TELEMETRY HOOKS
// ============================================

export function useBatteryLevel(robotId: string): number | null {
  const { latestPoint } = useTelemetry({ robotId, metrics: ['battery'] });
  return latestPoint?.metrics.battery ?? null;
}

export function useCpuUsage(robotId: string): number | null {
  const { latestPoint } = useTelemetry({ robotId, metrics: ['cpu'] });
  return latestPoint?.metrics.cpu ?? null;
}

export function useTemperature(robotId: string): number | null {
  const { latestPoint } = useTelemetry({ robotId, metrics: ['temperature'] });
  return latestPoint?.metrics.temperature ?? null;
}

export function usePosition(robotId: string): { x: number; y: number; z: number } | null {
  const { latestPoint } = useTelemetry({ robotId, metrics: ['position_x', 'position_y', 'position_z'] });

  if (!latestPoint) return null;

  return {
    x: latestPoint.metrics.position_x ?? 0,
    y: latestPoint.metrics.position_y ?? 0,
    z: latestPoint.metrics.position_z ?? 0,
  };
}

export function useVelocity(robotId: string): { linear: number; angular: number } | null {
  const { latestPoint } = useTelemetry({ robotId, metrics: ['velocity_linear', 'velocity_angular'] });

  if (!latestPoint) return null;

  return {
    linear: latestPoint.metrics.velocity_linear ?? 0,
    angular: latestPoint.metrics.velocity_angular ?? 0,
  };
}

// ============================================
// TELEMETRY AGGREGATION
// ============================================

interface TelemetryStats {
  min: number;
  max: number;
  avg: number;
  current: number;
}

export function useTelemetryStats(robotId: string, metric: string): TelemetryStats | null {
  const { telemetry } = useTelemetry({ robotId, metrics: [metric] });

  return useMemo(() => {
    if (telemetry.length === 0) return null;

    const values = telemetry
      .map(p => p.metrics[metric])
      .filter((v): v is number => v !== undefined && v !== null);

    if (values.length === 0) return null;

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      current: values[values.length - 1],
    };
  }, [telemetry, metric]);
}

export default useTelemetry;
