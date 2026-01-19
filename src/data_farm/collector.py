"""
Data collection from various sources
"""
import os
import json
import requests
from typing import Dict, List
from pathlib import Path
import numpy as np
from tqdm import tqdm

class DataCollector:
    """Collect robotics training data from open sources"""

    def __init__(self, data_dir: str = "data/datasets"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def download_coco_dataset(self, subset: str = "val2017"):
        """Download COCO dataset for object detection"""
        print(f"Downloading COCO {subset} dataset...")
        base_url = "http://images.cocodataset.org/zips/"
        image_url = f"{base_url}{subset}.zip"

        save_path = self.data_dir / f"{subset}.zip"
        self._download_file(image_url, save_path)
        print(f"COCO dataset downloaded to {self.data_dir / 'coco'}")

    def _download_file(self, url: str, save_path: Path):
        """Download file with progress bar"""
        try:
            response = requests.get(url, stream=True)
            total_size = int(response.headers.get('content-length', 0))

            with open(save_path, 'wb') as f, tqdm(
                desc=save_path.name,
                total=total_size,
                unit='iB',
                unit_scale=True
            ) as pbar:
                for data in response.iter_content(chunk_size=1024):
                    size = f.write(data)
                    pbar.update(size)
        except Exception as e:
            print(f"Download error: {e}")

    def create_sample_data(self, output_dir: Path):
        """Create sample robot data"""
        output_dir.mkdir(parents=True, exist_ok=True)

        # Create sample images and labels
        images = np.random.randint(0, 255, (100, 64, 64, 3), dtype=np.uint8)
        labels = np.random.randint(0, 10, (100,), dtype=np.int32)

        np.savez(output_dir / "sample_data.npz", images=images, labels=labels)
        print(f"Created sample data at {output_dir}")
