// VisionFlow Knowledge Visualizer - Main panel integrating 3D knowledge graph
// with robot understanding metrics, cognitive state, and agent telemetry
import { useState, useMemo } from 'react';
import {
  KnowledgeGraph3D,
  KnowledgeNode,
  KnowledgeGraphData,
} from './KnowledgeGraph3D';

// ============================================
// ROBOT KNOWLEDGE DATA
// ============================================

const ROBOT_KNOWLEDGE: KnowledgeGraphData = {
  nodes: [
    // MOTHER CORE - Sovereign Reasoning
    { id: 'mc-reasoning', label: 'Reasoning Engine', type: 'model', domain: 'mother_core', depth: 0, authority: 1.0, connections: 12, status: 'active' },
    { id: 'mc-planning', label: 'Task Planning', type: 'skill', domain: 'mother_core', depth: 1, authority: 0.9, connections: 8, status: 'active' },
    { id: 'mc-language', label: 'Language Understanding', type: 'skill', domain: 'mother_core', depth: 1, authority: 0.85, connections: 6, status: 'active' },
    { id: 'mc-ethics', label: 'Ethical Reasoning', type: 'policy', domain: 'mother_core', depth: 1, authority: 0.95, connections: 5, status: 'active' },
    { id: 'mc-context', label: 'Context Awareness', type: 'concept', domain: 'mother_core', depth: 2, authority: 0.7, connections: 4, status: 'active' },
    { id: 'mc-multimodal', label: 'Multimodal Fusion', type: 'skill', domain: 'mother_core', depth: 2, authority: 0.75, connections: 5, status: 'learning' },

    // GR00T N1 - Physical Intelligence
    { id: 'gn-sys2', label: 'System 2 VLM', type: 'model', domain: 'groot_n1', depth: 0, authority: 0.95, connections: 10, status: 'active' },
    { id: 'gn-sys1', label: 'System 1 Action', type: 'model', domain: 'groot_n1', depth: 0, authority: 0.9, connections: 8, status: 'active' },
    { id: 'gn-diffusion', label: 'Diffusion Policy', type: 'skill', domain: 'groot_n1', depth: 1, authority: 0.85, connections: 6, status: 'active' },
    { id: 'gn-transformer', label: 'Action Transformer', type: 'skill', domain: 'groot_n1', depth: 1, authority: 0.8, connections: 5, status: 'active' },
    { id: 'gn-embodied', label: 'Embodied Reasoning', type: 'concept', domain: 'groot_n1', depth: 2, authority: 0.7, connections: 4, status: 'learning' },

    // Defence Domain
    { id: 'df-doctrine', label: 'MoD Doctrine', type: 'doctrine', domain: 'defence', depth: 0, authority: 0.9, connections: 7, status: 'active' },
    { id: 'df-roe', label: 'Rules of Engagement', type: 'policy', domain: 'defence', depth: 1, authority: 0.95, connections: 5, status: 'active' },
    { id: 'df-tactical', label: 'Tactical Movement', type: 'skill', domain: 'defence', depth: 1, authority: 0.8, connections: 4, status: 'active' },
    { id: 'df-weapons', label: 'Weapons Handling', type: 'skill', domain: 'defence', depth: 2, authority: 0.85, connections: 3, status: 'idle' },
    { id: 'df-nato', label: 'NATO STANAG', type: 'doctrine', domain: 'defence', depth: 2, authority: 0.7, connections: 3, status: 'active' },

    // Legal Domain
    { id: 'lg-euai', label: 'EU AI Act', type: 'policy', domain: 'legal', depth: 0, authority: 0.9, connections: 6, status: 'active' },
    { id: 'lg-gdpr', label: 'GDPR Compliance', type: 'policy', domain: 'legal', depth: 1, authority: 0.85, connections: 4, status: 'active' },
    { id: 'lg-ukdpa', label: 'UK Data Protection', type: 'policy', domain: 'legal', depth: 1, authority: 0.8, connections: 4, status: 'active' },
    { id: 'lg-equality', label: 'Equality Act', type: 'policy', domain: 'legal', depth: 2, authority: 0.6, connections: 2, status: 'active' },

    // Robotics Domain
    { id: 'rb-locomotion', label: 'Bipedal Locomotion', type: 'skill', domain: 'robotics', depth: 0, authority: 0.9, connections: 7, status: 'active' },
    { id: 'rb-balance', label: 'Dynamic Balance', type: 'skill', domain: 'robotics', depth: 1, authority: 0.85, connections: 5, status: 'active' },
    { id: 'rb-grasp', label: 'Object Grasping', type: 'skill', domain: 'robotics', depth: 1, authority: 0.8, connections: 4, status: 'active' },
    { id: 'rb-navigate', label: 'Navigation', type: 'skill', domain: 'robotics', depth: 1, authority: 0.75, connections: 4, status: 'learning' },
    { id: 'rb-stairs', label: 'Stair Navigation', type: 'skill', domain: 'robotics', depth: 2, authority: 0.65, connections: 3, status: 'learning' },
    { id: 'rb-iso', label: 'ISO 10218', type: 'policy', domain: 'robotics', depth: 2, authority: 0.7, connections: 3, status: 'active' },

    // Memory Domain
    { id: 'mm-qdrant', label: 'Vector Memory', type: 'data', domain: 'memory', depth: 0, authority: 0.8, connections: 8, status: 'active' },
    { id: 'mm-neo4j', label: 'Graph Memory', type: 'data', domain: 'memory', depth: 0, authority: 0.85, connections: 9, status: 'active' },
    { id: 'mm-episodic', label: 'Episodic Memory', type: 'memory', domain: 'memory', depth: 1, authority: 0.7, connections: 5, status: 'active' },
    { id: 'mm-semantic', label: 'Semantic Memory', type: 'memory', domain: 'memory', depth: 1, authority: 0.75, connections: 6, status: 'active' },
    { id: 'mm-hansard', label: 'Hansard Corpus', type: 'data', domain: 'memory', depth: 2, authority: 0.5, connections: 2, status: 'active' },
    { id: 'mm-bbc', label: 'BBC Training Data', type: 'data', domain: 'memory', depth: 2, authority: 0.5, connections: 2, status: 'active' },

    // Perception Domain
    { id: 'pc-vision', label: 'Computer Vision', type: 'sensor', domain: 'perception', depth: 0, authority: 0.85, connections: 6, status: 'active' },
    { id: 'pc-depth', label: 'Depth Sensing', type: 'sensor', domain: 'perception', depth: 1, authority: 0.7, connections: 4, status: 'active' },
    { id: 'pc-imu', label: 'IMU Fusion', type: 'sensor', domain: 'perception', depth: 1, authority: 0.75, connections: 4, status: 'active' },
    { id: 'pc-force', label: 'Force Sensing', type: 'sensor', domain: 'perception', depth: 1, authority: 0.65, connections: 3, status: 'active' },
    { id: 'pc-object', label: 'Object Recognition', type: 'skill', domain: 'perception', depth: 2, authority: 0.7, connections: 3, status: 'active' },
    { id: 'pc-scene', label: 'Scene Understanding', type: 'skill', domain: 'perception', depth: 2, authority: 0.65, connections: 3, status: 'learning' },

    // Action Domain
    { id: 'ac-motor', label: 'Motor Control', type: 'actuator', domain: 'action', depth: 0, authority: 0.85, connections: 7, status: 'active' },
    { id: 'ac-servo', label: 'Servo Coordination', type: 'actuator', domain: 'action', depth: 1, authority: 0.8, connections: 4, status: 'active' },
    { id: 'ac-speech', label: 'Speech Synthesis', type: 'actuator', domain: 'action', depth: 1, authority: 0.6, connections: 3, status: 'active' },
    { id: 'ac-gesture', label: 'Gesture Generation', type: 'skill', domain: 'action', depth: 2, authority: 0.55, connections: 2, status: 'learning' },

    // Agent Nodes
    { id: 'ag-exo1', label: 'EXO-1 Agent', type: 'agent', domain: 'robotics', depth: 0, authority: 1.0, connections: 15, status: 'active', metadata: { firmware: 'v2.1.0', uptime: '47h 23m' } },
    { id: 'ag-mother', label: 'MOTHER Agent', type: 'agent', domain: 'mother_core', depth: 0, authority: 1.0, connections: 14, status: 'active', metadata: { model: '70B', inference: '340ms' } },
  ],
  edges: [
    // MOTHER CORE internal
    { id: 'e1', source: 'mc-reasoning', target: 'mc-planning', type: 'hierarchical', weight: 0.9 },
    { id: 'e2', source: 'mc-reasoning', target: 'mc-language', type: 'hierarchical', weight: 0.85 },
    { id: 'e3', source: 'mc-reasoning', target: 'mc-ethics', type: 'hierarchical', weight: 0.95 },
    { id: 'e4', source: 'mc-planning', target: 'mc-context', type: 'dependency', weight: 0.7 },
    { id: 'e5', source: 'mc-language', target: 'mc-multimodal', type: 'semantic', weight: 0.6 },

    // GR00T N1 internal
    { id: 'e6', source: 'gn-sys2', target: 'gn-sys1', type: 'data_flow', weight: 0.95 },
    { id: 'e7', source: 'gn-sys1', target: 'gn-diffusion', type: 'hierarchical', weight: 0.85 },
    { id: 'e8', source: 'gn-sys1', target: 'gn-transformer', type: 'hierarchical', weight: 0.8 },
    { id: 'e9', source: 'gn-sys2', target: 'gn-embodied', type: 'causal', weight: 0.7 },

    // MOTHER <-> GR00T convergence
    { id: 'e10', source: 'mc-reasoning', target: 'gn-sys2', type: 'inference', weight: 1.0 },
    { id: 'e11', source: 'mc-planning', target: 'gn-sys1', type: 'data_flow', weight: 0.9 },
    { id: 'e12', source: 'mc-multimodal', target: 'gn-embodied', type: 'semantic', weight: 0.7 },

    // Defence connections
    { id: 'e13', source: 'df-doctrine', target: 'df-roe', type: 'hierarchical', weight: 0.9 },
    { id: 'e14', source: 'df-doctrine', target: 'df-tactical', type: 'hierarchical', weight: 0.8 },
    { id: 'e15', source: 'df-tactical', target: 'df-weapons', type: 'dependency', weight: 0.7 },
    { id: 'e16', source: 'df-doctrine', target: 'df-nato', type: 'semantic', weight: 0.7 },
    { id: 'e17', source: 'df-roe', target: 'mc-ethics', type: 'dependency', weight: 0.9 },
    { id: 'e18', source: 'df-tactical', target: 'rb-locomotion', type: 'dependency', weight: 0.7 },

    // Legal connections
    { id: 'e19', source: 'lg-euai', target: 'lg-gdpr', type: 'hierarchical', weight: 0.8 },
    { id: 'e20', source: 'lg-euai', target: 'lg-ukdpa', type: 'hierarchical', weight: 0.8 },
    { id: 'e21', source: 'lg-ukdpa', target: 'lg-equality', type: 'semantic', weight: 0.5 },
    { id: 'e22', source: 'lg-euai', target: 'mc-ethics', type: 'dependency', weight: 0.9 },
    { id: 'e23', source: 'lg-gdpr', target: 'pc-vision', type: 'dependency', weight: 0.6 },

    // Robotics connections
    { id: 'e24', source: 'rb-locomotion', target: 'rb-balance', type: 'dependency', weight: 0.9 },
    { id: 'e25', source: 'rb-locomotion', target: 'rb-navigate', type: 'semantic', weight: 0.7 },
    { id: 'e26', source: 'rb-navigate', target: 'rb-stairs', type: 'dependency', weight: 0.6 },
    { id: 'e27', source: 'rb-grasp', target: 'gn-diffusion', type: 'data_flow', weight: 0.8 },
    { id: 'e28', source: 'rb-balance', target: 'pc-imu', type: 'data_flow', weight: 0.85 },
    { id: 'e29', source: 'rb-iso', target: 'mc-ethics', type: 'dependency', weight: 0.7 },

    // Memory connections
    { id: 'e30', source: 'mm-qdrant', target: 'mm-semantic', type: 'data_flow', weight: 0.8 },
    { id: 'e31', source: 'mm-neo4j', target: 'mm-episodic', type: 'data_flow', weight: 0.85 },
    { id: 'e32', source: 'mm-neo4j', target: 'mc-reasoning', type: 'inference', weight: 0.9 },
    { id: 'e33', source: 'mm-qdrant', target: 'mc-context', type: 'inference', weight: 0.8 },
    { id: 'e34', source: 'mm-semantic', target: 'mm-hansard', type: 'data_flow', weight: 0.5 },
    { id: 'e35', source: 'mm-semantic', target: 'mm-bbc', type: 'data_flow', weight: 0.5 },

    // Perception connections
    { id: 'e36', source: 'pc-vision', target: 'pc-depth', type: 'dependency', weight: 0.8 },
    { id: 'e37', source: 'pc-vision', target: 'pc-object', type: 'hierarchical', weight: 0.7 },
    { id: 'e38', source: 'pc-object', target: 'pc-scene', type: 'semantic', weight: 0.6 },
    { id: 'e39', source: 'pc-vision', target: 'gn-sys2', type: 'data_flow', weight: 0.9 },
    { id: 'e40', source: 'pc-imu', target: 'rb-balance', type: 'data_flow', weight: 0.85 },
    { id: 'e41', source: 'pc-force', target: 'rb-grasp', type: 'data_flow', weight: 0.7 },

    // Action connections
    { id: 'e42', source: 'ac-motor', target: 'ac-servo', type: 'hierarchical', weight: 0.85 },
    { id: 'e43', source: 'ac-motor', target: 'gn-sys1', type: 'data_flow', weight: 0.9 },
    { id: 'e44', source: 'ac-speech', target: 'mc-language', type: 'dependency', weight: 0.7 },
    { id: 'e45', source: 'ac-gesture', target: 'gn-diffusion', type: 'data_flow', weight: 0.6 },

    // Agent connections
    { id: 'e46', source: 'ag-exo1', target: 'ac-motor', type: 'data_flow', weight: 1.0 },
    { id: 'e47', source: 'ag-exo1', target: 'pc-vision', type: 'data_flow', weight: 0.9 },
    { id: 'e48', source: 'ag-exo1', target: 'rb-locomotion', type: 'dependency', weight: 0.9 },
    { id: 'e49', source: 'ag-mother', target: 'mc-reasoning', type: 'hierarchical', weight: 1.0 },
    { id: 'e50', source: 'ag-mother', target: 'mm-neo4j', type: 'data_flow', weight: 0.9 },
    { id: 'e51', source: 'ag-mother', target: 'ag-exo1', type: 'inference', weight: 0.95 },
  ],
};

