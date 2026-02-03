// Experiment Launch Form - Operator only
import React, { useState } from 'react';
import { experimentsApi } from '../../lib/backend';
import { ExperimentConfig, User } from '../../lib/types';
import { hasPermission } from '../../lib/auth';

interface Props {
  user: User | null;
  onLaunched?: () => void;
}

const MODELS = [
  { id: 'mother-core-v1', name: 'MOTHER CORE v1' },
  { id: 'mother-vision-v1', name: 'MOTHER Vision v1' },
  { id: 'exo1-control-v1', name: 'EXO-1 Control v1' },
  { id: 'groot-n1.6', name: 'GR00T N1.6' },
];

const DATASETS = [
  { id: 'ds-humanoid-motion-001', name: 'Humanoid Motion Dataset' },
  { id: 'ds-manipulation-001', name: 'Manipulation Dataset' },
  { id: 'ds-navigation-001', name: 'Navigation Dataset' },
];

export function ExperimentLaunchForm({ user, onLaunched }: Props) {
  const [model, setModel] = useState('');
  const [dataset, setDataset] = useState('');
  const [epochs, setEpochs] = useState(100);
  const [earlyStopping, setEarlyStopping] = useState(true);
  const [gpuLimit, setGpuLimit] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLaunch = hasPermission('experiments.launch', user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canLaunch) return;

    setLoading(true);
    setError(null);

    try {
      const config: ExperimentConfig = {
        model,
        dataset_ref: dataset,
        hyperparameters: {},
        constraints: {
          max_epochs: epochs,
          early_stopping: earlyStopping,
          gpu_limit: gpuLimit,
        },
      };

      await experimentsApi.launch(config);
      onLaunched?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Launch failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <h2 className="text-xl font-semibold mb-4 text-cyan-400">
        Launch Experiment
      </h2>

      {!canLaunch && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
          <p className="text-yellow-400 text-sm">
            Operator role required to launch experiments
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Model Selection */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!canLaunch || loading}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Select a model...</option>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Dataset Selection */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Dataset</label>
          <select
            value={dataset}
            onChange={(e) => setDataset(e.target.value)}
            disabled={!canLaunch || loading}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Select a dataset...</option>
            {DATASETS.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Training Config */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Epochs</label>
            <input
              type="number"
              value={epochs}
              onChange={(e) => setEpochs(parseInt(e.target.value))}
              disabled={!canLaunch || loading}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">GPU Limit</label>
            <input
              type="number"
              value={gpuLimit}
              onChange={(e) => setGpuLimit(parseInt(e.target.value))}
              min={1}
              max={8}
              disabled={!canLaunch || loading}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Early Stopping */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="earlyStopping"
            checked={earlyStopping}
            onChange={(e) => setEarlyStopping(e.target.checked)}
            disabled={!canLaunch || loading}
            className="rounded bg-gray-800 border-gray-700"
          />
          <label htmlFor="earlyStopping" className="text-sm text-gray-400">
            Enable early stopping
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canLaunch || !model || !dataset || loading}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium py-2 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? 'Launching...' : 'Launch Experiment'}
        </button>
      </form>
    </div>
  );
}
