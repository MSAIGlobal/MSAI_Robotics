#!/usr/bin/env python3
"""
Download robotics datasets for MOTHER Robotics Brain
"""
import subprocess
import sys
from pathlib import Path
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent.parent.parent
DATASETS_DIR = BASE_DIR / "datasets" / "robotics"

ROBOTICS_DATASETS = {
    # NVIDIA Datasets
    "nurec": {
        "source": "huggingface",
        "repo_id": "nvidia/PhysicalAI-Robotics-NuRec",
        "description": "NVIDIA robotic perception and control dataset",
    },
    
    # Open-X Embodiment
    "open_x_embodiment": {
        "source": "huggingface",
        "repo_id": "open-x/embodiment",
        "description": "Open X-Embodiment robotics dataset",
    },
    
    # RoboMIND
    "robomind": {
        "source": "github",
        "url": "https://github.com/OpenRobotLab/RoboMIND",
        "description": "Robot manipulation and interaction dataset",
    },
    
    # LeRobot datasets
    "lerobot_pusht": {
        "source": "huggingface",
        "repo_id": "lerobot/pusht",
        "description": "Push-T manipulation task dataset",
    },
    "lerobot_aloha": {
        "source": "huggingface",
        "repo_id": "lerobot/aloha_sim_insertion_human",
        "description": "ALOHA bimanual manipulation dataset",
    },
    
    # Humanoid datasets
    "humanoid_world_models": {
        "source": "github",
        "url": "https://github.com/snap-research/Humanoid-World-Models",
        "description": "World models for humanoid prediction",
    },
}

def download_huggingface(repo_id: str, output_dir: Path) -> bool:
    """Download dataset from HuggingFace"""
    try:
        from huggingface_hub import snapshot_download
        snapshot_download(
            repo_id=repo_id,
            local_dir=str(output_dir),
            local_dir_use_symlinks=False,
        )
        return True
    except Exception as e:
        logger.error(f"Failed to download {repo_id}: {e}")
        return False

def clone_github(url: str, output_dir: Path) -> bool:
    """Clone GitHub repository"""
    try:
        if output_dir.exists():
            subprocess.run(["git", "pull"], cwd=output_dir, check=True)
        else:
            subprocess.run(["git", "clone", url, str(output_dir)], check=True)
        return True
    except Exception as e:
        logger.error(f"Failed to clone {url}: {e}")
        return False

def main():
    logger.info("=" * 60)
    logger.info("MOTHER Robotics Brain - Dataset Download")
    logger.info("=" * 60)
    
    DATASETS_DIR.mkdir(parents=True, exist_ok=True)
    results = {}
    
    for name, config in ROBOTICS_DATASETS.items():
        logger.info(f"\nDownloading: {name}")
        logger.info(f"  Description: {config['description']}")
        
        output_dir = DATASETS_DIR / name
        
        if config["source"] == "huggingface":
            success = download_huggingface(config["repo_id"], output_dir)
        elif config["source"] == "github":
            success = clone_github(config["url"], output_dir)
        else:
            success = False
        
        results[name] = "success" if success else "failed"
        status = "✓" if success else "✗"
        logger.info(f"  {status} {name}: {results[name]}")
    
    # Save results
    results_path = DATASETS_DIR / "download_results.json"
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)
    
    logger.info(f"\nResults saved to: {results_path}")
    logger.info(f"Datasets directory: {DATASETS_DIR}")

if __name__ == "__main__":
    main()
