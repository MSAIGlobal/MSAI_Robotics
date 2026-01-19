#!/bin/bash
# MOTHER Robotics Training Setup Script

set -e  # Exit on error

echo "======================================================================"
echo "MOTHER Robotics Training Environment Setup"
echo "======================================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "  Python version: $python_version"

if ! python3 -c 'import sys; exit(0 if sys.version_info >= (3, 8) else 1)'; then
    echo -e "${RED}Error: Python 3.8 or higher is required${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python version OK${NC}"
echo ""

# Check if CUDA is available
echo "Checking CUDA availability..."
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
    echo -e "${GREEN}✓ NVIDIA GPU detected${NC}"
else
    echo -e "${YELLOW}⚠ No NVIDIA GPU detected - will use CPU${NC}"
fi
echo ""

# Create virtual environment
echo "Creating Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo "  Virtual environment already exists"
fi
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo -e "${GREEN}✓ Virtual environment activated${NC}"
echo ""

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip setuptools wheel
echo -e "${GREEN}✓ pip upgraded${NC}"
echo ""

# Install PyTorch with CUDA support if available
echo "Installing PyTorch..."
if command -v nvidia-smi &> /dev/null; then
    echo "  Installing PyTorch with CUDA support..."
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
else
    echo "  Installing PyTorch CPU version..."
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
fi
echo -e "${GREEN}✓ PyTorch installed${NC}"
echo ""

# Install NVIDIA packages
echo "Installing NVIDIA packages..."
pip install --upgrade nvidia-pyindex
pip install nvidia-tensorrt || echo "  TensorRT installation skipped (optional)"
echo -e "${GREEN}✓ NVIDIA packages installed${NC}"
echo ""

# Install requirements
echo "Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ requirements.txt not found${NC}"
fi
echo ""

# Create directory structure
echo "Creating directory structure..."
mkdir -p data/{raw,processed,datasets}
mkdir -p logs
mkdir -p checkpoints
mkdir -p outputs
mkdir -p configs
mkdir -p scripts
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Set permissions
echo "Setting script permissions..."
chmod +x scripts/*.py 2>/dev/null || true
chmod +x quick_start_training.py 2>/dev/null || true
echo -e "${GREEN}✓ Permissions set${NC}"
echo ""

# Verify installation
echo "Verifying installation..."
python3 -c "import torch; print(f'  PyTorch version: {torch.__version__}')"
python3 -c "import torch; print(f'  CUDA available: {torch.cuda.is_available()}')"
if python3 -c "import torch; exit(0 if torch.cuda.is_available() else 1)" 2>/dev/null; then
    python3 -c "import torch; print(f'  CUDA version: {torch.version.cuda}')"
    python3 -c "import torch; print(f'  GPU device: {torch.cuda.get_device_name(0)}')"
fi
echo -e "${GREEN}✓ Installation verified${NC}"
echo ""

# Create sample .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOL
# MOTHER Robotics Training Environment Variables

# Data paths
DATA_ROOT=data
CHECKPOINT_DIR=checkpoints
LOG_DIR=logs
OUTPUT_DIR=outputs

# Training settings
DEVICE=cuda
BATCH_SIZE=32
NUM_WORKERS=4

# API Keys (if needed)
# KAGGLE_USERNAME=your_username
# KAGGLE_KEY=your_api_key
EOL
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo "  .env file already exists"
fi
echo ""

echo "======================================================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "======================================================================"
echo ""
echo "Next steps:"
echo "  1. Activate the virtual environment: source venv/bin/activate"
echo "  2. Download datasets: python scripts/download_datasets.py --datasets coco"
echo "  3. Train a model: python scripts/train_robotics_model.py"
echo "  4. Or use quick start: python quick_start_training.py"
echo ""
echo "For more information, see README.md"
echo ""
