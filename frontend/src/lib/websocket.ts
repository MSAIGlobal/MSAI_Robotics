/**
 * MSAI Robotics WebSocket Client
 */

import type { RobotState, TelemetryPoint } from '../types/robotics';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

export type RoboticsEventType =
  | 'connected' | 'disconnected' | 'error' | 'status_update'
  | 'telemetry' | 'command_response' | 'safety_alert' | 'model_update';

export interface RoboticsEvent<T = unknown> {
  type: RoboticsEventType;
  data: T;
  timestamp: string;
}

export interface StatusUpdateData { robots: RobotState[]; }
export interface TelemetryData { robot_id: string; point: TelemetryPoint; }
export interface SafetyAlertData {
  robot_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

type EventCallback<T = unknown> = (event: RoboticsEvent<T>) => void;

class RoboticsWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<RoboticsEventType, Set<EventCallback>> = new Map();
  private messageQueue: string[] = [];
  private isConnecting = false;
  private telemetryBuffers: Map<string, TelemetryPoint[]> = new Map();

  get connected(): boolean { return this.ws?.readyState === WebSocket.OPEN; }

  constructor() {
    const types: RoboticsEventType[] = [
      'connected', 'disconnected', 'error', 'status_update',
      'telemetry', 'command_response', 'safety_alert', 'model_update'
    ];
    types.forEach(t => this.listeners.set(t, new Set()));
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;
    this.isConnecting = true;
    try {
      this.ws = new WebSocket(WS_BASE_URL);
      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected', {});
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift();
          if (msg) this.ws?.send(msg);
        }
      };
      this.ws.onclose = () => {
        this.isConnecting = false;
        this.emit('disconnected', {});
        this.attemptReconnect();
      };
      this.ws.onerror = () => {
        this.isConnecting = false;
        this.emit('error', { error: 'WebSocket error' });
      };
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as RoboticsEvent;
          this.handleMessage(msg);
        } catch {}
      };
    } catch {
      this.isConnecting = false;
    }
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.ws?.close();
    this.ws = null;
  }

  isConnected(): boolean { return this.ws?.readyState === WebSocket.OPEN; }

  on<T = unknown>(eventType: RoboticsEventType, callback: EventCallback<T>): () => void {
    this.listeners.get(eventType)?.add(callback as EventCallback);
    return () => { this.listeners.get(eventType)?.delete(callback as EventCallback); };
  }

  off(eventType: RoboticsEventType, callback: EventCallback): void {
    this.listeners.get(eventType)?.delete(callback);
  }

  send(type: string, data: unknown): void {
    const msg = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(msg);
    else {
      this.messageQueue.push(msg);
      if (!this.isConnecting) this.connect();
    }
  }

  subscribeTelemetry(robotId: string): void { this.send('subscribe_telemetry', { robot_id: robotId }); }
  unsubscribeTelemetry(robotId: string): void { this.send('unsubscribe_telemetry', { robot_id: robotId }); }
  subscribeStatus(): void { this.send('subscribe_status', {}); }
  subscribeSafetyAlerts(): void { this.send('subscribe_safety', {}); }

  sendCommand(robotId: string, commandType: string, parameters: Record<string, unknown>): boolean {
    if (!this.connected) return false;
    this.send('command', { robot_id: robotId, command_type: commandType, parameters });
    return true;
  }

  getTelemetry(robotId: string): TelemetryPoint[] {
    return this.telemetryBuffers.get(robotId) || [];
  }

  storeTelemetry(robotId: string, point: TelemetryPoint): void {
    const buffer = this.telemetryBuffers.get(robotId) || [];
    buffer.push(point);
    if (buffer.length > 500) buffer.shift();
    this.telemetryBuffers.set(robotId, buffer);
  }

  private emit<T>(eventType: RoboticsEventType, data: T): void {
    const event: RoboticsEvent<T> = { type: eventType, data, timestamp: new Date().toISOString() };
    this.listeners.get(eventType)?.forEach(cb => { try { cb(event as RoboticsEvent); } catch {} });
  }

  private handleMessage(msg: RoboticsEvent): void { this.emit(msg.type, msg.data); }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
  }
}

export const roboticsWs = new RoboticsWebSocket();
export default roboticsWs;
