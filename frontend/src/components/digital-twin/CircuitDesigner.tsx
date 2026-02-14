// Electronics Circuit Designer - CAD for circuit design and joining
// Design small circuits, join circuit blocks, export for PCB fabrication
import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

interface CircuitComponent {
  id: string;
  type: 'resistor' | 'capacitor' | 'inductor' | 'led' | 'ic' | 'connector' | 'mcu' | 'sensor' | 'mosfet' | 'diode' | 'crystal' | 'regulator';
  label: string;
  value?: string;
  package_type?: string;
  x: number;
  y: number;
  rotation: number;
  pins: CircuitPin[];
}

interface CircuitPin {
  id: string;
  label: string;
  x: number;
  y: number;
  type: 'input' | 'output' | 'power' | 'ground' | 'io' | 'analog';
  connected_to?: string;
}

interface CircuitWire {
  id: string;
  from_component: string;
  from_pin: string;
  to_component: string;
  to_pin: string;
  points: [number, number][];
  net_name?: string;
}

interface CircuitBlock {
  id: string;
  name: string;
  description: string;
  category: 'power' | 'sensing' | 'communication' | 'actuator' | 'processing' | 'interface';
  components: CircuitComponent[];
  wires: CircuitWire[];
  input_pins: string[];
  output_pins: string[];
}

// ============================================
// COMPONENT LIBRARY
// ============================================

const COMPONENT_LIBRARY: { category: string; items: { type: CircuitComponent['type']; label: string; defaultValue?: string; pins: Omit<CircuitPin, 'x' | 'y'>[] }[] }[] = [
  {
    category: 'Passive',
    items: [
      { type: 'resistor', label: 'Resistor', defaultValue: '10k', pins: [
        { id: 'p1', label: '1', type: 'io' }, { id: 'p2', label: '2', type: 'io' }
      ]},
      { type: 'capacitor', label: 'Capacitor', defaultValue: '100nF', pins: [
        { id: 'p1', label: '+', type: 'io' }, { id: 'p2', label: '-', type: 'io' }
      ]},
      { type: 'inductor', label: 'Inductor', defaultValue: '10uH', pins: [
        { id: 'p1', label: '1', type: 'io' }, { id: 'p2', label: '2', type: 'io' }
      ]},
      { type: 'crystal', label: 'Crystal', defaultValue: '16MHz', pins: [
        { id: 'p1', label: '1', type: 'io' }, { id: 'p2', label: '2', type: 'io' }
      ]},
    ],
  },
  {
    category: 'Active',
    items: [
      { type: 'led', label: 'LED', defaultValue: 'Green', pins: [
        { id: 'a', label: 'A', type: 'input' }, { id: 'k', label: 'K', type: 'output' }
      ]},
      { type: 'diode', label: 'Diode', defaultValue: '1N4148', pins: [
        { id: 'a', label: 'A', type: 'input' }, { id: 'k', label: 'K', type: 'output' }
      ]},
      { type: 'mosfet', label: 'MOSFET', defaultValue: 'IRLZ44N', pins: [
        { id: 'g', label: 'G', type: 'input' }, { id: 'd', label: 'D', type: 'io' }, { id: 's', label: 'S', type: 'ground' }
      ]},
      { type: 'regulator', label: 'Voltage Reg', defaultValue: 'LM7805', pins: [
        { id: 'in', label: 'IN', type: 'power' }, { id: 'out', label: 'OUT', type: 'output' }, { id: 'gnd', label: 'GND', type: 'ground' }
      ]},
    ],
  },
  {
    category: 'ICs',
    items: [
      { type: 'mcu', label: 'MCU', defaultValue: 'STM32F4', pins: [
        { id: 'vcc', label: 'VCC', type: 'power' }, { id: 'gnd', label: 'GND', type: 'ground' },
        { id: 'pa0', label: 'PA0', type: 'io' }, { id: 'pa1', label: 'PA1', type: 'io' },
        { id: 'pb0', label: 'PB0', type: 'io' }, { id: 'pb1', label: 'PB1', type: 'io' },
        { id: 'tx', label: 'TX', type: 'output' }, { id: 'rx', label: 'RX', type: 'input' },
      ]},
      { type: 'ic', label: 'Op-Amp', defaultValue: 'LM358', pins: [
        { id: 'vp', label: 'V+', type: 'power' }, { id: 'vn', label: 'V-', type: 'ground' },
        { id: 'inp', label: 'IN+', type: 'input' }, { id: 'inn', label: 'IN-', type: 'input' },
        { id: 'out', label: 'OUT', type: 'output' },
      ]},
      { type: 'sensor', label: 'Sensor', defaultValue: 'IMU-6050', pins: [
        { id: 'vcc', label: 'VCC', type: 'power' }, { id: 'gnd', label: 'GND', type: 'ground' },
        { id: 'sda', label: 'SDA', type: 'io' }, { id: 'scl', label: 'SCL', type: 'io' },
        { id: 'int', label: 'INT', type: 'output' },
      ]},
      { type: 'connector', label: 'Connector', defaultValue: 'JST-4P', pins: [
        { id: 'p1', label: '1', type: 'io' }, { id: 'p2', label: '2', type: 'io' },
        { id: 'p3', label: '3', type: 'io' }, { id: 'p4', label: '4', type: 'io' },
      ]},
    ],
  },
];

