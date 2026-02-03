#!/usr/bin/env python3
"""
Setup script to download all teacher models and initialize student models
"""
import subprocess
import sys
from pathlib import Path
from typing import List, Dict
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Base directories
BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "models" / "weights"
REPOS_DIR = BASE_DIR / "models" / "repos"
DATASETS_DIR = BASE_DIR / "datasets"

# Teacher model configurations
TEACHER_REPOS = {
    "lingbot_world": {
        "git_url": "https://github.com/Robbyant/lingbot-world.git",
        "hf_model": None,  # Not on HF yet
        "requirements": ["torch>=2.4.0", "flash-attn", "transformers"],
    },
    "holocine": {
        "git_url": "https://github.com/yihao-meng/HoloCine.git",
        "hf_model": "hlwang06/HoloCine",
        "requirements": ["torch", "diffusers", "transformers"],
    },
    "ditto": {
        "git_url": "https://github.com/EzioBy/Ditto.git",
        "hf_model": None,  # Check HF
        "requirements": ["torch", "diffusers"],
    },
    "worldcanvas": {
        "git_url": "https://github.com/pPetrichor/WorldCanvas.git",
        "hf_model": "hlwang06/WorldCanvas",
        "requirements": ["torch", "diffusers", "transformers"],
    },
    "reward_forcing": {
        "git_url": "https://github.com/JaydenLyh/Reward-Forcing.git",
        "hf_model": "JaydenLu666/Reward-Forcing-T2V-1.3B",
        "requirements": ["torch", "diffusers"],
    },
    "codef": {
        "git_url": "https://github.com/qiuyu96/CoDeF.git",
        "hf_model": None,
        "requirements": ["torch", "torchvision"],
    },
}

def run_command(cmd: List[str], cwd: Path = None) -> bool:
    """Run a command and return success status"""
    try:
        subprocess.run(cmd, cwd=cwd, check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Command failed: {' '.join(cmd)}")
        logger.error(f"Error: {e.stderr.decode()}")
        return False

def clone_repo(name: str, config: Dict) -> bool:
    """Clone a model repository"""
    repo_dir = REPOS_DIR / name
    
    if repo_dir.exists():
        logger.info(f"Repository {name} already exists, pulling latest...")
        return run_command(["git", "pull"], cwd=repo_dir)
    
    logger.info(f"Cloning {name} from {config['git_url']}...")
    return run_command(["git", "clone", config["git_url"], str(repo_dir)])

def download_hf_model(name: str, model_id: str) -> bool:
    """Download model from HuggingFace"""
    model_dir = MODELS_DIR / name
    model_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Downloading {model_id} from HuggingFace...")
    
    try:
        from huggingface_hub import snapshot_download
        snapshot_download(
            repo_id=model_id,
            local_dir=str(model_dir),
            local_dir_use_symlinks=False,
        )
        return True
    except Exception as e:
        logger.error(f"Failed to download {model_id}: {e}")
        return False

def setup_student_model(name: str, base_config: Dict) -> bool:
    """Initialize a student model from MOTHER T2V base"""
    student_dir = MODELS_DIR / f"mother_{name}"
    student_dir.mkdir(parents=True, exist_ok=True)
    
    # Create initial config
    config = {
        "name": f"MOTHER-{name.title()}",
        "base": "mother_t2v",
        "stage": base_config.get("stage", "unknown"),
        "version": "0.1.0",
        "training_status": "initialized",
        "teacher_model": name,
    }
    
    config_path = student_dir / "config.json"
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    
    logger.info(f"Initialized student model: MOTHER-{name.title()}")
    return True

def main():
    """Main setup function"""
    logger.info("=" * 60)
    logger.info("IntuiTV Model Setup")
    logger.info("=" * 60)
    
    # Create directories
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    REPOS_DIR.mkdir(parents=True, exist_ok=True)
    DATASETS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Track results
    results = {"repos": {}, "models": {}, "students": {}}
    
    # Clone all teacher repositories
    logger.info("\n[1/3] Cloning Teacher Model Repositories...")
    for name, config in TEACHER_REPOS.items():
        success = clone_repo(name, config)
        results["repos"][name] = "success" if success else "failed"
    
    # Download HuggingFace models
    logger.info("\n[2/3] Downloading HuggingFace Models...")
    for name, config in TEACHER_REPOS.items():
        if config.get("hf_model"):
            success = download_hf_model(name, config["hf_model"])
            results["models"][name] = "success" if success else "failed"
    
    # Initialize student models
    logger.info("\n[3/3] Initializing Student Models...")
    stage_mapping = {
        "lingbot_world": {"stage": "world_simulation"},
        "holocine": {"stage": "cinematography"},
        "ditto": {"stage": "video_editing"},
        "worldcanvas": {"stage": "scene_generation"},
        "reward_forcing": {"stage": "scene_generation"},
        "codef": {"stage": "character_consistency"},
    }
    
    for name, config in stage_mapping.items():
        success = setup_student_model(name, config)
        results["students"][f"mother_{name}"] = "success" if success else "failed"
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("Setup Summary")
    logger.info("=" * 60)
    
    for category, items in results.items():
        logger.info(f"\n{category.upper()}:")
        for name, status in items.items():
            icon = "✓" if status == "success" else "✗"
            logger.info(f"  {icon} {name}: {status}")
    
    # Save results
    results_path = BASE_DIR / "setup_results.json"
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)
    
    logger.info(f"\nResults saved to: {results_path}")
    logger.info("\nSetup complete! Run training with: python -m intuitv_pipeline.training.run")

if __name__ == "__main__":
    main()
