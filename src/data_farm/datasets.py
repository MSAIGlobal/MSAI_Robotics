"""
PyTorch and TensorFlow dataset classes
"""
import torch
from torch.utils.data import Dataset
import numpy as np
from pathlib import Path
from typing import Tuple
import json

class RoboticsDataset(Dataset):
    """PyTorch dataset for robotics data"""

    def __init__(self, data_dir: Path, split: str = "train", transform=None):
        self.data_dir = Path(data_dir)
        self.split = split
        self.transform = transform

        # Load data
        if (self.data_dir / f"{split}.npz").exists():
            data = np.load(self.data_dir / f"{split}.npz")
            self.images = data['images']
            self.labels = data.get('labels', data.get('depths', None))
        else:
            # Create sample data if not found
            self.images = np.random.randint(0, 255, (100, 64, 64, 3), dtype=np.uint8)
            self.labels = np.random.randint(0, 10, (100,), dtype=np.int32)

    def __len__(self) -> int:
        return len(self.images)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        image = self.images[idx]
        label = self.labels[idx] if self.labels is not None else 0

        # Convert to tensor
        image = torch.from_numpy(image).float()
        if image.dim() == 2:  # Grayscale
            image = image.unsqueeze(0)
        elif image.dim() == 3 and image.shape[2] == 3:  # RGB
            image = image.permute(2, 0, 1)

        label = torch.tensor(label).long()

        # Apply transforms
        if self.transform:
            image = self.transform(image)

        return image, label

class RoboticsDatasets:
    """Dataset registry"""

    @staticmethod
    def create_dataset(name: str, data_dir: str, split: str = "train"):
        """Create dataset by name"""
        return RoboticsDataset(Path(data_dir), split)
