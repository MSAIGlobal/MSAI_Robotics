// Experiment List - View all experiments
import React, { useEffect, useState } from 'react';
import { experimentsApi } from '../../lib/backend';
import { Experiment, User } from '../../lib/types';
import { hasPermission } from '../../lib/auth';

interface Props {
  user: User | null;
  onSelect?: (experiment: Experiment) => void;
}

export function ExperimentList({ user, onSelect }: Props) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canPause = hasPermission('experiments.pause', user);

  useEffect(() => {
    loadExperiments();
  }, []);

  async function loadExperiments() {
    try {
      const data = await experimentsApi.list();
      setExperiments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experiments');
    } finally {
      setLoading(false);
    }
  }

  async function handlePause(id: string) {
    if (!canPause) return;
    try {
      await experimentsApi.pause(id);
      loadExperiments();
    } catch (err) {
      console.error('Pause failed:', err);
    }
  }

  async function handleResume(id: string) {
    if (!canPause) return;
    try {
      await experimentsApi.resume(id);
      loadExperiments();
    } catch (err) {
      console.error('Resume failed:', err);
    }
  }

  const getStatusColor = (status: Experiment['status']) => {
    switch (status) {
      case 'running': return 'text-green-400';
      case 'completed': return 'text-cyan-400';
      case 'failed': return 'text-red-400';
      case 'paused': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusDot = (status: Experiment['status']) => {
    switch (status) {
      case 'running': return 'bg-green-400 animate-pulse';
      case 'completed': return 'bg-cyan-400';
      case 'failed': return 'bg-red-400';
      case 'paused': return 'bg-yellow-400';
      default: return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="glass-card">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <h2 className="text-xl font-semibold mb-4 text-cyan-400">Experiments</h2>

      <div className="space-y-3">
        {experiments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No experiments found</p>
        ) : (
          experiments.map((exp) => (
            <div
              key={exp.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-cyan-500/50 transition-colors cursor-pointer"
              onClick={() => onSelect?.(exp)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusDot(exp.status)}`} />
                    <h3 className="font-medium text-white">{exp.name}</h3>
                    <span className={`text-xs uppercase ${getStatusColor(exp.status)}`}>
                      {exp.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Model: {exp.config.model} | Dataset: {exp.config.dataset_ref}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Started: {exp.started_at ? new Date(exp.started_at).toLocaleString() : 'Not started'}
                  </p>
                </div>

                {canPause && (exp.status === 'running' || exp.status === 'paused') && (
                  <div className="flex gap-2">
                    {exp.status === 'running' ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePause(exp.id); }}
                        className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors"
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResume(exp.id); }}
                        className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                      >
                        Resume
                      </button>
                    )}
                  </div>
                )}
              </div>

              {exp.metrics && (
                <div className="flex gap-4 mt-3 pt-3 border-t border-gray-700">
                  {Object.entries(exp.metrics).slice(0, 4).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <p className="text-lg font-semibold text-cyan-400">
                        {typeof value === 'number' ? value.toFixed(2) : value}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{key}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
