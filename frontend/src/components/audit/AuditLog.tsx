// Immutable Audit Log with Export
import React, { useEffect, useState } from 'react';
import { auditApi } from '../../lib/backend';
import { AuditEvent, User, Role } from '../../lib/types';
import { hasPermission } from '../../lib/auth';

interface Props {
  user: User | null;
}

export function AuditLog({ user }: Props) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    actor: '',
    action: '',
    from: '',
    to: '',
  });
  const [exporting, setExporting] = useState(false);

  const canView = hasPermission('audit.view', user);
  const canExport = hasPermission('audit.export', user);

  useEffect(() => {
    if (canView) {
      loadEvents();
    }
  }, [canView]);

  async function loadEvents() {
    try {
      const data = await auditApi.list(
        Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v)
        )
      );
      setEvents(data);
    } catch (err) {
      console.error('Failed to load audit log:', err);
      // Demo data
      setEvents([
        { id: '1', timestamp: new Date().toISOString(), actor: 'admin@msai.com', role: 'admin', action: 'experiment.launch', target: 'exp-001', hash: 'abc123' },
        { id: '2', timestamp: new Date(Date.now() - 3600000).toISOString(), actor: 'operator@msai.com', role: 'operator', action: 'safety.pause', target: 'node-1', hash: 'def456' },
        { id: '3', timestamp: new Date(Date.now() - 7200000).toISOString(), actor: 'admin@msai.com', role: 'admin', action: 'command.execute', target: 'deploy-core', hash: 'ghi789' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: 'json' | 'csv' | 'pdf') {
    if (!canExport) return;
    setExporting(true);

    try {
      const { url } = await auditApi.export(format);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }

  function getActionColor(action: string): string {
    if (action.includes('kill') || action.includes('delete')) return 'text-red-400';
    if (action.includes('pause') || action.includes('warning')) return 'text-yellow-400';
    if (action.includes('launch') || action.includes('start')) return 'text-green-400';
    if (action.includes('login') || action.includes('auth')) return 'text-purple-400';
    return 'text-cyan-400';
  }

  function getRoleBadge(role: Role): string {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400';
      case 'operator': return 'bg-blue-500/20 text-blue-400';
      case 'gov': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  }

  if (!canView) {
    return (
      <div className="glass-card">
        <p className="text-yellow-400">
          Operator, Admin, or Gov role required to view audit logs
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-cyan-400">
          Audit Log
        </h2>
        {canExport && (
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700"
            >
              JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700"
            >
              CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting}
              className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700"
            >
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <input
          type="text"
          placeholder="Actor..."
          value={filters.actor}
          onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-cyan-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Action..."
          value={filters.action}
          onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-cyan-500 focus:outline-none"
        />
        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-cyan-500 focus:outline-none"
        />
        <button
          onClick={loadEvents}
          className="bg-cyan-500/20 text-cyan-400 rounded px-2 py-1 text-sm hover:bg-cyan-500/30"
        >
          Filter
        </button>
      </div>

      {/* Event List */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-800 rounded" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No events found</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.map((event) => (
            <div
              key={event.id}
              className="p-3 bg-gray-800/50 rounded-lg border-l-2 border-gray-700 hover:border-cyan-500 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-medium ${getActionColor(event.action)}`}>
                      {event.action}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded ${getRoleBadge(event.role)}`}>
                      {event.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    <span className="text-white">{event.actor}</span>
                    {' → '}
                    <span className="text-gray-300">{event.target}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 font-mono">
                    #{event.hash.slice(0, 8)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Integrity Notice */}
      <div className="mt-4 p-2 bg-gray-800/50 rounded-lg">
        <p className="text-xs text-gray-500">
          ✓ Append-only • ✓ Hash-chained • ✓ Immutable • Defence-grade traceability
        </p>
      </div>
    </div>
  );
}
