// Node Command Panel - Whitelisted command execution
import React, { useState, useEffect } from 'react';
import { commandsApi } from '../../lib/backend';
import { NodeCommand, CommandExecution, User } from '../../lib/types';
import { hasPermission } from '../../lib/auth';

interface Props {
  user: User | null;
  nodeId?: string;
}

export function NodeCommandPanel({ user, nodeId }: Props) {
  const [commands, setCommands] = useState<NodeCommand[]>([]);
  const [executions, setExecutions] = useState<CommandExecution[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<NodeCommand | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  const canExecute = hasPermission('nodes.command', user);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [cmds, execs] = await Promise.all([
        commandsApi.list(),
        commandsApi.listExecutions(),
      ]);
      setCommands(cmds);
      setExecutions(execs.slice(0, 10));
    } catch (err) {
      console.error('Failed to load commands:', err);
      // Demo commands
      setCommands([
        { id: 'deploy-core', description: 'Deploy MOTHER CORE', command: 'systemctl restart mother-core', allowed_roles: ['operator', 'admin'], requires_confirmation: true },
        { id: 'run-sim-test', description: 'Run simulation test', command: 'python run_sim_test.py', allowed_roles: ['operator', 'admin'], requires_confirmation: false },
        { id: 'check-status', description: 'Check system status', command: 'systemctl status mother-*', allowed_roles: ['operator', 'admin'], requires_confirmation: false },
        { id: 'view-logs', description: 'View recent logs', command: 'journalctl -u mother-core -n 50', allowed_roles: ['operator', 'admin'], requires_confirmation: false },
        { id: 'restart-gpu', description: 'Restart GPU services', command: 'systemctl restart nvidia-persistenced', allowed_roles: ['admin'], requires_confirmation: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function executeCommand(cmd: NodeCommand) {
    if (!canExecute) return;

    if (cmd.requires_confirmation) {
      setSelectedCommand(cmd);
      return;
    }

    await runCommand(cmd.id);
  }

  async function runCommand(commandId: string) {
    setExecuting(true);
    setOutput(null);

    try {
      const execution = await commandsApi.execute(commandId, nodeId);

      // Poll for completion
      let result = execution;
      while (result.status === 'running') {
        await new Promise((r) => setTimeout(r, 1000));
        result = await commandsApi.getExecution(result.id);
      }

      setOutput(result.stdout || result.stderr);
      loadData(); // Refresh executions
    } catch (err) {
      setOutput(`Error: ${err instanceof Error ? err.message : 'Command failed'}`);
    } finally {
      setExecuting(false);
      setSelectedCommand(null);
      setConfirmText('');
    }
  }

  function handleConfirmExecute() {
    if (!selectedCommand || confirmText !== 'EXECUTE') return;
    runCommand(selectedCommand.id);
  }

  if (loading) {
    return <div className="glass-card animate-pulse h-64" />;
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-cyan-400">
          Node Commands
        </h2>
        {nodeId && (
          <span className="text-xs text-gray-500">
            Target: {nodeId}
          </span>
        )}
      </div>

      {!canExecute && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
          <p className="text-yellow-400 text-sm">
            Operator role required to execute commands
          </p>
        </div>
      )}

      {/* Command List */}
      <div className="space-y-2 mb-4">
        {commands.map((cmd) => (
          <div
            key={cmd.id}
            className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-white">{cmd.description}</p>
              <p className="text-xs text-gray-500 font-mono">{cmd.command}</p>
            </div>
            <div className="flex items-center gap-2">
              {cmd.requires_confirmation && (
                <span className="text-xs text-yellow-400">⚠</span>
              )}
              <button
                onClick={() => executeCommand(cmd)}
                disabled={!canExecute || executing || !cmd.allowed_roles.includes(user?.role || 'observer')}
                className="px-3 py-1 text-sm bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {executing ? '...' : 'Run'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Output */}
      {output && (
        <div className="mb-4">
          <h3 className="text-sm text-gray-400 mb-2">Output</h3>
          <pre className="p-3 bg-black rounded-lg text-xs text-green-400 font-mono overflow-x-auto max-h-40">
            {output}
          </pre>
        </div>
      )}

      {/* Recent Executions */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-sm text-gray-400 mb-2">Recent Executions</h3>
        {executions.length === 0 ? (
          <p className="text-xs text-gray-500">No recent executions</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {executions.map((exec) => (
              <div
                key={exec.id}
                className="flex items-center justify-between p-2 bg-gray-800/30 rounded text-sm"
              >
                <span className="text-gray-300">{exec.command_id}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  exec.status === 'success' ? 'bg-green-500/20 text-green-400' :
                  exec.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {exec.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedCommand && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="glass-card max-w-md w-full mx-4 border border-yellow-500">
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">
              ⚠ Confirm Execution
            </h3>
            <p className="text-gray-300 mb-2">
              You are about to execute:
            </p>
            <pre className="p-2 bg-black rounded text-sm text-cyan-400 font-mono mb-4">
              {selectedCommand.command}
            </pre>
            <p className="text-sm text-gray-400 mb-4">
              This action will be logged. Type <strong>EXECUTE</strong> to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono mb-4 focus:border-yellow-500 focus:outline-none"
              placeholder="EXECUTE"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setSelectedCommand(null); setConfirmText(''); }}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExecute}
                disabled={confirmText !== 'EXECUTE' || executing}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {executing ? 'Executing...' : 'Execute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Notice */}
      <div className="mt-4 p-2 bg-gray-800/50 rounded-lg">
        <p className="text-xs text-gray-500">
          ✓ Whitelisted commands only • ✓ All executions logged • ✗ No raw shell access
        </p>
      </div>
    </div>
  );
}
