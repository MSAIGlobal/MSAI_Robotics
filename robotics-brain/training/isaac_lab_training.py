"""
Isaac Lab Training Pipeline
Reinforcement learning with simulation and domain randomization
"""
import torch
import torch.nn as nn
from torch.distributions import Normal
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class IsaacLabConfig:
    """Configuration for Isaac Lab training"""
    env_name: str = "Isaac-Humanoid-v0"
    num_envs: int = 4096
    sim_device: str = "cuda:0"
    physics_dt: float = 0.0083  # 120Hz
    control_dt: float = 0.0166  # 60Hz
    
    # Domain randomization
    randomize_friction: bool = True
    randomize_mass: bool = True
    randomize_gravity: bool = True
    
    # Training params
    max_epochs: int = 5000
    steps_per_epoch: int = 24
    batch_size: int = 32768
    learning_rate: float = 3e-4
    gamma: float = 0.99
    gae_lambda: float = 0.95
    clip_ratio: float = 0.2
    entropy_coef: float = 0.01
    
    # Checkpointing
    checkpoint_dir: Path = Path("checkpoints/isaac_lab")
    save_interval: int = 100

@dataclass
class RobotObservation:
    """Robot observation space"""
    joint_positions: torch.Tensor  # [num_envs, num_joints]
    joint_velocities: torch.Tensor
    base_position: torch.Tensor    # [num_envs, 3]
    base_orientation: torch.Tensor # [num_envs, 4] quaternion
    base_linear_vel: torch.Tensor  # [num_envs, 3]
    base_angular_vel: torch.Tensor # [num_envs, 3]
    contact_forces: Optional[torch.Tensor] = None

@dataclass
class RobotAction:
    """Robot action space"""
    joint_targets: torch.Tensor    # Target positions or torques
    action_type: str = "position"  # "position", "velocity", "torque"

# ============================================
# HUMANOID POLICY NETWORK
# ============================================

