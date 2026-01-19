"""
Data management and versioning
"""
import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

class DataManager:
    """Manage datasets with versioning"""

    def __init__(self, data_dir: str = "data/datasets"):
        self.data_dir = Path(data_dir)
        self.metadata_file = self.data_dir / "metadata.json"
        self._load_metadata()

    def _load_metadata(self):
        """Load dataset metadata"""
        if self.metadata_file.exists():
            with open(self.metadata_file) as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {
                'datasets': {},
                'versions': {},
                'last_updated': datetime.now().isoformat()
            }

    def _save_metadata(self):
        """Save dataset metadata"""
        self.metadata['last_updated'] = datetime.now().isoformat()
        self.metadata_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.metadata_file, 'w') as f:
            json.dump(self.metadata, f, indent=2)

    def register_dataset(self, name: str, path: Path, description: str = ""):
        """Register a dataset in the metadata"""
        dataset_id = hashlib.md5(str(path).encode()).hexdigest()[:8]

        self.metadata['datasets'][name] = {
            'id': dataset_id,
            'path': str(path),
            'description': description,
            'created': datetime.now().isoformat()
        }

        self._save_metadata()
        print(f"Registered dataset: {name} ({dataset_id})")

    def get_dataset_info(self, name: str) -> Optional[Dict]:
        """Get information about a dataset"""
        return self.metadata.get('datasets', {}).get(name)

    def list_datasets(self) -> List[str]:
        """List all registered datasets"""
        return list(self.metadata.get('datasets', {}).keys())
