/**
 * TelemetryChart Component
 * Real-time telemetry visualization using Recharts
 */

import { useMemo } from 'react';
import type { FC } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import type { TelemetryPoint } from '../../types/robotics';

interface TelemetryChartProps {
  data: TelemetryPoint[];
  metrics: string[];
  title?: string;
  height?: number;
  showLegend?: boolean;
  chartType?: 'line' | 'area';
  colors?: Record<string, string>;
}

const defaultColors: Record<string, string> = {
  cpu: '#3b82f6',         // blue
  memory: '#10b981',      // green
  battery: '#f59e0b',     // yellow
  temperature: '#ef4444', // red
  velocity_linear: '#8b5cf6',  // purple
  velocity_angular: '#ec4899', // pink
  position_x: '#06b6d4',  // cyan
  position_y: '#84cc16',  // lime
  position_z: '#f97316',  // orange
};

export const TelemetryChart: FC<TelemetryChartProps> = ({
  data,
  metrics,
  title,
  height = 200,
  showLegend = true,
  chartType = 'line',
  colors = defaultColors,
}) => {
  // Transform data for Recharts
  const chartData = useMemo(() => {
    return data.map((point, index) => {
      const entry: Record<string, any> = {
        time: new Date(point.timestamp).toLocaleTimeString(),
        index,
      };

      for (const metric of metrics) {
        entry[metric] = point.metrics[metric] ?? null;
      }

      return entry;
    });
  }, [data, metrics]);

  // Get min/max for better Y axis
  const yDomain = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    for (const point of chartData) {
      for (const metric of metrics) {
        const value = point[metric];
        if (value !== null && value !== undefined) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
    }

    const padding = (max - min) * 0.1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData, metrics]);

  const renderDataComponents = () => {
    return metrics.map((metric) =>
      chartType === 'area' ? (
        <Area
          key={metric}
          type="monotone"
          dataKey={metric}
          stroke={colors[metric] || '#fff'}
          fill={colors[metric] || '#fff'}
          fillOpacity={0.2}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          name={metric.replace('_', ' ')}
        />
      ) : (
        <Line
          key={metric}
          type="monotone"
          dataKey={metric}
          stroke={colors[metric] || '#fff'}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          name={metric.replace('_', ' ')}
        />
      )
    );
  };

  const chartContent = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis
        dataKey="time"
        stroke="#9ca3af"
        fontSize={10}
        tickLine={false}
        interval="preserveStartEnd"
      />
      <YAxis
        stroke="#9ca3af"
        fontSize={10}
        tickLine={false}
        domain={yDomain}
        width={40}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '8px',
        }}
        labelStyle={{ color: '#9ca3af' }}
        itemStyle={{ color: '#fff' }}
      />
      {showLegend && (
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
          iconType="line"
        />
      )}
      {renderDataComponents()}
    </>
  );

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      {title && (
        <h3 className="text-sm font-semibold text-gray-300 mb-2">{title}</h3>
      )}

      <ResponsiveContainer width="100%" height={height}>
        {chartType === 'area' ? (
          <AreaChart data={chartData}>{chartContent}</AreaChart>
        ) : (
          <LineChart data={chartData}>{chartContent}</LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

// ============================================
// SPECIALIZED CHARTS
// ============================================

interface BatteryGaugeProps {
  level: number;
  size?: number;
}

export const BatteryGauge: FC<BatteryGaugeProps> = ({ level, size = 100 }) => {
  const color = level > 50 ? '#10b981' : level > 20 ? '#f59e0b' : '#ef4444';
  const rotation = (level / 100) * 180;

  return (
    <div className="relative" style={{ width: size, height: size / 2 }}>
      <svg viewBox="0 0 100 50" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="#374151"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${rotation * 0.87} 157`}
        />
        {/* Center text */}
        <text x="50" y="45" textAnchor="middle" className="fill-white text-lg font-bold">
          {level.toFixed(0)}%
        </text>
      </svg>
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
        Battery
      </div>
    </div>
  );
};

interface StatusIndicatorProps {
  label: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export const StatusIndicator: FC<StatusIndicatorProps> = ({
  label,
  value,
  unit = '',
  min = 0,
  max = 100,
  warningThreshold,
  criticalThreshold,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  let barColor = 'bg-green-500';
  if (criticalThreshold && value >= criticalThreshold) {
    barColor = 'bg-red-500';
  } else if (warningThreshold && value >= warningThreshold) {
    barColor = 'bg-yellow-500';
  }

  return (
    <div className="bg-gray-700 rounded p-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white">{value.toFixed(1)}{unit}</span>
      </div>
      <div className="h-2 bg-gray-600 rounded overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
};

export default TelemetryChart;
