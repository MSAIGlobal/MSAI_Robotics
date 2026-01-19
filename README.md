# MOTHER Robotics Dashboard

An AI-powered robotics control dashboard with 3D CAD design, computer vision, and hardware integration.

## Features

- 🤖 **AI Brain Control**: Real-time AI decision making and situational awareness
- 🎥 **Computer Vision**: Live camera feeds with object detection
- 🛠️ **3D CAD Studio**: Interactive CAD design and visualization
- ⚙️ **Hardware Control**: Motor control and sensor monitoring
- 🧠 **AI Training**: Machine learning model training interface
- 📊 **Analytics**: Real-time performance metrics and logging

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone repository
git clone https://github.com/MSAIGlobal/intuitv-platform.git
cd intuitv-platform/robotics

# Install dependencies
npm install
pip install -r requirements.txt

# Start development server
npm run dev
```

## Deployment

### Netlify:
```bash
npm run deploy
```

### Docker:
```bash
docker-compose up
```

### Traditional Server:
```bash
./deployment/install.sh
```

## Project Structure

```
robotics/
├── src/                    # Source code
│   ├── app.py             # Main Dash application
│   ├── ai/                # AI modules
│   ├── hardware/          # Hardware interfaces
│   ├── cad/               # 3D CAD tools
│   └── api/               # API endpoints
├── public/                # Static files
├── data/                  # Data storage
└── deployment/            # Deployment configurations
```

## API Documentation

The dashboard provides REST API endpoints at `/api/` and WebSocket connections at `ws://localhost:8765`.

## License

MIT License - see LICENSE file for details
