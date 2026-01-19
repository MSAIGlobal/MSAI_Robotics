#!/usr/bin/env python3
"""
Quick start script for MOTHER Robotics training
Sets up and runs a simple training example
"""
import sys
from pathlib import Path
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
import numpy as np

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from nvidia_models.pretrained import NVIDIAPretrainedModels
from nvidia_models.transfer import TransferLearning
from data_farm.datasets import RoboticsDataset
from training.pipeline import TrainingPipeline
from inference.engine import InferenceEngine

def print_header(text):
    """Print formatted header"""
    print("\n" + "=" * 70)
    print(text)
    print("=" * 70)

def print_step(text):
    """Print formatted step"""
    print(f"\n{text}")
    print("-" * 70)

def main():
    print_header("MOTHER Robotics Quick Start Training")

    # Configuration
    config = {
        'model': 'resnet18',
        'num_classes': 10,
        'batch_size': 16,
        'epochs': 5,
        'learning_rate': 0.001,
        'data_dir': 'data/processed',
        'log_dir': 'logs'
    }

    print("\nConfiguration:")
    for key, value in config.items():
        print(f"  {key}: {value}")

    # Step 1: Check device
    print_step("Step 1: Checking compute device")
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")

    if device.type == 'cuda':
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")

    # Step 2: Load pre-trained model
    print_step("Step 2: Loading NVIDIA pre-trained model")
    nvidia_models = NVIDIAPretrainedModels()
    pytorch_models = nvidia_models.load_pytorch_models()

    base_model = pytorch_models[config['model']]
    print(f"✓ Loaded {config['model']}")

    # Step 3: Create transfer learning model
    print_step("Step 3: Creating transfer learning model")
    transfer = TransferLearning(
        base_model=base_model,
        num_classes=config['num_classes']
    )

    model = transfer.create_model(freeze_backbone=True)

    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

    print(f"✓ Model created")
    print(f"  Total parameters: {total_params:,}")
    print(f"  Trainable parameters: {trainable_params:,}")

    # Step 4: Create datasets
    print_step("Step 4: Creating datasets")

    # Create data directory if it doesn't exist
    data_dir = Path(config['data_dir'])
    data_dir.mkdir(parents=True, exist_ok=True)

    print("Note: Using sample data (no actual dataset found)")
    print("To use real data, download datasets using: python scripts/download_datasets.py")

    train_dataset = RoboticsDataset(data_dir, split='train')
    val_dataset = RoboticsDataset(data_dir, split='val')

    print(f"✓ Training samples: {len(train_dataset)}")
    print(f"✓ Validation samples: {len(val_dataset)}")

    # Step 5: Create data loaders
    print_step("Step 5: Creating data loaders")
    train_loader = DataLoader(
        train_dataset,
        batch_size=config['batch_size'],
        shuffle=True,
        num_workers=2
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=config['batch_size'],
        shuffle=False,
        num_workers=2
    )

    print(f"✓ Train batches: {len(train_loader)}")
    print(f"✓ Validation batches: {len(val_loader)}")

    # Step 6: Create training pipeline
    print_step("Step 6: Initializing training pipeline")

    training_config = {
        'epochs': config['epochs'],
        'log_dir': config['log_dir'],
        'optimizer': {
            'learning_rate': config['learning_rate']
        }
    }

    pipeline = TrainingPipeline(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        config=training_config
    )

    print(f"✓ Pipeline initialized")
    print(f"  Device: {pipeline.device}")
    print(f"  Log directory: {pipeline.log_dir}")

    # Step 7: Train model
    print_step(f"Step 7: Training for {config['epochs']} epochs")
    print("\nNote: This is a quick demonstration with sample data")
    print("For production training, use: python scripts/train_robotics_model.py\n")

    try:
        history = pipeline.train(num_epochs=config['epochs'])

        print_header("Training Complete!")
        print(f"\nBest validation accuracy: {pipeline.best_accuracy:.2f}%")
        print(f"Checkpoints saved to: {pipeline.log_dir}")

        # Step 8: Inference example
        print_step("Step 8: Running inference example")

        # Create inference engine
        engine = InferenceEngine(model=model, precision='fp32')

        # Get a sample from validation set
        sample_image, sample_label = val_dataset[0]

        print("Running inference on sample image...")
        result = engine.infer(sample_image, benchmark=True)

        print(f"✓ Predicted class: {result['class']}")
        print(f"✓ Confidence: {result['confidence']:.2%}")
        print(f"✓ Inference time: {result['inference_time']*1000:.2f} ms")

        # Step 9: Benchmark
        print_step("Step 9: Benchmarking model")

        test_input = torch.randn(1, 3, 224, 224)
        stats = engine.benchmark_model(
            test_input=test_input,
            num_iterations=50,
            warmup_iterations=5
        )

        # Success message
        print_header("Quick Start Complete!")
        print("\nWhat you've accomplished:")
        print("  ✓ Loaded NVIDIA pre-trained model")
        print("  ✓ Created transfer learning model")
        print("  ✓ Trained model for multiple epochs")
        print("  ✓ Ran inference and benchmarking")
        print(f"\nCheckpoint location: {pipeline.log_dir}")
        print("\nNext steps:")
        print("  1. Download real datasets: python scripts/download_datasets.py")
        print("  2. Configure training: Edit configs/training_config.yaml")
        print("  3. Full training run: python scripts/train_robotics_model.py")
        print("  4. Deploy for inference: Use InferenceEngine in production")
        print()

    except KeyboardInterrupt:
        print("\n\nTraining interrupted by user")

    except Exception as e:
        print(f"\n\nError during training: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
