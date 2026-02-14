/**
 * MSAI Robotics Dashboard - Main App
 * Control Plane for MOTHER Robotics Systems
 */

import { useState, useEffect } from 'react';
import { Dashboard } from './components/dashboard';
import { Exo1Dashboard } from './pages/Exo1Dashboard';
import { DigitalTwinDashboard } from './pages/DigitalTwinDashboard';
import { SafetyDashboard } from './components/safety/SafetyDashboard';
import { ExperimentLaunchForm } from './components/experiments/ExperimentLaunchForm';
import { ExperimentList } from './components/experiments/ExperimentList';
import { DatasetLineageGraph } from './components/datasets/DatasetLineageGraph';
import { NodeStatusGrid } from './components/nodes/NodeStatusGrid';
import { AuditLog } from './components/audit/AuditLog';
import { User } from './lib/types';
import { getStoredAuth, storeAuth, initNetlifyIdentity, openLogin, logout } from './lib/auth';

type View = 'dashboard' | 'digital-twin' | 'robotics' | 'experiments' | 'datasets' | 'nodes' | 'safety' | 'audit';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load stored auth
    const auth = getStoredAuth();
    if (auth.user) {
      setUser(auth.user);
    }
    setLoading(false);

    // Initialize Netlify Identity
    initNetlifyIdentity(
      (u) => { setUser(u); storeAuth(u); },
      () => { setUser(null); storeAuth(null); }
    );
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04060a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#04060a]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#04060a]/90 backdrop-blur border-b border-gray-800">
        <div className="max-w-[1920px] mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">
                MSAI <span className="text-cyan-400">Robotics</span>
              </span>
            </div>

            {/* Nav Links */}
            <div className="flex items-center gap-1">
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'digital-twin', label: 'Digital Twin' },
                { id: 'robotics', label: 'EXO-1' },
                { id: 'experiments', label: 'Experiments' },
                { id: 'datasets', label: 'Datasets' },
                { id: 'nodes', label: 'Nodes' },
                { id: 'safety', label: 'Safety' },
                { id: 'audit', label: 'Audit' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as View)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    currentView === item.id
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* User */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-sm text-gray-400">
                    {user.name}
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                      user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                      user.role === 'operator' ? 'bg-blue-500/20 text-blue-400' :
                      user.role === 'gov' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {user.role}
                    </span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={openLogin}
                  className="px-4 py-1.5 text-sm bg-cyan-500 text-white rounded-lg hover:bg-cyan-400"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto">
        {currentView === 'dashboard' && <Dashboard />}

        {currentView === 'digital-twin' && <DigitalTwinDashboard user={user} />}

        {currentView === 'robotics' && <Exo1Dashboard user={user} />}

        {currentView === 'experiments' && (
          <div className="p-4 grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <ExperimentList user={user} />
            </div>
            <div>
              <ExperimentLaunchForm user={user} />
            </div>
          </div>
        )}

        {currentView === 'datasets' && (
          <div className="p-4">
            <DatasetLineageGraph />
          </div>
        )}

        {currentView === 'nodes' && (
          <div className="p-4">
            <NodeStatusGrid />
          </div>
        )}

        {currentView === 'safety' && (
          <div className="p-4">
            <SafetyDashboard user={user} />
          </div>
        )}

        {currentView === 'audit' && (
          <div className="p-4">
            <AuditLog user={user} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 mt-8">
        <div className="max-w-[1920px] mx-auto px-4 text-center text-xs text-gray-600">
          MSAI Robotics Control Plane • Frontend-only • No training, inference, or GPU logic •
          All actions logged
        </div>
      </footer>
    </div>
  );
}

export default App;
