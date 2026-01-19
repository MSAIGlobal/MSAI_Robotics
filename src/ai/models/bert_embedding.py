"""
BERT embedding model for natural language understanding
"""
import torch
import torch.nn as nn
import numpy as np

try:
    from transformers import BertModel, BertTokenizer
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

class BERTEmbedding:
    """BERT embedding model for natural language understanding"""

    def __init__(self, model_name='bert-base-uncased'):
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError("transformers library required. Install with: pip install transformers")

        self.tokenizer = BertTokenizer.from_pretrained(model_name)
        self.model = BertModel.from_pretrained(model_name)
        self.model.eval()

    def get_embeddings(self, text):
        """Get embeddings for text"""
        inputs = self.tokenizer(text, return_tensors='pt', padding=True, truncation=True)

        with torch.no_grad():
            outputs = self.model(**inputs)
            embeddings = outputs.last_hidden_state[:, 0, :]  # CLS token

        return embeddings.numpy()

    def semantic_similarity(self, text1, text2):
        """Calculate semantic similarity between two texts"""
        emb1 = self.get_embeddings(text1)
        emb2 = self.get_embeddings(text2)

        # Cosine similarity
        similarity = np.dot(emb1[0], emb2[0]) / (
            np.linalg.norm(emb1[0]) * np.linalg.norm(emb2[0])
        )

        return float(similarity)

    def encode_commands(self, commands):
        """Encode robot commands"""
        encoded = {}
        for command in commands:
            emb = self.get_embeddings(command)
            encoded[command] = emb
        return encoded
