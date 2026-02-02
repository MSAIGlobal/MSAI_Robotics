/**
 * RobotCard Component
 * Displays individual robot status in the dashboard grid
 */

import type { FC } from 'react';
import { ControlMode } from '../../types/robotics';
import type { RobotState } from '../../types/robotics';

interface RobotCardProps {
  robot: RobotState;
  selected?: boolean;
  onClick?: () => void;
  onEmergencyStop?: () => void;
}

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
  busy: 'bg-yellow-500',
  error: 'bg-red-500',
  maintenance: 'bg-blue-500',
};

const modeIcons: Record<ControlMode, string> = {
  [ControlMode.AUTONOMOUS]: '🤖',
  [ControlMode.SUPERVISED]: '👁️',
  [ControlMode.TELEOPERATED]: '🎮',
  [ControlMode.EMERGENCY_STOP]: '🛑',
};

export const RobotCard: FC<RobotCardProps> = ({
  robot,
  selected = false,
  onClick,
  onEmergencyStop,
}) => {
  const statusColor = statusColors[robot.status] || 'bg-gray-500';

  const formatUptime = (lastHeartbeat: string) => {
    const diff = Date.now() - new Date(lastHeartbeat).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div
      className={`
        relative rounded-lg border-2 p-4 cursor-pointer transition-all
        ${selected
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
          : 'border-gray-700 bg-gray-800 hover:border-gray-600'}
        ${robot.status === 'error' ? 'animate-pulse' : ''}
      `}
      onClick={onClick}
    >
      {/* Status indicator */}
      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${statusColor}`} />

      {/* Robot ID and Mode */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{modeIcons[robot.control_mode]}</span>
        <div>
          <h3 className="font-bold text-white">{robot.robot_id}</h3>
          <span className="text-xs text-gray-400 capitalize">{robot.control_mode.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {/* Battery */}
        <div className="flex items-center gap-1">
          <span className="text-gray-400">🔋</span>
          <span className={robot.battery_percent < 20 ? 'text-red-400' : 'text-white'}>
            {robot.battery_percent.toFixed(0)}%
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1">
          <span className="text-gray-400">📡</span>
          <span className={`capitalize ${robot.status === 'online' ? 'text-green-400' : 'text-gray-400'}`}>
            {robot.status}
          </span>
        </div>

        {/* Position */}
        <div className="flex items-center gap-1 col-span-2">
          <span className="text-gray-400">📍</span>
          <span className="text-white text-xs">
            ({robot.position.x.toFixed(1)}, {robot.position.y.toFixed(1)}, {robot.position.z.toFixed(1)})
          </span>
        </div>

        {/* Last Heartbeat */}
        <div className="flex items-center gap-1 col-span-2">
          <span className="text-gray-400">💓</span>
          <span className="text-gray-300 text-xs">{formatUptime(robot.last_heartbeat as any)}</span>
        </div>
      </div>

      {/* Current Task */}
      {robot.current_task && (
        <div className="mt-2 p-2 bg-gray-700/50 rounded text-xs">
          <span className="text-gray-400">Task: </span>
          <span className="text-white">{robot.current_task}</span>
        </div>
      )}

      {/* Error Message */}
      {robot.error_message && (
        <div className="mt-2 p-2 bg-red-500/20 rounded text-xs text-red-300">
          ⚠️ {robot.error_message}
        </div>
      )}

      {/* Emergency Stop Button */}
      {robot.status === 'online' && robot.control_mode !== 'emergency_stop' && (
        <button
          className="mt-3 w-full py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm font-bold transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onEmergencyStop?.();
          }}
        >
          🛑 EMERGENCY STOP
        </button>
      )}

      {/* Firmware/Model Version */}
      <div className="mt-2 flex justify-between text-[10px] text-gray-500">
        <span>FW: {robot.firmware_version}</span>
        <span>Model: {robot.model_version}</span>
      </div>
    </div>
  );
};

export default RobotCard;
