/**
 * ControlPanel Component
 * Robot control interface with movement and action commands
 */

import React, { useState } from 'react';
import type { RobotState, ControlMode } from '../../types/robotics';
import { useRobotControl } from '../../hooks/useRobotControl';

interface ControlPanelProps {
  robot: RobotState;
  onModeChange?: (mode: ControlMode) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  robot,
  onModeChange,
}) => {
  const [gestureInput, setGestureInput] = useState('');
  const [speechInput, setSpeechInput] = useState('');

  const {
    currentMode,
    isExecuting,
    error,
    setControlMode,
    emergencyStop,
    move,
    rotate,
    stop,
    gesture,
    speak,
  } = useRobotControl({ robotId: robot.robot_id });

  const handleModeChange = async (mode: ControlMode) => {
    await setControlMode(mode);
    onModeChange?.(mode);
  };

  const handleMove = async (direction: string) => {
    await move(direction, 0.5, 1000);
  };

  const handleRotate = async (angle: number) => {
    await rotate(angle, 0.5);
  };

  const handleGesture = async () => {
    if (!gestureInput.trim()) return;
    await gesture(gestureInput.trim());
    setGestureInput('');
  };

  const handleSpeak = async () => {
    if (!speechInput.trim()) return;
    await speak(speechInput.trim());
    setSpeechInput('');
  };

  const isDisabled = robot.status !== 'online' || currentMode === 'emergency_stop';

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-bold text-white mb-4">Control Panel</h3>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 text-red-300 p-2 rounded text-sm mb-4">
          ⚠️ {error}
        </div>
      )}

      {/* Status Banner */}
      {isDisabled && (
        <div className="bg-yellow-500/20 text-yellow-300 p-2 rounded text-sm mb-4">
          🔒 Controls disabled: Robot is {robot.status === 'online' ? 'in emergency stop' : robot.status}
        </div>
      )}

      {/* Control Mode Selector */}
      <div className="mb-4">
        <label className="text-sm text-gray-400 mb-2 block">Control Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {(['autonomous', 'supervised', 'teleoperated'] as ControlMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              disabled={isDisabled}
              className={`
                px-3 py-2 rounded text-sm capitalize
                ${currentMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {mode.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Movement Controls */}
      <div className="mb-4">
        <label className="text-sm text-gray-400 mb-2 block">Movement</label>

        {/* D-Pad Style Controls */}
        <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
          <div /> {/* Empty cell */}
          <button
            onClick={() => handleMove('forward')}
            disabled={isDisabled || isExecuting}
            className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded disabled:opacity-50"
          >
            ⬆️
          </button>
          <div /> {/* Empty cell */}

          <button
            onClick={() => handleRotate(-45)}
            disabled={isDisabled || isExecuting}
            className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded disabled:opacity-50"
          >
            ↶
          </button>
          <button
            onClick={stop}
            disabled={isDisabled || isExecuting}
            className="bg-yellow-600 hover:bg-yellow-700 text-white p-3 rounded disabled:opacity-50 font-bold"
          >
            ⏹
          </button>
          <button
            onClick={() => handleRotate(45)}
            disabled={isDisabled || isExecuting}
            className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded disabled:opacity-50"
          >
            ↷
          </button>

          <div /> {/* Empty cell */}
          <button
            onClick={() => handleMove('backward')}
            disabled={isDisabled || isExecuting}
            className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded disabled:opacity-50"
          >
            ⬇️
          </button>
          <div /> {/* Empty cell */}
        </div>

        {/* Strafe Controls */}
        <div className="flex justify-center gap-4 mt-2">
          <button
            onClick={() => handleMove('left')}
            disabled={isDisabled || isExecuting}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            ⬅️ Strafe
          </button>
          <button
            onClick={() => handleMove('right')}
            disabled={isDisabled || isExecuting}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Strafe ➡️
          </button>
        </div>
      </div>

      {/* Gesture Control */}
      <div className="mb-4">
        <label className="text-sm text-gray-400 mb-2 block">Gesture</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={gestureInput}
            onChange={(e) => setGestureInput(e.target.value)}
            placeholder="wave, point, nod..."
            disabled={isDisabled}
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 text-sm disabled:opacity-50"
          />
          <button
            onClick={handleGesture}
            disabled={isDisabled || isExecuting || !gestureInput.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm disabled:opacity-50"
          >
            👋
          </button>
        </div>

        {/* Quick Gestures */}
        <div className="flex gap-2 mt-2 flex-wrap">
          {['wave', 'nod', 'shake_head', 'point', 'thumbs_up'].map((g) => (
            <button
              key={g}
              onClick={() => gesture(g)}
              disabled={isDisabled || isExecuting}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 disabled:opacity-50"
            >
              {g.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Speech Control */}
      <div className="mb-4">
        <label className="text-sm text-gray-400 mb-2 block">Speech</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={speechInput}
            onChange={(e) => setSpeechInput(e.target.value)}
            placeholder="Enter text to speak..."
            disabled={isDisabled}
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 text-sm disabled:opacity-50"
          />
          <button
            onClick={handleSpeak}
            disabled={isDisabled || isExecuting || !speechInput.trim()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm disabled:opacity-50"
          >
            🔊
          </button>
        </div>
      </div>

      {/* Emergency Stop */}
      <button
        onClick={emergencyStop}
        className="w-full py-4 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold text-lg transition-colors"
      >
        🛑 EMERGENCY STOP
      </button>

      {/* Executing Indicator */}
      {isExecuting && (
        <div className="mt-2 text-center text-sm text-gray-400 animate-pulse">
          Executing command...
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
