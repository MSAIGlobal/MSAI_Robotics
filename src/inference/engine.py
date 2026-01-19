"""
Inference engine for robotics models with benchmarking
"""
import torch
import torch.nn as nn
import numpy as np
import time
from pathlib import Path
from typing import Dict, List, Optional, Union
import json

class InferenceEngine:
    """Real-time inference engine with benchmarking"""

    def __init__(self,
                 model: nn.Module,
                 device: Optional[str] = None,
                 precision: str = 'fp32'):
        """
        Initialize inference engine

        Args:
            model: PyTorch model
            device: Device to run inference on ('cuda' or 'cpu')
            precision: Precision mode ('fp32', 'fp16', 'int8')
        """
        self.model = model
        self.precision = precision

        # Setup device
        if device is None:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        else:
            self.device = torch.device(device)

        # Move model to device
        self.model = self.model.to(self.device)
        self.model.eval()

        # Apply precision optimization
        if precision == 'fp16' and self.device.type == 'cuda':
            self.model = self.model.half()

        # Benchmarking stats
        self.inference_times = []
        self.total_inferences = 0

    def preprocess(self, input_data: Union[np.ndarray, torch.Tensor]) -> torch.Tensor:
        """
        Preprocess input data

        Args:
            input_data: Input image or data

        Returns:
            Preprocessed tensor
        """
        # Convert to tensor if needed
        if isinstance(input_data, np.ndarray):
            data = torch.from_numpy(input_data).float()
        else:
            data = input_data.float()

        # Normalize if image data (0-255 range)
        if data.max() > 1.0:
            data = data / 255.0

        # Add batch dimension if needed
        if data.dim() == 3:
            data = data.unsqueeze(0)

        # Ensure correct channel order (C, H, W)
        if data.dim() == 4 and data.shape[-1] == 3:
            data = data.permute(0, 3, 1, 2)

        # Apply precision
        if self.precision == 'fp16' and self.device.type == 'cuda':
            data = data.half()

        return data.to(self.device)

    def postprocess(self, output: torch.Tensor) -> Dict:
        """
        Postprocess model output

        Args:
            output: Model output tensor

        Returns:
            Dictionary with processed results
        """
        # Move to CPU and convert to numpy
        output = output.cpu()

        # Classification output
        if output.dim() == 2 and output.size(1) > 1:
            probabilities = torch.softmax(output, dim=1)
            confidence, predicted_class = torch.max(probabilities, dim=1)

            return {
                'class': predicted_class.item(),
                'confidence': confidence.item(),
                'probabilities': probabilities.numpy()
            }

        # Regression or other outputs
        else:
            return {
                'output': output.numpy()
            }

    @torch.no_grad()
    def infer(self, input_data: Union[np.ndarray, torch.Tensor],
              benchmark: bool = False) -> Dict:
        """
        Run inference on input data

        Args:
            input_data: Input data
            benchmark: Whether to record timing

        Returns:
            Dictionary with inference results
        """
        # Preprocess
        input_tensor = self.preprocess(input_data)

        # Run inference with timing
        if benchmark:
            start_time = time.time()

        output = self.model(input_tensor)

        if benchmark:
            inference_time = time.time() - start_time
            self.inference_times.append(inference_time)
            self.total_inferences += 1

        # Postprocess
        result = self.postprocess(output)

        if benchmark:
            result['inference_time'] = inference_time

        return result

    def infer_batch(self, batch_data: List[Union[np.ndarray, torch.Tensor]],
                   benchmark: bool = False) -> List[Dict]:
        """
        Run inference on batch of data

        Args:
            batch_data: List of input data
            benchmark: Whether to record timing

        Returns:
            List of inference results
        """
        results = []

        for data in batch_data:
            result = self.infer(data, benchmark=benchmark)
            results.append(result)

        return results

    def benchmark_model(self, test_input: torch.Tensor,
                       num_iterations: int = 100,
                       warmup_iterations: int = 10) -> Dict:
        """
        Benchmark model performance

        Args:
            test_input: Test input tensor
            num_iterations: Number of benchmark iterations
            warmup_iterations: Number of warmup iterations

        Returns:
            Benchmark statistics
        """
        print(f"Running benchmark with {num_iterations} iterations...")
        print(f"Device: {self.device}, Precision: {self.precision}")

        # Warmup
        print("Warming up...")
        for _ in range(warmup_iterations):
            _ = self.infer(test_input, benchmark=False)

        # Clear previous timing data
        self.inference_times = []

        # Benchmark
        print("Benchmarking...")
        for i in range(num_iterations):
            _ = self.infer(test_input, benchmark=True)

            if (i + 1) % 20 == 0:
                print(f"Progress: {i + 1}/{num_iterations}")

        # Calculate statistics
        times = np.array(self.inference_times)

        stats = {
            'device': str(self.device),
            'precision': self.precision,
            'num_iterations': num_iterations,
            'mean_time': float(np.mean(times)),
            'std_time': float(np.std(times)),
            'min_time': float(np.min(times)),
            'max_time': float(np.max(times)),
            'median_time': float(np.median(times)),
            'fps': float(1.0 / np.mean(times)),
            'throughput': float(num_iterations / np.sum(times))
        }

        print("\nBenchmark Results:")
        print(f"Mean inference time: {stats['mean_time']*1000:.2f} ms")
        print(f"Std deviation: {stats['std_time']*1000:.2f} ms")
        print(f"Min time: {stats['min_time']*1000:.2f} ms")
        print(f"Max time: {stats['max_time']*1000:.2f} ms")
        print(f"FPS: {stats['fps']:.2f}")
        print(f"Throughput: {stats['throughput']:.2f} samples/sec")

        return stats

    def load_checkpoint(self, checkpoint_path: Path):
        """
        Load model from checkpoint

        Args:
            checkpoint_path: Path to checkpoint file
        """
        checkpoint = torch.load(checkpoint_path, map_location=self.device)

        if 'model_state_dict' in checkpoint:
            self.model.load_state_dict(checkpoint['model_state_dict'])
        else:
            self.model.load_state_dict(checkpoint)

        self.model.eval()
        print(f"Loaded checkpoint from {checkpoint_path}")

    def export_onnx(self, output_path: Path,
                   input_shape: tuple,
                   opset_version: int = 11):
        """
        Export model to ONNX format

        Args:
            output_path: Output path for ONNX model
            input_shape: Input tensor shape (batch_size, channels, height, width)
            opset_version: ONNX opset version
        """
        dummy_input = torch.randn(input_shape).to(self.device)

        if self.precision == 'fp16' and self.device.type == 'cuda':
            dummy_input = dummy_input.half()

        torch.onnx.export(
            self.model,
            dummy_input,
            output_path,
            export_params=True,
            opset_version=opset_version,
            do_constant_folding=True,
            input_names=['input'],
            output_names=['output'],
            dynamic_axes={
                'input': {0: 'batch_size'},
                'output': {0: 'batch_size'}
            }
        )

        print(f"Model exported to ONNX: {output_path}")

    def save_benchmark_results(self, stats: Dict, output_path: Path):
        """
        Save benchmark results to JSON

        Args:
            stats: Benchmark statistics
            output_path: Output path for JSON file
        """
        with open(output_path, 'w') as f:
            json.dump(stats, f, indent=2)

        print(f"Benchmark results saved: {output_path}")

    def get_model_info(self) -> Dict:
        """
        Get model information

        Returns:
            Dictionary with model info
        """
        # Count parameters
        total_params = sum(p.numel() for p in self.model.parameters())
        trainable_params = sum(p.numel() for p in self.model.parameters() if p.requires_grad)

        return {
            'device': str(self.device),
            'precision': self.precision,
            'total_parameters': total_params,
            'trainable_parameters': trainable_params,
            'total_inferences': self.total_inferences,
            'model_type': type(self.model).__name__
        }
