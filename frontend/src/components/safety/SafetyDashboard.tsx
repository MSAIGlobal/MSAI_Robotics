// Safety & Kill-Switch Dashboard
import { useState, useEffect } from 'react';
import { safetyApi, nodesApi, experimentsApi } from '../../lib/backend';
import { User, NodeStatus, Experiment } from '../../lib/types';
import { hasPermission } from '../../lib/auth';

interface Props {
  user: User | null;
}

export function SafetyDashboard({ user }: Props) {
  const [nodes, setNodes] = useState<NodeStatus[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [safetyStatus, setSafetyStatus] = useState<{ paused: string[]; killed: string[] }>({
    paused: [],
    killed: [],
  });
  const [killConfirm, setKillConfirm] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const canPause = hasPermission('safety.pause', user);
  const canKill = hasPermission('safety.kill', user);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [nodesData, expData, statusData] = await Promise.all([
        nodesApi.list(),
        experimentsApi.list(),
        safetyApi.status(),
      ]);
      setNodes(nodesData);
      setExperiments(expData.filter((e) => e.status === 'running'));
      setSafetyStatus(statusData);
    } catch (err) {
      console.error('Failed to load safety data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePause(target: string) {
    if (!canPause) return;
    try {
      await safetyApi.pause(target);
      loadData();
    } catch (err) {
      console.error('Pause failed:', err);
    }
  }

  async function handleResume(target: string) {
    if (!canPause) return;
    try {
      await safetyApi.resume(target);
      loadData();
    } catch (err) {
      console.error('Resume failed:', err);
    }
  }

  async function handleKill() {
    if (!canKill || killConfirm !== 'KILL' || !selectedTarget) return;
    try {
      await safetyApi.kill(selectedTarget, killConfirm);
      setKillConfirm('');
      setSelectedTarget(null);
      loadData();
    } catch (err) {
      console.error('Kill failed:', err);
    }
  }

  if (loading) {
    return <div className="glass-card animate-pulse h-64" />;
  }

  return (
    <div className="space-y-6">
      {/* Safety Status Banner */}
      <div className={`glass-card border-2 ${
        safetyStatus.killed.length > 0
          ? 'border-red-500 bg-red-500/10'
          : safetyStatus.paused.length > 0
          ? 'border-yellow-500 bg-yellow-500/10'
          : 'border-green-500 bg-green-500/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${
              safetyStatus.killed.length > 0
                ? 'bg-red-500'
                : safetyStatus.paused.length > 0
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-green-500'
            }`} />
            <div>
              <h2 className="text-xl font-semibold">
                {safetyStatus.killed.length > 0
                  ? 'EMERGENCY STOP ACTIVE'
                  : safetyStatus.paused.length > 0
                  ? 'Systems Paused'
                  : 'All Systems Operational'}
              </h2>
              <p className="text-sm text-gray-400">
                {safetyStatus.paused.length} paused | {safetyStatus.killed.length} killed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Experiments */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-cyan-400 mb-4">
          Running Experiments
        </h3>
        {experiments.length === 0 ? (
          <p className="text-gray-500">No active experiments</p>
        ) : (
          <div className="space-y-3">
            {experiments.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3"
              >
                <div>
                  <p className="font-medium">{exp.name}</p>
                  <p className="text-sm text-gray-400">{exp.config.model}</p>
                </div>
                {canPause && (
                  <button
                    onClick={() => handlePause(exp.id)}
                    className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
                  >
                    Pause
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Node Controls */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-cyan-400 mb-4">
          Node Safety Controls
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {nodes.map((node) => (
            <div
              key={node.node_id}
              className={`rounded-lg p-4 border ${
                safetyStatus.killed.includes(node.node_id)
                  ? 'bg-red-500/10 border-red-500'
                  : safetyStatus.paused.includes(node.node_id)
                  ? 'bg-yellow-500/10 border-yellow-500'
                  : 'bg-gray-800/50 border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{node.hostname}</h4>
                <span className={`text-xs px-2 py-1 rounded ${
                  node.health === 'ok'
                    ? 'bg-green-500/20 text-green-400'
                    : node.health === 'warning'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {node.health.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-3">
                {node.gpus} GPUs | {Math.round(node.memory_used / 1024)}GB RAM
              </p>
              <div className="flex gap-2">
                {canPause && (
                  <>
                    {safetyStatus.paused.includes(node.node_id) ? (
                      <button
                        onClick={() => handleResume(node.node_id)}
                        className="flex-1 px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                      >
                        Resume
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePause(node.node_id)}
                        className="flex-1 px-3 py-1 text-sm bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30"
                      >
                        Pause
                      </button>
                    )}
                  </>
                )}
                {canKill && (
                  <button
                    onClick={() => setSelectedTarget(node.node_id)}
                    className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                  >
                    Kill
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kill Switch Modal */}
      {selectedTarget && canKill && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="glass-card max-w-md w-full mx-4 border-2 border-red-500">
            <h3 className="text-xl font-bold text-red-400 mb-4">
              ⚠️ EMERGENCY KILL SWITCH
            </h3>
            <p className="text-gray-300 mb-4">
              This will immediately terminate all processes on <strong>{selectedTarget}</strong>.
              This action is logged and cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Type KILL to confirm:
              </label>
              <input
                type="text"
                value={killConfirm}
                onChange={(e) => setKillConfirm(e.target.value.toUpperCase())}
                className="w-full bg-gray-800 border border-red-500 rounded-lg px-3 py-2 text-red-400 font-mono focus:outline-none"
                placeholder="KILL"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setSelectedTarget(null); setKillConfirm(''); }}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleKill}
                disabled={killConfirm !== 'KILL'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                KILL NOW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
