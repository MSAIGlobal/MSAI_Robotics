// Digital Twin Dashboard - Comprehensive interface for the MOTHER + GR00T N1 convergence
// Combines inference, TMUX monitoring, 3D printing, electronics, MoTHER Coder, and convergence architecture
import { useState } from 'react';
import { InferencePanel } from '../components/digital-twin/InferencePanel';
import { TmuxTerminal } from '../components/digital-twin/TmuxTerminal';
import { PrintingWorkbench } from '../components/digital-twin/PrintingWorkbench';
import { CircuitDesigner } from '../components/digital-twin/CircuitDesigner';
import { MotherCoderPanel } from '../components/digital-twin/MotherCoderPanel';
import { ConvergenceHub } from '../components/digital-twin/ConvergenceHub';
import { VisionFlowPanel } from '../components/digital-twin/VisionFlowPanel';
import { CadViewer } from '../components/robotics/CadViewer';
import { ControlPanel } from '../components/robotics/ControlPanel';
import { TelemetryPanel } from '../components/robotics/TelemetryPanel';
import { ElectronicsPanel } from '../components/robotics/ElectronicsPanel';
import { RepoSyncStatus } from '../components/sync/RepoSyncStatus';
import { SimulationState, User } from '../lib/types';

type Section = 'twin' | 'visionflow' | 'inference' | 'tmux' | 'printing' | 'electronics' | 'coder' | 'convergence';

interface Props {
  user: User | null;
}

const SECTIONS: { id: Section; label: string; color: string }[] = [
  { id: 'twin', label: 'Digital Twin', color: 'cyan' },
  { id: 'visionflow', label: 'VisionFlow', color: 'indigo' },
  { id: 'inference', label: 'Inference', color: 'blue' },
  { id: 'tmux', label: 'TMUX Terminal', color: 'green' },
  { id: 'printing', label: '3D Printing', color: 'orange' },
  { id: 'electronics', label: 'Electronics', color: 'purple' },
  { id: 'coder', label: 'MoTHER Coder', color: 'emerald' },
  { id: 'convergence', label: 'Convergence', color: 'blue' },
];

function getSectionColor(color: string, active: boolean): string {
  if (!active) return 'text-gray-400 hover:text-white hover:bg-gray-800/50';
  switch (color) {
    case 'cyan': return 'bg-cyan-500/20 text-cyan-400';
    case 'blue': return 'bg-blue-500/20 text-blue-400';
    case 'green': return 'bg-green-500/20 text-green-400';
    case 'orange': return 'bg-orange-500/20 text-orange-400';
    case 'purple': return 'bg-purple-500/20 text-purple-400';
    case 'emerald': return 'bg-emerald-500/20 text-emerald-400';
    case 'indigo': return 'bg-indigo-500/20 text-indigo-400';
    default: return 'bg-cyan-500/20 text-cyan-400';
  }
}

export function DigitalTwinDashboard({ user }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('twin');
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const [splitView, setSplitView] = useState(false);
  const [secondarySection, setSecondarySection] = useState<Section>('tmux');

  return (
    <div className="min-h-screen bg-[#04060a] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">
            MOTHER <span className="text-cyan-400">Digital Twin</span>
          </h1>
          <span className="px-2 py-1 text-xs bg-gradient-to-r from-blue-500/20 to-green-500/20 text-cyan-400 rounded border border-cyan-500/20">
            Convergence Platform
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-gray-400">
              {user.name} ({user.role})
            </span>
          )}
          <button
            onClick={() => setSplitView(!splitView)}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              splitView ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {splitView ? 'Split View' : 'Single View'}
          </button>
          <RepoSyncStatus />
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {SECTIONS.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${
              getSectionColor(section.color, activeSection === section.id)
            }`}
          >
            {section.label}
          </button>
        ))}

        {/* Split view secondary selector */}
        {splitView && (
          <>
            <span className="text-gray-600 mx-2">|</span>
            {SECTIONS.filter(s => s.id !== activeSection).map(section => (
              <button
                key={`sec-${section.id}`}
                onClick={() => setSecondarySection(section.id)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${
                  secondarySection === section.id
                    ? 'bg-gray-700/50 text-gray-300 ring-1 ring-gray-600'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                {section.label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Content Area */}
      <div className={`${splitView ? 'grid grid-cols-2 gap-4' : ''} h-[calc(100vh-160px)]`}>
        {/* Primary Panel */}
        <div className={`${splitView ? '' : 'h-full'} overflow-hidden`}>
          {renderSection(activeSection, { user, simulationState, setSimulationState })}
        </div>

        {/* Secondary Panel (Split View) */}
        {splitView && (
          <div className="overflow-hidden">
            {renderSection(secondarySection, { user, simulationState, setSimulationState })}
          </div>
        )}
      </div>

      {/* Status Footer */}
      <div className="mt-4 p-3 bg-gray-800/50 rounded-lg flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>MOTHER Sovereign Platform</span>
          <span className="text-gray-700">|</span>
          <span>NVIDIA GR00T N1 Integration</span>
          <span className="text-gray-700">|</span>
          <span>UK Infrastructure</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>MOTHER Core</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>GR00T N1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              simulationState?.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-600'
            }`} />
            <span>
              {simulationState?.status === 'running' ? 'Sim Running' : 'Sim Idle'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Render section content
function renderSection(
  section: Section,
  ctx: {
    user: User | null;
    simulationState: SimulationState | null;
    setSimulationState: (s: SimulationState | null) => void;
  },
) {
  switch (section) {
    case 'twin':
      return (
        <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full">
          <div className="row-span-1 overflow-hidden">
            <CadViewer
              modelId="exo1"
              simulationState={ctx.simulationState || undefined}
              showConstraints={true}
            />
          </div>
          <div className="row-span-1 overflow-auto">
            <ElectronicsPanel modelId="exo1" user={ctx.user} />
          </div>
          <div className="row-span-1 overflow-auto">
            <ControlPanel
              user={ctx.user}
              onSimulationStateChange={ctx.setSimulationState}
            />
          </div>
          <div className="row-span-1 overflow-auto">
            <TelemetryPanel simulationState={ctx.simulationState} />
          </div>
        </div>
      );

    case 'visionflow':
      return <VisionFlowPanel />;

    case 'inference':
      return <InferencePanel />;

    case 'tmux':
      return <TmuxTerminal />;

    case 'printing':
      return <PrintingWorkbench />;

    case 'electronics':
      return <CircuitDesigner />;

    case 'coder':
      return <MotherCoderPanel />;

    case 'convergence':
      return <ConvergenceHub />;

    default:
      return null;
  }
}
