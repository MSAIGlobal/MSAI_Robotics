#!/bin/bash
# URGENT: Checkpoint Cleanup Script
# Keeps only the last 5 checkpoints per training run to free disk space
# Run with: bash cleanup_checkpoints.sh [--dry-run]

set -e

DRY_RUN=false
KEEP_COUNT=5

if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "=== DRY RUN MODE - No files will be deleted ==="
fi

echo "================================================"
echo "   CHECKPOINT CLEANUP - Keeping last $KEEP_COUNT"
echo "================================================"
echo ""

# Common checkpoint locations - add your paths here
SEARCH_PATHS=(
    "$HOME/models"
    "$HOME/training"
    "$HOME/experiments"
    "$HOME/outputs"
    "$HOME/runs"
    "$HOME/mother-ai-sovereign-full-system"
    "$HOME/MSAI_Robotics"
    "$HOME/intuitv_pipeline"
    "/data/checkpoints"
    "/workspace"
)

TOTAL_FREED=0

cleanup_numbered_checkpoints() {
    local base_dir="$1"
    local pattern="$2"

    if [ ! -d "$base_dir" ]; then
        return
    fi

    # Find checkpoint directories/files matching pattern
    local checkpoints=()
    while IFS= read -r -d '' ckpt; do
        checkpoints+=("$ckpt")
    done < <(find "$base_dir" -maxdepth 1 -name "$pattern" -print0 2>/dev/null | sort -z -V)

    local count=${#checkpoints[@]}

    if [ $count -le $KEEP_COUNT ]; then
        return
    fi

    local to_delete=$((count - KEEP_COUNT))
    echo "  Found $count checkpoints, deleting oldest $to_delete..."

    for ((i=0; i<to_delete; i++)); do
        local ckpt="${checkpoints[$i]}"
        local size=$(du -sh "$ckpt" 2>/dev/null | cut -f1)

        if [ "$DRY_RUN" = true ]; then
            echo "    [DRY-RUN] Would delete: $ckpt ($size)"
        else
            echo "    Deleting: $ckpt ($size)"
            rm -rf "$ckpt"
        fi
    done
}

# Function to clean HuggingFace-style checkpoints (checkpoint-XXXX)
cleanup_hf_checkpoints() {
    local train_dir="$1"

    echo "Scanning: $train_dir"

    # Find all checkpoint-XXXX directories
    local checkpoints=($(ls -d "$train_dir"/checkpoint-* 2>/dev/null | sort -t'-' -k2 -n))
    local count=${#checkpoints[@]}

    if [ $count -eq 0 ]; then
        return
    fi

    if [ $count -le $KEEP_COUNT ]; then
        echo "  Only $count checkpoints found, keeping all"
        return
    fi

    local to_delete=$((count - KEEP_COUNT))
    echo "  Found $count checkpoints, will delete $to_delete oldest"

    for ((i=0; i<to_delete; i++)); do
        local ckpt="${checkpoints[$i]}"
        local size=$(du -sh "$ckpt" 2>/dev/null | cut -f1)
        local bytes=$(du -sb "$ckpt" 2>/dev/null | cut -f1)
        TOTAL_FREED=$((TOTAL_FREED + bytes))

        if [ "$DRY_RUN" = true ]; then
            echo "    [DRY-RUN] Would delete: $(basename $ckpt) ($size)"
        else
            echo "    Deleting: $(basename $ckpt) ($size)"
            rm -rf "$ckpt"
        fi
    done
}

# Function to clean epoch-based checkpoints
cleanup_epoch_checkpoints() {
    local train_dir="$1"

    # Find epoch_* or epoch-* directories/files
    local checkpoints=($(ls -d "$train_dir"/epoch* 2>/dev/null | sort -t'_' -k2 -n 2>/dev/null || ls -d "$train_dir"/epoch* 2>/dev/null | sort -t'-' -k2 -n 2>/dev/null))
    local count=${#checkpoints[@]}

    if [ $count -eq 0 ]; then
        return
    fi

    if [ $count -le $KEEP_COUNT ]; then
        return
    fi

    local to_delete=$((count - KEEP_COUNT))
    echo "  Epoch checkpoints: deleting $to_delete of $count"

    for ((i=0; i<to_delete; i++)); do
        local ckpt="${checkpoints[$i]}"
        local size=$(du -sh "$ckpt" 2>/dev/null | cut -f1)
        local bytes=$(du -sb "$ckpt" 2>/dev/null | cut -f1)
        TOTAL_FREED=$((TOTAL_FREED + bytes))

        if [ "$DRY_RUN" = true ]; then
            echo "    [DRY-RUN] Would delete: $(basename $ckpt) ($size)"
        else
            echo "    Deleting: $(basename $ckpt) ($size)"
            rm -rf "$ckpt"
        fi
    done
}

# Function to clean step-based checkpoints
cleanup_step_checkpoints() {
    local train_dir="$1"

    # Find step_* or step-* or *_step_* files
    local checkpoints=($(ls "$train_dir"/*step* 2>/dev/null | sort -t'_' -k2 -n 2>/dev/null || ls "$train_dir"/*step* 2>/dev/null | sort -V))
    local count=${#checkpoints[@]}

    if [ $count -eq 0 ]; then
        return
    fi

    if [ $count -le $KEEP_COUNT ]; then
        return
    fi

    local to_delete=$((count - KEEP_COUNT))
    echo "  Step checkpoints: deleting $to_delete of $count"

    for ((i=0; i<to_delete; i++)); do
        local ckpt="${checkpoints[$i]}"
        local size=$(du -sh "$ckpt" 2>/dev/null | cut -f1)
        local bytes=$(du -sb "$ckpt" 2>/dev/null | cut -f1)
        TOTAL_FREED=$((TOTAL_FREED + bytes))

        if [ "$DRY_RUN" = true ]; then
            echo "    [DRY-RUN] Would delete: $(basename $ckpt) ($size)"
        else
            echo "    Deleting: $(basename $ckpt) ($size)"
            rm -rf "$ckpt"
        fi
    done
}

# Main cleanup
echo "Checking disk space before cleanup..."
df -h / | head -2
echo ""

# Search all paths for training directories with checkpoints
for search_path in "${SEARCH_PATHS[@]}"; do
    if [ ! -d "$search_path" ]; then
        continue
    fi

    echo ""
    echo "=== Searching: $search_path ==="

    # Find directories containing checkpoint-* subdirs (HuggingFace style)
    while IFS= read -r -d '' dir; do
        parent=$(dirname "$dir")
        cleanup_hf_checkpoints "$parent"
    done < <(find "$search_path" -type d -name "checkpoint-*" -print0 2>/dev/null | sort -z -u)

    # Find directories containing epoch checkpoints
    while IFS= read -r -d '' dir; do
        parent=$(dirname "$dir")
        cleanup_epoch_checkpoints "$parent"
    done < <(find "$search_path" -type d -name "epoch*" -print0 2>/dev/null | sort -z -u)

    # Find standalone .pt/.safetensors/.ckpt files in checkpoints directories
    while IFS= read -r -d '' ckpt_dir; do
        echo "Scanning checkpoint dir: $ckpt_dir"

        # Clean .pt files
        local pt_files=($(ls "$ckpt_dir"/*.pt 2>/dev/null | sort -V))
        if [ ${#pt_files[@]} -gt $KEEP_COUNT ]; then
            local to_delete=$((${#pt_files[@]} - KEEP_COUNT))
            echo "  .pt files: deleting $to_delete of ${#pt_files[@]}"
            for ((i=0; i<to_delete; i++)); do
                if [ "$DRY_RUN" = true ]; then
                    echo "    [DRY-RUN] Would delete: ${pt_files[$i]}"
                else
                    rm -f "${pt_files[$i]}"
                fi
            done
        fi

        # Clean .safetensors files
        local st_files=($(ls "$ckpt_dir"/*.safetensors 2>/dev/null | sort -V))
        if [ ${#st_files[@]} -gt $KEEP_COUNT ]; then
            local to_delete=$((${#st_files[@]} - KEEP_COUNT))
            echo "  .safetensors files: deleting $to_delete of ${#st_files[@]}"
            for ((i=0; i<to_delete; i++)); do
                if [ "$DRY_RUN" = true ]; then
                    echo "    [DRY-RUN] Would delete: ${st_files[$i]}"
                else
                    rm -f "${st_files[$i]}"
                fi
            done
        fi

    done < <(find "$search_path" -type d -name "checkpoints" -print0 2>/dev/null)
done

echo ""
echo "================================================"
echo "   CLEANUP COMPLETE"
echo "================================================"

if [ "$DRY_RUN" = true ]; then
    echo "This was a DRY RUN - no files were deleted"
    echo "Run without --dry-run to actually delete files"
else
    echo "Disk space after cleanup:"
    df -h / | head -2
fi

# Convert bytes to human readable
if [ $TOTAL_FREED -gt 0 ]; then
    if [ $TOTAL_FREED -gt 1073741824 ]; then
        echo "Estimated space freed: $((TOTAL_FREED / 1073741824)) GB"
    elif [ $TOTAL_FREED -gt 1048576 ]; then
        echo "Estimated space freed: $((TOTAL_FREED / 1048576)) MB"
    else
        echo "Estimated space freed: $((TOTAL_FREED / 1024)) KB"
    fi
fi
