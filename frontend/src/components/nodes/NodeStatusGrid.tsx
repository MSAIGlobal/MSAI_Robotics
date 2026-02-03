// Multi-Node Status Grid
import React, { useEffect, useState } from 'react';
import { nodesApi, createTelemetryStream } from '../../lib/backend';
import { NodeStatus } from '../../lib/types';

interface Props {
  onSelectNode?: (node: NodeStatus) => void;
}

export function NodeStatusGrid({ onSelectNode }: Props) {
  const [nodes, setNodes] = useState<NodeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveUpdates, setLiveUpdates] = useState<Record<string, NodeStatus>>({});

  useEffect(() => {
    loadNodes();
  }, []);

  async function loadNodes() {
    try {
      const data = await nodesApi.list();
      setNodes(data);

      // Start WebSocket streams for each node
      data.forEach((node) => {
        try {
          createTelemetryStream(
            node.node_id,
            (status) => setLiveUpdates((prev) => ({ ...prev, [node.node_id]: status })),
            (err) => console.error(`Stream error for ${node.node_id}:`, err)
          );
        } catch {
          // WebSocket might not be available
        }
      });
    } catch (err) {
      console.error('Failed to load nodes:', err);
    } finally {
      setLoading(false);
    }
  }

  const getNodeData = (node: NodeStatus) => {
    return liveUpdates[node.node_id] || node;
  };

  const getHealthColor = (health: NodeStatus['health']) => {
    switch (health) {
      case 'ok': return { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' };
      case 'warning': return { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500' };
      case 'critical': return { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' };
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card animate-pulse h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-cyan-400">Node Cluster</h2>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live Updates
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {nodes.map((node) => {
          const data = getNodeData(node);
          const colors = getHealthColor(data.health);
          const avgGpuUtil = data.gpu_util.reduce((a, b) => a + b, 0) / data.gpu_util.length;

          return (
            <div
              key={node.node_id}
              className={`glass-card border ${colors.border} cursor-pointer hover:scale-105 transition-transform`}
              onClick={() => onSelectNode?.(data)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-white truncate">{data.hostname}</h3>
                <span className={`w-3 h-3 rounded-full ${colors.bg} ${
                  data.health === 'ok' ? '' : 'animate-pulse'
                }`} />
              </div>

              {/* GPU Utilization Bars */}
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">GPU Utilization</p>
                <div className="grid grid-cols-4 gap-1">
                  {data.gpu_util.map((util, i) => (
                    <div key={i} className="h-8 bg-gray-800 rounded overflow-hidden relative">
                      <div
                        className="absolute bottom-0 w-full bg-gradient-to-t from-cyan-500 to-blue-500 transition-all duration-300"
                        style={{ height: `${util}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                        {Math.round(util)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Memory</p>
                  <p className="text-white">
                    {Math.round(data.memory_used / 1024)}
                    <span className="text-gray-500">/{Math.round(data.memory_total / 1024)}GB</span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Disk Free</p>
                  <p className="text-white">{Math.round(data.disk_free / 1024)}GB</p>
                </div>
              </div>

              {/* Average GPU */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Avg GPU</span>
                  <span className={`text-lg font-bold ${
                    avgGpuUtil > 90 ? 'text-red-400' :
                    avgGpuUtil > 70 ? 'text-yellow-400' : 'text-cyan-400'
                  }`}>
                    {avgGpuUtil.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Bar */}
      <div className="glass-card">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-cyan-400">{nodes.length}</p>
            <p className="text-xs text-gray-400">Nodes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-cyan-400">
              {nodes.reduce((acc, n) => acc + n.gpus, 0)}
            </p>
            <p className="text-xs text-gray-400">Total GPUs</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-cyan-400">
              {Math.round(nodes.reduce((acc, n) => acc + n.memory_total, 0) / 1024)}GB
            </p>
            <p className="text-xs text-gray-400">Total RAM</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">
              {nodes.filter((n) => getNodeData(n).health === 'ok').length}
            </p>
            <p className="text-xs text-gray-400">Healthy</p>
          </div>
        </div>
      </div>
    </div>
  );
}
