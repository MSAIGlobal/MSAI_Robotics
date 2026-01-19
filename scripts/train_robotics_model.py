#!/usr/bin/env python3
"""
Train robotics models with NVIDIA pre-trained models
"""
import sys
from pathlib import Path
import yaml
import torch
from torch.utils.data import DataLoader
import argparse

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from nvidia_models.pretrained import NVIDIAPretrainedModels
from nvidia_models.transfer import TransferLearning
from data_farm.datasets import RoboticsDataset
from training.pipeline import TrainingPipeline

def load_config(config_path: Path) -> dict:
    """Load configuration from YAML file"""
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    return config

def create_model(config: dict):
    """Create model from config"""
    model_config = config['model']

    # Load NVIDIA pre-trained models
    nvidia_models = NVIDIAPretrainedModels()
    pytorch_models = nvidia_models.load_pytorch_models()

    # Select base model
    model_name = model_config['name']
    if model_name == 'resnet18':
        base_model = pytorch_models['resnet18']
    elif model_name == 'resnet50':
        base_model = pytorch_models['resnet50']
    elif model_name == 'mobilenet_v2':
        base_model = pytorch_models['mobilenet_v2']
    elif model_name == 'faster_rcnn':
        base_model = pytorch_models['faster_rcnn']
    else:
        raise ValueError(f"Unknown model: {model_name}")

    # Apply transfer learning
    transfer = TransferLearning(
        base_model=base_model,
        num_classes=model_config['num_classes']
    )

    model = transfer.create_model(
        freeze_backbone=model_config.get('freeze_backbone', True)
    )

    return model

def create_dataloaders(config: dict):
    """Create training and validation dataloaders"""
    dataset_config = config['dataset']

    # Create datasets
    train_dataset = RoboticsDataset(
        data_dir=dataset_config['data_dir'],
        split=dataset_config['train_split']
    )

    val_dataset = RoboticsDataset(
        data_dir=dataset_config['data_dir'],
        split=dataset_config['val_split']
    )

    # Create dataloaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=dataset_config['batch_size'],
        shuffle=dataset_config.get('shuffle', True),
        num_workers=dataset_config.get('num_workers', 4)
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=dataset_config['batch_size'],
        shuffle=False,
        num_workers=dataset_config.get('num_workers', 4)
    )

    return train_loader, val_loader

def main():
    parser = argparse.ArgumentParser(description='Train robotics model')
    parser.add_argument(
        '--config',
        type=str,
        default='configs/training_config.yaml',
        help='Path to configuration file'
    )
    parser.add_argument(
        '--epochs',
        type=int,
        default=None,
        help='Number of training epochs (overrides config)'
    )
    parser.add_argument(
        '--resume',
        type=str,
        default=None,
        help='Path to checkpoint to resume from'
    )

    args = parser.parse_args()

    # Load configuration
    config_path = Path(args.config)
    if not config_path.exists():
        print(f"Error: Config file not found: {config_path}")
        return

    config = load_config(config_path)

    print("=" * 60)
    print("MOTHER Robotics Model Training")
    print("=" * 60)
    print(f"Config: {config_path}")
    print(f"Model: {config['model']['name']}")
    print(f"Dataset: {config['dataset']['name']}")
    print(f"Epochs: {args.epochs or config['training']['epochs']}")
    print("=" * 60)
    print()

    # Create model
    print("Creating model...")
    model = create_model(config)
    print(f"✓ Model created: {config['model']['name']}")

    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"  Total parameters: {total_params:,}")
    print(f"  Trainable parameters: {trainable_params:,}")
    print()

    # Create dataloaders
    print("Loading datasets...")
    train_loader, val_loader = create_dataloaders(config)
    print(f"✓ Training samples: {len(train_loader.dataset)}")
    print(f"✓ Validation samples: {len(val_loader.dataset)}")
    print()

    # Create training pipeline
    print("Initializing training pipeline...")
    pipeline = TrainingPipeline(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        config=config['training']
    )
    print(f"✓ Pipeline initialized")
    print(f"  Device: {pipeline.device}")
    print(f"  Log directory: {pipeline.log_dir}")
    print()

    # Resume from checkpoint if specified
    if args.resume:
        checkpoint_path = Path(args.resume)
        if checkpoint_path.exists():
            print(f"Resuming from checkpoint: {checkpoint_path}")
            checkpoint = torch.load(checkpoint_path)
            pipeline.model.load_state_dict(checkpoint['model_state_dict'])
            pipeline.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
            pipeline.current_epoch = checkpoint['epoch']
            pipeline.best_accuracy = checkpoint['best_accuracy']
            print(f"✓ Resumed from epoch {pipeline.current_epoch}")
            print()

    # Start training
    print("=" * 60)
    print("Starting Training")
    print("=" * 60)
    print()

    try:
        history = pipeline.train(num_epochs=args.epochs)

        print()
        print("=" * 60)
        print("Training Complete!")
        print("=" * 60)
        print(f"Best validation accuracy: {pipeline.best_accuracy:.2f}%")
        print(f"Checkpoints saved to: {pipeline.log_dir}")
        print()

    except KeyboardInterrupt:
        print("\n\nTraining interrupted by user")
        print("Saving checkpoint...")
        pipeline.save_checkpoint('interrupted')
        print(f"Checkpoint saved to: {pipeline.log_dir}")
        print()

    except Exception as e:
        print(f"\n\nError during training: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
