/**
 * Robotics Dashboard State Management
 * Using Zustand for lightweight, performant state
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type {
  RobotState,
  TelemetryPoint,
  ControlMode,
  SafetyLevel,
  ChatMessage,
  CommandResponse,
} from '../types/robotics';

// ============================================
// TYPES
// ============================================

interface SafetyAlert {
  id: string;
  robot_id: string;
  alert_type: string;
  severity: SafetyLevel;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface DashboardView {
  activePanel: 'overview' | 'robot-detail' | 'telemetry' | 'chat' | 'settings';
  selectedRobotId: string | null;
  sidebarOpen: boolean;
  darkMode: boolean;
  gridLayout: 'single' | 'dual' | 'quad';
}

interface RoboticsState {
  // Connection
  isConnected: boolean;
  connectionError: string | null;

  // Robots
  robots: Map<string, RobotState>;
  robotsArray: RobotState[];

  // Telemetry
  telemetryBuffers: Map<string, TelemetryPoint[]>;
  telemetryBufferSize: number;

  // Commands
  pendingCommands: Map<string, { command: any; timestamp: Date }>;
  commandHistory: CommandResponse[];

  // Safety
  safetyAlerts: SafetyAlert[];
  globalEmergencyStop: boolean;

  // Chat
  chatMessages: ChatMessage[];
  isMotherThinking: boolean;

  // UI
  view: DashboardView;

  // Loading states
  isLoading: boolean;
  loadingMessage: string;
}

interface RoboticsActions {
  // Connection
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;

  // Robots
  updateRobots: (robots: RobotState[]) => void;
  updateRobot: (robot: RobotState) => void;
  removeRobot: (robotId: string) => void;
  clearRobots: () => void;

  // Telemetry
  addTelemetry: (robotId: string, point: TelemetryPoint) => void;
  clearTelemetry: (robotId: string) => void;
  setTelemetryBufferSize: (size: number) => void;

  // Commands
  addPendingCommand: (commandId: string, command: any) => void;
  removePendingCommand: (commandId: string) => void;
  addCommandResponse: (response: CommandResponse) => void;
  clearCommandHistory: () => void;

  // Safety
  addSafetyAlert: (alert: Omit<SafetyAlert, 'id' | 'acknowledged'>) => void;
  acknowledgeSafetyAlert: (alertId: string) => void;
  clearSafetyAlerts: () => void;
  setGlobalEmergencyStop: (stopped: boolean) => void;

  // Chat
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  setMotherThinking: (thinking: boolean) => void;

  // UI
  setActivePanel: (panel: DashboardView['activePanel']) => void;
  selectRobot: (robotId: string | null) => void;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  setGridLayout: (layout: DashboardView['gridLayout']) => void;

  // Loading
  setLoading: (loading: boolean, message?: string) => void;

  // Reset
  reset: () => void;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: RoboticsState = {
  isConnected: false,
  connectionError: null,
  robots: new Map(),
  robotsArray: [],
  telemetryBuffers: new Map(),
  telemetryBufferSize: 500,
  pendingCommands: new Map(),
  commandHistory: [],
  safetyAlerts: [],
  globalEmergencyStop: false,
  chatMessages: [],
  isMotherThinking: false,
  view: {
    activePanel: 'overview',
    selectedRobotId: null,
    sidebarOpen: true,
    darkMode: true,
    gridLayout: 'dual',
  },
  isLoading: false,
  loadingMessage: '',
};

// ============================================
// STORE
// ============================================

export const useRoboticsStore = create<RoboticsState & RoboticsActions>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // Connection
      setConnected: (connected) => set({ isConnected: connected }),
      setConnectionError: (error) => set({ connectionError: error }),

      // Robots
      updateRobots: (robots) => {
        const robotsMap = new Map<string, RobotState>();
        for (const robot of robots) {
          robotsMap.set(robot.robot_id, robot);
        }
        set({ robots: robotsMap, robotsArray: robots });
      },

      updateRobot: (robot) => {
        const robots = new Map(get().robots);
        robots.set(robot.robot_id, robot);
        set({ robots, robotsArray: Array.from(robots.values()) });
      },

      removeRobot: (robotId) => {
        const robots = new Map(get().robots);
        robots.delete(robotId);
        set({ robots, robotsArray: Array.from(robots.values()) });
      },

      clearRobots: () => set({ robots: new Map(), robotsArray: [] }),

      // Telemetry
      addTelemetry: (robotId, point) => {
        const buffers = new Map(get().telemetryBuffers);
        const buffer = buffers.get(robotId) || [];

        buffer.push(point);

        // Trim buffer
        const maxSize = get().telemetryBufferSize;
        while (buffer.length > maxSize) {
          buffer.shift();
        }

        buffers.set(robotId, buffer);
        set({ telemetryBuffers: buffers });
      },

      clearTelemetry: (robotId) => {
        const buffers = new Map(get().telemetryBuffers);
        buffers.delete(robotId);
        set({ telemetryBuffers: buffers });
      },

      setTelemetryBufferSize: (size) => set({ telemetryBufferSize: size }),

      // Commands
      addPendingCommand: (commandId, command) => {
        const pending = new Map(get().pendingCommands);
        pending.set(commandId, { command, timestamp: new Date() });
        set({ pendingCommands: pending });
      },

      removePendingCommand: (commandId) => {
        const pending = new Map(get().pendingCommands);
        pending.delete(commandId);
        set({ pendingCommands: pending });
      },

      addCommandResponse: (response) => {
        const history = [...get().commandHistory, response].slice(-100);
        set({ commandHistory: history });
      },

      clearCommandHistory: () => set({ commandHistory: [] }),

      // Safety
      addSafetyAlert: (alert) => {
        const newAlert: SafetyAlert = {
          ...alert,
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          acknowledged: false,
        };
        set({ safetyAlerts: [...get().safetyAlerts, newAlert] });
      },

      acknowledgeSafetyAlert: (alertId) => {
        const alerts = get().safetyAlerts.map(a =>
          a.id === alertId ? { ...a, acknowledged: true } : a
        );
        set({ safetyAlerts: alerts });
      },

      clearSafetyAlerts: () => set({ safetyAlerts: [] }),

      setGlobalEmergencyStop: (stopped) => set({ globalEmergencyStop: stopped }),

      // Chat
      addChatMessage: (message) => {
        set({ chatMessages: [...get().chatMessages, message] });
      },

      clearChatMessages: () => set({ chatMessages: [] }),

      setMotherThinking: (thinking) => set({ isMotherThinking: thinking }),

      // UI
      setActivePanel: (panel) => set({ view: { ...get().view, activePanel: panel } }),

      selectRobot: (robotId) => set({ view: { ...get().view, selectedRobotId: robotId } }),

      toggleSidebar: () => set({ view: { ...get().view, sidebarOpen: !get().view.sidebarOpen } }),

      toggleDarkMode: () => set({ view: { ...get().view, darkMode: !get().view.darkMode } }),

      setGridLayout: (layout) => set({ view: { ...get().view, gridLayout: layout } }),

      // Loading
      setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),

      // Reset
      reset: () => set(initialState),
    })),
    { name: 'robotics-store' }
  )
);

// ============================================
// SELECTORS
// ============================================

export const selectRobot = (robotId: string) => (state: RoboticsState) =>
  state.robots.get(robotId);

export const selectOnlineRobots = (state: RoboticsState) =>
  state.robotsArray.filter(r => r.status === 'online');

export const selectRobotsByStatus = (status: string) => (state: RoboticsState) =>
  state.robotsArray.filter(r => r.status === status);

export const selectTelemetry = (robotId: string) => (state: RoboticsState) =>
  state.telemetryBuffers.get(robotId) || [];

export const selectUnacknowledgedAlerts = (state: RoboticsState) =>
  state.safetyAlerts.filter(a => !a.acknowledged);

export const selectCriticalAlerts = (state: RoboticsState) =>
  state.safetyAlerts.filter(a => a.severity === 'critical' && !a.acknowledged);

export const selectSelectedRobot = (state: RoboticsState) =>
  state.view.selectedRobotId ? state.robots.get(state.view.selectedRobotId) : null;

// ============================================
// HOOKS USING SELECTORS
// ============================================

export const useSelectedRobot = () => useRoboticsStore(selectSelectedRobot);

export const useOnlineRobots = () => useRoboticsStore(selectOnlineRobots);

export const useUnacknowledgedAlerts = () => useRoboticsStore(selectUnacknowledgedAlerts);

export const useCriticalAlerts = () => useRoboticsStore(selectCriticalAlerts);

export const useRobotTelemetry = (robotId: string) =>
  useRoboticsStore(state => state.telemetryBuffers.get(robotId) || []);

export default useRoboticsStore;
