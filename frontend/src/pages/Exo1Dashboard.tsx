// MOTHER EXO-1 Robotics Dashboard - Complete multi-panel layout
import { useState } from 'react';
import { CadViewer } from '../components/robotics/CadViewer';
import { ElectronicsPanel } from '../components/robotics/ElectronicsPanel';
import { ControlPanel } from '../components/robotics/ControlPanel';
import { TelemetryPanel } from '../components/robotics/TelemetryPanel';
import { MotherVoicePanel } from '../components/voice/MotherVoicePanel';
import { NodeCommandPanel } from '../components/commands/NodeCommandPanel';
import { RepoSyncStatus } from '../components/sync/RepoSyncStatus';
import { SimulationState, User } from '../lib/types';

interface Props {
  user: User | null;
}

export function Exo1Dashboard({ user }: Props) {
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const [activePanel, setActivePanel] = useState<'cad' | 'voice' | 'commands'>('cad');

  return (
    <div className="min-h-screen bg-[#04060a] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">
            MOTHER <span className="text-cyan-400">EXO-1</span>
          </h1>
          <span className="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded">
            Digital Humanoid
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-gray-400">
              {user.name} ({user.role})
            </span>
          )}
          <RepoSyncStatus />
        </div>
      </div>

      {/* Main Grid - 2x2 Layout */}
      <div className="grid grid-cols-2 grid-rows-2 gap-4 h-[calc(100vh-120px)]">
        {/* Top Left - CAD / Voice / Commands */}
        <div className="row-span-1">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setActivePanel('cad')}
              className={`px-3 py-1 text-sm rounded ${
                activePanel === 'cad'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              CAD
            </button>
            <button
              onClick={() => setActivePanel('voice')}
              className={`px-3 py-1 text-sm rounded ${
                activePanel === 'voice'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Voice
            </button>
            <button
              onClick={() => setActivePanel('commands')}
              className={`px-3 py-1 text-sm rounded ${
                activePanel === 'commands'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Commands
            </button>
          </div>

          {activePanel === 'cad' && (
            <CadViewer
              modelId="exo1"
              simulationState={simulationState || undefined}
              showConstraints={true}
            />
          )}
          {activePanel === 'voice' && (
            <MotherVoicePanel user={user} />
          )}
          {activePanel === 'commands' && (
            <NodeCommandPanel user={user} />
          )}
        </div>

        {/* Top Right - Electronics */}
        <div className="row-span-1 overflow-auto">
          <ElectronicsPanel modelId="exo1" user={user} />
        </div>

        {/* Bottom Left - Control */}
        <div className="row-span-1 overflow-auto">
          <ControlPanel
            user={user}
            onSimulationStateChange={setSimulationState}
          />
        </div>

        {/* Bottom Right - Telemetry */}
        <div className="row-span-1 overflow-auto">
          <TelemetryPanel simulationState={simulationState} />
        </div>
      </div>

      {/* Safety Footer */}
      <div className="mt-4 p-3 bg-gray-800/50 rounded-lg flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>✓ Frontend-only control plane</span>
          <span>✓ No physical robot control</span>
          <span>✓ All actions logged</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            simulationState?.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-600'
          }`} />
          <span>
            {simulationState?.status === 'running' ? 'Simulation Running' : 'Simulation Idle'}
          </span>
        </div>
      </div>
    </div>
  );
}
