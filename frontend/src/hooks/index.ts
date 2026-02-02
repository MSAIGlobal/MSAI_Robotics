/**
 * Robotics Dashboard Hooks - Central Export
 */

// Robot management
export {
  useRobots,
  useRobotsByStatus,
  useOnlineRobots,
  useRobotCount,
  default as useRobotsDefault
} from './useRobots';

// Telemetry
export {
  useTelemetry,
  useBatteryLevel,
  useCpuUsage,
  useTemperature,
  usePosition,
  useVelocity,
  useTelemetryStats,
  default as useTelemetryDefault
} from './useTelemetry';

// Robot control
export {
  useRobotControl,
  useSafetyAlerts,
  default as useRobotControlDefault
} from './useRobotControl';

// MOTHER AI integration
export {
  useMotherRobotics,
  default as useMotherRoboticsDefault
} from './useMotherRobotics';
