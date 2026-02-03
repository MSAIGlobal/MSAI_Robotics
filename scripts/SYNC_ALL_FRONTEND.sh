#!/bin/bash
# =============================================================================
#  MSAI MASTER FRONTEND SYNC SCRIPT
# =============================================================================
#  Syncs ALL frontend code between:
#    NODE: git@github.com:MSAIGlobal/mother-ai-sovereign-full-system.git
#    FRONTEND: git@github.com:MSAIGlobal/MSAI_Robotics.git
#
#  RULE: Latest modification date ALWAYS wins
#
#  Run in GitBash on your Windows laptop:
#    bash SYNC_ALL_FRONTEND.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Config
NODE_REPO="git@github.com:MSAIGlobal/mother-ai-sovereign-full-system.git"
FRONTEND_REPO="git@github.com:MSAIGlobal/MSAI_Robotics.git"
SYNC_DIR="$HOME/MSAI_Sync_$(date +%Y%m%d)"
BRANCH="sync-all-frontend-$(date +%H%M%S)"

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           MSAI MASTER FRONTEND SYNC                        ║"
echo "║                                                            ║"
echo "║   NODE  → mother-ai-sovereign-full-system                  ║"
echo "║   FRONT → MSAI_Robotics                                    ║"
echo "║                                                            ║"
echo "║   Rule: Newest file always wins                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Create sync directory
mkdir -p "$SYNC_DIR"
cd "$SYNC_DIR"
echo -e "${GREEN}Working in: $SYNC_DIR${NC}"
echo ""

# =============================================================================
# STEP 1: Clone/Update Repos
# =============================================================================
echo -e "${YELLOW}[1/7] Setting up repositories...${NC}"

if [ -d "NODE" ]; then
    echo "  Updating NODE repo..."
    cd NODE
    git fetch --all
    git checkout claude/fix-netlify-build-errors-tjiQs 2>/dev/null || git checkout main
    git pull origin claude/fix-netlify-build-errors-tjiQs 2>/dev/null || git pull
    cd ..
else
    echo "  Cloning NODE repo..."
    git clone "$NODE_REPO" NODE
    cd NODE
    git checkout claude/fix-netlify-build-errors-tjiQs 2>/dev/null || true
    cd ..
fi

if [ -d "FRONTEND" ]; then
    echo "  Updating FRONTEND repo..."
    cd FRONTEND
    git fetch --all
    git checkout claude/fix-netlify-build-errors-tjiQs 2>/dev/null || git checkout main
    git pull origin claude/fix-netlify-build-errors-tjiQs 2>/dev/null || git pull
    cd ..
else
    echo "  Cloning FRONTEND repo..."
    git clone "$FRONTEND_REPO" FRONTEND
    cd FRONTEND
    git checkout claude/fix-netlify-build-errors-tjiQs 2>/dev/null || true
    cd ..
fi

# =============================================================================
# STEP 2: Create sync branch
# =============================================================================
echo -e "${YELLOW}[2/7] Creating sync branch: $BRANCH${NC}"
cd FRONTEND
git checkout -b "$BRANCH"
cd ..

