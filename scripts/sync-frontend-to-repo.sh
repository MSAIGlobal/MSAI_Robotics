#!/bin/bash
# =============================================================================
# MSAI Frontend Sync Script
# Syncs all frontend code from NODE repo to Frontend repo
# Latest creation/modification date ALWAYS wins
# =============================================================================
# Run this in GitBash on your laptop
# Usage: bash sync-frontend-to-repo.sh
# =============================================================================

set -e

# Configuration
NODE_REPO="git@github.com:MSAIGlobal/mother-ai-sovereign-full-system.git"
FRONTEND_REPO="git@github.com:MSAIGlobal/MSAI_Robotics.git"
WORK_DIR="$HOME/msai-frontend-sync"
BRANCH_NAME="sync-node-frontend-$(date +%Y%m%d-%H%M%S)"

echo "=============================================="
echo "  MSAI Frontend Sync Script"
echo "  NODE -> Frontend Repo"
echo "=============================================="
echo ""

# Create work directory
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

echo "[1/6] Cloning/Updating NODE repo..."
if [ -d "node-repo" ]; then
    cd node-repo
    git fetch origin
    git checkout main 2>/dev/null || git checkout master
    git pull
    # Also get the claude branch with latest fixes
    git fetch origin claude/fix-netlify-build-errors-tjiQs 2>/dev/null || true
    git checkout claude/fix-netlify-build-errors-tjiQs 2>/dev/null || echo "Using main branch"
    cd ..
else
    git clone "$NODE_REPO" node-repo
    cd node-repo
    git fetch origin claude/fix-netlify-build-errors-tjiQs 2>/dev/null || true
    git checkout claude/fix-netlify-build-errors-tjiQs 2>/dev/null || echo "Using main branch"
    cd ..
fi

echo "[2/6] Cloning/Updating Frontend repo..."
if [ -d "frontend-repo" ]; then
    cd frontend-repo
    git fetch origin
    git checkout main 2>/dev/null || git checkout master
    git pull
    cd ..
else
    git clone "$FRONTEND_REPO" frontend-repo
fi

echo "[3/6] Creating sync branch..."
cd frontend-repo
git checkout -b "$BRANCH_NAME"
cd ..

echo "[4/6] Syncing frontend files (newer wins)..."

# =============================================================================
# FRONTEND DIRECTORIES TO SYNC FROM NODE
# =============================================================================

# Main frontend from NODE
if [ -d "node-repo/frontend" ]; then
    echo "  -> Syncing node-repo/frontend/ ..."
    cp -ru node-repo/frontend/* frontend-repo/frontend/ 2>/dev/null || mkdir -p frontend-repo/frontend && cp -r node-repo/frontend/* frontend-repo/frontend/
fi

# Playout theme
if [ -d "node-repo/frontend/playout-theme" ]; then
    echo "  -> Syncing playout-theme..."
    mkdir -p frontend-repo/frontend/src/styles
    cp -ru node-repo/frontend/playout-theme/* frontend-repo/frontend/src/styles/ 2>/dev/null || true
fi

# INTUITV Systems frontend
if [ -d "node-repo/INTUITV_MSAI_SYSTEMS/frontend" ]; then
    echo "  -> Syncing INTUITV_MSAI_SYSTEMS frontend..."
    mkdir -p frontend-repo/intuitv-systems
    cp -ru node-repo/INTUITV_MSAI_SYSTEMS/frontend/* frontend-repo/intuitv-systems/ 2>/dev/null || true
fi

# IntuiTV Pipeline frontend components
if [ -d "node-repo/intuitv_pipeline" ]; then
    echo "  -> Syncing intuitv_pipeline..."
    mkdir -p frontend-repo/pipeline
    cp -ru node-repo/intuitv_pipeline/* frontend-repo/pipeline/ 2>/dev/null || true
fi

# Mother Robotics Brain (frontend-relevant parts)
if [ -d "node-repo/mother_robotics_brain" ]; then
    echo "  -> Syncing mother_robotics_brain types/interfaces..."
    mkdir -p frontend-repo/src/lib/robotics-brain
    # Copy Python type definitions that inform TypeScript types
    cp -ru node-repo/mother_robotics_brain/*.py frontend-repo/src/lib/robotics-brain/ 2>/dev/null || true
fi

# Services API definitions (for frontend API client)
if [ -d "node-repo/services" ]; then
    echo "  -> Syncing services API schemas..."
    mkdir -p frontend-repo/api-schemas
    find node-repo/services -name "*.json" -o -name "*schema*" -o -name "*types*" | while read f; do
        cp -u "$f" frontend-repo/api-schemas/ 2>/dev/null || true
    done
fi

# Scripts and deployment
if [ -d "node-repo/scripts" ]; then
    echo "  -> Syncing scripts..."
    mkdir -p frontend-repo/scripts
    cp -ru node-repo/scripts/* frontend-repo/scripts/ 2>/dev/null || true
fi

echo "[5/6] Staging and committing changes..."
cd frontend-repo

# Add all changes
git add -A

# Check if there are changes
if git diff --staged --quiet; then
    echo "No changes to commit - repos are already in sync!"
else
    git commit -m "$(cat <<EOF
Sync frontend code from NODE repo

Source: mother-ai-sovereign-full-system
Target: MSAI_Robotics

Synced directories:
- frontend/ (main dashboard)
- playout-theme/ (elevate.io styles)
- INTUITV_MSAI_SYSTEMS/frontend
- intuitv_pipeline/
- mother_robotics_brain/ (type definitions)
- services/ (API schemas)
- scripts/

Merge strategy: Latest modification date wins

https://claude.ai/code/session_01G9su7853YtB6pTjH9r6huE
EOF
)"
fi

echo "[6/6] Pushing branch for PR..."
git push -u origin "$BRANCH_NAME"

echo ""
echo "=============================================="
echo "  SYNC COMPLETE!"
echo "=============================================="
echo ""
echo "Branch pushed: $BRANCH_NAME"
echo ""
echo "Next steps:"
echo "1. Go to: https://github.com/MSAIGlobal/MSAI_Robotics/pulls"
echo "2. Create a new Pull Request from branch: $BRANCH_NAME"
echo "3. Review the changes"
echo "4. Merge to main"
echo ""
echo "Work directory: $WORK_DIR"
echo ""
