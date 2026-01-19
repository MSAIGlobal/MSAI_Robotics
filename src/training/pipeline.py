"""
Complete training pipeline for robotics
"""
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional
import json

class TrainingPipeline:
    """Complete training pipeline"""

    def __init__(self,
                 model: nn.Module,
                 train_loader: DataLoader,
                 val_loader: DataLoader,
                 config: Dict):

        self.model = model
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.config = config

        # Setup device
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = self.model.to(self.device)

        # Setup optimizer and scheduler
        self.optimizer = self._create_optimizer()
        self.criterion = nn.CrossEntropyLoss()

        # Setup logging
        self.log_dir = Path(config.get('log_dir', 'logs')) / datetime.now().strftime('%Y%m%d_%H%M%S')
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Training state
        self.best_accuracy = 0.0
        self.current_epoch = 0

    def _create_optimizer(self):
        """Create optimizer"""
        optimizer_config = self.config.get('optimizer', {})
        lr = optimizer_config.get('learning_rate', 0.001)

        return torch.optim.Adam(self.model.parameters(), lr=lr)

    def train_epoch(self) -> Dict:
        """Train for one epoch"""
        self.model.train()
        total_loss = 0.0
        correct = 0
        total = 0

        for batch_idx, (data, target) in enumerate(self.train_loader):
            data, target = data.to(self.device), target.to(self.device)

            self.optimizer.zero_grad()
            output = self.model(data)
            loss = self.criterion(output, target)
            loss.backward()
            self.optimizer.step()

            total_loss += loss.item()
            pred = output.argmax(dim=1, keepdim=True)
            correct += pred.eq(target.view_as(pred)).sum().item()
            total += target.size(0)

        avg_loss = total_loss / len(self.train_loader)
        accuracy = 100. * correct / total

        return {'loss': avg_loss, 'accuracy': accuracy}

    def validate(self) -> Dict:
        """Validate model"""
        self.model.eval()
        total_loss = 0.0
        correct = 0
        total = 0

        with torch.no_grad():
            for data, target in self.val_loader:
                data, target = data.to(self.device), target.to(self.device)
                output = self.model(data)
                total_loss += self.criterion(output, target).item()
                pred = output.argmax(dim=1, keepdim=True)
                correct += pred.eq(target.view_as(pred)).sum().item()
                total += target.size(0)

        avg_loss = total_loss / len(self.val_loader)
        accuracy = 100. * correct / total

        return {'loss': avg_loss, 'accuracy': accuracy}

    def train(self, num_epochs: int = None):
        """Run complete training"""
        if num_epochs is None:
            num_epochs = self.config.get('epochs', 100)

        history = {
            'train_loss': [], 'train_accuracy': [],
            'val_loss': [], 'val_accuracy': []
        }

        print(f"Starting training for {num_epochs} epochs")
        print(f"Device: {self.device}")

        for epoch in range(self.current_epoch, num_epochs):
            self.current_epoch = epoch

            print(f"\nEpoch {epoch+1}/{num_epochs}")
            print("-" * 50)

            # Train
            train_metrics = self.train_epoch()
            history['train_loss'].append(train_metrics['loss'])
            history['train_accuracy'].append(train_metrics['accuracy'])

            # Validate
            val_metrics = self.validate()
            history['val_loss'].append(val_metrics['loss'])
            history['val_accuracy'].append(val_metrics['accuracy'])

            # Print progress
            print(f"Train Loss: {train_metrics['loss']:.4f}, "
                  f"Train Acc: {train_metrics['accuracy']:.2f}%")
            print(f"Val Loss: {val_metrics['loss']:.4f}, "
                  f"Val Acc: {val_metrics['accuracy']:.2f}%")

            # Save checkpoint if best
            if val_metrics['accuracy'] > self.best_accuracy:
                self.best_accuracy = val_metrics['accuracy']
                self.save_checkpoint('best')

        print(f"\nTraining completed!")
        print(f"Best validation accuracy: {self.best_accuracy:.2f}%")

        # Save final model
        self.save_checkpoint('final')
        self.save_history(history)

        return history

    def save_checkpoint(self, name: str):
        """Save model checkpoint"""
        checkpoint_path = self.log_dir / f'checkpoint_{name}.pth'

        checkpoint = {
            'epoch': self.current_epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'best_accuracy': self.best_accuracy,
            'config': self.config
        }

        torch.save(checkpoint, checkpoint_path)
        print(f"Checkpoint saved: {checkpoint_path}")

    def save_history(self, history: Dict):
        """Save training history"""
        history_path = self.log_dir / 'training_history.json'

        with open(history_path, 'w') as f:
            json.dump(history, f, indent=2)

        print(f"Training history saved: {history_path}")
