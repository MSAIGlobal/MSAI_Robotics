"""
NVIDIA pre-trained models from PyTorch and TensorFlow
"""
import torch
import torchvision
from torchvision import models
from typing import Dict
from pathlib import Path

class NVIDIAPretrained:
    """NVIDIA pre-trained models"""

    def __init__(self, models_dir: str = "models/nvidia_pretrained"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)

    def load_pytorch_models(self):
        """Load PyTorch pre-trained models"""
        print("Loading PyTorch pre-trained models...")

        models_dict = {}

        # Vision models
        models_dict['resnet18'] = models.resnet18(pretrained=True)
        models_dict['resnet50'] = models.resnet50(pretrained=True)
        models_dict['mobilenet_v2'] = models.mobilenet_v2(pretrained=True)

        # Object detection
        try:
            models_dict['faster_rcnn'] = torchvision.models.detection.fasterrcnn_resnet50_fpn(
                pretrained=True, progress=True)
        except:
            print("Faster R-CNN not available")

        # Save models
        for name, model in models_dict.items():
            model_path = self.models_dir / f"{name}.pth"
            torch.save(model.state_dict(), model_path)
            print(f"Saved {name} to {model_path}")

        return models_dict

    def get_model_info(self, model_name: str) -> Dict:
        """Get information about a model"""
        model_info = {
            'resnet18': {
                'type': 'classification',
                'parameters': '11M',
                'input_size': [224, 224],
                'accuracy': '69.8% (ImageNet)'
            },
            'faster_rcnn': {
                'type': 'object_detection',
                'parameters': '41M',
                'input_size': [800, 1333],
                'mAP': '37.0% (COCO)'
            }
        }

        return model_info.get(model_name, {})
