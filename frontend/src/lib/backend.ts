// MSAI Robotics - Backend API Client
// All heavy calls proxied to NODE cluster

import { getAuthHeaders } from './auth';
import {
  Experiment,
  ExperimentConfig,
  ExperimentDiff,
  DatasetNode,
  DatasetScore,
  NodeStatus,
  AuditEvent,
  VoiceRequest,
  VoiceResponse,
  CadModel,
  MotorConfig,
  SensorConfig,
  MotionSession,
  SimulationConfig,
  SimulationState,
  NodeCommand,
  CommandExecution,
  RepoSyncStatus,
} from './types';

// ============================================
// CONFIG
// ============================================

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BACKEND_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// EXPERIMENTS API
// ============================================

export const experimentsApi = {
  list: () => apiCall<Experiment[]>('/experiments'),

  get: (id: string) => apiCall<Experiment>(`/experiments/${id}`),

  launch: (config: ExperimentConfig) =>
    apiCall<Experiment>('/experiments/launch', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  pause: (id: string) =>
    apiCall<void>(`/experiments/${id}/pause`, { method: 'POST' }),

  resume: (id: string) =>
    apiCall<void>(`/experiments/${id}/resume`, { method: 'POST' }),

  stop: (id: string) =>
    apiCall<void>(`/experiments/${id}/stop`, { method: 'POST' }),

  diff: (id1: string, id2: string) =>
    apiCall<ExperimentDiff>(`/experiments/diff?a=${id1}&b=${id2}`),
};

// ============================================
// DATASETS API
// ============================================

export const datasetsApi = {
  list: () => apiCall<DatasetNode[]>('/datasets'),

  get: (id: string) => apiCall<DatasetNode>(`/datasets/${id}`),

  lineage: (id: string) => apiCall<DatasetNode[]>(`/datasets/${id}/lineage`),

  score: (id: string) => apiCall<DatasetScore>(`/datasets/${id}/score`),

  graph: () => apiCall<{ nodes: DatasetNode[]; edges: { from: string; to: string }[] }>(
    '/datasets/graph'
  ),
};

// ============================================
// NODES API
// ============================================

export const nodesApi = {
  list: () => apiCall<NodeStatus[]>('/nodes'),

  get: (id: string) => apiCall<NodeStatus>(`/nodes/${id}`),

  history: (id: string, hours: number = 24) =>
    apiCall<NodeStatus[]>(`/nodes/${id}/history?hours=${hours}`),
};

// ============================================
// SAFETY API
// ============================================

export const safetyApi = {
  pause: (target: string) =>
    apiCall<void>('/safety/pause', {
      method: 'POST',
      body: JSON.stringify({ target }),
    }),

  resume: (target: string) =>
    apiCall<void>('/safety/resume', {
      method: 'POST',
      body: JSON.stringify({ target }),
    }),

  kill: (target: string, confirmation: string) =>
    apiCall<void>('/safety/kill', {
      method: 'POST',
      body: JSON.stringify({ target, confirmation }),
    }),

  status: () =>
    apiCall<{ paused: string[]; killed: string[] }>('/safety/status'),
};

// ============================================
// AUDIT API
// ============================================

export const auditApi = {
  list: (filters?: { actor?: string; action?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams(filters as Record<string, string>);
    return apiCall<AuditEvent[]>(`/audit?${params}`);
  },

  export: (format: 'json' | 'csv' | 'pdf') =>
    apiCall<{ url: string }>(`/audit/export?format=${format}`),
};

// ============================================
// VOICE API
// ============================================

export const voiceApi = {
  speak: (request: VoiceRequest) =>
    apiCall<VoiceResponse>('/voice/speak', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  voices: () => apiCall<{ id: string; name: string }[]>('/voice/list'),
};

// ============================================
// ROBOTICS API
// ============================================

export const roboticsApi = {
  // CAD
  getCadModel: (id: string) => apiCall<CadModel>(`/robotics/cad/${id}`),
  listCadModels: () => apiCall<CadModel[]>('/robotics/cad'),

  // Electronics
  getMotorConfigs: (modelId: string) =>
    apiCall<MotorConfig[]>(`/robotics/motors/${modelId}`),
  updateMotorConfig: (modelId: string, config: MotorConfig) =>
    apiCall<void>(`/robotics/motors/${modelId}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  getSensorConfigs: (modelId: string) =>
    apiCall<SensorConfig[]>(`/robotics/sensors/${modelId}`),

  // Simulation
  startSimulation: (config: SimulationConfig) =>
    apiCall<{ session_id: string }>('/robotics/sim/start', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  pauseSimulation: () =>
    apiCall<void>('/robotics/sim/pause', { method: 'POST' }),

  resumeSimulation: () =>
    apiCall<void>('/robotics/sim/resume', { method: 'POST' }),

  stopSimulation: () =>
    apiCall<void>('/robotics/sim/stop', { method: 'POST' }),

  getSimulationState: () => apiCall<SimulationState>('/robotics/sim/state'),

  // Motion Sessions
  listSessions: () => apiCall<MotionSession[]>('/robotics/sessions'),
  getSession: (id: string) => apiCall<MotionSession>(`/robotics/sessions/${id}`),
  exportSession: (id: string, format: 'json' | 'csv' | 'gltf') =>
    apiCall<{ url: string }>(`/robotics/sessions/${id}/export?format=${format}`),
};

// ============================================
// NODE COMMANDS API
// ============================================

export const commandsApi = {
  list: () => apiCall<NodeCommand[]>('/commands'),

  execute: (commandId: string, nodeId?: string) =>
    apiCall<CommandExecution>('/commands/execute', {
      method: 'POST',
      body: JSON.stringify({ command_id: commandId, node_id: nodeId }),
    }),

  getExecution: (id: string) => apiCall<CommandExecution>(`/commands/executions/${id}`),

  listExecutions: () => apiCall<CommandExecution[]>('/commands/executions'),
};

// ============================================
// REPO SYNC API
// ============================================

export const syncApi = {
  status: () => apiCall<RepoSyncStatus>('/sync/status'),

  trigger: () =>
    apiCall<void>('/sync/trigger', { method: 'POST' }),
};

// ============================================
// INFERENCE API
// ============================================

export const inferenceApi = {
  chat: (request: {
    model: string;
    messages: { role: string; content: string }[];
    config: {
      temperature: number;
      max_tokens: number;
      system_prompt: string;
      use_mother_core: boolean;
      use_groot_n1: boolean;
      use_memory: boolean;
      sovereignty_mode: boolean;
    };
  }) =>
    apiCall<{ content: string; latency_ms: number; tokens: number; reasoning_path?: string[] }>(
      '/inference/chat',
      { method: 'POST', body: JSON.stringify(request) }
    ),

  models: () =>
    apiCall<{ id: string; name: string; type: string; status: string }[]>('/inference/models'),

  status: () =>
    apiCall<{ connected: boolean; active_sessions: number; gpu_utilization: number }>('/inference/status'),
};

// ============================================
// TMUX API
// ============================================

export const tmuxApi = {
  sessions: () =>
    apiCall<{ id: string; name: string; status: string; windows: number; created: string }[]>('/tmux/sessions'),

  execute: (sessionId: string, command: string) =>
    apiCall<{ output: string; exit_code: number }>(`/tmux/${sessionId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ command }),
    }),

  createSession: (name: string) =>
    apiCall<{ id: string; name: string }>('/tmux/sessions', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  killSession: (sessionId: string) =>
    apiCall<void>(`/tmux/${sessionId}`, { method: 'DELETE' }),
};

// ============================================
// 3D PRINTING API
// ============================================

export const printingApi = {
  // Printers
  listPrinters: () =>
    apiCall<{
      id: string;
      name: string;
      model: string;
      status: string;
      progress: number;
      temperature_bed: number;
      temperature_nozzle: number;
      ip_address: string;
      connected: boolean;
    }[]>('/printing/printers'),

  connectPrinter: (printerId: string) =>
    apiCall<void>(`/printing/printers/${printerId}/connect`, { method: 'POST' }),

  disconnectPrinter: (printerId: string) =>
    apiCall<void>(`/printing/printers/${printerId}/disconnect`, { method: 'POST' }),

  // Jobs
  listJobs: () =>
    apiCall<{
      id: string;
      name: string;
      printer_id: string;
      status: string;
      progress: number;
      estimated_time: number;
      elapsed_time: number;
      material: string;
      weight_g: number;
    }[]>('/printing/jobs'),

  submitJob: (printerId: string, gcode: string, name: string) =>
    apiCall<{ job_id: string }>('/printing/jobs', {
      method: 'POST',
      body: JSON.stringify({ printer_id: printerId, gcode, name }),
    }),

  cancelJob: (jobId: string) =>
    apiCall<void>(`/printing/jobs/${jobId}/cancel`, { method: 'POST' }),

  // CAD
  buildCAD: (code: string) =>
    apiCall<{ primitives: any[]; stl_url?: string; errors: string[] }>('/printing/cad/build', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
};

// ============================================
// ELECTRONICS API
// ============================================

export const electronicsApi = {
  saveCircuit: (project: { name: string; components: any[]; wires: any[]; blocks: any[] }) =>
    apiCall<{ id: string }>('/electronics/circuits', {
      method: 'POST',
      body: JSON.stringify(project),
    }),

  listCircuits: () =>
    apiCall<{ id: string; name: string; created_at: string; component_count: number }[]>('/electronics/circuits'),

  getCircuit: (id: string) =>
    apiCall<any>(`/electronics/circuits/${id}`),

  exportCircuit: (id: string, format: 'kicad' | 'eagle' | 'gerber' | 'bom' | 'spice' | 'json') =>
    apiCall<{ url: string }>(`/electronics/circuits/${id}/export?format=${format}`),
};

// ============================================
// CONVERGENCE API
// ============================================

export const convergenceApi = {
  status: () =>
    apiCall<{
      mother_status: string;
      groot_status: string;
      bridge_latency_ms: number;
      integration_layers: { name: string; status: string }[];
      sovereignty_score: number;
    }>('/convergence/status'),

  sovereigntyChecks: () =>
    apiCall<{ id: string; name: string; status: string; details: string }[]>('/convergence/sovereignty'),

  skillLibrary: () =>
    apiCall<{ id: string; name: string; category: string; verified: boolean; compliance: string[] }[]>('/convergence/skills'),

  graphQuery: (cypher: string) =>
    apiCall<{ nodes: any[]; relations: any[] }>('/convergence/graph/query', {
      method: 'POST',
      body: JSON.stringify({ query: cypher }),
    }),

  trainingPipelines: () =>
    apiCall<{ id: string; name: string; status: string; progress: number; framework: string }[]>('/convergence/training'),
};

// ============================================
// WEBSOCKET STREAMING
// ============================================

export function createSimulationStream(
  onFrame: (state: SimulationState) => void,
  onError: (error: Error) => void
): WebSocket {
  const wsUrl = BACKEND_URL.replace('http', 'ws') + '/robotics/sim/stream';
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const state = JSON.parse(event.data) as SimulationState;
      onFrame(state);
    } catch (e) {
      onError(e as Error);
    }
  };

  ws.onerror = () => onError(new Error('WebSocket error'));

  return ws;
}

export function createTelemetryStream(
  nodeId: string,
  onUpdate: (status: NodeStatus) => void,
  onError: (error: Error) => void
): WebSocket {
  const wsUrl = BACKEND_URL.replace('http', 'ws') + `/nodes/${nodeId}/stream`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const status = JSON.parse(event.data) as NodeStatus;
      onUpdate(status);
    } catch (e) {
      onError(e as Error);
    }
  };

  ws.onerror = () => onError(new Error('WebSocket error'));

  return ws;
}

export function createInferenceStream(
  onToken: (data: { type: string; token?: string; latency_ms?: number; tokens?: number; reasoning_path?: string[] }) => void,
  onError: (error: Error) => void
): WebSocket {
  const wsUrl = BACKEND_URL.replace('http', 'ws') + '/inference/stream';
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onToken(data);
    } catch (e) {
      onError(e as Error);
    }
  };

  ws.onerror = () => onError(new Error('WebSocket error'));

  return ws;
}

export function createTmuxStream(
  sessionId: string,
  onOutput: (data: { type: string; content: string; stream?: string }) => void,
  onError: (error: Error) => void
): WebSocket {
  const wsUrl = BACKEND_URL.replace('http', 'ws') + `/tmux/${sessionId}/stream`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onOutput(data);
    } catch (e) {
      onError(e as Error);
    }
  };

  ws.onerror = () => onError(new Error('WebSocket error'));

  return ws;
}
