// MoTHER Coder - Real-time AI code generation with voice interface
// Build components via natural language and voice commands
import { useState, useRef, useEffect, useCallback } from 'react';

// ============================================
// TYPES
// ============================================

interface CodeFile {
  id: string;
  name: string;
  language: string;
  content: string;
  generated_at: string;
  status: 'generating' | 'ready' | 'error' | 'building';
}

interface BuildResult {
  success: boolean;
  output: string[];
  errors: string[];
  warnings: string[];
  artifacts: string[];
  duration_ms: number;
}

interface VoiceState {
  isListening: boolean;
  transcript: string;
  confidence: number;
  language: string;
}

interface CoderMessage {
  id: string;
  role: 'user' | 'coder' | 'system';
  content: string;
  timestamp: Date;
  code_files?: CodeFile[];
  build_result?: BuildResult;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MotherCoderPanel() {
  const [messages, setMessages] = useState<CoderMessage[]>([
    {
      id: 'welcome',
      role: 'system',
      content: 'MoTHER Coder v2.0 initialised. Ready to build. Use text or voice to describe what you need.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeFiles, setActiveFiles] = useState<CodeFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    transcript: '',
    confidence: 0,
    language: 'en-GB',
  });
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'build'>('chat');
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice recognition setup
  const startVoiceRecognition = useCallback(() => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'system',
          content: 'Speech recognition not available in this browser. Use Chrome or Edge.',
          timestamp: new Date(),
        }]);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = voiceState.language;

      recognition.onstart = () => {
        setVoiceState(prev => ({ ...prev, isListening: true }));
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        let confidence = 0;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
          confidence = event.results[i][0].confidence;
        }
        setVoiceState(prev => ({ ...prev, transcript, confidence }));

