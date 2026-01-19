"""
Data collection and management system for robotics training
"""
from .collector import DataCollector
from .processor import DataProcessor
from .manager import DataManager
from .datasets import RoboticsDatasets

__all__ = ['DataCollector', 'DataProcessor', 'DataManager', 'RoboticsDatasets']
