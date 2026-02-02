/**
 * Dashboard Component
 * Main robotics dashboard layout
 */

import type { FC } from 'react';
import { useRobots } from '../../hooks/useRobots';
import { useTelemetry } from '../../hooks/useTelemetry';
import { useRoboticsStore } from '../../store/roboticsStore';
import { RobotCard } from './RobotCard';
import { TelemetryChart, BatteryGauge, StatusIndicator } from './TelemetryChart';
import { ControlPanel } from './ControlPanel';
import { MotherChat } from './MotherChat';
import { roboticsApi } from '../../lib/api';

export const Dashboard: FC = () => {
  const {
    robots,
    selectedRobot,
    isLoading,
    isConnected,
    error,
    selectRobot,
    refreshRobots,
  } = useRobots({ autoConnect: true });

  const { view, setActivePanel, toggleSidebar, setGridLayout } = useRoboticsStore();

  // Telemetry for selected robot
  const { telemetry } = useTelemetry({
    robotId: selectedRobot?.robot_id || '',
    autoSubscribe: !!selectedRobot,
  });

  const handleEmergencyStop = async (robotId: string) => {
    try {
      await roboticsApi.setControlMode(robotId, 'emergency_stop');
      refreshRobots();
    } catch (err) {
      console.error('Emergency stop failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="text-gray-400 hover:text-white p-2"
            >
              ☰
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <h1 className="text-xl font-bold">MSAI Robotics Dashboard</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>

            {/* Grid Layout Toggle */}
            <div className="flex gap-1 bg-gray-700 rounded p-1">
              {(['single', 'dual', 'quad'] as const).map((layout) => (
                <button
                  key={layout}
                  onClick={() => setGridLayout(layout)}
                  className={`px-2 py-1 rounded text-xs ${
                    view.gridLayout === layout ? 'bg-blue-600' : 'hover:bg-gray-600'
                  }`}
                >
                  {layout === 'single' ? '▢' : layout === 'dual' ? '▣' : '⊞'}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={refreshRobots}
              disabled={isLoading}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50"
            >
              {isLoading ? '⟳' : '↻'} Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {view.sidebarOpen && (
          <aside className="w-64 bg-gray-800 border-r border-gray-700 p-4 min-h-[calc(100vh-60px)]">
            {/* Nav Panels */}
            <nav className="space-y-2 mb-6">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'robot-detail', label: 'Robot Detail', icon: '🤖' },
                { id: 'telemetry', label: 'Telemetry', icon: '📈' },
                { id: 'chat', label: 'MOTHER Chat', icon: '💬' },
                { id: 'settings', label: 'Settings', icon: '⚙️' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActivePanel(item.id as any)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left ${
                    view.activePanel === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Robot List */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Robots ({robots.length})</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {robots.map((robot) => (
                  <button
                    key={robot.robot_id}
                    onClick={() => selectRobot(robot.robot_id)}
                    className={`w-full text-left p-2 rounded ${
                      selectedRobot?.robot_id === robot.robot_id
                        ? 'bg-blue-600/30 border border-blue-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{robot.robot_id}</span>
                      <span className={`w-2 h-2 rounded-full ${
                        robot.status === 'online' ? 'bg-green-500' :
                        robot.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                      }`} />
                    </div>
                    <div className="text-xs text-gray-400 capitalize">
                      {robot.control_mode.replace('_', ' ')}
                    </div>
                  </button>
                ))}

                {robots.length === 0 && (
                  <div className="text-gray-500 text-sm text-center py-4">
                    No robots connected
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 overflow-y-auto min-h-[calc(100vh-60px)]">
          {/* Error Banner */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded mb-4">
              ⚠️ {error}
            </div>
          )}

          {/* Overview Panel */}
          {view.activePanel === 'overview' && (
            <div>
              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Total Robots</div>
                  <div className="text-3xl font-bold">{robots.length}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Online</div>
                  <div className="text-3xl font-bold text-green-400">
                    {robots.filter(r => r.status === 'online').length}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Busy</div>
                  <div className="text-3xl font-bold text-yellow-400">
                    {robots.filter(r => r.status === 'busy').length}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Errors</div>
                  <div className="text-3xl font-bold text-red-400">
                    {robots.filter(r => r.status === 'error').length}
                  </div>
                </div>
              </div>

              {/* Robot Grid */}
              <h2 className="text-lg font-semibold mb-4">Connected Robots</h2>
              <div className={`grid gap-4 ${
                view.gridLayout === 'single' ? 'grid-cols-1' :
                view.gridLayout === 'dual' ? 'grid-cols-2' : 'grid-cols-4'
              }`}>
                {robots.map((robot) => (
                  <RobotCard
                    key={robot.robot_id}
                    robot={robot}
                    selected={selectedRobot?.robot_id === robot.robot_id}
                    onClick={() => selectRobot(robot.robot_id)}
                    onEmergencyStop={() => handleEmergencyStop(robot.robot_id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Robot Detail Panel */}
          {view.activePanel === 'robot-detail' && selectedRobot && (
            <div className="grid grid-cols-2 gap-6">
              {/* Left: Robot Info & Controls */}
              <div className="space-y-4">
                <RobotCard
                  robot={selectedRobot}
                  selected
                  onEmergencyStop={() => handleEmergencyStop(selectedRobot.robot_id)}
                />
                <ControlPanel robot={selectedRobot} />
              </div>

              {/* Right: Telemetry & Chat */}
              <div className="space-y-4">
                {/* Quick Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <BatteryGauge level={selectedRobot.battery_percent} size={120} />
                  <div className="space-y-2">
                    <StatusIndicator
                      label="CPU"
                      value={telemetry[telemetry.length - 1]?.metrics.cpu || 0}
                      unit="%"
                      warningThreshold={70}
                      criticalThreshold={90}
                    />
                    <StatusIndicator
                      label="Memory"
                      value={telemetry[telemetry.length - 1]?.metrics.memory || 0}
                      unit="%"
                      warningThreshold={80}
                      criticalThreshold={95}
                    />
                    <StatusIndicator
                      label="Temperature"
                      value={telemetry[telemetry.length - 1]?.metrics.temperature || 0}
                      unit="°C"
                      max={100}
                      warningThreshold={60}
                      criticalThreshold={80}
                    />
                  </div>
                </div>

                {/* Telemetry Chart */}
                <TelemetryChart
                  data={telemetry}
                  metrics={['cpu', 'memory', 'temperature']}
                  title="System Metrics"
                  height={200}
                />

                {/* MOTHER Chat */}
                <div className="h-[400px]">
                  <MotherChat robotContext={selectedRobot} />
                </div>
              </div>
            </div>
          )}

          {view.activePanel === 'robot-detail' && !selectedRobot && (
            <div className="text-center text-gray-500 py-20">
              <span className="text-6xl block mb-4">🤖</span>
              <p>Select a robot from the sidebar to view details</p>
            </div>
          )}

          {/* Telemetry Panel */}
          {view.activePanel === 'telemetry' && selectedRobot && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Telemetry: {selectedRobot.robot_id}
              </h2>

              <TelemetryChart
                data={telemetry}
                metrics={['cpu', 'memory']}
                title="Compute Metrics"
                height={250}
                chartType="area"
              />

              <TelemetryChart
                data={telemetry}
                metrics={['battery', 'temperature']}
                title="Power & Thermal"
                height={250}
              />

              <TelemetryChart
                data={telemetry}
                metrics={['velocity_linear', 'velocity_angular']}
                title="Motion Metrics"
                height={250}
              />
            </div>
          )}

          {/* Chat Panel */}
          {view.activePanel === 'chat' && (
            <div className="h-[calc(100vh-140px)]">
              <MotherChat robotContext={selectedRobot || undefined} />
            </div>
          )}

          {/* Settings Panel */}
          {view.activePanel === 'settings' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-4">Settings</h2>

              <div className="bg-gray-800 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span>Dark Mode</span>
                  <button className="px-3 py-1 bg-blue-600 rounded text-sm">
                    Enabled
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span>WebSocket Auto-Connect</span>
                  <button className="px-3 py-1 bg-blue-600 rounded text-sm">
                    Enabled
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span>Telemetry Buffer Size</span>
                  <input
                    type="number"
                    defaultValue={500}
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span>Audio Alerts</span>
                  <button className="px-3 py-1 bg-green-600 rounded text-sm">
                    Enabled
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
