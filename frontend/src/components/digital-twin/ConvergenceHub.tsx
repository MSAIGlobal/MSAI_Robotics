// Convergence Architecture Hub - NVIDIA GR00T N1 + MOTHER AI Integration
// Sovereign Cognitive Layer dashboard for the British Brain convergence
import { useState, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

interface SystemNode {
  id: string;
  name: string;
  type: 'mother_core' | 'mother_specialist' | 'groot_system2' | 'groot_system1' | 'memory' | 'simulation' | 'robot' | 'bridge';
  status: 'online' | 'offline' | 'degraded' | 'syncing';
  metrics: {
    latency_ms: number;
    throughput: number;
    cpu: number;
    memory: number;
    gpu?: number;
  };
  description: string;
}

interface IntegrationLayer {
  id: string;
  name: string;
  nvidia_component: string;
  mother_component: string;
  mechanism: string;
  status: 'active' | 'configuring' | 'inactive' | 'error';
  last_sync: string;
  data_flow_rate: number;
}

interface SovereigntyCheck {
  id: string;
  check_name: string;
  category: 'data_residency' | 'model_provenance' | 'audit_trail' | 'compliance' | 'encryption';
  status: 'pass' | 'fail' | 'warning' | 'pending';
  details: string;
  last_checked: string;
}

interface SkillPrimitive {
  id: string;
  name: string;
  source: string;
  category: 'locomotion' | 'manipulation' | 'perception' | 'communication' | 'tactical';
  compliance: string[];
  verified: boolean;
  last_tested: string;
}

interface TrainingPipeline {
  id: string;
  name: string;
  type: 'post_training' | 'synthetic_data' | 'fine_tuning' | 'evaluation';
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  dataset: string;
  framework: string;
  sovereign_data: boolean;
}

interface GraphNode {
  entity: string;
  type: string;
  properties: Record<string, string>;
}

interface GraphRelation {
  from: string;
  relation: string;
  to: string;
}

// ============================================
// SYSTEM ARCHITECTURE DATA
// ============================================

const SYSTEM_NODES: SystemNode[] = [
  {
    id: 'mother-core',
    name: 'MOTHER CORE 70B',
    type: 'mother_core',
    status: 'online',
    metrics: { latency_ms: 340, throughput: 142, cpu: 45, memory: 78, gpu: 85 },
    description: 'Sovereign reasoning & planning engine',
  },
  {
    id: 'mother-legal',
    name: 'MOTHER LEGAL 7B',
    type: 'mother_specialist',
    status: 'online',
    metrics: { latency_ms: 89, throughput: 450, cpu: 22, memory: 34, gpu: 45 },
    description: 'Legal & compliance specialist model',
  },
  {
    id: 'mother-defence',
    name: 'MOTHER DEFENCE 7B',
    type: 'mother_specialist',
    status: 'online',
    metrics: { latency_ms: 95, throughput: 420, cpu: 25, memory: 36, gpu: 48 },
    description: 'Defence & tactical doctrine specialist',
  },
  {
    id: 'mother-robotics',
    name: 'MOTHER ROBOTICS 7B',
    type: 'mother_specialist',
    status: 'online',
    metrics: { latency_ms: 78, throughput: 510, cpu: 20, memory: 30, gpu: 42 },
    description: 'Robotics control & motion specialist',
  },
  {
    id: 'groot-sys2',
    name: 'GR00T N1 System 2',
    type: 'groot_system2',
    status: 'online',
    metrics: { latency_ms: 120, throughput: 280, cpu: 35, memory: 52, gpu: 72 },
    description: 'Vision-Language Model (slow thinking)',
  },
  {
    id: 'groot-sys1',
    name: 'GR00T N1 System 1',
    type: 'groot_system1',
    status: 'online',
    metrics: { latency_ms: 15, throughput: 1200, cpu: 60, memory: 45, gpu: 90 },
    description: 'Diffusion Policy / Action Transformer (fast action)',
  },
  {
    id: 'memory-vector',
    name: 'Qdrant Vector DB',
    type: 'memory',
    status: 'online',
    metrics: { latency_ms: 5, throughput: 10000, cpu: 15, memory: 62, gpu: 0 },
    description: 'Vector embeddings for semantic search',
  },
  {
    id: 'memory-graph',
    name: 'Neo4j Graph DB',
    type: 'memory',
    status: 'online',
    metrics: { latency_ms: 8, throughput: 5000, cpu: 20, memory: 55, gpu: 0 },
    description: 'Knowledge graph for institutional memory',
  },
  {
    id: 'isaac-sim',
    name: 'Isaac Sim / Newton',
    type: 'simulation',
    status: 'online',
    metrics: { latency_ms: 45, throughput: 60, cpu: 40, memory: 68, gpu: 82 },
    description: 'Physics simulation for training & validation',
  },
  {
    id: 'api-bridge',
    name: 'API Bridge Layer',
    type: 'bridge',
    status: 'online',
    metrics: { latency_ms: 3, throughput: 50000, cpu: 8, memory: 12, gpu: 0 },
    description: 'Secure low-latency bridge (MOTHER <-> GR00T)',
  },
  {
    id: 'exo1-robot',
    name: 'EXO-1 Humanoid',
    type: 'robot',
    status: 'online',
    metrics: { latency_ms: 2, throughput: 0, cpu: 30, memory: 40, gpu: 55 },
    description: 'Physical humanoid robot platform',
  },
];

const INTEGRATION_LAYERS: IntegrationLayer[] = [
  {
    id: 'il-1',
    name: 'High-Level Reasoning',
    nvidia_component: 'System 2 (VLM)',
    mother_component: 'MOTHER CORE 70B + Neo4j',
    mechanism: 'Replace/augment GR00T VLM planning with jurisdiction-aware reasoning',
    status: 'active',
    last_sync: new Date().toISOString(),
    data_flow_rate: 142,
  },
  {
    id: 'il-2',
    name: 'Domain Task Execution',
    nvidia_component: 'System 1 (Generalised Skills)',
    mother_component: 'MOTHER DEFENCE / LEGAL / ROBOTICS',
    mechanism: 'Specialist models supervise action primitives for doctrinal compliance',
    status: 'active',
    last_sync: new Date().toISOString(),
    data_flow_rate: 450,
  },
  {
    id: 'il-3',
    name: 'Persistent Memory & Audit',
    nvidia_component: 'Training Data + Context',
    mother_component: 'Qdrant + Neo4j Memory',
    mechanism: 'Episodic memory with traceable triples for EU AI Act compliance',
    status: 'active',
    last_sync: new Date().toISOString(),
    data_flow_rate: 5000,
  },
  {
    id: 'il-4',
    name: 'Sovereign Simulation',
    nvidia_component: 'Newton Physics + Isaac Lab',
    mother_component: 'UK/EU Training Datasets',
    mechanism: 'Generate sovereign synthetic training data using UK regulatory constraints',
    status: 'configuring',
    last_sync: new Date().toISOString(),
    data_flow_rate: 60,
  },
  {
    id: 'il-5',
    name: 'Secure Deployment',
    nvidia_component: 'H200 GPU Compute',
    mother_component: 'Air-Gapped UK Infrastructure',
    mechanism: 'Full stack on UK-sovereign infrastructure with data jurisdiction controls',
    status: 'active',
    last_sync: new Date().toISOString(),
    data_flow_rate: 0,
  },
];

const SOVEREIGNTY_CHECKS: SovereigntyCheck[] = [
  { id: 'sc-1', check_name: 'Data Residency - UK', category: 'data_residency', status: 'pass', details: 'All training data stored on UK sovereign infrastructure', last_checked: new Date().toISOString() },
  { id: 'sc-2', check_name: 'Model Provenance Chain', category: 'model_provenance', status: 'pass', details: 'Full provenance chain from base model to deployed checkpoint', last_checked: new Date().toISOString() },
  { id: 'sc-3', check_name: 'Audit Trail Integrity', category: 'audit_trail', status: 'pass', details: 'All action-decision pairs logged with hash verification', last_checked: new Date().toISOString() },
  { id: 'sc-4', check_name: 'EU AI Act Compliance', category: 'compliance', status: 'pass', details: 'High-risk AI system requirements met (Art. 6-51)', last_checked: new Date().toISOString() },
  { id: 'sc-5', check_name: 'UK Data Protection Act', category: 'compliance', status: 'pass', details: 'DPIA completed, ICO notification filed', last_checked: new Date().toISOString() },
  { id: 'sc-6', check_name: 'MoD Security Classification', category: 'encryption', status: 'warning', details: 'OFFICIAL-SENSITIVE cleared. SECRET clearance pending', last_checked: new Date().toISOString() },
  { id: 'sc-7', check_name: 'Air-Gap Verification', category: 'data_residency', status: 'pass', details: 'Network isolation confirmed - no external egress detected', last_checked: new Date().toISOString() },
  { id: 'sc-8', check_name: 'Encryption at Rest (AES-256)', category: 'encryption', status: 'pass', details: 'All persistent storage encrypted with UK-managed keys', last_checked: new Date().toISOString() },
];

const SKILL_PRIMITIVES: SkillPrimitive[] = [
  { id: 'sk-1', name: 'Bipedal Walk', source: 'GR00T N1 + MOTHER', category: 'locomotion', compliance: ['UK H&S', 'ISO 10218'], verified: true, last_tested: new Date().toISOString() },
  { id: 'sk-2', name: 'Object Grasp', source: 'GR00T N1', category: 'manipulation', compliance: ['ISO 10218'], verified: true, last_tested: new Date().toISOString() },
  { id: 'sk-3', name: 'Weapons Handling', source: 'MOTHER DEFENCE', category: 'tactical', compliance: ['UK MoD Drill', 'LOAC', 'ROE'], verified: true, last_tested: new Date().toISOString() },
  { id: 'sk-4', name: 'Field Medical Assist', source: 'MOTHER CORE', category: 'manipulation', compliance: ['NHS Protocol', 'UK BSL-4'], verified: false, last_tested: new Date().toISOString() },
  { id: 'sk-5', name: 'Environment Scan', source: 'GR00T N1 System 2', category: 'perception', compliance: ['GDPR', 'UK Surveillance Code'], verified: true, last_tested: new Date().toISOString() },
  { id: 'sk-6', name: 'Verbal Communication', source: 'MOTHER CORE', category: 'communication', compliance: ['UK Equality Act'], verified: true, last_tested: new Date().toISOString() },
  { id: 'sk-7', name: 'Stair Navigation', source: 'GR00T N1 + MOTHER', category: 'locomotion', compliance: ['UK H&S', 'Accessibility Regs'], verified: true, last_tested: new Date().toISOString() },
  { id: 'sk-8', name: 'Tactical Movement', source: 'MOTHER DEFENCE', category: 'tactical', compliance: ['UK MoD Doctrine', 'NATO STANAG'], verified: false, last_tested: new Date().toISOString() },
];

const TRAINING_PIPELINES: TrainingPipeline[] = [
  { id: 'tp-1', name: 'GR00T N1 Post-Training (UK H&S)', type: 'post_training', status: 'running', progress: 67, dataset: 'uk-hse-scenarios-2024', framework: 'Isaac Lab', sovereign_data: true },
  { id: 'tp-2', name: 'Synthetic Warehouse Data', type: 'synthetic_data', status: 'running', progress: 34, dataset: 'uk-warehouse-synthetic-v3', framework: 'Newton Physics', sovereign_data: true },
  { id: 'tp-3', name: 'MOTHER DEFENCE Fine-tune', type: 'fine_tuning', status: 'completed', progress: 100, dataset: 'mod-doctrine-2024-q4', framework: 'PyTorch + DeepSpeed', sovereign_data: true },
  { id: 'tp-4', name: 'Compliance Evaluation Suite', type: 'evaluation', status: 'idle', progress: 0, dataset: 'eu-ai-act-test-suite', framework: 'Custom Evaluator', sovereign_data: true },
];

const GRAPH_SAMPLE: { nodes: GraphNode[]; relations: GraphRelation[] } = {
  nodes: [
    { entity: 'Unit-7 (EXO-1)', type: 'Robot', properties: { status: 'Active', firmware: 'v2.1.0' } },
    { entity: 'Porton Down', type: 'Facility', properties: { clearance: 'BSL-4', jurisdiction: 'UK MoD' } },
    { entity: 'UK Bio-Safety Level 4', type: 'Policy', properties: { framework: 'UK HSE', version: '2024' } },
    { entity: 'MOTHER CORE 70B', type: 'Model', properties: { params: '70B', sovereign: 'true' } },
    { entity: 'GR00T N1', type: 'Model', properties: { params: '2.2B+', provider: 'NVIDIA' } },
    { entity: 'NHS Field Protocol', type: 'Doctrine', properties: { classification: 'OFFICIAL', last_updated: '2024-Q3' } },
  ],
  relations: [
    { from: 'Unit-7 (EXO-1)', relation: 'located_in', to: 'Porton Down' },
    { from: 'Porton Down', relation: 'regulated_by', to: 'UK Bio-Safety Level 4' },
    { from: 'Unit-7 (EXO-1)', relation: 'runs_model', to: 'MOTHER CORE 70B' },
    { from: 'Unit-7 (EXO-1)', relation: 'runs_model', to: 'GR00T N1' },
    { from: 'MOTHER CORE 70B', relation: 'supervised_by', to: 'NHS Field Protocol' },
    { from: 'GR00T N1', relation: 'constrained_by', to: 'UK Bio-Safety Level 4' },
  ],
};

// ============================================
// MAIN COMPONENT
// ============================================

export function ConvergenceHub() {
  const [activeTab, setActiveTab] = useState<'overview' | 'integration' | 'sovereignty' | 'skills' | 'training' | 'graph'>('overview');
  const [nodes, setNodes] = useState<SystemNode[]>(SYSTEM_NODES);
  const [selectedNode, setSelectedNode] = useState<SystemNode | null>(null);

  // Simulate live metric updates
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => prev.map(node => ({
        ...node,
        metrics: {
          ...node.metrics,
          latency_ms: Math.max(1, node.metrics.latency_ms + Math.floor(Math.random() * 20 - 10)),
          throughput: Math.max(0, node.metrics.throughput + Math.floor(Math.random() * 40 - 20)),
          cpu: Math.min(100, Math.max(0, node.metrics.cpu + Math.floor(Math.random() * 10 - 5))),
          memory: Math.min(100, Math.max(0, node.metrics.memory + Math.floor(Math.random() * 6 - 3))),
          gpu: node.metrics.gpu !== undefined ? Math.min(100, Math.max(0, node.metrics.gpu + Math.floor(Math.random() * 8 - 4))) : undefined,
        },
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  function getStatusColor(status: string): string {
    switch (status) {
      case 'online': case 'active': case 'pass': case 'completed': return 'bg-green-500';
      case 'offline': case 'inactive': case 'fail': case 'failed': return 'bg-red-500';
      case 'degraded': case 'configuring': case 'warning': case 'running': return 'bg-yellow-500';
      case 'syncing': case 'pending': case 'idle': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  }

  function getStatusBadge(status: string): string {
    switch (status) {
      case 'online': case 'active': case 'pass': case 'completed': return 'bg-green-500/20 text-green-400';
      case 'offline': case 'inactive': case 'fail': case 'failed': return 'bg-red-500/20 text-red-400';
      case 'degraded': case 'configuring': case 'warning': case 'running': return 'bg-yellow-500/20 text-yellow-400';
      case 'syncing': case 'pending': case 'idle': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  }

  function getNodeTypeColor(type: string): string {
    switch (type) {
      case 'mother_core': return 'border-l-blue-600';
      case 'mother_specialist': return 'border-l-blue-400';
      case 'groot_system2': return 'border-l-green-500';
      case 'groot_system1': return 'border-l-green-400';
      case 'memory': return 'border-l-purple-500';
      case 'simulation': return 'border-l-orange-500';
      case 'robot': return 'border-l-cyan-500';
      case 'bridge': return 'border-l-yellow-500';
      default: return 'border-l-gray-500';
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#04060a] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gradient-to-r from-[#005ea8]/20 via-gray-900/80 to-[#76b900]/20">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-white text-sm">Convergence Architecture</h2>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            MOTHER
          </span>
          <span className="text-[10px] text-gray-600">+</span>
          <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
            NVIDIA GR00T N1
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['overview', 'integration', 'sovereignty', 'skills', 'training', 'graph'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-1 text-[11px] rounded transition-colors ${
                activeTab === tab
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="flex-1 overflow-y-auto p-4">
          {/* System Status Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[#005ea8]/10 border border-[#005ea8]/30 rounded-lg p-3">
              <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">MOTHER Stack</p>
              <p className="text-2xl font-bold text-white">
                {nodes.filter(n => n.type.startsWith('mother')).filter(n => n.status === 'online').length}
                <span className="text-sm text-gray-500">/{nodes.filter(n => n.type.startsWith('mother')).length}</span>
              </p>
              <p className="text-xs text-gray-500">Models Online</p>
            </div>
            <div className="bg-[#76b900]/10 border border-[#76b900]/30 rounded-lg p-3">
              <p className="text-[10px] text-green-400 uppercase tracking-wider mb-1">NVIDIA Stack</p>
              <p className="text-2xl font-bold text-white">
                {nodes.filter(n => n.type.startsWith('groot') || n.type === 'simulation').filter(n => n.status === 'online').length}
                <span className="text-sm text-gray-500">/{nodes.filter(n => n.type.startsWith('groot') || n.type === 'simulation').length}</span>
              </p>
              <p className="text-xs text-gray-500">Systems Online</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <p className="text-[10px] text-purple-400 uppercase tracking-wider mb-1">Sovereignty</p>
              <p className="text-2xl font-bold text-white">
                {SOVEREIGNTY_CHECKS.filter(c => c.status === 'pass').length}
                <span className="text-sm text-gray-500">/{SOVEREIGNTY_CHECKS.length}</span>
              </p>
              <p className="text-xs text-gray-500">Checks Passed</p>
            </div>
          </div>

          {/* Architecture Nodes */}
          <h3 className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">System Nodes</h3>
          <div className="grid grid-cols-2 gap-2">
            {nodes.map(node => (
              <button
                key={node.id}
                onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                className={`bg-gray-800/40 border border-gray-700/50 border-l-4 ${getNodeTypeColor(node.type)} rounded-lg p-3 text-left hover:bg-gray-800/60 transition-colors ${
                  selectedNode?.id === node.id ? 'ring-1 ring-cyan-500/50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(node.status)} ${node.status === 'online' ? '' : 'animate-pulse'}`} />
                    <span className="text-xs font-medium text-white">{node.name}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 text-[9px] rounded ${getStatusBadge(node.status)}`}>
                    {node.status}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mb-2">{node.description}</p>
                <div className="grid grid-cols-4 gap-1 text-[9px]">
                  <div>
                    <span className="text-gray-600 block">Latency</span>
                    <span className="text-gray-300 font-mono">{node.metrics.latency_ms}ms</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">CPU</span>
                    <span className={`font-mono ${node.metrics.cpu > 80 ? 'text-red-400' : 'text-gray-300'}`}>{node.metrics.cpu}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">MEM</span>
                    <span className={`font-mono ${node.metrics.memory > 85 ? 'text-red-400' : 'text-gray-300'}`}>{node.metrics.memory}%</span>
                  </div>
                  {node.metrics.gpu !== undefined && (
                    <div>
                      <span className="text-gray-600 block">GPU</span>
                      <span className={`font-mono ${node.metrics.gpu > 90 ? 'text-red-400' : 'text-gray-300'}`}>{node.metrics.gpu}%</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Selected Node Detail */}
          {selectedNode && (
            <div className="mt-3 bg-gray-800/60 border border-gray-700/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">{selectedNode.name} - Details</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="text-gray-300 ml-2">{selectedNode.type.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-500">Throughput:</span>
                  <span className="text-gray-300 ml-2">{selectedNode.metrics.throughput} req/s</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Description:</span>
                  <span className="text-gray-300 ml-2">{selectedNode.description}</span>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-500">Health:</span>
                    {['cpu', 'memory', 'gpu'].map(metric => {
                      const val = (selectedNode.metrics as any)[metric];
                      if (val === undefined) return null;
                      return (
                        <div key={metric} className="flex-1">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
                            <span>{metric.toUpperCase()}</span>
                            <span>{val}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                val > 90 ? 'bg-red-500' : val > 70 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${val}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Integration Tab */}
      {activeTab === 'integration' && (
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Integration Layers</h3>
          <div className="space-y-3">
            {INTEGRATION_LAYERS.map((layer, idx) => (
              <div key={layer.id} className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 w-5">{idx + 1}.</span>
                    <h4 className="text-sm font-medium text-white">{layer.name}</h4>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] rounded ${getStatusBadge(layer.status)}`}>
                    {layer.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="bg-[#76b900]/5 border border-[#76b900]/20 rounded p-2">
                    <p className="text-[9px] text-green-500 uppercase mb-0.5">NVIDIA Component</p>
                    <p className="text-xs text-gray-300">{layer.nvidia_component}</p>
                  </div>
                  <div className="bg-[#005ea8]/5 border border-[#005ea8]/20 rounded p-2">
                    <p className="text-[9px] text-blue-500 uppercase mb-0.5">MOTHER Component</p>
                    <p className="text-xs text-gray-300">{layer.mother_component}</p>
                  </div>
                </div>

                <p className="text-[10px] text-gray-500">{layer.mechanism}</p>

                {layer.data_flow_rate > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-600">
                    <span>Data flow: {layer.data_flow_rate} ops/s</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sovereignty Tab */}
      {activeTab === 'sovereignty' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sovereignty & Compliance</h3>
            <span className="text-xs text-green-400">
              {SOVEREIGNTY_CHECKS.filter(c => c.status === 'pass').length}/{SOVEREIGNTY_CHECKS.length} Passed
            </span>
          </div>
          <div className="space-y-2">
            {SOVEREIGNTY_CHECKS.map(check => (
              <div key={check.id} className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(check.status)}`} />
                    <span className="text-xs font-medium text-white">{check.check_name}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] rounded uppercase ${getStatusBadge(check.status)}`}>
                    {check.status}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 ml-4">{check.details}</p>
                <div className="flex items-center gap-2 ml-4 mt-1">
                  <span className={`px-1.5 py-0.5 text-[9px] rounded ${
                    check.category === 'data_residency' ? 'bg-blue-500/20 text-blue-400' :
                    check.category === 'compliance' ? 'bg-purple-500/20 text-purple-400' :
                    check.category === 'encryption' ? 'bg-red-500/20 text-red-400' :
                    check.category === 'audit_trail' ? 'bg-cyan-500/20 text-cyan-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {check.category.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Sovereign Skill Library</h3>
          <div className="space-y-2">
            {SKILL_PRIMITIVES.map(skill => (
              <div key={skill.id} className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${skill.verified ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                    <span className="text-xs font-medium text-white">{skill.name}</span>
                    <span className={`px-1.5 py-0.5 text-[9px] rounded ${
                      skill.category === 'locomotion' ? 'bg-cyan-500/20 text-cyan-400' :
                      skill.category === 'manipulation' ? 'bg-blue-500/20 text-blue-400' :
                      skill.category === 'perception' ? 'bg-purple-500/20 text-purple-400' :
                      skill.category === 'communication' ? 'bg-green-500/20 text-green-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {skill.category}
                    </span>
                  </div>
                  <span className={`text-[10px] ${skill.verified ? 'text-green-400' : 'text-yellow-400'}`}>
                    {skill.verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-4 text-[10px]">
                  <span className="text-gray-500">Source: {skill.source}</span>
                  <span className="text-gray-600">|</span>
                  <span className="text-gray-500">Compliance: {skill.compliance.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Training Tab */}
      {activeTab === 'training' && (
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Training Pipelines</h3>
          <div className="space-y-3">
            {TRAINING_PIPELINES.map(pipeline => (
              <div key={pipeline.id} className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(pipeline.status)} ${pipeline.status === 'running' ? 'animate-pulse' : ''}`} />
                    <span className="text-xs font-medium text-white">{pipeline.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] rounded ${getStatusBadge(pipeline.status)}`}>
                    {pipeline.status}
                  </span>
                </div>

                {pipeline.status !== 'idle' && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{pipeline.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pipeline.status === 'completed' ? 'bg-green-500' :
                          pipeline.status === 'failed' ? 'bg-red-500' :
                          'bg-gradient-to-r from-blue-500 to-cyan-500'
                        }`}
                        style={{ width: `${pipeline.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <span className="text-gray-600 block">Dataset</span>
                    <span className="text-gray-400">{pipeline.dataset}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">Framework</span>
                    <span className="text-gray-400">{pipeline.framework}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">Sovereign</span>
                    <span className={pipeline.sovereign_data ? 'text-green-400' : 'text-red-400'}>
                      {pipeline.sovereign_data ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Implementation Steps */}
          <h3 className="text-xs font-medium text-gray-400 mt-6 mb-3 uppercase tracking-wider">Implementation Steps</h3>
          <div className="space-y-2">
            {[
              { step: 1, title: 'API Bridge', desc: 'Secure low-latency bridge between MOTHER CORE (UK H200) and GR00T N1 stack', status: 'active' },
              { step: 2, title: 'Post-Training with Sovereign Data', desc: 'Post-train GR00T System 1 using Isaac Lab simulations constrained by MOTHER LEGAL/DEFENCE', status: 'active' },
              { step: 3, title: 'Graph-Augmented Inference', desc: 'Query Neo4j graph before GR00T System 2 planning for institutional context', status: 'configuring' },
              { step: 4, title: 'Sovereign Skill Library', desc: 'Generate verified, compliant action primitives from MOTHER specialist models', status: 'configuring' },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-3 bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold shrink-0">
                  {item.step}
                </span>
                <div>
                  <h4 className="text-xs font-medium text-white">{item.title}</h4>
                  <p className="text-[10px] text-gray-500">{item.desc}</p>
                </div>
                <span className={`ml-auto px-2 py-0.5 text-[9px] rounded shrink-0 ${getStatusBadge(item.status)}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graph Tab */}
      {activeTab === 'graph' && (
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Knowledge Graph (Neo4j)</h3>
          <p className="text-[10px] text-gray-600 mb-3">Graph-augmented inference: entities and relationships injected into GR00T VLM context</p>

          {/* Graph Nodes */}
          <div className="mb-4">
            <h4 className="text-xs text-gray-500 mb-2">Entities</h4>
            <div className="grid grid-cols-2 gap-2">
              {GRAPH_SAMPLE.nodes.map((node, i) => (
                <div key={i} className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 text-[9px] rounded ${
                      node.type === 'Robot' ? 'bg-cyan-500/20 text-cyan-400' :
                      node.type === 'Facility' ? 'bg-orange-500/20 text-orange-400' :
                      node.type === 'Policy' ? 'bg-red-500/20 text-red-400' :
                      node.type === 'Model' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {node.type}
                    </span>
                    <span className="text-xs text-white font-medium">{node.entity}</span>
                  </div>
                  <div className="text-[9px] text-gray-600">
                    {Object.entries(node.properties).map(([k, v]) => (
                      <span key={k} className="mr-2">{k}: <span className="text-gray-400">{v}</span></span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Graph Relations */}
          <div>
            <h4 className="text-xs text-gray-500 mb-2">Relations (Triples)</h4>
            <div className="space-y-1.5">
              {GRAPH_SAMPLE.relations.map((rel, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-gray-800/30 rounded-lg px-3 py-2">
                  <span className="text-cyan-400 font-medium">{rel.from}</span>
                  <span className="px-2 py-0.5 bg-gray-700/50 rounded text-[9px] text-yellow-400 font-mono">
                    {rel.relation}
                  </span>
                  <span className="text-cyan-400 font-medium">{rel.to}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Example Query */}
          <div className="mt-4 bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
            <h4 className="text-xs text-gray-400 mb-2">Example Graph Query (Cypher)</h4>
            <pre className="text-[10px] text-cyan-400 font-mono bg-[#0a0e14] p-2 rounded">
{`MATCH (r:Robot)-[:located_in]->(f:Facility)
      -[:regulated_by]->(p:Policy)
WHERE r.name = 'Unit-7 (EXO-1)'
RETURN r, f, p`}
            </pre>
            <p className="text-[9px] text-gray-600 mt-1">
              This context is injected into GR00T N1 VLM prompt, ensuring all actions are institutionally aware.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
