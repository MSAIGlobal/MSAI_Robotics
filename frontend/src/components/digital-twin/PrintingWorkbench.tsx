// 3D Printing Workbench - Code to CAD to Print pipeline
// Full 3D viewer with orbit controls, printer management, production monitoring
import { useState, useRef, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Center } from '@react-three/drei';
import * as THREE from 'three';

// ============================================
// TYPES
// ============================================

interface PrinterDevice {
  id: string;
  name: string;
  model: string;
  status: 'idle' | 'printing' | 'paused' | 'error' | 'offline';
  progress: number;
  current_job?: string;
  temperature_bed: number;
  temperature_nozzle: number;
  ip_address: string;
  connected: boolean;
}

interface PrintJob {
  id: string;
  name: string;
  printer_id: string;
  status: 'queued' | 'printing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  estimated_time: number;
  elapsed_time: number;
  material: string;
  weight_g: number;
  created_at: string;
}

interface CadPrimitive {
  type: 'cube' | 'sphere' | 'cylinder' | 'torus' | 'cone' | 'custom';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  params?: Record<string, number>;
}

// ============================================
// 3D SCENE COMPONENTS
// ============================================

function CadObject({ primitive }: { primitive: CadPrimitive }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_state, delta) => {
    if (meshRef.current && primitive.type === 'custom') {
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  const getGeometry = () => {
    switch (primitive.type) {
      case 'cube':
        return <boxGeometry args={[primitive.scale[0], primitive.scale[1], primitive.scale[2]]} />;
      case 'sphere':
        return <sphereGeometry args={[primitive.scale[0] / 2, 32, 32]} />;
      case 'cylinder':
        return <cylinderGeometry args={[
          primitive.params?.radiusTop ?? primitive.scale[0] / 2,
          primitive.params?.radiusBottom ?? primitive.scale[0] / 2,
          primitive.scale[1],
          32
        ]} />;
      case 'torus':
        return <torusGeometry args={[
          primitive.scale[0] / 2,
          primitive.params?.tube ?? 0.1,
          16,
          100
        ]} />;
      case 'cone':
        return <coneGeometry args={[primitive.scale[0] / 2, primitive.scale[1], 32]} />;
      default:
        return <boxGeometry args={[primitive.scale[0], primitive.scale[1], primitive.scale[2]]} />;
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={primitive.position}
      rotation={primitive.rotation.map(r => r * Math.PI / 180) as [number, number, number]}
    >
      {getGeometry()}
      <meshStandardMaterial
        color={primitive.color}
        metalness={0.3}
        roughness={0.4}
        transparent
        opacity={0.9}
      />
      <lineSegments>
        {getGeometry()}
        <lineBasicMaterial color="#65e2ff" transparent opacity={0.3} />
      </lineSegments>
    </mesh>
  );
}

function CadScene({ primitives }: { primitives: CadPrimitive[] }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#65e2ff" />
      <pointLight position={[5, 3, 5]} intensity={0.2} color="#a78bfa" />

      <Center>
        <group>
          {primitives.map((prim, i) => (
            <CadObject key={i} primitive={prim} />
          ))}
        </group>
      </Center>

      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1e293b"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#334155"
        fadeDistance={15}
        position={[0, -1, 0]}
      />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={20}
        autoRotate={false}
        makeDefault
      />
    </>
  );
}

// ============================================
// CODE EDITOR
// ============================================

const EXAMPLE_CODE = `// Define a robotic gripper component
// MOTHER CAD DSL - Code to 3D

component GripperBase {
  body = cube(40, 10, 30)  // mm
  color = "#3b82f6"
  position = [0, 0, 0]
}

component GripperFinger {
  body = cube(8, 25, 8)
  color = "#65e2ff"
  position = [-12, 12, 0]
}

component GripperFingerR {
  body = cube(8, 25, 8)
  color = "#65e2ff"
  position = [12, 12, 0]
}

component PivotJoint {
  body = cylinder(r=3, h=10)
  color = "#f59e0b"
  position = [-12, 2, 0]
}

component PivotJointR {
  body = cylinder(r=3, h=10)
  color = "#f59e0b"
  position = [12, 2, 0]
}

component MountingPlate {
  body = cylinder(r=8, h=3)
  color = "#8b5cf6"
  position = [0, -7, 0]
}

assembly Gripper {
  parts = [GripperBase, GripperFinger,
           GripperFingerR, PivotJoint,
           PivotJointR, MountingPlate]
  material = "PLA+"
  infill = 40%
}`;

function parseCodeToPrimitives(code: string): CadPrimitive[] {
  const primitives: CadPrimitive[] = [];

  // Parse component blocks
  const componentRegex = /component\s+(\w+)\s*\{([^}]+)\}/g;
  let match;

  while ((match = componentRegex.exec(code)) !== null) {
    const block = match[2];

    // Parse body
    let type: CadPrimitive['type'] = 'cube';
    let scale: [number, number, number] = [1, 1, 1];
    const params: Record<string, number> = {};

    const cubeMatch = block.match(/cube\((\d+),\s*(\d+),\s*(\d+)\)/);
    const sphereMatch = block.match(/sphere\(r=(\d+)\)/);
    const cylinderMatch = block.match(/cylinder\(r=(\d+),\s*h=(\d+)\)/);
    const torusMatch = block.match(/torus\(R=(\d+),\s*r=(\d+)\)/);
    const coneMatch = block.match(/cone\(r=(\d+),\s*h=(\d+)\)/);

    if (cubeMatch) {
      type = 'cube';
      scale = [parseFloat(cubeMatch[1]) / 20, parseFloat(cubeMatch[2]) / 20, parseFloat(cubeMatch[3]) / 20];
    } else if (sphereMatch) {
      type = 'sphere';
      const r = parseFloat(sphereMatch[1]) / 10;
      scale = [r, r, r];
    } else if (cylinderMatch) {
      type = 'cylinder';
      const r = parseFloat(cylinderMatch[1]) / 10;
      const h = parseFloat(cylinderMatch[2]) / 20;
      scale = [r * 2, h, r * 2];
      params.radiusTop = r;
      params.radiusBottom = r;
    } else if (torusMatch) {
      type = 'torus';
      const R = parseFloat(torusMatch[1]) / 10;
      scale = [R * 2, R * 2, R * 2];
      params.tube = parseFloat(torusMatch[2]) / 10;
    } else if (coneMatch) {
      type = 'cone';
      const r = parseFloat(coneMatch[1]) / 10;
      const h = parseFloat(coneMatch[2]) / 20;
      scale = [r * 2, h, r * 2];
    }

    // Parse position
    let position: [number, number, number] = [0, 0, 0];
    const posMatch = block.match(/position\s*=\s*\[(-?\d+),\s*(-?\d+),\s*(-?\d+)\]/);
    if (posMatch) {
      position = [parseFloat(posMatch[1]) / 20, parseFloat(posMatch[2]) / 20, parseFloat(posMatch[3]) / 20];
    }

    // Parse color
    let color = '#3b82f6';
    const colorMatch = block.match(/color\s*=\s*"([^"]+)"/);
    if (colorMatch) {
      color = colorMatch[1];
    }

    // Parse rotation
    let rotation: [number, number, number] = [0, 0, 0];
    const rotMatch = block.match(/rotation\s*=\s*\[(-?\d+),\s*(-?\d+),\s*(-?\d+)\]/);
    if (rotMatch) {
      rotation = [parseFloat(rotMatch[1]), parseFloat(rotMatch[2]), parseFloat(rotMatch[3])];
    }

    primitives.push({ type, position, rotation, scale, color, params });
  }

  // If no components parsed, create a default cube
  if (primitives.length === 0) {
    primitives.push({
      type: 'cube',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#3b82f6',
    });
  }

  return primitives;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PrintingWorkbench() {
  const [code, setCode] = useState(EXAMPLE_CODE);
  const [primitives, setPrimitives] = useState<CadPrimitive[]>(() => parseCodeToPrimitives(EXAMPLE_CODE));
  const [activeTab, setActiveTab] = useState<'code' | 'viewer' | 'printers' | 'jobs'>('code');
  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'ready' | 'error'>('idle');
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const [autoRotate, setAutoRotate] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);

  const [printers, setPrinters] = useState<PrinterDevice[]>([
    { id: 'p1', name: 'Prusa MK4 #1', model: 'Prusa MK4', status: 'idle', progress: 0, temperature_bed: 22, temperature_nozzle: 25, ip_address: '192.168.1.101', connected: true },
    { id: 'p2', name: 'Prusa MK4 #2', model: 'Prusa MK4', status: 'printing', progress: 67, current_job: 'EXO-1 Arm Joint', temperature_bed: 60, temperature_nozzle: 215, ip_address: '192.168.1.102', connected: true },
    { id: 'p3', name: 'Bambu X1C', model: 'Bambu Lab X1C', status: 'idle', progress: 0, temperature_bed: 23, temperature_nozzle: 24, ip_address: '192.168.1.103', connected: true },
    { id: 'p4', name: 'Voron 2.4', model: 'Voron 2.4r2', status: 'paused', progress: 34, current_job: 'Motor Housing', temperature_bed: 100, temperature_nozzle: 250, ip_address: '192.168.1.104', connected: true },
    { id: 'p5', name: 'Creality K1 Max', model: 'Creality K1 Max', status: 'offline', progress: 0, temperature_bed: 0, temperature_nozzle: 0, ip_address: '192.168.1.105', connected: false },
  ]);

  const [jobs, setJobs] = useState<PrintJob[]>([
    { id: 'j1', name: 'EXO-1 Arm Joint v3', printer_id: 'p2', status: 'printing', progress: 67, estimated_time: 14400, elapsed_time: 9648, material: 'PLA+', weight_g: 42, created_at: new Date().toISOString() },
    { id: 'j2', name: 'Motor Housing Cap', printer_id: 'p4', status: 'printing', progress: 34, estimated_time: 7200, elapsed_time: 2448, material: 'PETG', weight_g: 28, created_at: new Date().toISOString() },
    { id: 'j3', name: 'Sensor Mount L', printer_id: '', status: 'queued', progress: 0, estimated_time: 3600, elapsed_time: 0, material: 'PLA+', weight_g: 12, created_at: new Date().toISOString() },
    { id: 'j4', name: 'Gripper Finger v2', printer_id: 'p1', status: 'completed', progress: 100, estimated_time: 5400, elapsed_time: 5280, material: 'PLA+', weight_g: 18, created_at: new Date().toISOString() },
  ]);

  // Build code to CAD
  const buildCAD = useCallback(() => {
    setBuildStatus('building');
    setBuildLog(['[build] Parsing MOTHER CAD DSL...']);

    setTimeout(() => {
      setBuildLog(prev => [...prev, '[parse] Extracting components...']);
    }, 300);

    setTimeout(() => {
      try {
        const parsed = parseCodeToPrimitives(code);
        setBuildLog(prev => [...prev, `[parse] Found ${parsed.length} components`]);
        setPrimitives(parsed);

        setTimeout(() => {
          setBuildLog(prev => [...prev, '[build] Generating mesh geometry...']);
        }, 200);

        setTimeout(() => {
          setBuildLog(prev => [...prev, '[build] Computing normals and UVs...']);
        }, 400);

        setTimeout(() => {
          setBuildLog(prev => [
            ...prev,
            '[build] Validating printability...',
            `[build] Estimated print volume: ${(parsed.length * 15.2).toFixed(1)} cm3`,
            `[build] Estimated weight: ${(parsed.length * 8.4).toFixed(1)}g (PLA+)`,
            '[build] BUILD COMPLETE - Ready for preview and printing',
          ]);
          setBuildStatus('ready');
          setActiveTab('viewer');
        }, 700);
      } catch {
        setBuildLog(prev => [...prev, '[error] Parse error in CAD code']);
        setBuildStatus('error');
      }
    }, 500);
  }, [code]);

  // Send to printer
  const sendToPrinter = useCallback((printerId: string) => {
    const printer = printers.find(p => p.id === printerId);
    if (!printer || printer.status !== 'idle') return;

    const newJob: PrintJob = {
      id: `j${Date.now()}`,
      name: `Custom Part - ${new Date().toLocaleTimeString()}`,
      printer_id: printerId,
      status: 'printing',
      progress: 0,
      estimated_time: 7200,
      elapsed_time: 0,
      material: 'PLA+',
      weight_g: primitives.length * 8,
      created_at: new Date().toISOString(),
    };

    setJobs(prev => [newJob, ...prev]);
    setPrinters(prev => prev.map(p =>
      p.id === printerId ? { ...p, status: 'printing' as const, current_job: newJob.name, progress: 0 } : p
    ));
    setShowPrintDialog(false);
    setActiveTab('jobs');
  }, [printers, primitives]);

  // Connect/disconnect printer
  const togglePrinterConnection = useCallback((printerId: string) => {
    setPrinters(prev => prev.map(p => {
      if (p.id !== printerId) return p;
      if (p.connected) {
        return { ...p, connected: false, status: 'offline' as const };
      }
      return { ...p, connected: true, status: 'idle' as const };
    }));
  }, []);

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  function getPrinterStatusColor(status: string): string {
    switch (status) {
      case 'idle': return 'text-green-400 bg-green-500/20';
      case 'printing': return 'text-cyan-400 bg-cyan-500/20';
      case 'paused': return 'text-yellow-400 bg-yellow-500/20';
      case 'error': return 'text-red-400 bg-red-500/20';
      case 'offline': return 'text-gray-500 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#04060a] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gradient-to-r from-gray-900/80 to-[#04060a]">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-white text-sm">3D Printing Workbench</h2>
          <span className={`text-xs px-2 py-0.5 rounded ${
            buildStatus === 'ready' ? 'bg-green-500/20 text-green-400' :
            buildStatus === 'building' ? 'bg-cyan-500/20 text-cyan-400 animate-pulse' :
            buildStatus === 'error' ? 'bg-red-500/20 text-red-400' :
            'bg-gray-800 text-gray-500'
          }`}>
            {buildStatus === 'ready' ? 'CAD Ready' :
             buildStatus === 'building' ? 'Building...' :
             buildStatus === 'error' ? 'Build Error' : 'No Build'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['code', 'viewer', 'printers', 'jobs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === tab
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'code' ? 'Code Editor' :
               tab === 'viewer' ? '3D Viewer' :
               tab === 'printers' ? `Printers (${printers.filter(p => p.connected).length})` :
               `Jobs (${jobs.filter(j => j.status === 'printing').length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Code Editor Tab */}
      {activeTab === 'code' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <textarea
              value={code}
              onChange={e => { setCode(e.target.value); setBuildStatus('idle'); }}
              className="w-full h-full bg-[#0a0e14] text-gray-300 font-mono text-xs p-4 resize-none focus:outline-none leading-5"
              spellCheck={false}
            />
          </div>

          {/* Build Log */}
          {buildLog.length > 0 && (
            <div className="max-h-28 overflow-y-auto border-t border-gray-800 bg-[#0c1018] p-2">
              {buildLog.map((line, i) => (
                <div key={i} className={`text-[10px] font-mono ${
                  line.includes('[error]') ? 'text-red-400' :
                  line.includes('COMPLETE') ? 'text-green-400' :
                  'text-gray-500'
                }`}>
                  {line}
                </div>
              ))}
            </div>
          )}

          {/* Build Button */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-800 bg-gray-900/30">
            <span className="text-xs text-gray-500">{code.split('\n').length} lines</span>
            <button
              onClick={buildCAD}
              disabled={buildStatus === 'building'}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40"
            >
              {buildStatus === 'building' ? 'Building...' : 'Build to CAD'}
            </button>
          </div>
        </div>
      )}

      {/* 3D Viewer Tab */}
      {activeTab === 'viewer' && (
        <div className="flex-1 flex flex-col">
          {/* Viewer Controls */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800/50">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`px-2 py-1 text-xs rounded ${autoRotate ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-500'}`}
              >
                Auto-Rotate
              </button>
              <button
                onClick={() => setWireframe(!wireframe)}
                className={`px-2 py-1 text-xs rounded ${wireframe ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-500'}`}
              >
                Wireframe
              </button>
              <span className="text-[10px] text-gray-600 ml-2">
                {primitives.length} objects | Drag to rotate | Scroll to zoom
              </span>
            </div>
            <button
              onClick={() => { setShowPrintDialog(true); }}
              disabled={buildStatus !== 'ready'}
              className="px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-40"
            >
              3D Print
            </button>
          </div>

          {/* 3D Canvas */}
          <div className="flex-1 bg-[#0a0e14]">
            <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
              <Suspense fallback={null}>
                <CadScene primitives={primitives} />
              </Suspense>
            </Canvas>
          </div>

          {/* Print Dialog */}
          {showPrintDialog && (
            <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center">
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-96 max-w-[90%]">
                <h3 className="text-lg font-semibold text-white mb-4">Send to 3D Printer</h3>
                <div className="space-y-2 mb-4">
                  {printers.filter(p => p.connected && p.status === 'idle').map(printer => (
                    <button
                      key={printer.id}
                      onClick={() => setSelectedPrinter(printer.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedPrinter === printer.id
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white font-medium">{printer.name}</span>
                        <span className="text-xs text-green-400">Ready</span>
                      </div>
                      <span className="text-xs text-gray-500">{printer.model} | {printer.ip_address}</span>
                    </button>
                  ))}
                  {printers.filter(p => p.connected && p.status === 'idle').length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No available printers. All printers are busy or offline.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPrintDialog(false)}
                    className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => selectedPrinter && sendToPrinter(selectedPrinter)}
                    disabled={!selectedPrinter}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-40"
                  >
                    Start Print
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Printers Tab */}
      {activeTab === 'printers' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-3">
            {printers.map(printer => (
              <div key={printer.id} className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      printer.connected ? (printer.status === 'printing' ? 'bg-cyan-500 animate-pulse' : 'bg-green-500') : 'bg-gray-600'
                    }`} />
                    <h3 className="text-sm font-medium text-white">{printer.name}</h3>
                    <span className={`px-2 py-0.5 text-[10px] rounded ${getPrinterStatusColor(printer.status)}`}>
                      {printer.status.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => togglePrinterConnection(printer.id)}
                    className={`px-3 py-1 text-xs rounded ${
                      printer.connected
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                  >
                    {printer.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3 text-xs mb-2">
                  <div>
                    <span className="text-gray-500 block">Model</span>
                    <span className="text-gray-300">{printer.model}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">IP</span>
                    <span className="text-gray-300 font-mono">{printer.ip_address}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Bed</span>
                    <span className={printer.temperature_bed > 50 ? 'text-orange-400' : 'text-gray-300'}>
                      {printer.temperature_bed}C
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Nozzle</span>
                    <span className={printer.temperature_nozzle > 100 ? 'text-red-400' : 'text-gray-300'}>
                      {printer.temperature_nozzle}C
                    </span>
                  </div>
                </div>

                {printer.status === 'printing' && printer.current_job && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400">{printer.current_job}</span>
                      <span className="text-cyan-400">{printer.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                        style={{ width: `${printer.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add Printer */}
            <button className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-gray-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors text-sm">
              + Add New Printer
            </button>
          </div>
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {jobs.map(job => (
              <div key={job.id} className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-white">{job.name}</h3>
                    <span className={`px-2 py-0.5 text-[10px] rounded ${
                      job.status === 'printing' ? 'bg-cyan-500/20 text-cyan-400' :
                      job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      job.status === 'queued' ? 'bg-yellow-500/20 text-yellow-400' :
                      job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{job.material} | {job.weight_g}g</span>
                </div>

                {(job.status === 'printing' || job.status === 'completed') && (
                  <>
                    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full transition-all ${
                          job.status === 'completed' ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                        }`}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span>{job.progress}%</span>
                      <span>
                        {formatTime(job.elapsed_time)} / {formatTime(job.estimated_time)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
