"""
Inference Node Manager
Manages model loading, inference, and auto-switching between teacher/student
"""
import torch
from typing import Dict, Optional, Any, List
from dataclasses import dataclass, field
from pathlib import Path
from enum import Enum
import asyncio
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NodeStatus(Enum):
    INITIALIZING = "initializing"
    READY = "ready"
    BUSY = "busy"
    ERROR = "error"
    OFFLINE = "offline"

@dataclass
class InferenceNode:
    """Single inference node configuration"""
    node_id: str
    gpu_id: int
    gpu_memory_gb: float
    status: NodeStatus = NodeStatus.INITIALIZING
    loaded_model: Optional[str] = None
    current_job: Optional[str] = None
    jobs_completed: int = 0
    
@dataclass
class ModelInstance:
    """Loaded model instance"""
    model_name: str
    model: Any  # Actual model object
    device: torch.device
    loaded_at: datetime = field(default_factory=datetime.now)
    inference_count: int = 0

class InferenceNodeManager:
    """Manages multiple inference nodes and model deployment"""
    
    def __init__(self, auto_detect_gpus: bool = True):
        self.nodes: Dict[str, InferenceNode] = {}
        self.loaded_models: Dict[str, ModelInstance] = {}
        self.model_to_node: Dict[str, str] = {}  # model_name -> node_id
        
        if auto_detect_gpus:
            self._detect_gpus()
    
    def _detect_gpus(self):
        """Detect available GPUs and create nodes"""
        if not torch.cuda.is_available():
            logger.warning("No CUDA GPUs detected, using CPU")
            self.nodes["cpu_0"] = InferenceNode(
                node_id="cpu_0",
                gpu_id=-1,
                gpu_memory_gb=0,
                status=NodeStatus.READY,
            )
            return
        
        for i in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(i)
            memory_gb = props.total_memory / (1024 ** 3)
            
            node = InferenceNode(
                node_id=f"gpu_{i}",
                gpu_id=i,
                gpu_memory_gb=memory_gb,
                status=NodeStatus.READY,
            )
            self.nodes[node.node_id] = node
            logger.info(f"Detected GPU {i}: {props.name} ({memory_gb:.1f} GB)")
    
    def get_available_node(self, required_memory_gb: float = 0) -> Optional[InferenceNode]:
        """Get an available node with sufficient memory"""
        for node in self.nodes.values():
            if node.status == NodeStatus.READY:
                if node.gpu_memory_gb >= required_memory_gb or node.gpu_id == -1:
                    return node
        return None
    
    async def load_model(
        self,
        model_name: str,
        model_path: Path,
        model_class: Any,
        required_memory_gb: float = 24.0,
    ) -> bool:
        """Load a model onto an available node"""
        node = self.get_available_node(required_memory_gb)
        if not node:
            logger.error(f"No available node for model {model_name} (needs {required_memory_gb}GB)")
            return False
        
        try:
            node.status = NodeStatus.BUSY
            
            device = torch.device(f"cuda:{node.gpu_id}" if node.gpu_id >= 0 else "cpu")
            
            # Load model
            logger.info(f"Loading {model_name} on {node.node_id}...")
            model = model_class.from_pretrained(str(model_path))
            model = model.to(device)
            model.eval()
            
            # Register
            instance = ModelInstance(
                model_name=model_name,
                model=model,
                device=device,
            )
            self.loaded_models[model_name] = instance
            self.model_to_node[model_name] = node.node_id
            node.loaded_model = model_name
            node.status = NodeStatus.READY
            
            logger.info(f"Loaded {model_name} successfully on {node.node_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load {model_name}: {e}")
            node.status = NodeStatus.ERROR
            return False
    
    async def run_inference(
        self,
        model_name: str,
        inputs: Dict[str, Any],
        job_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Run inference on a loaded model"""
        if model_name not in self.loaded_models:
            logger.error(f"Model {model_name} not loaded")
            return None
        
        instance = self.loaded_models[model_name]
        node_id = self.model_to_node[model_name]
        node = self.nodes[node_id]
        
        try:
            node.status = NodeStatus.BUSY
            node.current_job = job_id
            
            # Move inputs to device
            device_inputs = {}
            for k, v in inputs.items():
                if isinstance(v, torch.Tensor):
                    device_inputs[k] = v.to(instance.device)
                else:
                    device_inputs[k] = v
            
            # Run inference
            with torch.no_grad():
                outputs = instance.model(**device_inputs)
            
            instance.inference_count += 1
            node.jobs_completed += 1
            node.status = NodeStatus.READY
            node.current_job = None
            
            return outputs
            
        except Exception as e:
            logger.error(f"Inference failed for {model_name}: {e}")
            node.status = NodeStatus.ERROR
            return None
    
    def unload_model(self, model_name: str):
        """Unload a model from memory"""
        if model_name in self.loaded_models:
            instance = self.loaded_models[model_name]
            del instance.model
            torch.cuda.empty_cache()
            
            node_id = self.model_to_node.pop(model_name)
            node = self.nodes[node_id]
            node.loaded_model = None
            
            del self.loaded_models[model_name]
            logger.info(f"Unloaded {model_name}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get status of all nodes and models"""
        return {
            "nodes": {
                nid: {
                    "gpu_id": n.gpu_id,
                    "memory_gb": n.gpu_memory_gb,
                    "status": n.status.value,
                    "loaded_model": n.loaded_model,
                    "jobs_completed": n.jobs_completed,
                }
                for nid, n in self.nodes.items()
            },
            "loaded_models": list(self.loaded_models.keys()),
        }

# ============================================
# AUTO-TRAINING TRIGGER
# ============================================

class AutoTrainingManager:
    """Monitors performance and triggers training when needed"""
    
    def __init__(
        self,
        performance_threshold: float = 0.95,
        min_samples_for_training: int = 1000,
    ):
        self.performance_threshold = performance_threshold
        self.min_samples = min_samples_for_training
        self.performance_log: Dict[str, List[float]] = {}
        self.training_queue: List[Dict] = []
    
    def log_performance(
        self,
        model_name: str,
        score: float,
        user_feedback: Optional[float] = None,
    ):
        """Log model performance for monitoring"""
        if model_name not in self.performance_log:
            self.performance_log[model_name] = []
        
        self.performance_log[model_name].append(score)
        
        # Check if training should be triggered
        self._check_training_trigger(model_name)
    
    def _check_training_trigger(self, model_name: str):
        """Check if model needs retraining"""
        scores = self.performance_log.get(model_name, [])
        if len(scores) < 100:
            return
        
        recent_avg = sum(scores[-100:]) / 100
        overall_avg = sum(scores) / len(scores)
        
        # Trigger training if performance dropped
        if recent_avg < overall_avg * 0.9:
            logger.info(f"Performance drop detected for {model_name}, queuing training")
            self.training_queue.append({
                "model": model_name,
                "trigger": "performance_drop",
                "recent_avg": recent_avg,
                "overall_avg": overall_avg,
                "queued_at": datetime.now().isoformat(),
            })
    
    def get_pending_training(self) -> List[Dict]:
        """Get list of models pending training"""
        return self.training_queue.copy()

# Global instances
node_manager = InferenceNodeManager()
auto_trainer = AutoTrainingManager()