# =============================================================================
# STEP 3: Sync function (newest wins)
# =============================================================================
sync_newer() {
    local src="$1"
    local dst="$2"

    if [ -e "$src" ]; then
        mkdir -p "$(dirname "$dst")"
        if [ -d "$src" ]; then
            # Directory - use cp -ru (recursive, update only newer)
            cp -ru "$src"/* "$dst"/ 2>/dev/null || cp -r "$src"/* "$dst"/
        else
            # File - use cp -u (update only if newer)
            cp -u "$src" "$dst" 2>/dev/null || cp "$src" "$dst"
        fi
        echo -e "  ${GREEN}✓${NC} $(basename "$src")"
    fi
}

# =============================================================================
# STEP 4: Sync all frontend directories
# =============================================================================
echo -e "${YELLOW}[3/7] Syncing frontend directories...${NC}"

# Main frontend folder
sync_newer "NODE/frontend" "FRONTEND/frontend"

# Playout theme
sync_newer "NODE/frontend/playout-theme" "FRONTEND/frontend/src/styles/playout-theme"

# IntuiTV Systems
sync_newer "NODE/INTUITV_MSAI_SYSTEMS/frontend" "FRONTEND/intuitv-systems"

# IntuiTV Pipeline
sync_newer "NODE/intuitv_pipeline" "FRONTEND/pipeline"

# Mother Robotics Brain
sync_newer "NODE/mother_robotics_brain" "FRONTEND/robotics-brain"

# System Monitor
sync_newer "NODE/services/system_monitor" "FRONTEND/services/system-monitor"

# Scripts
sync_newer "NODE/scripts" "FRONTEND/scripts"
sync_newer "NODE/deploy-frontends.sh" "FRONTEND/scripts/deploy-frontends.sh"
sync_newer "NODE/clone-frontends.sh" "FRONTEND/scripts/clone-frontends.sh"

# =============================================================================
# STEP 5: Sync specific files from this session
# =============================================================================
echo -e "${YELLOW}[4/7] Syncing session-specific files...${NC}"

# websocket.ts fix
sync_newer "NODE/frontend/src/lib/websocket.ts" "FRONTEND/frontend/src/lib/websocket.ts"

# API files
sync_newer "NODE/frontend/src/lib/api.ts" "FRONTEND/frontend/src/lib/api.ts"

# =============================================================================
# STEP 6: Handle any .git folders in subdirectories (remove them)
# =============================================================================
echo -e "${YELLOW}[5/7] Cleaning embedded git repos...${NC}"
find FRONTEND -mindepth 2 -name ".git" -type d -exec rm -rf {} \; 2>/dev/null || true
echo -e "  ${GREEN}✓${NC} Cleaned"

# =============================================================================
# STEP 7: Stage, commit, push
# =============================================================================
echo -e "${YELLOW}[6/7] Staging changes...${NC}"
cd FRONTEND
git add -A

# Show what changed
echo ""
echo -e "${CYAN}Changed files:${NC}"
git diff --staged --name-only | head -30
CHANGED=$(git diff --staged --name-only | wc -l)
echo -e "${CYAN}Total: $CHANGED files${NC}"
echo ""

if [ "$CHANGED" -eq 0 ]; then
    echo -e "${GREEN}Already in sync! No changes needed.${NC}"
    exit 0
fi

echo -e "${YELLOW}[7/7] Committing and pushing...${NC}"
git commit -m "$(cat <<EOF
Sync all frontend code from NODE repo

Synced from: mother-ai-sovereign-full-system
Branch: claude/fix-netlify-build-errors-tjiQs

Directories synced:
- frontend/ (main dashboard, MSAI Robotics)
- frontend/playout-theme/ (elevate.io styles)
- intuitv-systems/ (INTUITV_MSAI_SYSTEMS frontend)
- pipeline/ (intuitv_pipeline - Text-to-TV)
- robotics-brain/ (MOTHER Robotics Brain)
- services/ (system monitor, APIs)
- scripts/ (deploy, cleanup, sync)

Session files included:
- EXO-1 Dashboard (CadViewer, Electronics, Control, Telemetry)
- Auth & RBAC system (observer/operator/admin/gov)
- Experiments, Datasets, Nodes, Safety dashboards
- Voice panel, Command console, Audit log
- WebSocket streaming, Backend API client

Merge rule: Latest modification date wins

https://claude.ai/code/session_01G9su7853YtB6pTjH9r6huE
EOF
)"

git push -u origin "$BRANCH"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    SYNC COMPLETE!                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Branch: ${CYAN}$BRANCH${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Open: https://github.com/MSAIGlobal/MSAI_Robotics/pulls"
echo "2. Click 'New Pull Request'"
echo "3. Select branch: $BRANCH"
echo "4. Review changes"
echo "5. Merge to main"
echo ""
echo -e "Sync directory: ${CYAN}$SYNC_DIR${NC}"
echo ""
