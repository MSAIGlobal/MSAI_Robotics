/**
 * MSAI Robotics API Client
 * REST API wrapper for robotics backend
 */

import type {
  RobotState,
  RobotCommand,
  CommandResponse,
  TelemetryPoint,
  ChatMessage,
} from '../types/robotics';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Helper for authenticated requests
async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('access_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response;
}

// ============================================
// ROBOT MANAGEMENT API
// ============================================

export interface RobotsListResponse {
  robots: RobotState[];
  count: number;
}

export async function getAllRobots(): Promise<RobotsListResponse> {
  const response = await fetchWithAuth('/robots');
  return response.json();
}

export async function getRobot(robotId: string): Promise<RobotState> {
  const response = await fetchWithAuth(`/robots/${robotId}`);
  return response.json();
}

export async function setControlMode(
  robotId: string,
  mode: string
): Promise<void> {
  await fetchWithAuth(`/robots/${robotId}/control-mode`, {
    method: 'PUT',
    body: JSON.stringify({ mode }),
  });
}

// ============================================
// COMMAND API
// ============================================

export async function sendCommand(
  command: RobotCommand
): Promise<CommandResponse> {
  const response = await fetchWithAuth('/commands', {
    method: 'POST',
    body: JSON.stringify(command),
  });
  return response.json();
}

export async function getCommandStatus(
  commandId: string
): Promise<CommandResponse> {
  const response = await fetchWithAuth(`/commands/${commandId}`);
  return response.json();
}

// ============================================
// TELEMETRY API
// ============================================

export interface TelemetryResponse {
  robot_id: string;
  data: TelemetryPoint[];
  count: number;
}

export async function getTelemetry(
  robotId: string,
  startTime?: Date,
  endTime?: Date
): Promise<TelemetryResponse> {
  const params = new URLSearchParams();
  if (startTime) params.set('start', startTime.toISOString());
  if (endTime) params.set('end', endTime.toISOString());

  const queryString = params.toString();
  const endpoint = `/robots/${robotId}/telemetry${queryString ? `?${queryString}` : ''}`;

  const response = await fetchWithAuth(endpoint);
  return response.json();
}

// ============================================
// MOTHER ROBOTICS AI API
// ============================================

export interface MotherChatRequest {
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  robot_context?: {
    robot_id: string;
    status: string;
    position: { x: number; y: number; z: number };
    battery_percent: number;
  };
}

export interface MotherChatResponse {
  response: string;
  suggested_commands?: RobotCommand[];
  safety_warnings?: string[];
}

export async function chatWithMother(
  request: MotherChatRequest
): Promise<MotherChatResponse> {
  const response = await fetchWithAuth('/mother/robotics/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return response.json();
}

// ============================================
// MODEL MANAGEMENT API
// ============================================

export interface ModelInfo {
  model_type: string;
  model_name: string;
  version: string;
  deployed_at: string;
}

export async function getDeployedModels(robotId: string): Promise<ModelInfo[]> {
  const response = await fetchWithAuth(`/robots/${robotId}/models`);
  return response.json();
}

export async function deployModel(
  robotId: string,
  modelType: string,
  modelPath: string
): Promise<{ status: string; job_id: string }> {
  const response = await fetchWithAuth(`/robots/${robotId}/models/deploy`, {
    method: 'POST',
    body: JSON.stringify({ model_type: modelType, model_path: modelPath }),
  });
  return response.json();
}

// ============================================
// DATASET EXPORT API
// ============================================

export interface DatasetExportRequest {
  robot_id: string;
  data_types: string[];
  format: 'jsonl' | 'parquet' | 'csv';
  start_time?: string;
  end_time?: string;
}

export interface DatasetExportResponse {
  export_id: string;
  status: string;
  download_url?: string;
}

export async function exportDataset(
  request: DatasetExportRequest
): Promise<DatasetExportResponse> {
  const response = await fetchWithAuth('/datasets/export', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return response.json();
}

export async function getExportStatus(
  exportId: string
): Promise<DatasetExportResponse> {
  const response = await fetchWithAuth(`/datasets/export/${exportId}`);
  return response.json();
}

// ============================================
// CONSOLIDATED API OBJECT
// ============================================

export const roboticsApi = {
  // Robots
  getAllRobots,
  getRobot,
  setControlMode,

  // Commands
  sendCommand,
  getCommandStatus,

  // Telemetry
  getTelemetry,

  // MOTHER AI
  chatWithMother,

  // Models
  getDeployedModels,
  deployModel,

  // Datasets
  exportDataset,
  getExportStatus,
};

export default roboticsApi;
