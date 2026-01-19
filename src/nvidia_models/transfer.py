"""
Transfer learning with NVIDIA models
"""
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from typing import Dict
import numpy as np

class TransferLearning:
    """Transfer learning with pre-trained models"""

    def __init__(self, base_model: nn.Module, num_classes: int):
        self.base_model = base_model
        self.num_classes = num_classes

    def create_model(self, freeze_backbone: bool = True) -> nn.Module:
        """Create transfer learning model"""
        # Freeze backbone if specified
        if freeze_backbone:
            for param in self.base_model.parameters():
                param.requires_grad = False

        # Modify last layer based on model type
        if hasattr(self.base_model, 'fc'):  # ResNet
            num_features = self.base_model.fc.in_features
            self.base_model.fc = nn.Linear(num_features, self.num_classes)

        elif hasattr(self.base_model, 'classifier'):  # MobileNet/EfficientNet
            if isinstance(self.base_model.classifier, nn.Sequential):
                num_features = self.base_model.classifier[-1].in_features
                self.base_model.classifier[-1] = nn.Linear(num_features, self.num_classes)
            else:
                num_features = self.base_model.classifier.in_features
                self.base_model.classifier = nn.Linear(num_features, self.num_classes)

        return self.base_model

    def save_model(self, model: nn.Module, path: str):
        """Save trained model"""
        torch.save({
            'model_state_dict': model.state_dict(),
            'num_classes': self.num_classes
        }, path)
        print(f"Model saved to {path}")
