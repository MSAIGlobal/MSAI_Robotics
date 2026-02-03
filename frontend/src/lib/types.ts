// MSAI Robotics - Core Types
// Authoritative type definitions for the control plane

// ============================================
// AUTH & RBAC
// ============================================

export type Role = "observer" | "operator" | "admin" | "gov";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  org?: string;
  sso_provider?: "netlify" | "azure" | "gov";
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// ============================================
// EXPERIMENTS
// ============================================

export interface ExperimentConfig {
  model: string;
  dataset_ref: string;
  hyperparameters: Record<string, unknown>;
  constraints: {
    max_epochs?: number;
    early_stopping?: boolean;
    gpu_limit?: number;
  };
}

export interface Experiment {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "paused";
  config: ExperimentConfig;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  metrics?: Record<string, number>;
  actor: string;
}

export interface ExperimentDiff {
  config_diff: Record<string, { before: unknown; after: unknown }>;
  dataset_diff: Record<string, { before: unknown; after: unknown }>;
  metrics_diff: Record<string, { before: number; after: number }>;
}

// ============================================
// DATASETS
// ============================================

export interface DatasetNode {
  id: string;
  name: string;
  source: string;
  derived_from?: string[];
  created_at: string;
  used_in: string[];
  size_bytes: number;
  format: string;
}

export interface DatasetScore {
  dataset_id: string;
  score: number;
  breakdown: {
    completeness: number;
    noise: number;
    duplication: number;
    bias: number;
    provenance: number;
  };
}

// ============================================
// NODE STATUS
// ============================================

export interface NodeStatus {
  node_id: string;
  hostname: string;
  gpus: number;
  gpu_util: number[];
  gpu_memory: number[];
  memory_used: number;
  memory_total: number;
  disk_free: number;
  disk_total: number;
  health: "ok" | "warning" | "critical";
  last_heartbeat: string;
}

// ============================================
// SAFETY
// ============================================

export interface SafetyAction {
  type: "pause" | "resume" | "kill";
  target: string;
  actor: string;
  timestamp: string;
  confirmed: boolean;
}

// ============================================
// AUDIT
// ============================================

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  role: Role;
  action: string;
  target: string;
  details?: Record<string, unknown>;
  hash: string;
}

// ============================================
// VOICE / TTS
// ============================================

export interface VoiceRequest {
  text: string;
  voice?: string;
}

export interface VoiceResponse {
  audio_url: string;
  duration: number;
}

// ============================================
// ROBOTICS - EXO-1
// ============================================

export interface JointSpec {
  name: string;
  type: "revolute" | "prismatic" | "fixed";
  parent: string;
  min_angle?: number;
  max_angle?: number;
  max_torque?: number;
}

export interface CadModel {
  id: string;
  name: string;
  format: "stl" | "step" | "gltf";
  url: string;
  joints: JointSpec[];
}

export interface MotorConfig {
  joint: string;
  type: "servo" | "bldc";
  max_torque: number;
  controller: string;
  driver: string;
  power_rail: string;
}

export interface SensorConfig {
  id: string;
  type: "imu" | "force_torque" | "encoder" | "vision";
  location: string;
  sampling_rate: number;
}

export interface MotionFrame {
  t: number;
  joints: Record<string, number>;
  velocities?: Record<string, number>;
  torques?: Record<string, number>;
}

export interface MotionSession {
  id: string;
  scenario: string;
  frames: MotionFrame[];
  created_at: string;
  duration: number;
}

export interface SimulationConfig {
  model: string;
  scenario: "walk" | "stand" | "step" | "balance" | "custom";
  constraints: {
    max_torque: number;
    balance: boolean;
    collision_check: boolean;
  };
}

export interface SimulationState {
  status: "idle" | "running" | "paused" | "stopped";
  current_frame: number;
  total_frames: number;
  joints: Record<string, number>;
  safety_warnings: string[];
}

// ============================================
// NODE COMMANDS
// ============================================

export interface NodeCommand {
  id: string;
  description: string;
  command: string;
  allowed_roles: Role[];
  requires_confirmation: boolean;
}

export interface CommandExecution {
  id: string;
  command_id: string;
  actor: string;
  started_at: string;
  completed_at?: string;
  status: "running" | "success" | "failed";
  stdout: string;
  stderr: string;
}

// ============================================
// REPO SYNC
// ============================================

export interface RepoSyncStatus {
  frontend_commit: string;
  frontend_version: string;
  backend_commit: string;
  backend_version: string;
  schema_version: string;
  compatible: boolean;
  last_sync: string;
}
