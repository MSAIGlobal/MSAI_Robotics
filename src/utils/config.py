import os
from typing import Dict, Any

class Config:
    """Configuration manager"""
    def __init__(self):
        self.config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        config = {
            "debug": os.environ.get('DEBUG', 'false').lower() == 'true',
            "logging_level": "INFO",
            "enable_websocket": True,
            "websocket_port": 8765,
        }

        return config

    def get(self, key: str, default=None):
        return self.config.get(key, default)

config = Config()

def load_config():
    return config.config