// Pre-built circuit blocks
const CIRCUIT_BLOCKS: CircuitBlock[] = [
  {
    id: 'pwr-5v',
    name: '5V Power Supply',
    description: 'LM7805 linear regulator with input/output filtering',
    category: 'power',
    components: [],
    wires: [],
    input_pins: ['VIN', 'GND'],
    output_pins: ['5V', 'GND'],
  },
  {
    id: 'motor-driver',
    name: 'H-Bridge Motor Driver',
    description: 'Dual MOSFET H-bridge for DC motor control',
    category: 'actuator',
    components: [],
    wires: [],
    input_pins: ['PWM_A', 'PWM_B', 'VCC', 'GND'],
    output_pins: ['MOTOR_A', 'MOTOR_B'],
  },
  {
    id: 'imu-interface',
    name: 'IMU Sensor Interface',
    description: 'MPU-6050 I2C interface with pull-ups and filtering',
    category: 'sensing',
    components: [],
    wires: [],
    input_pins: ['VCC', 'GND', 'SDA', 'SCL'],
    output_pins: ['SDA', 'SCL', 'INT'],
  },
  {
    id: 'uart-level',
    name: 'UART Level Shifter',
    description: 'Bidirectional 3.3V to 5V level shifter for UART',
    category: 'communication',
    components: [],
    wires: [],
    input_pins: ['TX_3V3', 'RX_3V3', '3V3', '5V', 'GND'],
    output_pins: ['TX_5V', 'RX_5V'],
  },
  {
    id: 'force-sensor',
    name: 'Force Sensor ADC',
    description: 'Load cell amplifier with HX711 ADC',
    category: 'sensing',
    components: [],
    wires: [],
    input_pins: ['FORCE+', 'FORCE-', 'VCC', 'GND'],
    output_pins: ['DATA', 'CLK'],
  },
  {
    id: 'servo-driver',
    name: 'Servo Controller',
    description: 'PCA9685 16-channel PWM servo driver',
    category: 'actuator',
    components: [],
    wires: [],
    input_pins: ['SDA', 'SCL', 'VCC', 'GND', 'V_SERVO'],
    output_pins: ['PWM0-15'],
  },
];

// ============================================
// CANVAS DRAWING
// ============================================

