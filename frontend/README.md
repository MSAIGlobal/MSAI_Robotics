# MSAI Robotics Dashboard

Real-time humanoid robot control and monitoring dashboard, integrated with MOTHER AI.

## Features

- **Real-time Robot Monitoring** - WebSocket-based live updates for all connected robots
- **Telemetry Visualization** - Charts for CPU, memory, battery, temperature, and motion metrics
- **Robot Control** - Movement, gestures, and speech commands
- **MOTHER AI Integration** - Natural language interface for robot control and diagnostics
- **Safety Alerts** - Real-time safety monitoring with audio alerts for critical issues
- **Multi-Robot Support** - Manage multiple humanoid robots from a single dashboard

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Zustand** - State management
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
VITE_API_URL=https://api.msai.global
VITE_WS_URL=wss://api.msai.global
VITE_ROBOTICS_ENDPOINT=/api/v1/robotics
```

## Project Structure

```
src/
├── components/
│   └── dashboard/
│       ├── Dashboard.tsx      # Main dashboard layout
│       ├── RobotCard.tsx      # Robot status card
│       ├── TelemetryChart.tsx # Real-time charts
│       ├── ControlPanel.tsx   # Robot control interface
│       └── MotherChat.tsx     # MOTHER AI chat
├── hooks/
│   ├── useRobots.ts           # Robot state management
│   ├── useTelemetry.ts        # Telemetry data streams
│   ├── useRobotControl.ts     # Robot commands
│   └── useMotherRobotics.ts   # MOTHER AI integration
├── lib/
│   ├── api.ts                 # REST API client
│   └── websocket.ts           # WebSocket client
├── store/
│   └── roboticsStore.ts       # Zustand store
├── types/
│   └── robotics.ts            # TypeScript types
├── App.tsx
├── main.tsx
└── index.css
```

## API Integration

### REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/robotics/status` | GET | Get all robots status |
| `/api/v1/robotics/{id}/status` | GET | Get specific robot status |
| `/api/v1/robotics/command` | POST | Send command to robot |
| `/api/v1/robotics/{id}/control/mode` | PUT | Set control mode |
| `/api/v1/robotics/{id}/telemetry` | GET | Get telemetry data |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `status_update` | Server → Client | Robot status updates |
| `telemetry` | Server → Client | Real-time telemetry |
| `safety_alert` | Server → Client | Safety alerts |
| `command` | Client → Server | Robot commands |
| `command_response` | Server → Client | Command execution result |

## Control Modes

- **Autonomous** - Robot operates independently
- **Supervised** - Robot requires confirmation for actions
- **Teleoperated** - Direct manual control
- **Emergency Stop** - All movement halted

## Deployment

Configured for Netlify deployment with automatic API proxying.

```bash
# Build and deploy
npm run build
netlify deploy --prod
```

## License

MIT - MSAI Global
