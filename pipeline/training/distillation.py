"""
Teacher-Student Distillation Training
Train MOTHER GenAI models using opensource teachers
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import logging
from datetime import datetime

from ..models.registry import ModelConfig, ModelRegistry, PipelineStage, registry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DistillationConfig:
    """Configuration for distillation training"""
    teacher_model: str
    student_model: str
    stage: PipelineStage
    
    # Training params
    batch_size: int = 4
    learning_rate: float = 1e-5
    num_epochs: int = 10
    warmup_steps: int = 1000
    max_steps: int = 100000
    
    # Distillation params
    temperature: float = 2.0
    alpha: float = 0.5  # Weight for distillation loss vs task loss
    
    # Checkpointing
    save_every: int = 5000
    eval_every: int = 1000
    checkpoint_dir: Path = Path("checkpoints/distillation")
    
    # Data
    use_user_content: bool = True  # Use content created by users for training

class DistillationLoss(nn.Module):
    """Combined loss for knowledge distillation"""
    
    def __init__(self, temperature: float = 2.0, alpha: float = 0.5):
        super().__init__()
        self.temperature = temperature
        self.alpha = alpha
        self.kl_div = nn.KLDivLoss(reduction="batchmean")
    
    def forward(
        self,
        student_logits: torch.Tensor,
        teacher_logits: torch.Tensor,
        labels: Optional[torch.Tensor] = None,
    ) -> Dict[str, torch.Tensor]:
        # Soft targets from teacher
        soft_targets = F.softmax(teacher_logits / self.temperature, dim=-1)
        soft_student = F.log_softmax(student_logits / self.temperature, dim=-1)
        
        # Distillation loss
        distill_loss = self.kl_div(soft_student, soft_targets) * (self.temperature ** 2)
        
        losses = {"distillation": distill_loss}
        
        # Hard target loss if labels provided
        if labels is not None:
            hard_loss = F.cross_entropy(student_logits, labels)
            losses["hard"] = hard_loss
            losses["total"] = self.alpha * distill_loss + (1 - self.alpha) * hard_loss
        else:
            losses["total"] = distill_loss
        
        return losses

class VideoDistillationLoss(nn.Module):
    """Specialized loss for video generation distillation"""
    
    def __init__(self, config: DistillationConfig):
        super().__init__()
        self.config = config
        self.mse = nn.MSELoss()
        self.lpips = None  # Will be loaded if available
        
    def forward(
        self,
        student_output: Dict[str, torch.Tensor],
        teacher_output: Dict[str, torch.Tensor],
    ) -> Dict[str, torch.Tensor]:
        losses = {}
        
        # Latent space distillation
        if "latents" in student_output and "latents" in teacher_output:
            losses["latent"] = self.mse(student_output["latents"], teacher_output["latents"])
        
        # Feature distillation
        if "features" in student_output and "features" in teacher_output:
            feat_loss = 0
            for s_feat, t_feat in zip(student_output["features"], teacher_output["features"]):
                feat_loss += self.mse(s_feat, t_feat)
            losses["feature"] = feat_loss / len(student_output["features"])
        
        # Pixel loss for decoded frames
        if "frames" in student_output and "frames" in teacher_output:
            losses["pixel"] = self.mse(student_output["frames"], teacher_output["frames"])
        
        # Total loss
        losses["total"] = sum(losses.values())
        return losses

class DistillationTrainer:
    """Trainer for knowledge distillation"""
    
    def __init__(
        self,
        config: DistillationConfig,
        teacher_model: nn.Module,
        student_model: nn.Module,
        train_dataloader: DataLoader,
        val_dataloader: Optional[DataLoader] = None,
    ):
        self.config = config
        self.teacher = teacher_model
        self.student = student_model
        self.train_loader = train_dataloader
        self.val_loader = val_dataloader
        
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.teacher.to(self.device).eval()
        self.student.to(self.device)
        
        self.loss_fn = VideoDistillationLoss(config)
        self.optimizer = torch.optim.AdamW(
            self.student.parameters(),
            lr=config.learning_rate,
            weight_decay=0.01,
        )
        
        self.global_step = 0
        self.best_val_loss = float("inf")
        
        # Create checkpoint dir
        config.checkpoint_dir.mkdir(parents=True, exist_ok=True)
    
    def train(self):
        """Run distillation training"""
        logger.info(f"Starting distillation: {self.config.teacher_model} -> {self.config.student_model}")
        
        for epoch in range(self.config.num_epochs):
            self.student.train()
            epoch_losses = []
            
            for batch in self.train_loader:
                if self.global_step >= self.config.max_steps:
                    break
                
                loss = self.train_step(batch)
                epoch_losses.append(loss)
                
                if self.global_step % 100 == 0:
                    avg_loss = sum(epoch_losses[-100:]) / min(100, len(epoch_losses))
                    logger.info(f"Step {self.global_step} | Loss: {avg_loss:.4f}")
                
                if self.global_step % self.config.eval_every == 0 and self.val_loader:
                    self.evaluate()
                
                if self.global_step % self.config.save_every == 0:
                    self.save_checkpoint()
                
                self.global_step += 1
            
            logger.info(f"Epoch {epoch + 1} complete | Avg Loss: {sum(epoch_losses) / len(epoch_losses):.4f}")
        
        self.save_checkpoint(final=True)
        logger.info("Training complete")
    
    def train_step(self, batch: Dict) -> float:
        """Single training step"""
        self.optimizer.zero_grad()
        
        # Move batch to device
        batch = {k: v.to(self.device) if isinstance(v, torch.Tensor) else v for k, v in batch.items()}
        
        # Get teacher outputs (no grad)
        with torch.no_grad():
            teacher_output = self.teacher(**batch)
        
        # Get student outputs
        student_output = self.student(**batch)
        
        # Compute loss
        losses = self.loss_fn(student_output, teacher_output)
        total_loss = losses["total"]
        
        # Backward
        total_loss.backward()
        torch.nn.utils.clip_grad_norm_(self.student.parameters(), 1.0)
        self.optimizer.step()
        
        return total_loss.item()
    
    @torch.no_grad()
    def evaluate(self) -> float:
        """Evaluate on validation set"""
        self.student.eval()
        val_losses = []
        
        for batch in self.val_loader:
            batch = {k: v.to(self.device) if isinstance(v, torch.Tensor) else v for k, v in batch.items()}
            
            teacher_output = self.teacher(**batch)
            student_output = self.student(**batch)
            
            losses = self.loss_fn(student_output, teacher_output)
            val_losses.append(losses["total"].item())
        
        avg_loss = sum(val_losses) / len(val_losses)
        logger.info(f"Validation Loss: {avg_loss:.4f}")
        
        if avg_loss < self.best_val_loss:
            self.best_val_loss = avg_loss
            self.save_checkpoint(best=True)
        
        self.student.train()
        return avg_loss
    
    def save_checkpoint(self, best: bool = False, final: bool = False):
        """Save model checkpoint"""
        if best:
            path = self.config.checkpoint_dir / "best_model.pt"
        elif final:
            path = self.config.checkpoint_dir / "final_model.pt"
        else:
            path = self.config.checkpoint_dir / f"checkpoint_{self.global_step}.pt"
        
        torch.save({
            "step": self.global_step,
            "model_state": self.student.state_dict(),
            "optimizer_state": self.optimizer.state_dict(),
            "config": self.config,
            "best_val_loss": self.best_val_loss,
        }, path)
        
        logger.info(f"Saved checkpoint: {path}")

class UserContentCollector:
    """Collect user-generated content for training data"""
    
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.content_queue = []
    
    def add_content(
        self,
        user_id: str,
        prompt: str,
        video_path: Path,
        rating: Optional[float] = None,
        metadata: Optional[Dict] = None,
    ):
        """Add user content to training queue"""
        self.content_queue.append({
            "user_id": user_id,
            "prompt": prompt,
            "video_path": str(video_path),
            "rating": rating,
            "metadata": metadata or {},
            "timestamp": datetime.now().isoformat(),
        })
    
    def get_training_batch(self, min_rating: float = 3.0) -> List[Dict]:
        """Get high-quality content for training"""
        return [
            c for c in self.content_queue
            if c.get("rating") is None or c["rating"] >= min_rating
        ]

def create_training_pipeline(
    stage: PipelineStage,
    use_user_content: bool = True,
) -> DistillationTrainer:
    """Factory function to create training pipeline for a stage"""
    teacher_config = registry._get_teacher_for_stage(stage)
    student_config = registry._get_student_for_stage(stage)
    
    if not teacher_config or not student_config:
        raise ValueError(f"Missing teacher or student model for stage {stage}")
    
    config = DistillationConfig(
        teacher_model=teacher_config.name,
        student_model=student_config.name,
        stage=stage,
        use_user_content=use_user_content,
    )
    
    # Models would be loaded here
    # teacher = load_model(teacher_config)
    # student = load_model(student_config)
    
    logger.info(f"Created training pipeline: {teacher_config.name} -> {student_config.name}")
    return config
