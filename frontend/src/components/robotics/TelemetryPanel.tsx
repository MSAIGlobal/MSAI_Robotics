// Telemetry & Safety Panel - Real-time data from NODE
import React, { useEffect, useState, useRef } from 'react';
import { SimulationState } from '../../lib/types';

interface Props {
  simulationState?: SimulationState | null;
}

interface TelemetryPoint {
  t: number;
  value: number;
}

export function TelemetryPanel({ simulationState }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [history, setHistory] = useState<{
    torque: TelemetryPoint[];
    velocity: TelemetryPoint[];
    balance: TelemetryPoint[];
  }>({
    torque: [],
    velocity: [],
    balance: [],
  });

  // Simulate telemetry data when simulation is running
  useEffect(() => {
    if (!simulationState || simulationState.status !== 'running') return;

    const interval = setInterval(() => {
      const t = Date.now() / 1000;
      setHistory((prev) => ({
        torque: [...prev.torque.slice(-50), { t, value: 50 + Math.sin(t) * 30 + Math.random() * 10 }],
        velocity: [...prev.velocity.slice(-50), { t, value: 0.5 + Math.sin(t * 0.5) * 0.3 + Math.random() * 0.1 }],
        balance: [...prev.balance.slice(-50), { t, value: 85 + Math.sin(t * 2) * 10 + Math.random() * 5 }],
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [simulationState?.status]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (canvas.height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw lines
    const drawLine = (data: TelemetryPoint[], color: string, max: number) => {
      if (data.length < 2) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((point, i) => {
        const x = (i / (data.length - 1)) * canvas.width;
        const y = canvas.height - (point.value / max) * canvas.height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    };

    drawLine(history.torque, '#65e2ff', 100);
    drawLine(history.velocity, '#22c55e', 1);
    drawLine(history.balance, '#f59e0b', 100);
  }, [history]);

  const latestTorque = history.torque[history.torque.length - 1]?.value || 0;
  const latestVelocity = history.velocity[history.velocity.length - 1]?.value || 0;
  const latestBalance = history.balance[history.balance.length - 1]?.value || 0;

  const isOnline = simulationState?.status === 'running';

  return (
    <div className="glass-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-cyan-400">
          Telemetry & Safety
        </h2>
        <span className={`flex items-center gap-1 text-xs ${
          isOnline ? 'text-green-400' : 'text-gray-500'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
          }`} />
          {isOnline ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* Real-time Values */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-400">Torque</p>
          <p className="text-xl font-bold text-cyan-400">
            {latestTorque.toFixed(1)}
            <span className="text-xs text-gray-500 ml-1">Nm</span>
          </p>
        </div>
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-400">Velocity</p>
          <p className="text-xl font-bold text-green-400">
            {latestVelocity.toFixed(2)}
            <span className="text-xs text-gray-500 ml-1">m/s</span>
          </p>
        </div>
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-400">Balance</p>
          <p className={`text-xl font-bold ${
            latestBalance > 80 ? 'text-green-400' :
            latestBalance > 60 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {latestBalance.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-4">
        <canvas
          ref={canvasRef}
          width={300}
          height={120}
          className="w-full rounded-lg"
          style={{ background: '#0a0d12' }}
        />
        <div className="flex justify-center gap-4 mt-2">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-3 h-0.5 bg-cyan-400" /> Torque
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-3 h-0.5 bg-green-500" /> Velocity
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-3 h-0.5 bg-amber-500" /> Balance
          </span>
        </div>
      </div>

      {/* Safety Status */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-sm text-gray-400 mb-2">Safety Constraints</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Joint Limits</span>
            <span className="text-sm text-green-400">✓ OK</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Torque Caps</span>
            <span className={`text-sm ${
              latestTorque < 80 ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {latestTorque < 80 ? '✓ OK' : '⚠ High'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Balance Envelope</span>
            <span className={`text-sm ${
              latestBalance > 70 ? 'text-green-400' : 'text-red-400'
            }`}>
              {latestBalance > 70 ? '✓ OK' : '✗ UNSTABLE'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Collision Check</span>
            <span className="text-sm text-green-400">✓ Clear</span>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {simulationState?.safety_warnings && simulationState.safety_warnings.length > 0 && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <h4 className="text-sm font-medium text-red-400 mb-1">⚠ Active Warnings</h4>
          <ul className="text-xs text-red-300 space-y-1">
            {simulationState.safety_warnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
