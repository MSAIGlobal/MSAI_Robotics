"""
Transformer model for robotics decision making
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import math

class PositionalEncoding(nn.Module):
    """Positional encoding for transformer"""

    def __init__(self, d_model, max_len=5000):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))

        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0).transpose(0, 1)
        self.register_buffer('pe', pe)

    def forward(self, x):
        return x + self.pe[:x.size(0), :]

class TransformerModel(nn.Module):
    """Transformer model for robotics decision making"""

    def __init__(self, input_dim=128, hidden_dim=256, num_layers=4, num_heads=8):
        super().__init__()
        self.input_projection = nn.Linear(input_dim, hidden_dim)
        self.pos_encoder = PositionalEncoding(hidden_dim)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=num_heads,
            dim_feedforward=hidden_dim*4,
            dropout=0.1,
            batch_first=True
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers)

        # Output heads
        self.action_head = nn.Linear(hidden_dim, 4)  # 4 actions
        self.value_head = nn.Linear(hidden_dim, 1)   # Value estimate

    def forward(self, x, mask=None):
        """Forward pass"""
        # Project input
        x = self.input_projection(x)

        # Add positional encoding
        x = self.pos_encoder(x)

        # Transformer encoder
        if mask is not None:
            x = self.transformer_encoder(x, src_key_padding_mask=mask)
        else:
            x = self.transformer_encoder(x)

        # Get outputs
        actions = self.action_head(x[:, -1, :])  # Last token
        value = self.value_head(x[:, -1, :])

        return actions, value

    def predict_action(self, sensor_data):
        """Predict action from sensor data"""
        with torch.no_grad():
            # Convert sensor data to tensor
            x = torch.tensor(sensor_data, dtype=torch.float32).unsqueeze(0)

            # Get prediction
            actions, value = self.forward(x)

            # Convert to probabilities
            action_probs = F.softmax(actions, dim=-1)
            best_action = torch.argmax(action_probs, dim=-1)

            return {
                "action": best_action.item(),
                "confidence": action_probs[0, best_action].item(),
                "value_estimate": value.item()
            }