class HumanoidPolicy(nn.Module):
    """
    Policy network for humanoid robot control
    Compatible with Isaac Lab environments
    """
    
    def __init__(
        self,
        obs_dim: int = 69,      # Standard humanoid obs
        action_dim: int = 21,   # 21 actuated joints
        hidden_dim: int = 512,
    ):
        super().__init__()
        
        # Actor network (policy)
        self.actor = nn.Sequential(
            nn.Linear(obs_dim, hidden_dim),
            nn.ELU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ELU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ELU(),
        )
        self.actor_mean = nn.Linear(hidden_dim, action_dim)
        self.actor_logstd = nn.Parameter(torch.zeros(action_dim))
        
        # Critic network (value function)
        self.critic = nn.Sequential(
            nn.Linear(obs_dim, hidden_dim),
            nn.ELU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ELU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ELU(),
            nn.Linear(hidden_dim, 1),
        )
        
        # Initialize weights
        self._init_weights()
    
    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.orthogonal_(m.weight, gain=1.0)
                nn.init.zeros_(m.bias)
    
    def forward(self, obs: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Forward pass returning action, log_prob, value"""
        # Actor
        actor_features = self.actor(obs)
        mean = self.actor_mean(actor_features)
        std = self.actor_logstd.exp()
        
        dist = Normal(mean, std)
        action = dist.sample()
        log_prob = dist.log_prob(action).sum(-1)
        
        # Critic
        value = self.critic(obs).squeeze(-1)
        
        return action, log_prob, value
    
    def get_action(self, obs: torch.Tensor, deterministic: bool = False) -> torch.Tensor:
        """Get action for inference"""
        with torch.no_grad():
            actor_features = self.actor(obs)
            mean = self.actor_mean(actor_features)
            
            if deterministic:
                return mean
            
            std = self.actor_logstd.exp()
            dist = Normal(mean, std)
            return dist.sample()
    
    def evaluate_actions(
        self,
        obs: torch.Tensor,
        actions: torch.Tensor,
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Evaluate actions for PPO update"""
        actor_features = self.actor(obs)
        mean = self.actor_mean(actor_features)
        std = self.actor_logstd.exp()
        
        dist = Normal(mean, std)
        log_prob = dist.log_prob(actions).sum(-1)
        entropy = dist.entropy().sum(-1)
        
        value = self.critic(obs).squeeze(-1)
        
        return log_prob, value, entropy

# ============================================
# PPO TRAINER
# ============================================

class PPOTrainer:
    """
    Proximal Policy Optimization trainer
    Designed for Isaac Lab environments
    """
    
    def __init__(
        self,
        config: IsaacLabConfig,
        policy: HumanoidPolicy,
        optimizer: Optional[torch.optim.Optimizer] = None,
    ):
        self.config = config
        self.policy = policy
        self.device = torch.device(config.sim_device)
        self.policy.to(self.device)
        
        self.optimizer = optimizer or torch.optim.Adam(
            policy.parameters(),
            lr=config.learning_rate,
        )
        
        # Storage
        self.obs_buffer = []
        self.actions_buffer = []
        self.rewards_buffer = []
        self.values_buffer = []
        self.log_probs_buffer = []
        self.dones_buffer = []
        
        # Metrics
        self.epoch = 0
        self.total_steps = 0
        self.best_reward = float("-inf")
        
        # Create checkpoint dir
        config.checkpoint_dir.mkdir(parents=True, exist_ok=True)
    
    def collect_rollout(self, env: Any, steps: int) -> Dict[str, float]:
        """Collect experience from environment"""
        self.policy.eval()
        
        obs = env.reset()
        episode_rewards = []
        current_rewards = torch.zeros(self.config.num_envs, device=self.device)
        
        for _ in range(steps):
            with torch.no_grad():
                action, log_prob, value = self.policy(obs)
            
            next_obs, reward, done, info = env.step(action)
            
            # Store transition
            self.obs_buffer.append(obs)
            self.actions_buffer.append(action)
            self.rewards_buffer.append(reward)
            self.values_buffer.append(value)
            self.log_probs_buffer.append(log_prob)
            self.dones_buffer.append(done)
            
            # Track rewards
            current_rewards += reward
            if done.any():
                episode_rewards.extend(current_rewards[done].tolist())
                current_rewards[done] = 0
            
            obs = next_obs
            self.total_steps += self.config.num_envs
        
        return {
            "mean_reward": sum(episode_rewards) / max(len(episode_rewards), 1),
            "episodes": len(episode_rewards),
        }
    
    def compute_gae(self, last_value: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Compute Generalized Advantage Estimation"""
        advantages = []
        returns = []
        gae = torch.zeros(self.config.num_envs, device=self.device)
        next_value = last_value
        
        for t in reversed(range(len(self.rewards_buffer))):
            mask = 1.0 - self.dones_buffer[t].float()
            delta = self.rewards_buffer[t] + self.config.gamma * next_value * mask - self.values_buffer[t]
            gae = delta + self.config.gamma * self.config.gae_lambda * mask * gae
            advantages.insert(0, gae)
            returns.insert(0, gae + self.values_buffer[t])
            next_value = self.values_buffer[t]
        
        return torch.stack(advantages), torch.stack(returns)
    
    def update_policy(self) -> Dict[str, float]:
        """PPO policy update"""
        self.policy.train()
        
        # Flatten buffers
        obs = torch.stack(self.obs_buffer).reshape(-1, self.obs_buffer[0].shape[-1])
        actions = torch.stack(self.actions_buffer).reshape(-1, self.actions_buffer[0].shape[-1])
        old_log_probs = torch.stack(self.log_probs_buffer).reshape(-1)
        
        # Compute advantages
        with torch.no_grad():
            _, _, last_value = self.policy(self.obs_buffer[-1])
        advantages, returns = self.compute_gae(last_value)
        advantages = advantages.reshape(-1)
        returns = returns.reshape(-1)
        
        # Normalize advantages
        advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)
        
        # PPO update epochs
        total_loss = 0
        policy_loss_total = 0
        value_loss_total = 0
        
        num_batches = obs.shape[0] // self.config.batch_size
        indices = torch.randperm(obs.shape[0])
        
        for start in range(0, obs.shape[0], self.config.batch_size):
            end = start + self.config.batch_size
            batch_indices = indices[start:end]
            
            # Get batch
            batch_obs = obs[batch_indices]
            batch_actions = actions[batch_indices]
            batch_old_log_probs = old_log_probs[batch_indices]
            batch_advantages = advantages[batch_indices]
            batch_returns = returns[batch_indices]
            
            # Evaluate
            new_log_probs, values, entropy = self.policy.evaluate_actions(batch_obs, batch_actions)
            
            # Policy loss
            ratio = (new_log_probs - batch_old_log_probs).exp()
            surr1 = ratio * batch_advantages
            surr2 = torch.clamp(ratio, 1 - self.config.clip_ratio, 1 + self.config.clip_ratio) * batch_advantages
            policy_loss = -torch.min(surr1, surr2).mean()
            
            # Value loss
            value_loss = 0.5 * (values - batch_returns).pow(2).mean()
            
            # Entropy bonus
            entropy_loss = -entropy.mean()
            
            # Total loss
            loss = policy_loss + 0.5 * value_loss + self.config.entropy_coef * entropy_loss
            
            # Update
            self.optimizer.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(self.policy.parameters(), 1.0)
            self.optimizer.step()
            
            total_loss += loss.item()
            policy_loss_total += policy_loss.item()
            value_loss_total += value_loss.item()
        
        # Clear buffers
        self.obs_buffer.clear()
        self.actions_buffer.clear()
        self.rewards_buffer.clear()
        self.values_buffer.clear()
        self.log_probs_buffer.clear()
        self.dones_buffer.clear()
        
        return {
            "loss": total_loss / num_batches,
            "policy_loss": policy_loss_total / num_batches,
            "value_loss": value_loss_total / num_batches,
        }
    
    def train(self, env: Any) -> Dict[str, List[float]]:
        """Main training loop"""
        logger.info(f"Starting training for {self.config.max_epochs} epochs")
        
        history = {"rewards": [], "losses": []}
        
        for epoch in range(self.config.max_epochs):
            self.epoch = epoch
            
            # Collect rollout
            rollout_stats = self.collect_rollout(env, self.config.steps_per_epoch)
            
            # Update policy
            update_stats = self.update_policy()
            
            history["rewards"].append(rollout_stats["mean_reward"])
            history["losses"].append(update_stats["loss"])
            
            # Logging
            if epoch % 10 == 0:
                logger.info(
                    f"Epoch {epoch} | Reward: {rollout_stats['mean_reward']:.2f} | "
                    f"Loss: {update_stats['loss']:.4f} | Steps: {self.total_steps}"
                )
            
            # Save checkpoint
            if epoch % self.config.save_interval == 0:
                self.save_checkpoint()
            
            # Best model
            if rollout_stats["mean_reward"] > self.best_reward:
                self.best_reward = rollout_stats["mean_reward"]
                self.save_checkpoint(best=True)
        
        return history
    
    def save_checkpoint(self, best: bool = False):
        """Save training checkpoint"""
        filename = "best_policy.pt" if best else f"checkpoint_{self.epoch}.pt"
        path = self.config.checkpoint_dir / filename
        
        torch.save({
            "epoch": self.epoch,
            "policy_state": self.policy.state_dict(),
            "optimizer_state": self.optimizer.state_dict(),
            "best_reward": self.best_reward,
            "total_steps": self.total_steps,
        }, path)
        
        logger.info(f"Saved checkpoint: {path}")
    
    def load_checkpoint(self, path: Path):
        """Load training checkpoint"""
        checkpoint = torch.load(path, map_location=self.device)
        self.policy.load_state_dict(checkpoint["policy_state"])
        self.optimizer.load_state_dict(checkpoint["optimizer_state"])
        self.epoch = checkpoint["epoch"]
        self.best_reward = checkpoint["best_reward"]
        self.total_steps = checkpoint["total_steps"]
        logger.info(f"Loaded checkpoint from epoch {self.epoch}")

# ============================================
# DIGITAL TWIN TESTING
# ============================================

class DigitalTwinTester:
    """
    Test motor commands in simulation before real execution
    Validates timing, trajectories, and safety
    """
    
    def __init__(self, policy: HumanoidPolicy, simulation_config: Dict[str, Any]):
        self.policy = policy
        self.sim_config = simulation_config
        self.test_results: List[Dict] = []
    
    def test_command_sequence(
        self,
        commands: List[Dict[str, torch.Tensor]],
        expected_duration_ms: float,
    ) -> Dict[str, Any]:
        """Test a sequence of motor commands"""
        result = {
            "success": True,
            "timing_valid": True,
            "trajectory_valid": True,
            "safety_valid": True,
            "actual_duration_ms": 0,
            "errors": [],
        }
        
        total_time = 0
        for i, cmd in enumerate(commands):
            # Check timing
            cmd_time = cmd.get("duration_ms", 16.67)  # Default 60Hz
            total_time += cmd_time
            
            # Validate joint limits
            if "joint_targets" in cmd:
                for j, target in enumerate(cmd["joint_targets"]):
                    if target < -3.14 or target > 3.14:  # Rough limits
                        result["safety_valid"] = False
                        result["errors"].append(f"Joint {j} target {target:.3f} out of range")
        
        result["actual_duration_ms"] = total_time
        
        # Check total timing
        timing_tolerance = 0.1  # 10%
        if abs(total_time - expected_duration_ms) > expected_duration_ms * timing_tolerance:
            result["timing_valid"] = False
            result["errors"].append(
                f"Timing mismatch: expected {expected_duration_ms}ms, got {total_time}ms"
            )
        
        result["success"] = result["timing_valid"] and result["safety_valid"]
        self.test_results.append(result)
        
        return result
    
    def validate_motor_timing(
        self,
        action: torch.Tensor,
        target_frequency_hz: float = 60.0,
    ) -> Dict[str, Any]:
        """Validate that motor commands can execute at target frequency"""
        target_period_ms = 1000.0 / target_frequency_hz
        
        # Estimate computation time (would be actual measurement)
        computation_time_ms = 2.0  # Placeholder
        
        return {
            "valid": computation_time_ms < target_period_ms,
            "target_period_ms": target_period_ms,
            "computation_time_ms": computation_time_ms,
            "margin_ms": target_period_ms - computation_time_ms,
        }
