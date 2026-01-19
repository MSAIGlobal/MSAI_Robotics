#!/usr/bin/env python3
"""
Complete setup script for MOTHER Robotics Dashboard
Runs all initialization scripts in the correct order
"""
import subprocess
import sys
from pathlib import Path

def run_script(script_name, description):
    """Run a Python script and report status"""
    print(f"\n{'=' * 60}")
    print(f"{description}")
    print(f"{'=' * 60}")

    script_path = Path(__file__).parent / script_name

    if not script_path.exists():
        print(f"⚠ Warning: {script_name} not found, skipping...")
        return False

    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        print(result.stdout)

        if result.returncode != 0:
            print(f"⚠ Warning: {script_name} completed with errors:")
            print(result.stderr)
            return False

        return True

    except subprocess.TimeoutExpired:
        print(f"⚠ Warning: {script_name} timed out")
        return False

    except Exception as e:
        print(f"⚠ Warning: Error running {script_name}: {e}")
        return False

def create_directory_structure():
    """Create complete directory structure"""
    print("\nCreating directory structure...")

    directories = [
        'public/assets/images',
        'public/assets/fonts',
        'src/components',
        'src/pages',
        'src/ai/models',
        'src/hardware',
        'src/cad',
        'src/utils',
        'src/api',
        'src/database',
        'src/static/css',
        'src/static/js',
        'src/static/models',
        'src/tests',
        'data/datasets/household_objects',
        'data/datasets/navigation_scenes',
        'data/datasets/human_interactions',
        'data/models/trained',
        'data/models/checkpoints',
        'data/cad',
        'data/logs',
        'deployment',
        'docs',
        'examples/cad_examples',
        'examples/ai_examples',
        'examples/hardware_examples',
    ]

    for directory in directories:
        path = Path(directory)
        path.mkdir(parents=True, exist_ok=True)

    print(f"✓ Created {len(directories)} directories")
    return True

def main():
    """Main setup function"""
    print("=" * 60)
    print("MOTHER ROBOTICS - COMPLETE SETUP")
    print("=" * 60)
    print()
    print("This script will:")
    print("  1. Create directory structure")
    print("  2. Generate image assets")
    print("  3. Create sample datasets")
    print("  4. Generate log files")
    print("  5. Initialize model files")
    print()

    # Step 1: Create directories
    print("\n[1/5] Creating directory structure...")
    if not create_directory_structure():
        print("⚠ Warning: Directory creation had issues")

    # Step 2: Generate image assets
    success = run_script(
        'create_assets.py',
        '[2/5] Generating image assets...'
    )

    # Step 3: Create sample datasets
    success = run_script(
        'create_sample_data.py',
        '[3/5] Creating sample datasets...'
    )

    # Step 4: Generate log files
    success = run_script(
        'create_logs.py',
        '[4/5] Generating log files...'
    )

    # Step 5: Initialize models
    success = run_script(
        'initialize_models.py',
        '[5/5] Initializing model files...'
    )

    # Final summary
    print("\n" + "=" * 60)
    print("SETUP COMPLETE!")
    print("=" * 60)
    print("\nMOTHER Robotics Dashboard is ready!")
    print()
    print("Next steps:")
    print("  1. Review the training configuration:")
    print("     configs/training_config.yaml")
    print()
    print("  2. Download real datasets (optional):")
    print("     python scripts/download_datasets.py --datasets coco")
    print()
    print("  3. Run quick start training:")
    print("     python quick_start_training.py")
    print()
    print("  4. Or train with full configuration:")
    print("     python scripts/train_robotics_model.py")
    print()
    print("  5. Start the dashboard:")
    print("     python src/main.py")
    print()
    print("Dashboard will be available at: http://localhost:8050")
    print()

if __name__ == '__main__':
    main()
