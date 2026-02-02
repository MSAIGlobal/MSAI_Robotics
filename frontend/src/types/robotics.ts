/**
 * MSAI Robotics Dashboard Type Definitions
 */

// ============================================
// ENUMS
// ============================================

export enum RobotStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

export enum ControlMode {
  AUTONOMOUS = 'autonomous',
  SUPERVISED = 'supervised',
  TELEOPERATED = 'teleoperated',
  EMERGENCY_STOP = 'emergency_stop'
}

export enum CommandType {
  MOVE = 'move',
  STOP = 'stop',
  GESTURE = 'gesture',
  SPEAK = 'speak',
  LOOK = 'look',
  LOOK_AT = 'look_at',
  GRASP = 'grasp',
  GRAB = 'grab',
  RELEASE = 'release',
  NAVIGATE = 'navigate',
  FOLLOW = 'follow',
  INTERACT = 'interact',
  ROTATE = 'rotate',
  GO_TO_POSITION = 'go_to_position',
  EMERGENCY_STOP = 'emergency_stop'
}

export enum SafetyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  WARNING = 'warning'
}

// ============================================
// ROBOT STATE
// ============================================

export interface Position {
  x: number;
  y: number;
  z: number;
  roll: number;
  pitch: number;
  yaw: number;
}

export interface Velocity {
  linear: number;
  angular: number;
}

export interface JointState {
  name: string;
  position: number;
  velocity: number;
  effort: number;
}

export interface SensorData {
  timestamp: string;
  cameras: CameraData[];
  lidar: LidarData | null;
  imu: IMUData | null;
  force_sensors: ForceSensorData[];
}

export interface CameraData {
  camera_id: string;
  frame_url: string;
  resolution: [number, number];
  fps: number;
}

export interface LidarData {
  points_count: number;
  scan_url: string;
  range_min: number;
  range_max: number;
}

export interface IMUData {
  acceleration: [number, number, number];
  gyroscope: [number, number, number];
  orientation: [number, number, number, number];
}

export interface ForceSensorData {
  sensor_id: string;
  force: [number, number, number];
  torque: [number, number, number];
}

export interface RobotState {
  robot_id: string;
  name: string;
  status: RobotStatus;
  control_mode: ControlMode;
  battery_percent: number;
  position: Position;
  velocity: Velocity;
  joints: JointState[];
  last_heartbeat: string;
  current_task: string | null;
  error_message: string | null;
  model_version: string;
  firmware_version: string;
  uptime_seconds: number;
  safety_level: SafetyLevel;
}

// ============================================
// COMMANDS
// ============================================

export interface RobotCommand {
  robot_id: string;
  command_type: CommandType;
  parameters: Record<string, any>;
  priority: number;
  timeout_ms: number;
}

export interface MoveCommand extends RobotCommand {
  command_type: CommandType.MOVE;
  parameters: {
    target_position?: Position;
    velocity?: Velocity;
    duration_ms?: number;
  };
}

export interface SpeakCommand extends RobotCommand {
  command_type: CommandType.SPEAK;
  parameters: {
    text: string;
    language?: string;
    emotion?: string;
  };
}

export interface NavigateCommand extends RobotCommand {
  command_type: CommandType.NAVIGATE;
  parameters: {
    waypoints: Position[];
    speed?: number;
    avoid_obstacles?: boolean;
  };
}

export interface CommandResponse {
  success: boolean;
  command_id: string;
  message?: string;
  error?: string;
}

// ============================================
// TELEMETRY
// ============================================

export interface TelemetryMetrics {
  cpu: number;
  memory: number;
  battery: number;
  temperature: number;
  gpu: number;
  network_latency: number;
  position_x: number;
  position_y: number;
  position_z: number;
  velocity_linear: number;
  velocity_angular: number;
  [key: string]: number | undefined;
}

export interface TelemetryPoint {
  timestamp: string;
  robot_id: string;
  position: Position;
  velocity: Velocity;
  battery_percent: number;
  cpu_percent: number;
  memory_percent: number;
  gpu_percent: number;
  temperature_c: number;
  network_latency_ms: number;
  metrics: TelemetryMetrics;
}

export interface TelemetryStream {
  robot_id: string;
  buffer_size: number;
  points: TelemetryPoint[];
  latest: TelemetryPoint | null;
}

export interface TelemetryChartData {
  timestamps: Date[];
  series: Record<string, (number | null)[]>;
}

// ============================================
// MODEL & UPDATES
// ============================================

export interface ModelInfo {
  model_type: string;
  model_name: string;
  version: string;
  size_bytes: number;
  checksum: string;
  deployed_at: string;
}

export interface ModelUpdateRequest {
  robot_id: string;
  model_type: 'llm' | 'vision' | 'motion';
  model_path: string;
  checksum: string;
  force?: boolean;
}

export interface ModelUpdateProgress {
  robot_id: string;
  model_type: string;
  status: 'preparing' | 'uploading' | 'installing' | 'verifying' | 'complete' | 'failed';
  progress_percent: number;
  error?: string;
}

// ============================================
// DATASET EXPORT
// ============================================

export interface DatasetExportRequest {
  robot_id: string;
  start_time?: string;
  end_time?: string;
  data_types: ('telemetry' | 'interactions' | 'sensor_data' | 'commands')[];
  format: 'jsonl' | 'parquet' | 'csv';
}

export interface DatasetExportResponse {
  export_id: string;
  robot_id: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  download_url?: string;
  size_bytes?: number;
  record_count?: number;
}

// ============================================
// MOTHER ROBOTICS LLM
// ============================================

export interface MotherRoboticsMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

// ChatMessage is used by hooks and components for chat UI
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date | string;
}

export interface MotherRoboticsRequest {
  messages: MotherRoboticsMessage[];
  robot_context?: {
    robot_id: string;
    current_state: RobotState;
    environment?: string;
  };
  max_tokens?: number;
  temperature?: number;
}

export interface MotherRoboticsResponse {
  message?: MotherRoboticsMessage;
  response?: string;
  suggested_commands?: RobotCommand[];
  safety_warnings?: string[];
}

// ============================================
// WEBSOCKET MESSAGES
// ============================================

export type WebSocketMessageType =
  | 'status_update'
  | 'telemetry'
  | 'command_response'
  | 'error'
  | 'heartbeat'
  | 'model_update_progress'
  | 'safety_alert';

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  data: T;
  timestamp: string;
}

export interface StatusUpdateMessage extends WebSocketMessage<{ robots: RobotState[] }> {
  type: 'status_update';
}

export interface TelemetryMessage extends WebSocketMessage<TelemetryPoint> {
  type: 'telemetry';
}

export interface SafetyAlertMessage extends WebSocketMessage<{
  robot_id: string;
  alert_type: string;
  severity: SafetyLevel;
  message: string;
}> {
  type: 'safety_alert';
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface RobotsListResponse {
  count: number;
  robots: RobotState[];
}

export interface TelemetryExportResponse {
  robot_id: string;
  count: number;
  data: TelemetryPoint[];
}
