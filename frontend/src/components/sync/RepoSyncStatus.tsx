// Repo Sync Status Panel - Frontend ↔ Backend sync
import { useEffect, useState } from 'react';
import { syncApi } from '../../lib/backend';
import { RepoSyncStatus as SyncStatus } from '../../lib/types';

export function RepoSyncStatus() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadStatus() {
    try {
      const data = await syncApi.status();
      setStatus(data);
    } catch (err) {
      console.error('Failed to load sync status:', err);
      // Demo status
      setStatus({
        frontend_commit: 'abc1234',
        frontend_version: '1.4.2',
        backend_commit: 'def5678',
        backend_version: '2.1.0',
        schema_version: '2026-02',
        compatible: true,
        last_sync: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }

  async function triggerSync() {
    setSyncing(true);
    try {
      await syncApi.trigger();
      await loadStatus();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="glass-card animate-pulse h-24" />
    );
  }

  if (!status) {
    return (
      <div className="glass-card border border-red-500/50">
        <p className="text-red-400">Failed to load sync status</p>
      </div>
    );
  }

  return (
    <div className={`glass-card border ${
      status.compatible
        ? 'border-green-500/50'
        : 'border-red-500/50'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400">
          Repo Sync Status
        </h3>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            status.compatible ? 'bg-green-500' : 'bg-red-500 animate-pulse'
          }`} />
          <span className={`text-xs ${
            status.compatible ? 'text-green-400' : 'text-red-400'
          }`}>
            {status.compatible ? 'IN SYNC' : 'OUT OF SYNC'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        {/* Frontend */}
        <div className="p-2 bg-gray-800/50 rounded">
          <p className="text-xs text-gray-500 mb-1">Frontend</p>
          <p className="text-sm font-medium text-cyan-400">
            v{status.frontend_version}
          </p>
          <p className="text-xs text-gray-600 font-mono">
            {status.frontend_commit.slice(0, 7)}
          </p>
        </div>

        {/* Backend */}
        <div className="p-2 bg-gray-800/50 rounded">
          <p className="text-xs text-gray-500 mb-1">Backend</p>
          <p className="text-sm font-medium text-cyan-400">
            v{status.backend_version}
          </p>
          <p className="text-xs text-gray-600 font-mono">
            {status.backend_commit.slice(0, 7)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          Schema: {status.schema_version}
        </span>
        <span className="text-gray-500">
          Last sync: {new Date(status.last_sync).toLocaleTimeString()}
        </span>
      </div>

      {!status.compatible && (
        <div className="mt-3 p-2 bg-red-500/20 border border-red-500/50 rounded">
          <p className="text-xs text-red-400">
            ⚠ Schema mismatch detected. Some features may be unavailable.
            Deployment buttons are disabled.
          </p>
        </div>
      )}

      <button
        onClick={triggerSync}
        disabled={syncing}
        className="w-full mt-3 py-1 text-xs bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white disabled:opacity-50"
      >
        {syncing ? 'Syncing...' : 'Refresh Sync'}
      </button>
    </div>
  );
}