function getComponentColor(type: CircuitComponent['type']): string {
  switch (type) {
    case 'resistor': return '#8b5cf6';
    case 'capacitor': return '#3b82f6';
    case 'inductor': return '#6366f1';
    case 'led': return '#22c55e';
    case 'ic': case 'mcu': return '#f59e0b';
    case 'connector': return '#6b7280';
    case 'sensor': return '#06b6d4';
    case 'mosfet': return '#ef4444';
    case 'diode': return '#ec4899';
    case 'crystal': return '#a855f7';
    case 'regulator': return '#f97316';
    default: return '#6b7280';
  }
}

function getPinColor(type: CircuitPin['type']): string {
  switch (type) {
    case 'power': return '#ef4444';
    case 'ground': return '#1f2937';
    case 'input': return '#22c55e';
    case 'output': return '#3b82f6';
    case 'io': return '#f59e0b';
    case 'analog': return '#a855f7';
    default: return '#6b7280';
  }
}

function getCategoryColor(cat: string): string {
  switch (cat) {
    case 'power': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'sensing': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'communication': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'actuator': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'processing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'interface': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CircuitDesigner() {
  const [activeTab, setActiveTab] = useState<'designer' | 'blocks' | 'library' | 'export'>('designer');
  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [wires, setWires] = useState<CircuitWire[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [_selectedBlock, setSelectedBlock] = useState<CircuitBlock | null>(null);
  const [usedBlocks, setUsedBlocks] = useState<CircuitBlock[]>([]);
  const [blockConnections, setBlockConnections] = useState<{ from: string; fromPin: string; to: string; toPin: string }[]>([]);
  const [gridSnap, setGridSnap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<{ blockId: string; pin: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw circuit on canvas
  useEffect(() => {
    drawCircuit();
  }, [components, wires, selectedComponent, zoom, showGrid]);

  const drawCircuit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;
      const gridSize = 20 * zoom;
      for (let x = 0; x < rect.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rect.height);
        ctx.stroke();
      }
      for (let y = 0; y < rect.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width, y);
        ctx.stroke();
      }
    }

    // Draw wires
    wires.forEach(wire => {
      ctx.strokeStyle = '#65e2ff';
      ctx.lineWidth = 2 * zoom;
      ctx.beginPath();
      if (wire.points.length > 0) {
        ctx.moveTo(wire.points[0][0] * zoom, wire.points[0][1] * zoom);
        wire.points.slice(1).forEach(p => ctx.lineTo(p[0] * zoom, p[1] * zoom));
      }
      ctx.stroke();
    });

    // Draw components
    components.forEach(comp => {
      const isSelected = comp.id === selectedComponent;
      const color = getComponentColor(comp.type);
      const x = comp.x * zoom;
      const y = comp.y * zoom;
      const w = (comp.type === 'mcu' || comp.type === 'ic' ? 80 : comp.type === 'sensor' ? 60 : 50) * zoom;
      const h = (comp.type === 'mcu' ? 60 : comp.type === 'ic' || comp.type === 'sensor' ? 50 : 30) * zoom;

      // Component body
      ctx.fillStyle = isSelected ? color + '40' : color + '20';
      ctx.strokeStyle = isSelected ? '#65e2ff' : color;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - h / 2, w, h, 4 * zoom);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = '#e2e8f0';
      ctx.font = `${10 * zoom}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(comp.label, x, y - 2 * zoom);
      if (comp.value) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${8 * zoom}px monospace`;
        ctx.fillText(comp.value, x, y + 10 * zoom);
      }

      // Pins
      comp.pins.forEach((pin) => {
        const pinX = x + pin.x * zoom;
        const pinY = y + pin.y * zoom;
        ctx.fillStyle = getPinColor(pin.type);
        ctx.beginPath();
        ctx.arc(pinX, pinY, 3 * zoom, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.font = `${7 * zoom}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(pin.label, pinX, pinY - 5 * zoom);
      });
    });
  }, [components, wires, selectedComponent, zoom, showGrid]);

  // Add component to canvas
  const addComponent = useCallback((type: CircuitComponent['type'], label: string, value?: string, pins?: Omit<CircuitPin, 'x' | 'y'>[]) => {
    const pinsWithPositions: CircuitPin[] = (pins || []).map((pin, i) => {
      const totalPins = (pins || []).length;
      const spacing = 15;
      const startY = -(totalPins - 1) * spacing / 2;
      return {
        ...pin,
        x: i % 2 === 0 ? -30 : 30,
        y: startY + Math.floor(i / 2) * spacing,
      };
    });

    const newComp: CircuitComponent = {
      id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      label,
      value,
      x: 200 + Math.random() * 200,
      y: 150 + Math.random() * 100,
      rotation: 0,
      pins: pinsWithPositions,
    };

    setComponents(prev => [...prev, newComp]);
    setSelectedComponent(newComp.id);
  }, []);

  // Add pre-built block
  const addBlock = useCallback((block: CircuitBlock) => {
    setUsedBlocks(prev => [...prev, { ...block, id: `${block.id}-${Date.now()}` }]);
  }, []);

  // Handle canvas mouse events
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Find clicked component
    const clicked = components.find(comp => {
      const w = comp.type === 'mcu' || comp.type === 'ic' ? 80 : comp.type === 'sensor' ? 60 : 50;
      const h = comp.type === 'mcu' ? 60 : comp.type === 'ic' || comp.type === 'sensor' ? 50 : 30;
      return x > comp.x - w / 2 && x < comp.x + w / 2 && y > comp.y - h / 2 && y < comp.y + h / 2;
    });

    if (clicked) {
      setSelectedComponent(clicked.id);
      setDragging(clicked.id);
      setDragOffset({ x: x - clicked.x, y: y - clicked.y });
    } else {
      setSelectedComponent(null);
    }
  }, [components, zoom]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let x = (e.clientX - rect.left) / zoom - dragOffset.x;
    let y = (e.clientY - rect.top) / zoom - dragOffset.y;

    if (gridSnap) {
      x = Math.round(x / 20) * 20;
      y = Math.round(y / 20) * 20;
    }

    setComponents(prev => prev.map(c => c.id === dragging ? { ...c, x, y } : c));
  }, [dragging, zoom, dragOffset, gridSnap]);

  const handleCanvasMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Delete selected component
  const deleteSelected = useCallback(() => {
    if (!selectedComponent) return;
    setComponents(prev => prev.filter(c => c.id !== selectedComponent));
    setWires(prev => prev.filter(w => w.from_component !== selectedComponent && w.to_component !== selectedComponent));
    setSelectedComponent(null);
  }, [selectedComponent]);

  return (
    <div className="flex flex-col h-full bg-[#04060a] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gradient-to-r from-gray-900/80 to-[#04060a]">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-white text-sm">Electronics Designer</h2>
          <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
            {components.length} components
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['designer', 'blocks', 'library', 'export'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === tab
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'designer' ? 'Circuit Canvas' :
               tab === 'blocks' ? 'Circuit Blocks' :
               tab === 'library' ? 'Component Library' : 'Export'}
            </button>
          ))}
        </div>
      </div>

      {/* Designer Tab */}
      {activeTab === 'designer' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800/50 bg-[#0a0e14]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-2 py-1 text-xs rounded ${showGrid ? 'bg-gray-700 text-gray-300' : 'text-gray-600'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setGridSnap(!gridSnap)}
                className={`px-2 py-1 text-xs rounded ${gridSnap ? 'bg-gray-700 text-gray-300' : 'text-gray-600'}`}
              >
                Snap
              </button>
              <div className="flex items-center gap-1 ml-2">
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="px-1.5 py-0.5 text-xs text-gray-400 bg-gray-800 rounded">-</button>
                <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="px-1.5 py-0.5 text-xs text-gray-400 bg-gray-800 rounded">+</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedComponent && (
                <>
                  <button
                    onClick={() => {
                      setComponents(prev => prev.map(c => c.id === selectedComponent ? { ...c, rotation: c.rotation + 90 } : c));
                    }}
                    className="px-2 py-1 text-xs bg-gray-800 text-gray-400 rounded hover:text-white"
                  >
                    Rotate
                  </button>
                  <button
                    onClick={deleteSelected}
                    className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />

            {/* Quick-add floating panel */}
            <div className="absolute top-2 right-2 bg-gray-900/90 border border-gray-700/50 rounded-lg p-2 max-w-[140px]">
              <p className="text-[10px] text-gray-500 mb-1">Quick Add</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { type: 'resistor' as const, label: 'R', pins: COMPONENT_LIBRARY[0].items[0].pins },
                  { type: 'capacitor' as const, label: 'C', pins: COMPONENT_LIBRARY[0].items[1].pins },
                  { type: 'led' as const, label: 'LED', pins: COMPONENT_LIBRARY[1].items[0].pins },
                  { type: 'mcu' as const, label: 'MCU', pins: COMPONENT_LIBRARY[2].items[0].pins },
                  { type: 'sensor' as const, label: 'Sensor', pins: COMPONENT_LIBRARY[2].items[2].pins },
                  { type: 'connector' as const, label: 'Conn', pins: COMPONENT_LIBRARY[2].items[3].pins },
                ].map(item => (
                  <button
                    key={item.type}
                    onClick={() => addComponent(item.type, item.label, undefined, item.pins)}
                    className="px-1.5 py-1 text-[10px] rounded bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                    style={{ borderLeft: `2px solid ${getComponentColor(item.type)}` }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Circuit Blocks Tab */}
      {activeTab === 'blocks' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Pre-built Circuit Blocks</h3>
            <p className="text-xs text-gray-500 mb-3">Drag blocks to join them together. Connect input/output pins between blocks.</p>
          </div>

          {/* Available Blocks */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {CIRCUIT_BLOCKS.map(block => (
              <div
                key={block.id}
                className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 cursor-pointer hover:border-purple-500/30 transition-colors"
                onClick={() => { setSelectedBlock(block); addBlock(block); }}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-medium text-white">{block.name}</h4>
                  <span className={`px-1.5 py-0.5 text-[9px] rounded border ${getCategoryColor(block.category)}`}>
                    {block.category}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mb-2">{block.description}</p>
                <div className="flex items-center justify-between text-[9px]">
                  <div className="flex items-center gap-1">
                    <span className="text-green-400">IN:</span>
                    <span className="text-gray-400">{block.input_pins.join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400">OUT:</span>
                    <span className="text-gray-400">{block.output_pins.join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Used Blocks */}
          {usedBlocks.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Active Blocks ({usedBlocks.length})</h3>
              <div className="space-y-2 mb-4">
                {usedBlocks.map((block, idx) => (
                  <div key={block.id} className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-white">{block.name} #{idx + 1}</span>
                      <button
                        onClick={() => setUsedBlocks(prev => prev.filter(b => b.id !== block.id))}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] text-green-400 mb-1">Input Pins</p>
                        {block.input_pins.map(pin => (
                          <button
                            key={pin}
                            onClick={() => {
                              if (connectingFrom) {
                                setBlockConnections(prev => [...prev, {
                                  from: connectingFrom.blockId,
                                  fromPin: connectingFrom.pin,
                                  to: block.id,
                                  toPin: pin,
                                }]);
                                setConnectingFrom(null);
                              } else {
                                setConnectingFrom({ blockId: block.id, pin });
                              }
                            }}
                            className={`block w-full text-left px-2 py-0.5 text-[10px] rounded mb-0.5 transition-colors ${
                              connectingFrom?.blockId === block.id && connectingFrom?.pin === pin
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                            }`}
                          >
                            {pin}
                          </button>
                        ))}
                      </div>
                      <div>
                        <p className="text-[9px] text-blue-400 mb-1">Output Pins</p>
                        {block.output_pins.map(pin => (
                          <button
                            key={pin}
                            onClick={() => {
                              if (connectingFrom) {
                                setBlockConnections(prev => [...prev, {
                                  from: block.id,
                                  fromPin: pin,
                                  to: connectingFrom.blockId,
                                  toPin: connectingFrom.pin,
                                }]);
                                setConnectingFrom(null);
                              } else {
                                setConnectingFrom({ blockId: block.id, pin });
                              }
                            }}
                            className={`block w-full text-left px-2 py-0.5 text-[10px] rounded mb-0.5 transition-colors ${
                              connectingFrom?.blockId === block.id && connectingFrom?.pin === pin
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                            }`}
                          >
                            {pin}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Block Connections */}
              {blockConnections.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Connections ({blockConnections.length})</h3>
                  {blockConnections.map((conn, i) => {
                    const fromBlock = usedBlocks.find(b => b.id === conn.from);
                    const toBlock = usedBlocks.find(b => b.id === conn.to);
                    return (
                      <div key={i} className="flex items-center gap-2 text-[10px] py-1 border-b border-gray-800/50">
                        <span className="text-cyan-400">{fromBlock?.name || conn.from}</span>
                        <span className="text-gray-600">.</span>
                        <span className="text-blue-400">{conn.fromPin}</span>
                        <span className="text-gray-600">---&gt;</span>
                        <span className="text-cyan-400">{toBlock?.name || conn.to}</span>
                        <span className="text-gray-600">.</span>
                        <span className="text-green-400">{conn.toPin}</span>
                        <button
                          onClick={() => setBlockConnections(prev => prev.filter((_, j) => j !== i))}
                          className="ml-auto text-red-400 hover:text-red-300"
                        >
                          x
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Component Library Tab */}
      {activeTab === 'library' && (
        <div className="flex-1 overflow-y-auto p-4">
          {COMPONENT_LIBRARY.map(category => (
            <div key={category.category} className="mb-4">
              <h3 className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">{category.category}</h3>
              <div className="grid grid-cols-2 gap-2">
                {category.items.map(item => (
                  <button
                    key={item.type + item.label}
                    onClick={() => addComponent(item.type, item.label, item.defaultValue, item.pins)}
                    className="p-2 bg-gray-800/40 border border-gray-700/50 rounded-lg text-left hover:border-purple-500/30 transition-colors"
                    style={{ borderLeftWidth: 3, borderLeftColor: getComponentColor(item.type) }}
                  >
                    <div className="text-xs font-medium text-white">{item.label}</div>
                    {item.defaultValue && <div className="text-[10px] text-gray-500">{item.defaultValue}</div>}
                    <div className="text-[9px] text-gray-600 mt-1">{item.pins.length} pins</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Export Circuit Design</h3>
          <div className="space-y-3">
            {[
              { format: 'KiCad', ext: '.kicad_sch', desc: 'KiCad schematic format' },
              { format: 'Eagle', ext: '.sch', desc: 'Autodesk Eagle schematic' },
              { format: 'Gerber', ext: '.gbr', desc: 'PCB fabrication files (Gerber RS-274X)' },
              { format: 'BOM', ext: '.csv', desc: 'Bill of Materials spreadsheet' },
              { format: 'SPICE', ext: '.spice', desc: 'SPICE netlist for simulation' },
              { format: 'JSON', ext: '.json', desc: 'Raw circuit data (MOTHER format)' },
            ].map(exp => (
              <button
                key={exp.format}
                className="w-full p-3 bg-gray-800/40 border border-gray-700/50 rounded-lg text-left hover:border-purple-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{exp.format}</div>
                    <div className="text-xs text-gray-500">{exp.desc}</div>
                  </div>
                  <span className="text-xs text-gray-600 font-mono">{exp.ext}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
            <h4 className="text-xs font-medium text-gray-400 mb-2">Design Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Components:</span>
                <span className="text-white ml-2">{components.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Wires:</span>
                <span className="text-white ml-2">{wires.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Blocks:</span>
                <span className="text-white ml-2">{usedBlocks.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Connections:</span>
                <span className="text-white ml-2">{blockConnections.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
