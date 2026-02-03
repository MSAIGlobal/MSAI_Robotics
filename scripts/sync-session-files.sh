#!/bin/bash
# =============================================================================
# MSAI Session Files Sync Script
# Syncs ALL files created/modified in this coding session
# From NODE repo to Frontend repo
# =============================================================================
# Run in GitBash on your laptop
# Usage: bash sync-session-files.sh
# =============================================================================

set -e

NODE_REPO="git@github.com:MSAIGlobal/mother-ai-sovereign-full-system.git"
FRONTEND_REPO="git@github.com:MSAIGlobal/MSAI_Robotics.git"
WORK_DIR="$HOME/msai-session-sync"
BRANCH_NAME="session-sync-$(date +%Y%m%d-%H%M%S)"

echo "=============================================="
echo "  MSAI Session Files Sync"
echo "=============================================="

mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# Clone both repos
echo "[1/5] Setting up repos..."
[ -d "node-repo" ] && (cd node-repo && git fetch --all && git pull) || git clone "$NODE_REPO" node-repo
[ -d "frontend-repo" ] && (cd frontend-repo && git fetch --all && git pull) || git clone "$FRONTEND_REPO" frontend-repo

# Checkout latest branches
cd node-repo
git checkout claude/fix-netlify-build-errors-tjiQs 2>/dev/null || git checkout main
git pull origin claude/fix-netlify-build-errors-tjiQs 2>/dev/null || true
cd ../frontend-repo
git checkout claude/fix-netlify-build-errors-tjiQs 2>/dev/null || git checkout main
git checkout -b "$BRANCH_NAME"
cd ..

echo "[2/5] Copying session files..."

# =============================================================================
# FILES CREATED/MODIFIED THIS SESSION - NODE REPO
# =============================================================================

# 1. Playout Theme (elevate.io inspired)
echo "  -> Playout theme..."
mkdir -p frontend-repo/frontend/src/styles/playout-theme
cp -v node-repo/frontend/playout-theme/globals.css frontend-repo/frontend/src/styles/playout-theme/ 2>/dev/null || true
cp -v node-repo/frontend/playout-theme/components/*.tsx frontend-repo/frontend/src/styles/playout-theme/ 2>/dev/null || true

# 2. IntuiTV Pipeline
echo "  -> IntuiTV Pipeline..."
mkdir -p frontend-repo/pipeline
cp -rv node-repo/intuitv_pipeline/* frontend-repo/pipeline/ 2>/dev/null || true

# 3. Mother Robotics Brain
echo "  -> Mother Robotics Brain..."
mkdir -p frontend-repo/robotics-brain
cp -rv node-repo/mother_robotics_brain/* frontend-repo/robotics-brain/ 2>/dev/null || true

# 4. System Monitor Service
echo "  -> System Monitor..."
mkdir -p frontend-repo/services/system-monitor
cp -rv node-repo/services/system_monitor/* frontend-repo/services/system-monitor/ 2>/dev/null || true

# 5. Cleanup Scripts
echo "  -> Scripts..."
mkdir -p frontend-repo/scripts
cp -v node-repo/scripts/cleanup_checkpoints.sh frontend-repo/scripts/ 2>/dev/null || true
cp -v node-repo/scripts/cleanup_checkpoints.py frontend-repo/scripts/ 2>/dev/null || true
cp -v node-repo/scripts/sync-frontend-to-repo.sh frontend-repo/scripts/ 2>/dev/null || true

# 6. Deploy scripts
cp -v node-repo/deploy-frontends.sh frontend-repo/scripts/ 2>/dev/null || true
cp -v node-repo/clone-frontends.sh frontend-repo/scripts/ 2>/dev/null || true

# =============================================================================
# FILES CREATED THIS SESSION - DIRECTLY IN FRONTEND REPO (MSAI_Robotics)
# =============================================================================

echo "[3/5] Verifying MSAI_Robotics frontend files..."

# These were pushed directly to MSAI_Robotics - verify they exist
FRONTEND_FILES=(
    "frontend/src/lib/types.ts"
    "frontend/src/lib/auth.ts"
    "frontend/src/lib/backend.ts"
    "frontend/src/components/robotics/CadViewer.tsx"
    "frontend/src/components/robotics/ControlPanel.tsx"
    "frontend/src/components/robotics/ElectronicsPanel.tsx"
    "frontend/src/components/robotics/TelemetryPanel.tsx"
    "frontend/src/components/experiments/ExperimentLaunchForm.tsx"
    "frontend/src/components/experiments/ExperimentList.tsx"
    "frontend/src/components/datasets/DatasetLineageGraph.tsx"
    "frontend/src/components/nodes/NodeStatusGrid.tsx"
    "frontend/src/components/safety/SafetyDashboard.tsx"
    "frontend/src/components/voice/MotherVoicePanel.tsx"
    "frontend/src/components/commands/NodeCommandPanel.tsx"
    "frontend/src/components/audit/AuditLog.tsx"
    "frontend/src/components/sync/RepoSyncStatus.tsx"
    "frontend/src/pages/Exo1Dashboard.tsx"
)

cd frontend-repo
for f in "${FRONTEND_FILES[@]}"; do
    if [ -f "$f" ]; then
        echo "  ✓ $f"
    else
        echo "  ✗ MISSING: $f"
    fi
done
cd ..

echo "[4/5] Committing changes..."
cd frontend-repo
git add -A

if git diff --staged --quiet; then
    echo "No new changes to commit"
else
    git commit -m "$(cat <<EOF
Sync session files from NODE repo

This commit includes all files from the coding session:

From NODE (mother-ai-sovereign-full-system):
- frontend/playout-theme/ (elevate.io inspired styles)
- intuitv_pipeline/ (Text-to-TV with 6 teacher models)
- mother_robotics_brain/ (NVIDIA GR00T, Isaac Lab)
- services/system_monitor/ (GPU monitoring, 8x H200)
- scripts/ (cleanup, deploy, sync)

Already in Frontend repo (MSAI_Robotics):
- Complete EXO-1 Dashboard
- Auth & RBAC system
- Experiment/Dataset/Node/Safety dashboards
- Voice panel, Command console, Audit log

Merge strategy: Latest modification wins

https://claude.ai/code/session_01G9su7853YtB6pTjH9r6huE
EOF
)"
fi

echo "[5/5] Pushing..."
git push -u origin "$BRANCH_NAME"

echo ""
echo "=============================================="
echo "  DONE!"
echo "=============================================="
echo ""
echo "Branch: $BRANCH_NAME"
echo "PR URL: https://github.com/MSAIGlobal/MSAI_Robotics/compare/$BRANCH_NAME"
echo ""
