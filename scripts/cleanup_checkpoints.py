#!/usr/bin/env python3
"""
URGENT: Checkpoint Cleanup Script
Keeps only the last N checkpoints per training run to free disk space.

Usage:
    python cleanup_checkpoints.py                    # Dry run (preview)
    python cleanup_checkpoints.py --execute          # Actually delete
    python cleanup_checkpoints.py --keep 3 --execute # Keep only 3
"""

import os
import re
import shutil
import argparse
from pathlib import Path
from typing import List, Tuple
from datetime import datetime

# Common checkpoint locations - ADD YOUR PATHS HERE
SEARCH_PATHS = [
    Path.home() / "models",
    Path.home() / "training",
    Path.home() / "experiments",
    Path.home() / "outputs",
    Path.home() / "runs",
    Path.home() / "mother-ai-sovereign-full-system",
    Path.home() / "MSAI_Robotics",
    Path.home() / "intuitv_pipeline",
    Path("/data/checkpoints"),
    Path("/workspace"),
    Path("/mnt/data"),
]

# Checkpoint patterns
CHECKPOINT_PATTERNS = [
    r"checkpoint-(\d+)",      # HuggingFace: checkpoint-1000
    r"epoch[_-]?(\d+)",       # epoch_10, epoch-10, epoch10
    r"step[_-]?(\d+)",        # step_1000, step-1000
    r"iter[_-]?(\d+)",        # iter_1000
    r"ckpt[_-]?(\d+)",        # ckpt_10
    r"model[_-]?(\d+)",       # model_10
    r".*?(\d{5,})",           # Any 5+ digit number (step counts)
]


def get_checkpoint_number(name: str) -> int:
    """Extract checkpoint number from name for sorting."""
    for pattern in CHECKPOINT_PATTERNS:
        match = re.search(pattern, name, re.IGNORECASE)
        if match:
            return int(match.group(1))

    # Fallback: try to find any number
    numbers = re.findall(r'\d+', name)
    if numbers:
        return int(numbers[-1])
    return 0


def get_size_str(path: Path) -> str:
    """Get human-readable size of path."""
    try:
        if path.is_file():
            size = path.stat().st_size
        else:
            size = sum(f.stat().st_size for f in path.rglob('*') if f.is_file())

        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} PB"
    except:
        return "? B"


def get_size_bytes(path: Path) -> int:
    """Get size in bytes."""
    try:
        if path.is_file():
            return path.stat().st_size
        return sum(f.stat().st_size for f in path.rglob('*') if f.is_file())
    except:
        return 0


def find_checkpoint_groups(search_path: Path) -> List[Tuple[Path, List[Path]]]:
    """Find groups of checkpoints in a directory."""
    groups = []

    if not search_path.exists():
        return groups

    # Find directories containing checkpoint-* subdirs
    for parent in search_path.rglob("*"):
        if not parent.is_dir():
            continue

        checkpoints = []

        # HuggingFace style: checkpoint-XXXX directories
        checkpoints.extend(list(parent.glob("checkpoint-*")))

        # Epoch style
        checkpoints.extend(list(parent.glob("epoch*")))
        checkpoints.extend(list(parent.glob("epoch_*")))

        # Step style
        checkpoints.extend([p for p in parent.glob("*step*") if p.is_dir() or p.suffix in ['.pt', '.pth', '.safetensors', '.ckpt']])

        # Direct checkpoint files
        for ext in ['.pt', '.pth', '.safetensors', '.ckpt', '.bin']:
            checkpoints.extend(list(parent.glob(f"*{ext}")))

        # Deduplicate and filter
        checkpoints = list(set(checkpoints))
        checkpoints = [c for c in checkpoints if c.exists()]

        if len(checkpoints) > 0:
            # Sort by checkpoint number
            checkpoints.sort(key=lambda p: get_checkpoint_number(p.name))
            groups.append((parent, checkpoints))

    return groups


def cleanup_checkpoints(keep_count: int = 5, execute: bool = False):
    """Main cleanup function."""
    print("=" * 60)
    print(f"   CHECKPOINT CLEANUP - Keeping last {keep_count}")
    print(f"   Mode: {'EXECUTE (will delete!)' if execute else 'DRY RUN (preview only)'}")
    print("=" * 60)
    print()

    total_freed = 0
    total_deleted = 0

    for search_path in SEARCH_PATHS:
        if not search_path.exists():
            continue

        print(f"\n=== Searching: {search_path} ===")

        groups = find_checkpoint_groups(search_path)

        for parent, checkpoints in groups:
            if len(checkpoints) <= keep_count:
                continue

            to_delete = checkpoints[:-keep_count]  # Keep the newest
            to_keep = checkpoints[-keep_count:]

            print(f"\n  {parent}")
            print(f"  Found {len(checkpoints)} checkpoints, deleting {len(to_delete)}")
            print(f"  Keeping: {[c.name for c in to_keep]}")

            for ckpt in to_delete:
                size_str = get_size_str(ckpt)
                size_bytes = get_size_bytes(ckpt)
                total_freed += size_bytes
                total_deleted += 1

                if execute:
                    print(f"    DELETING: {ckpt.name} ({size_str})")
                    try:
                        if ckpt.is_dir():
                            shutil.rmtree(ckpt)
                        else:
                            ckpt.unlink()
                    except Exception as e:
                        print(f"      ERROR: {e}")
                else:
                    print(f"    [DRY-RUN] Would delete: {ckpt.name} ({size_str})")

    print("\n" + "=" * 60)
    print("   CLEANUP COMPLETE")
    print("=" * 60)

    # Convert to human readable
    freed_str = f"{total_freed / (1024**3):.2f} GB" if total_freed > 1024**3 else f"{total_freed / (1024**2):.2f} MB"

    print(f"\nCheckpoints {'deleted' if execute else 'to delete'}: {total_deleted}")
    print(f"Space {'freed' if execute else 'to free'}: {freed_str}")

    if not execute:
        print("\n*** This was a DRY RUN - no files deleted ***")
        print("*** Run with --execute to actually delete ***")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean up old model checkpoints")
    parser.add_argument("--keep", type=int, default=5, help="Number of checkpoints to keep (default: 5)")
    parser.add_argument("--execute", action="store_true", help="Actually delete files (default: dry run)")
    parser.add_argument("--path", type=str, help="Additional path to search")

    args = parser.parse_args()

    if args.path:
        SEARCH_PATHS.append(Path(args.path))

    cleanup_checkpoints(keep_count=args.keep, execute=args.execute)