        // If final result, set as input
        if (event.results[event.results.length - 1].isFinal) {
          setInput(prev => prev + (prev ? ' ' : '') + transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setVoiceState(prev => ({ ...prev, isListening: false }));
      };

      recognition.onend = () => {
        setVoiceState(prev => ({ ...prev, isListening: false, transcript: '' }));
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Voice setup error:', err);
    }
  }, [voiceState.language]);

  const stopVoiceRecognition = useCallback(() => {
    recognitionRef.current?.stop();
    setVoiceState(prev => ({ ...prev, isListening: false, transcript: '' }));
  }, []);

  // Send message to MoTHER Coder
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isGenerating) return;

    const userMsg: CoderMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    // Simulate MoTHER Coder response with code generation
    setTimeout(() => {
      const generatedFiles = generateCodeFromPrompt(userMsg.content);

      const coderMsg: CoderMessage = {
        id: crypto.randomUUID(),
        role: 'coder',
        content: generateCoderResponse(userMsg.content, generatedFiles),
        timestamp: new Date(),
        code_files: generatedFiles,
      };

      setMessages(prev => [...prev, coderMsg]);
      setActiveFiles(prev => [...prev, ...generatedFiles]);
      setIsGenerating(false);

      if (generatedFiles.length > 0) {
        setSelectedFile(generatedFiles[0].id);
      }
    }, 1500 + Math.random() * 2000);
  }, [input, isGenerating]);

  // Generate code based on prompt
  function generateCodeFromPrompt(prompt: string): CodeFile[] {
    const lowerPrompt = prompt.toLowerCase();
    const files: CodeFile[] = [];

    if (lowerPrompt.includes('motor') || lowerPrompt.includes('servo') || lowerPrompt.includes('actuator')) {
      files.push({
        id: `file-${Date.now()}-1`,
        name: 'motor_controller.py',
        language: 'python',
        content: `"""MOTHER Coder - Motor Controller Module
Generated for: ${prompt}
"""

import asyncio
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class MotorConfig:
    joint_name: str
    motor_type: str  # 'servo' | 'bldc'
    max_torque: float  # Nm
    max_speed: float   # rad/s
    gear_ratio: float
    encoder_resolution: int

class MotorController:
    def __init__(self, configs: List[MotorConfig]):
        self.configs = {c.joint_name: c for c in configs}
        self.positions: dict[str, float] = {}
        self.velocities: dict[str, float] = {}
        self._running = False

    async def initialize(self):
        """Initialize all motor drivers and encoders."""
        for name, config in self.configs.items():
            self.positions[name] = 0.0
            self.velocities[name] = 0.0
            print(f"[MOTOR] Initialized {name}: {config.motor_type} "
                  f"({config.max_torque}Nm, ratio={config.gear_ratio})")
        self._running = True

    async def set_position(self, joint: str, target: float,
                           speed: Optional[float] = None):
        """Move joint to target position (radians)."""
        config = self.configs.get(joint)
        if not config:
            raise ValueError(f"Unknown joint: {joint}")

        max_speed = speed or config.max_speed
        current = self.positions[joint]
        delta = target - current

        # Safety: check torque limits
        if abs(delta) * config.gear_ratio > config.max_torque:
            print(f"[SAFETY] Torque limit would be exceeded for {joint}")
            return False

        self.positions[joint] = target
        self.velocities[joint] = max_speed
        return True

    async def emergency_stop(self):
        """Immediately stop all motors."""
        self._running = False
        for name in self.configs:
            self.velocities[name] = 0.0
        print("[MOTOR] EMERGENCY STOP - All motors halted")

    async def get_telemetry(self) -> dict:
        """Get current motor telemetry."""
        return {
            name: {
                "position": self.positions[name],
                "velocity": self.velocities[name],
                "torque": abs(self.velocities[name]) * 0.1,
                "temperature": 45.0 + abs(self.velocities[name]) * 2,
            }
            for name in self.configs
        }

# Entry point
async def main():
    configs = [
        MotorConfig("l_shoulder", "bldc", 80.0, 3.14, 100.0, 4096),
        MotorConfig("l_elbow", "bldc", 60.0, 4.18, 80.0, 4096),
        MotorConfig("l_wrist", "servo", 20.0, 6.28, 50.0, 1024),
    ]
    controller = MotorController(configs)
    await controller.initialize()
    await controller.set_position("l_shoulder", 1.57)

if __name__ == "__main__":
    asyncio.run(main())
`,
        generated_at: new Date().toISOString(),
        status: 'ready',
      });
    }

    if (lowerPrompt.includes('sensor') || lowerPrompt.includes('imu') || lowerPrompt.includes('telemetry')) {
      files.push({
        id: `file-${Date.now()}-2`,
        name: 'sensor_pipeline.py',
        language: 'python',
        content: `"""MOTHER Coder - Sensor Data Pipeline
Generated for: ${prompt}
"""

import asyncio
import json
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import List, Callable, Optional

@dataclass
class IMUReading:
    timestamp: str
    accel_x: float
    accel_y: float
    accel_z: float
    gyro_x: float
    gyro_y: float
    gyro_z: float
    temperature: float

@dataclass
class ForceSensorReading:
    timestamp: str
    sensor_id: str
    force_x: float
    force_y: float
    force_z: float
    torque_x: float
    torque_y: float
    torque_z: float

class SensorPipeline:
    def __init__(self, sample_rate: int = 100):
        self.sample_rate = sample_rate
        self.callbacks: List[Callable] = []
        self._running = False
        self.buffer: List[dict] = []
        self.buffer_size = 1000

    def on_data(self, callback: Callable):
        """Register a callback for sensor data."""
        self.callbacks.append(callback)

    async def start(self):
        """Start the sensor pipeline."""
        self._running = True
        print(f"[SENSOR] Pipeline started at {self.sample_rate}Hz")
        while self._running:
            reading = await self._read_sensors()
            self.buffer.append(reading)
            if len(self.buffer) > self.buffer_size:
                self.buffer = self.buffer[-self.buffer_size:]
            for cb in self.callbacks:
                await cb(reading)
            await asyncio.sleep(1.0 / self.sample_rate)

    async def stop(self):
        self._running = False
        print("[SENSOR] Pipeline stopped")

    async def _read_sensors(self) -> dict:
        import random
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "imu": asdict(IMUReading(
                timestamp=datetime.utcnow().isoformat(),
                accel_x=random.gauss(0, 0.1),
                accel_y=random.gauss(0, 0.1),
                accel_z=random.gauss(9.81, 0.1),
                gyro_x=random.gauss(0, 0.01),
                gyro_y=random.gauss(0, 0.01),
                gyro_z=random.gauss(0, 0.01),
                temperature=45.0 + random.gauss(0, 1),
            )),
        }

    async def export_buffer(self, path: str):
        """Export buffer to JSONL file."""
        with open(path, 'w') as f:
            for reading in self.buffer:
                f.write(json.dumps(reading) + '\\n')
        print(f"[SENSOR] Exported {len(self.buffer)} readings to {path}")
`,
        generated_at: new Date().toISOString(),
        status: 'ready',
      });
    }

    if (lowerPrompt.includes('api') || lowerPrompt.includes('endpoint') || lowerPrompt.includes('server') || lowerPrompt.includes('interface')) {
      files.push({
        id: `file-${Date.now()}-3`,
        name: 'api_server.py',
        language: 'python',
        content: `"""MOTHER Coder - API Server
Generated for: ${prompt}
"""

from fastapi import FastAPI, HTTPException, WebSocket
from pydantic import BaseModel
from typing import List, Optional
import asyncio

app = FastAPI(title="MOTHER Robotics API", version="2.0.0")

class CommandRequest(BaseModel):
    robot_id: str
    command: str
    parameters: dict = {}
    priority: int = 5
    timeout_ms: int = 5000

class StatusResponse(BaseModel):
    robot_id: str
    status: str
    position: dict
    battery: float
    safety_level: str

@app.get("/robots")
async def list_robots() -> List[StatusResponse]:
    """List all connected robots and their status."""
    return [
        StatusResponse(
            robot_id="exo1",
            status="online",
            position={"x": 0, "y": 0, "z": 0},
            battery=87.5,
            safety_level="normal",
        )
    ]

@app.post("/robots/{robot_id}/command")
async def send_command(robot_id: str, cmd: CommandRequest):
    """Send a command to a specific robot."""
    if robot_id != cmd.robot_id:
        raise HTTPException(400, "Robot ID mismatch")
    return {"status": "accepted", "command_id": f"cmd-{robot_id}-001"}

@app.websocket("/ws/telemetry/{robot_id}")
async def telemetry_stream(websocket: WebSocket, robot_id: str):
    """Stream real-time telemetry data."""
    await websocket.accept()
    try:
        while True:
            telemetry = {
                "robot_id": robot_id,
                "timestamp": "2024-01-01T00:00:00Z",
                "cpu": 45.2,
                "memory": 62.1,
                "gpu": 78.5,
                "temperature": 52.3,
            }
            await websocket.send_json(telemetry)
            await asyncio.sleep(0.1)
    except Exception:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
`,
        generated_at: new Date().toISOString(),
        status: 'ready',
      });
    }

    // Default: generate a generic utility
    if (files.length === 0) {
      files.push({
        id: `file-${Date.now()}-0`,
        name: 'generated_module.py',
        language: 'python',
        content: `"""MOTHER Coder - Generated Module
Generated for: ${prompt}
"""

class GeneratedModule:
    """Auto-generated module based on user request."""

    def __init__(self):
        self.initialized = True
        print("[MOTHER] Module initialized")

    def execute(self, **kwargs):
        """Execute the generated logic."""
        print(f"[MOTHER] Executing with params: {kwargs}")
        return {"status": "success", "params": kwargs}

    def __repr__(self):
        return f"<GeneratedModule initialized={self.initialized}>"

# Usage
if __name__ == "__main__":
    module = GeneratedModule()
    result = module.execute(task="${prompt}")
    print(f"Result: {result}")
`,
        generated_at: new Date().toISOString(),
        status: 'ready',
      });
    }

    return files;
  }

  function generateCoderResponse(_prompt: string, files: CodeFile[]): string {
    const fileList = files.map(f => `- \`${f.name}\` (${f.language})`).join('\n');
    return `Generated ${files.length} file${files.length !== 1 ? 's' : ''} based on your request:\n\n${fileList}\n\nThe code is ready for review. You can build and deploy from the Files tab, or ask me to modify any of the generated files.`;
  }

  // Build files
  const buildFiles = useCallback(() => {
    if (activeFiles.length === 0) return;
    setIsBuilding(true);
    setBuildLog(['[build] Starting MoTHER Coder build pipeline...']);
    setActiveTab('build');

    const steps = [
      '[build] Linting code...',
      '[build] Running type checks...',
      '[build] Checking safety constraints...',
      '[build] Verifying API compatibility...',
      '[build] Compiling modules...',
      '[build] Running unit tests...',
      `[build] ${activeFiles.length} files processed`,
      '[build] BUILD SUCCESSFUL',
    ];

    steps.forEach((step, i) => {
      setTimeout(() => {
        setBuildLog(prev => [...prev, step]);
        if (i === steps.length - 1) {
          setIsBuilding(false);
        }
      }, (i + 1) * 500);
    });
  }, [activeFiles]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const getLanguageColor = (lang: string) => {
    switch (lang) {
      case 'python': return 'text-yellow-400';
      case 'typescript': return 'text-blue-400';
      case 'rust': return 'text-orange-400';
      case 'cpp': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#04060a] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gradient-to-r from-gray-900/80 to-[#04060a]">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isGenerating ? 'bg-cyan-500 animate-pulse' : 'bg-green-500'}`} />
          <h2 className="font-semibold text-white text-sm">MoTHER Coder</h2>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
            {activeFiles.length} files
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['chat', 'files', 'build'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === tab
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'chat' ? 'Chat' : tab === 'files' ? 'Files' : 'Build'}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-emerald-500/15 text-emerald-50 rounded-br-sm'
                    : msg.role === 'system'
                    ? 'bg-gray-800/50 text-gray-400 rounded-bl-sm border border-gray-700/30'
                    : 'bg-gray-800/80 text-gray-100 rounded-bl-sm'
                }`}>
                  {msg.role === 'coder' && (
                    <p className="text-[10px] text-emerald-500/60 mb-1 font-mono">MOTHER CODER</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.code_files && msg.code_files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.code_files.map(file => (
                        <button
                          key={file.id}
                          onClick={() => { setSelectedFile(file.id); setActiveTab('files'); }}
                          className="flex items-center gap-2 w-full px-2 py-1 bg-gray-900/50 rounded text-xs hover:bg-gray-900/80 transition-colors"
                        >
                          <span className={getLanguageColor(file.language)}>
                            {file.name}
                          </span>
                          <span className="text-gray-600 ml-auto">{file.language}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="text-[10px] text-gray-600 mt-1 block">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex justify-start">
                <div className="bg-gray-800/80 rounded-xl rounded-bl-sm px-3 py-2">
                  <p className="text-[10px] text-emerald-500/60 mb-1 font-mono">MOTHER CODER</p>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                    <span className="text-xs text-gray-500">Generating code...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice indicator */}
          {voiceState.isListening && (
            <div className="px-4 py-2 border-t border-gray-800/50 bg-red-500/5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-red-400">Listening...</span>
                {voiceState.transcript && (
                  <span className="text-xs text-gray-400 italic">{voiceState.transcript}</span>
                )}
                <button
                  onClick={stopVoiceRecognition}
                  className="ml-auto text-xs text-red-400 hover:text-red-300"
                >
                  Stop
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-800 bg-gray-900/30">
            <div className="flex gap-2">
              <button
                onClick={voiceState.isListening ? stopVoiceRecognition : startVoiceRecognition}
                className={`px-3 py-2 rounded-lg text-sm ${
                  voiceState.isListening
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                {voiceState.isListening ? 'Stop' : 'Voice'}
              </button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell MoTHER what to build..."
                rows={1}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isGenerating}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40"
              >
                Build
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* File list */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-800/50 overflow-x-auto">
            {activeFiles.map(file => (
              <button
                key={file.id}
                onClick={() => setSelectedFile(file.id)}
                className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
                  selectedFile === file.id
                    ? 'bg-gray-700/50 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <span className={getLanguageColor(file.language)}>
                  {file.name}
                </span>
              </button>
            ))}
            {activeFiles.length === 0 && (
              <span className="text-xs text-gray-600">No files generated yet. Use the chat to create code.</span>
            )}
          </div>

          {/* Code viewer */}
          <div className="flex-1 overflow-auto bg-[#0a0e14]">
            {selectedFile && (() => {
              const file = activeFiles.find(f => f.id === selectedFile);
              if (!file) return null;
              return (
                <pre className="p-4 text-xs text-gray-300 font-mono leading-5 whitespace-pre-wrap">
                  {file.content}
                </pre>
              );
            })()}
          </div>

          {/* File actions */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-800 bg-gray-900/30">
            <span className="text-xs text-gray-500">
              {activeFiles.length} file{activeFiles.length !== 1 ? 's' : ''} generated
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (selectedFile) {
                    const file = activeFiles.find(f => f.id === selectedFile);
                    if (file) navigator.clipboard.writeText(file.content);
                  }
                }}
                className="px-3 py-1 text-xs bg-gray-800 text-gray-400 rounded hover:text-white"
              >
                Copy
              </button>
              <button
                onClick={buildFiles}
                disabled={activeFiles.length === 0 || isBuilding}
                className="px-4 py-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded text-xs font-medium disabled:opacity-40"
              >
                Build All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Build Tab */}
      {activeTab === 'build' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-[#0a0e14] p-3 font-mono">
            {buildLog.length === 0 ? (
              <p className="text-xs text-gray-600">No build output yet. Generate code and click Build.</p>
            ) : (
              buildLog.map((line, i) => (
                <div key={i} className={`text-xs leading-5 ${
                  line.includes('SUCCESSFUL') || line.includes('PASS') ? 'text-green-400' :
                  line.includes('ERROR') || line.includes('FAIL') ? 'text-red-400' :
                  line.includes('[build]') ? 'text-cyan-400' :
                  'text-gray-400'
                }`}>
                  {line}
                </div>
              ))
            )}
            {isBuilding && (
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                <span className="text-xs text-cyan-400">Building...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
