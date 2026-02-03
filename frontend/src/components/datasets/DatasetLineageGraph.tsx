// Dataset Lineage & Provenance Graph
import React, { useEffect, useRef, useState } from 'react';
import { datasetsApi } from '../../lib/backend';
import { DatasetNode, DatasetScore } from '../../lib/types';

interface Props {
  onSelectDataset?: (dataset: DatasetNode) => void;
}

export function DatasetLineageGraph({ onSelectDataset }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [datasets, setDatasets] = useState<DatasetNode[]>([]);
  const [edges, setEdges] = useState<{ from: string; to: string }[]>([]);
  const [selected, setSelected] = useState<DatasetNode | null>(null);
  const [score, setScore] = useState<DatasetScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGraph();
  }, []);

  async function loadGraph() {
    try {
      const data = await datasetsApi.graph();
      setDatasets(data.nodes);
      setEdges(data.edges);
    } catch (err) {
      console.error('Failed to load dataset graph:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectDataset(dataset: DatasetNode) {
    setSelected(dataset);
    onSelectDataset?.(dataset);
    try {
      const scoreData = await datasetsApi.score(dataset.id);
      setScore(scoreData);
    } catch (err) {
      console.error('Failed to load score:', err);
    }
  }

  // Simple force-directed layout calculation
  const nodePositions = React.useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const cols = Math.ceil(Math.sqrt(datasets.length));

    datasets.forEach((ds, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      positions[ds.id] = {
        x: 100 + col * 180,
        y: 80 + row * 120,
      };
    });

    return positions;
  }, [datasets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || datasets.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw edges
    ctx.strokeStyle = 'rgba(101, 226, 255, 0.3)';
    ctx.lineWidth = 2;
    edges.forEach(({ from, to }) => {
      const fromPos = nodePositions[from];
      const toPos = nodePositions[to];
      if (fromPos && toPos) {
        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(toPos.x, toPos.y);
        ctx.stroke();

        // Arrow
        const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
        const arrowLen = 10;
        ctx.beginPath();
        ctx.moveTo(toPos.x - 30 * Math.cos(angle), toPos.y - 30 * Math.sin(angle));
        ctx.lineTo(
          toPos.x - 30 * Math.cos(angle) - arrowLen * Math.cos(angle - 0.5),
          toPos.y - 30 * Math.sin(angle) - arrowLen * Math.sin(angle - 0.5)
        );
        ctx.moveTo(toPos.x - 30 * Math.cos(angle), toPos.y - 30 * Math.sin(angle));
        ctx.lineTo(
          toPos.x - 30 * Math.cos(angle) - arrowLen * Math.cos(angle + 0.5),
          toPos.y - 30 * Math.sin(angle) - arrowLen * Math.sin(angle + 0.5)
        );
        ctx.stroke();
      }
    });

    // Draw nodes
    datasets.forEach((ds) => {
      const pos = nodePositions[ds.id];
      if (!pos) return;

      const isSelected = selected?.id === ds.id;

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#65e2ff' : '#1e293b';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#65e2ff' : '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = isSelected ? '#0a0d12' : '#9ca3af';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ds.name.slice(0, 12), pos.x, pos.y + 4);
    });
  }, [datasets, edges, nodePositions, selected]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked node
    for (const ds of datasets) {
      const pos = nodePositions[ds.id];
      if (!pos) continue;
      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (dist < 25) {
        handleSelectDataset(ds);
        return;
      }
    }
  };

  if (loading) {
    return <div className="glass-card animate-pulse h-96" />;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Graph Canvas */}
      <div className="col-span-2 glass-card">
        <h3 className="text-lg font-semibold text-cyan-400 mb-4">
          Dataset Lineage Graph
        </h3>
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          onClick={handleCanvasClick}
          className="w-full rounded-lg cursor-pointer"
          style={{ background: '#0a0d12' }}
        />
        <p className="text-xs text-gray-500 mt-2">
          Click on a node to view details and quality score
        </p>
      </div>

      {/* Dataset Details */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-cyan-400 mb-4">
          Dataset Details
        </h3>
        {selected ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Name</p>
              <p className="font-medium">{selected.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Source</p>
              <p className="text-sm">{selected.source}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Format</p>
              <p className="text-sm">{selected.format}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Size</p>
              <p className="text-sm">
                {(selected.size_bytes / 1024 / 1024 / 1024).toFixed(2)} GB
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Used In</p>
              <p className="text-sm">{selected.used_in.length} experiments</p>
            </div>

            {/* Quality Score */}
            {score && (
              <div className="pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-400">Quality Score</p>
                  <span className={`text-2xl font-bold ${
                    score.score >= 80 ? 'text-green-400' :
                    score.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {score.score}
                  </span>
                </div>
                <div className="space-y-2">
                  {Object.entries(score.breakdown).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-24 capitalize">{key}</span>
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            value >= 80 ? 'bg-green-500' :
                            value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            Select a dataset to view details
          </p>
        )}
      </div>
    </div>
  );
}