// ============================================
// DOMAIN COLORS
// ============================================

const DOMAIN_COLORS: Record<string, string> = {
  mother_core: '#4FC3F7',
  groot_n1: '#76b900',
  defence: '#EF5350',
  legal: '#AA96DA',
  robotics: '#4ECDC4',
  memory: '#FFD54F',
  perception: '#81C784',
  action: '#FFB74D',
};

const DOMAIN_LABELS: Record<string, string> = {
  mother_core: 'MOTHER Core',
  groot_n1: 'GR00T N1',
  defence: 'Defence',
  legal: 'Legal',
  robotics: 'Robotics',
  memory: 'Memory',
  perception: 'Perception',
  action: 'Action',
};

// ============================================
// MAIN COMPONENT
// ============================================

export function VisionFlowPanel() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [visualMode, setVisualMode] = useState<'knowledge' | 'ontology' | 'agent'>('knowledge');
  const [showMetrics, setShowMetrics] = useState(true);
  const [filterDomain, setFilterDomain] = useState<string | null>(null);

  // Filter data by domain
  const filteredData = useMemo<KnowledgeGraphData>(() => {
    if (!filterDomain) return ROBOT_KNOWLEDGE;
    const filteredNodes = ROBOT_KNOWLEDGE.nodes.filter(n => n.domain === filterDomain);
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = ROBOT_KNOWLEDGE.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [filterDomain]);

  // Get selected node details
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return ROBOT_KNOWLEDGE.nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId]);

  // Compute connected nodes
  const connectedNodes = useMemo(() => {
    if (!selectedNodeId) return [];
    const connected: KnowledgeNode[] = [];
    ROBOT_KNOWLEDGE.edges.forEach(e => {
      if (e.source === selectedNodeId) {
        const node = ROBOT_KNOWLEDGE.nodes.find(n => n.id === e.target);
        if (node) connected.push(node);
      }
      if (e.target === selectedNodeId) {
        const node = ROBOT_KNOWLEDGE.nodes.find(n => n.id === e.source);
        if (node) connected.push(node);
      }
    });
    return connected;
  }, [selectedNodeId]);

  // Compute domain stats
  const domainStats = useMemo(() => {
    const stats: Record<string, { total: number; active: number; learning: number }> = {};
    ROBOT_KNOWLEDGE.nodes.forEach(n => {
      if (!stats[n.domain]) stats[n.domain] = { total: 0, active: 0, learning: 0 };
      stats[n.domain].total++;
      if (n.status === 'active') stats[n.domain].active++;
      if (n.status === 'learning') stats[n.domain].learning++;
    });
    return stats;
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#000022] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60 bg-gradient-to-r from-[#000033] to-[#000022]">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
          <h2 className="font-semibold text-white text-sm">VisionFlow — Robot Knowledge Graph</h2>
          <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
            {ROBOT_KNOWLEDGE.nodes.length} nodes | {ROBOT_KNOWLEDGE.edges.length} edges
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(['knowledge', 'ontology', 'agent'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setVisualMode(mode)}
              className={`px-2 py-1 text-[11px] rounded transition-colors ${
                visualMode === mode
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
          <span className="text-gray-700 mx-1">|</span>
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className={`px-2 py-1 text-[11px] rounded ${showMetrics ? 'bg-gray-700/50 text-gray-300' : 'text-gray-600'}`}
          >
            Metrics
          </button>
        </div>
      </div>

      {/* Domain Filter Bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-800/30 bg-[#000028]">
        <button
          onClick={() => setFilterDomain(null)}
          className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
            !filterDomain ? 'bg-gray-700/50 text-white' : 'text-gray-600 hover:text-gray-400'
          }`}
        >
          All Domains
        </button>
        {Object.entries(DOMAIN_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilterDomain(filterDomain === key ? null : key)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
              filterDomain === key
                ? 'text-white'
                : 'text-gray-600 hover:text-gray-400'
            }`}
            style={{
              backgroundColor: filterDomain === key ? DOMAIN_COLORS[key] + '30' : undefined,
              borderLeft: `2px solid ${DOMAIN_COLORS[key]}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Knowledge Graph */}
        <div className={`${showMetrics ? 'flex-1' : 'w-full'} relative`}>
          <KnowledgeGraph3D
            data={filteredData}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
          />

          {/* Legend overlay */}
          <div className="absolute bottom-3 left-3 bg-[#000033]/80 backdrop-blur border border-gray-800/50 rounded-lg p-2">
            <p className="text-[9px] text-gray-500 mb-1">Edge Types</p>
            <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
              {[
                ['Semantic', '#4FC3F7'],
                ['Causal', '#FF5722'],
                ['Hierarchical', '#AA96DA'],
                ['Dependency', '#FFD54F'],
                ['Data Flow', '#4ECDC4'],
                ['Inference', '#81C784'],
              ].map(([label, color]) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} />
                  <span className="text-[8px] text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Controls hint */}
          <div className="absolute bottom-3 right-3 text-[9px] text-gray-600">
            Drag to rotate | Scroll to zoom | Click node to inspect
          </div>
        </div>

        {/* Metrics Sidebar */}
        {showMetrics && (
          <div className="w-72 border-l border-gray-800/40 bg-[#000028] overflow-y-auto">
            {/* Selected Node Detail */}
            {selectedNode ? (
              <div className="p-3 border-b border-gray-800/40">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: DOMAIN_COLORS[selectedNode.domain] }}
                  />
                  <h3 className="text-sm font-medium text-white">{selectedNode.label}</h3>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] mb-3">
                  <div>
                    <span className="text-gray-600 block">Type</span>
                    <span className="text-gray-300 capitalize">{selectedNode.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">Domain</span>
                    <span className="text-gray-300">{DOMAIN_LABELS[selectedNode.domain]}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">Status</span>
                    <span className={`capitalize ${
                      selectedNode.status === 'active' ? 'text-green-400' :
                      selectedNode.status === 'learning' ? 'text-blue-400' :
                      selectedNode.status === 'error' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>{selectedNode.status}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">Authority</span>
                    <span className="text-gray-300">{(selectedNode.authority * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">Depth</span>
                    <span className="text-gray-300">{selectedNode.depth}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">Connections</span>
                    <span className="text-gray-300">{selectedNode.connections}</span>
                  </div>
                </div>

                {/* Authority bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[9px] text-gray-600 mb-0.5">
                    <span>Authority</span>
                    <span>{(selectedNode.authority * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${selectedNode.authority * 100}%`,
                        backgroundColor: DOMAIN_COLORS[selectedNode.domain],
                      }}
                    />
                  </div>
                </div>

                {/* Metadata */}
                {selectedNode.metadata && (
                  <div className="mb-3">
                    <p className="text-[9px] text-gray-600 mb-1">Metadata</p>
                    {Object.entries(selectedNode.metadata).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-[10px] py-0.5">
                        <span className="text-gray-500">{k}:</span>
                        <span className="text-gray-300 font-mono">{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Connected Nodes */}
                <div>
                  <p className="text-[9px] text-gray-600 mb-1">Connected ({connectedNodes.length})</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {connectedNodes.map(cn => (
                      <button
                        key={cn.id}
                        onClick={() => setSelectedNodeId(cn.id)}
                        className="w-full flex items-center gap-1.5 px-2 py-1 bg-gray-800/30 rounded text-left hover:bg-gray-800/50 transition-colors"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: DOMAIN_COLORS[cn.domain] }}
                        />
                        <span className="text-[10px] text-gray-300 truncate">{cn.label}</span>
                        <span className={`text-[8px] ml-auto shrink-0 ${
                          cn.status === 'active' ? 'text-green-400' :
                          cn.status === 'learning' ? 'text-blue-400' :
                          'text-gray-600'
                        }`}>
                          {cn.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 border-b border-gray-800/40">
                <p className="text-xs text-gray-500 text-center py-4">
                  Click a node to inspect the robot's knowledge
                </p>
              </div>
            )}

            {/* Domain Overview */}
            <div className="p-3 border-b border-gray-800/40">
              <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Cognitive Domains</h3>
              <div className="space-y-2">
                {Object.entries(domainStats).map(([domain, stats]) => (
                  <div key={domain} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: DOMAIN_COLORS[domain] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-400 truncate">{DOMAIN_LABELS[domain]}</span>
                        <span className="text-gray-500 ml-1">{stats.active}/{stats.total}</span>
                      </div>
                      <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-0.5">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(stats.active / stats.total) * 100}%`,
                            backgroundColor: DOMAIN_COLORS[domain],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cognitive Summary */}
            <div className="p-3">
              <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Cognitive State</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800/30 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-cyan-400">
                    {ROBOT_KNOWLEDGE.nodes.filter(n => n.status === 'active').length}
                  </p>
                  <p className="text-[9px] text-gray-600">Active</p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-blue-400">
                    {ROBOT_KNOWLEDGE.nodes.filter(n => n.status === 'learning').length}
                  </p>
                  <p className="text-[9px] text-gray-600">Learning</p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">
                    {ROBOT_KNOWLEDGE.edges.length}
                  </p>
                  <p className="text-[9px] text-gray-600">Connections</p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-green-400">
                    {(ROBOT_KNOWLEDGE.nodes.reduce((s, n) => s + n.authority, 0) / ROBOT_KNOWLEDGE.nodes.length * 100).toFixed(0)}%
                  </p>
                  <p className="text-[9px] text-gray-600">Avg Authority</p>
                </div>
              </div>

              {/* Learning Progress */}
              <div className="mt-3">
                <p className="text-[9px] text-gray-600 mb-1">Knowledge Completeness</p>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-green-500"
                    style={{
                      width: `${(ROBOT_KNOWLEDGE.nodes.filter(n => n.status === 'active').length / ROBOT_KNOWLEDGE.nodes.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[8px] text-gray-600 mt-0.5">
                  <span>
                    {((ROBOT_KNOWLEDGE.nodes.filter(n => n.status === 'active').length / ROBOT_KNOWLEDGE.nodes.length) * 100).toFixed(1)}%
                  </span>
                  <span>{ROBOT_KNOWLEDGE.nodes.length} total nodes</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
