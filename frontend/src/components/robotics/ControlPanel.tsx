// Motion Control Panel - Simulation controls
import React, { useState, useEffect } from 'react';
import { roboticsApi, createSimulationStream } from '../../lib/backend';
import { SimulationConfig, SimulationState, MotionSession, User } from '../../lib/types';
import { hasPermission } from '../../lib/auth';

interface Props {
  user: User | null;
  onSimulationStateChange?: (state: SimulationState) => void;
}

const SCENARIOS = [
  { id: 'stand', name: 'Stand', icon: '🧍' },
  { id: 'walk', name: 'Walk', icon: '🚶' },
  { id: 'step', name: 'Step', icon: '👣' },
  { id: 'balance', name: 'Balance', icon: '⚖️' },
];

export function ControlPanel({ user, onSimulationStateChange }: Props) {
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [sessions, setSessions] = useState<MotionSession[]>([]);
  const [selectedScenario, setSelectedScenario] = useState('stand');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);

  const canControl = hasPermission('robotics.control', user);
  const canStartSim = hasPermission('robotics.sim.start', user);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const data = await roboticsApi.listSessions();
      setSessions(data.slice(0, 5));
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }

  async function startSimulation() {
    if (!canStartSim) return;
    setLoading(true);

    try {
      const config: SimulationConfig = {
        model: 'exo1',
        scenario: selectedScenario as SimulationConfig['scenario'],
        constraints: {
          max_torque: 130,
          balance: true,
          collision_check: true,
        },
      };

      await roboticsApi.startSimulation(config);

      // Connect to stream
      const ws = createSimulationStream(
        (state) => {
          setSimState(state);
          onSimulationStateChange?.(state);
        },
        (err) => console.error('Stream error:', err)
      );

      // Store WebSocket for cleanup
      (window as unknown as { __simWs?: WebSocket }).__simWs = ws;
    } catch (err) {
      console.error('Failed to start simulation:', err);
    } finally {
      setLoading(false);
    }
  }

  async function pauseSimulation() {
    try {
      await roboticsApi.pauseSimulation();
    } catch (err) {
      console.error('Failed to pause:', err);
    }
  }

  async function resumeSimulation() {
    try {
      await roboticsApi.resumeSimulation();
    } catch (err) {
      console.error('Failed to resume:', err);
    }
  }

  async function stopSimulation() {
    try {
      await roboticsApi.stopSimulation();
      setSimState(null);
      onSimulationStateChange?.(null as unknown as SimulationState);

      // Close WebSocket
      const ws = (window as unknown as { __simWs?: WebSocket }).__simWs;
      ws?.close();

      loadSessions();
    } catch (err) {
      console.error('Failed to stop:', err);
    }
  }

  async function exportSession(sessionId: string, format: 'json' | 'csv') {
    try {
      const { url } = await roboticsApi.exportSession(sessionId, format);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to export:', err);
    }
  }

  const isRunning = simState?.status === 'running';
  const isPaused = simState?.status === 'paused';

  return (
    <div className="glass-card h-full">
      <h2 className="text-lg font-semibold text-cyan-400 mb-4">
        Motion Control
      </h2>

      {/* Scenario Selection */}
      <div className="mb-4">
        <p className="text-sm text-gray-400 mb-2">Scenario</p>
        <div className="grid grid-cols-4 gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedScenario(s.id)}
              disabled={isRunning || !canControl}
              className={`p-2 rounded-lg text-center transition-colors ${
                selectedScenario === s.id
                  ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400'
                  : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="text-xl">{s.icon}</span>
              <p className="text-xs mt-1">{s.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2 mb-4">
        {!isRunning && !isPaused ? (
          <button
            onClick={startSimulation}
            disabled={!canStartSim || loading}
            className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Starting...' : '▶ Start'}
          </button>
        ) : (
          <>
            {isRunning ? (
              <button
                onClick={pauseSimulation}
                disabled={!canControl}
                className="flex-1 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-medium hover:bg-yellow-500/30 disabled:opacity-50"
              >
                ⏸ Pause
              </button>
            ) : (
              <button
                onClick={resumeSimulation}
                disabled={!canControl}
                className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg font-medium hover:bg-green-500/30 disabled:opacity-50"
              >
                ▶ Resume
              </button>
            )}
            <button
              onClick={stopSimulation}
              disabled={!canControl}
              className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 disabled:opacity-50"
            >
              ⏹ Stop
            </button>
          </>
        )}
      </div>

      {/* Recording Toggle */}
      <div className="flex items-center justify-between mb-4 p-2 bg-gray-800/50 rounded-lg">
        <span className="text-sm text-gray-400">Record Session</span>
        <button
          onClick={() => setRecording(!recording)}
          disabled={!canControl}
          className={`w-12 h-6 rounded-full transition-colors ${
            recording ? 'bg-red-500' : 'bg-gray-700'
          } disabled:opacity-50`}
        >
          <span
            className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
              recording ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Simulation Status */}
      {simState && (
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Status</span>
            <span className={`text-sm font-medium ${
              simState.status === 'running' ? 'text-green-400' :
              simState.status === 'paused' ? 'text-yellow-400' : 'text-gray-400'
            }`}>
              {simState.status.toUpperCase()}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
              style={{ width: `${(simState.current_frame / simState.total_frames) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Frame {simState.current_frame} / {simState.total_frames}
          </p>
        </div>
      )}

      {/* Recent Sessions */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-sm text-gray-400 mb-2">Recent Sessions</h3>
        {sessions.length === 0 ? (
          <p className="text-xs text-gray-500">No sessions recorded</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg"
              >
                <div>
                  <p className="text-sm text-white">{session.scenario}</p>
                  <p className="text-xs text-gray-500">
                    {session.duration.toFixed(1)}s • {session.frames.length} frames
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => exportSession(session.id, 'json')}
                    className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => exportSession(session.id, 'csv')}
                    className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                  >
                    CSV
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
