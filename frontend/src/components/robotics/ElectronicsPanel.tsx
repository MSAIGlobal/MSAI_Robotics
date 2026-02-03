// Electronics & Actuation Panel - Motor configs, sensors, power
import React, { useEffect, useState } from 'react';
import { roboticsApi } from '../../lib/backend';
import { MotorConfig, SensorConfig, User } from '../../lib/types';
import { hasPermission } from '../../lib/auth';

interface Props {
  modelId: string;
  user: User | null;
}

export function ElectronicsPanel({ modelId, user }: Props) {
  const [motors, setMotors] = useState<MotorConfig[]>([]);
  const [sensors, setSensors] = useState<SensorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'motors' | 'sensors'>('motors');

  const canEdit = hasPermission('robotics.control', user);

  useEffect(() => {
    loadData();
  }, [modelId]);

  async function loadData() {
    try {
      const [motorData, sensorData] = await Promise.all([
        roboticsApi.getMotorConfigs(modelId),
        roboticsApi.getSensorConfigs(modelId),
      ]);
      setMotors(motorData);
      setSensors(sensorData);
    } catch (err) {
      console.error('Failed to load electronics data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="glass-card animate-pulse h-64" />;
  }

  return (
    <div className="glass-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-cyan-400">
          Electronics & Motors
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('motors')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              activeTab === 'motors'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Motors
          </button>
          <button
            onClick={() => setActiveTab('sensors')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              activeTab === 'sensors'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Sensors
          </button>
        </div>
      </div>

      {activeTab === 'motors' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-2">Joint</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Torque</th>
                <th className="pb-2">Controller</th>
                <th className="pb-2">Driver</th>
              </tr>
            </thead>
            <tbody>
              {motors.map((motor) => (
                <tr
                  key={motor.joint}
                  className="border-b border-gray-800 hover:bg-gray-800/50"
                >
                  <td className="py-2 font-medium text-white">{motor.joint}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      motor.type === 'bldc'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {motor.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 text-gray-300">{motor.max_torque} Nm</td>
                  <td className="py-2 text-gray-400">{motor.controller}</td>
                  <td className="py-2 text-gray-400">{motor.driver}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'sensors' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-2">ID</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Location</th>
                <th className="pb-2">Rate</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((sensor) => (
                <tr
                  key={sensor.id}
                  className="border-b border-gray-800 hover:bg-gray-800/50"
                >
                  <td className="py-2 font-medium text-white">{sensor.id}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      sensor.type === 'imu' ? 'bg-purple-500/20 text-purple-400' :
                      sensor.type === 'force_torque' ? 'bg-orange-500/20 text-orange-400' :
                      sensor.type === 'encoder' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-pink-500/20 text-pink-400'
                    }`}>
                      {sensor.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 text-gray-300">{sensor.location}</td>
                  <td className="py-2 text-gray-400">{sensor.sampling_rate} Hz</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Power Summary */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h3 className="text-sm text-gray-400 mb-2">Power Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-semibold text-cyan-400">48V</p>
            <p className="text-xs text-gray-500">Main Rail</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-cyan-400">
              {motors.reduce((acc, m) => acc + m.max_torque * 2, 0)}W
            </p>
            <p className="text-xs text-gray-500">Peak Power</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-green-400">OK</p>
            <p className="text-xs text-gray-500">Status</p>
          </div>
        </div>
      </div>
    </div>
  );
}
