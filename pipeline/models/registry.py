"""
IntuiTV Model Registry
Teacher and Student model management for Text-to-TV pipeline
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any
from pathlib import Path
import json

class ModelRole(Enum):
    TEACHER = "teacher"
    STUDENT = "student"

class PipelineStage(Enum):
    TEXT_TO_SCRIPT = "text_to_script"
    SCRIPT_TO_SCENES = "script_to_scenes"
    SCENE_GENERATION = "scene_generation"  # T2V core
    WORLD_SIMULATION = "world_simulation"
    CINEMATOGRAPHY = "cinematography"
    VIDEO_EDITING = "video_editing"
    CHARACTER_CONSISTENCY = "character_consistency"
    SCENE_STITCHING = "scene_stitching"
    AUDIO_GENERATION = "audio_generation"
    FINAL_COMPOSITE = "final_composite"

@dataclass
class ModelConfig:
    name: str
    role: ModelRole
    stage: PipelineStage
    repo_url: str
    hf_model_id: Optional[str] = None
    local_path: Optional[Path] = None
    version: str = "1.0.0"
    capabilities: List[str] = field(default_factory=list)
    gpu_memory_gb: float = 24.0
    is_active: bool = True
    performance_score: float = 0.0  # Used for teacher->student switch

# ============================================
# TEACHER MODELS (Open Source)
# ============================================

TEACHER_MODELS = {
    # World Simulation & I2V
    "lingbot_world": ModelConfig(
        name="LingBot-World",
        role=ModelRole.TEACHER,
        stage=PipelineStage.WORLD_SIMULATION,
        repo_url="https://github.com/Robbyant/lingbot-world",
        hf_model_id="lingbot/world-simulation",
        capabilities=["i2v_generation", "camera_control", "world_simulation", "60sec_video"],
        gpu_memory_gb=80.0,
    ),
    
    # Multi-shot Cinematography
    "holocine": ModelConfig(
        name="HoloCine",
        role=ModelRole.TEACHER,
        stage=PipelineStage.CINEMATOGRAPHY,
        repo_url="https://github.com/yihao-meng/HoloCine",
        hf_model_id="hlwang06/HoloCine",
        capabilities=["multi_shot_narrative", "shot_composition", "character_consistency", "cinematic_control"],
        gpu_memory_gb=48.0,
    ),
    
    # Video Editing
    "ditto": ModelConfig(
        name="Ditto",
        role=ModelRole.TEACHER,
        stage=PipelineStage.VIDEO_EDITING,
        repo_url="https://github.com/EzioBy/Ditto",
        hf_model_id="ditto/video-editor",
        capabilities=["instruction_editing", "global_edit", "local_edit", "style_transfer"],
        gpu_memory_gb=32.0,
    ),
    
    # World Canvas - Trajectory Control
    "worldcanvas": ModelConfig(
        name="WorldCanvas",
        role=ModelRole.TEACHER,
        stage=PipelineStage.SCENE_GENERATION,
        repo_url="https://github.com/pPetrichor/WorldCanvas",
        hf_model_id="hlwang06/WorldCanvas",
        capabilities=["multi_agent", "trajectory_control", "reference_guided", "object_persistence"],
        gpu_memory_gb=48.0,
    ),
    
    # Reward Forcing - Training Enhancement
    "reward_forcing": ModelConfig(
        name="Reward-Forcing",
        role=ModelRole.TEACHER,
        stage=PipelineStage.SCENE_GENERATION,
        repo_url="https://github.com/JaydenLyh/Reward-Forcing",
        hf_model_id="JaydenLu666/Reward-Forcing-T2V-1.3B",
        capabilities=["motion_quality", "streaming_generation", "re_dmd_training"],
        gpu_memory_gb=24.0,
    ),
    
    # CoDeF - Content Deformation
    "codef": ModelConfig(
        name="CoDeF",
        role=ModelRole.TEACHER,
        stage=PipelineStage.CHARACTER_CONSISTENCY,
        repo_url="https://github.com/qiuyu96/CoDeF",
        capabilities=["content_deformation", "video_translation", "keypoint_tracking", "super_resolution"],
        gpu_memory_gb=16.0,
    ),
}

# ============================================
# STUDENT MODELS (MOTHER GenAI Family)
# ============================================

STUDENT_MODELS = {
    "mother_t2v": ModelConfig(
        name="MOTHER-T2V",
        role=ModelRole.STUDENT,
        stage=PipelineStage.SCENE_GENERATION,
        repo_url="internal://mother-ai-sovereign-full-system",
        local_path=Path("models/mother_t2v"),
        capabilities=["text_to_video", "scene_generation"],
        gpu_memory_gb=24.0,
    ),
    
    "mother_cinematographer": ModelConfig(
        name="MOTHER-Cinematographer",
        role=ModelRole.STUDENT,
        stage=PipelineStage.CINEMATOGRAPHY,
        repo_url="internal://mother-ai-sovereign-full-system",
        local_path=Path("models/mother_cinematographer"),
        capabilities=["multi_shot", "shot_composition"],
        gpu_memory_gb=24.0,
    ),
    
    "mother_editor": ModelConfig(
        name="MOTHER-Editor",
        role=ModelRole.STUDENT,
        stage=PipelineStage.VIDEO_EDITING,
        repo_url="internal://mother-ai-sovereign-full-system",
        local_path=Path("models/mother_editor"),
        capabilities=["video_editing", "scene_stitching"],
        gpu_memory_gb=24.0,
    ),
    
    "mother_world": ModelConfig(
        name="MOTHER-World",
        role=ModelRole.STUDENT,
        stage=PipelineStage.WORLD_SIMULATION,
        repo_url="internal://mother-ai-sovereign-full-system",
        local_path=Path("models/mother_world"),
        capabilities=["world_simulation", "environment_generation"],
        gpu_memory_gb=48.0,
    ),
    
    "mother_character": ModelConfig(
        name="MOTHER-Character",
        role=ModelRole.STUDENT,
        stage=PipelineStage.CHARACTER_CONSISTENCY,
        repo_url="internal://mother-ai-sovereign-full-system",
        local_path=Path("models/mother_character"),
        capabilities=["character_consistency", "face_preservation"],
        gpu_memory_gb=16.0,
    ),
}

class ModelRegistry:
    """Central registry for all pipeline models"""
    
    def __init__(self, config_path: Optional[Path] = None):
        self.teachers = TEACHER_MODELS.copy()
        self.students = STUDENT_MODELS.copy()
        self.performance_thresholds: Dict[str, float] = {}
        
        if config_path and config_path.exists():
            self.load_config(config_path)
    
    def get_active_model(self, stage: PipelineStage) -> ModelConfig:
        """Get the best performing model for a stage (student if surpassed teacher)"""
        student = self._get_student_for_stage(stage)
        teacher = self._get_teacher_for_stage(stage)
        
        if student and teacher:
            threshold = self.performance_thresholds.get(stage.value, 0.95)
            if student.performance_score >= teacher.performance_score * threshold:
                return student
        
        return teacher or student
    
    def _get_teacher_for_stage(self, stage: PipelineStage) -> Optional[ModelConfig]:
        for model in self.teachers.values():
            if model.stage == stage and model.is_active:
                return model
        return None
    
    def _get_student_for_stage(self, stage: PipelineStage) -> Optional[ModelConfig]:
        for model in self.students.values():
            if model.stage == stage and model.is_active:
                return model
        return None
    
    def update_performance(self, model_name: str, score: float):
        """Update model performance score"""
        if model_name in self.students:
            self.students[model_name].performance_score = score
        elif model_name in self.teachers:
            self.teachers[model_name].performance_score = score
    
    def get_training_pairs(self) -> List[tuple]:
        """Get teacher-student pairs for distillation training"""
        pairs = []
        for student in self.students.values():
            teacher = self._get_teacher_for_stage(student.stage)
            if teacher:
                pairs.append((teacher, student))
        return pairs
    
    def load_config(self, path: Path):
        with open(path) as f:
            data = json.load(f)
            self.performance_thresholds = data.get("thresholds", {})
    
    def save_config(self, path: Path):
        data = {
            "thresholds": self.performance_thresholds,
            "student_scores": {k: v.performance_score for k, v in self.students.items()},
        }
        with open(path, "w") as f:
            json.dump(data, f, indent=2)

# Global registry instance
registry = ModelRegistry()
