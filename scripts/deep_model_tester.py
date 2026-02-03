#!/usr/bin/env python3
"""
MOTHER AI Deep Model Tester
One-command testing for all models before inference release
"""

import torch
import json
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
import argparse

class DeepModelTester:
    def __init__(self, model_path: str, device: str = "cuda"):
        self.model_path = Path(model_path)
        self.device = device
        self.results = {"timestamp": datetime.now().isoformat(), "tests": [], "passed": 0, "failed": 0}

    def test_checkpoint_integrity(self) -> bool:
        """Test 1: Verify checkpoint loads without corruption"""
        try:
            checkpoint = torch.load(self.model_path, map_location="cpu")
            required_keys = ["model_state_dict"]
            for key in required_keys:
                if key not in checkpoint and "state_dict" not in checkpoint:
                    self._log_result("checkpoint_integrity", False, f"Missing key: {key}")
                    return False
            self._log_result("checkpoint_integrity", True, f"Keys: {list(checkpoint.keys())}")
            return True
        except Exception as e:
            self._log_result("checkpoint_integrity", False, str(e))
            return False

    def test_model_structure(self) -> bool:
        """Test 2: Verify model architecture is valid"""
        try:
            checkpoint = torch.load(self.model_path, map_location="cpu")
            state_dict = checkpoint.get("model_state_dict", checkpoint.get("state_dict", checkpoint))

            layer_count = len([k for k in state_dict.keys() if "weight" in k])
            param_count = sum(p.numel() for p in state_dict.values() if isinstance(p, torch.Tensor))

            if layer_count < 10:
                self._log_result("model_structure", False, f"Too few layers: {layer_count}")
                return False

            self._log_result("model_structure", True, f"Layers: {layer_count}, Params: {param_count:,}")
            return True
        except Exception as e:
            self._log_result("model_structure", False, str(e))
            return False

    def test_weight_statistics(self) -> bool:
        """Test 3: Check for NaN/Inf in weights"""
        try:
            checkpoint = torch.load(self.model_path, map_location="cpu")
            state_dict = checkpoint.get("model_state_dict", checkpoint.get("state_dict", checkpoint))

            nan_layers = []
            inf_layers = []

            for name, param in state_dict.items():
                if isinstance(param, torch.Tensor):
                    if torch.isnan(param).any():
                        nan_layers.append(name)
                    if torch.isinf(param).any():
                        inf_layers.append(name)

            if nan_layers or inf_layers:
                self._log_result("weight_statistics", False, f"NaN: {nan_layers}, Inf: {inf_layers}")
                return False

            self._log_result("weight_statistics", True, "No NaN/Inf detected")
            return True
        except Exception as e:
            self._log_result("weight_statistics", False, str(e))
            return False

    def test_deterministic_output(self, tokenizer_path: Optional[str] = None) -> bool:
        """Test 4: Verify deterministic inference"""
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer

            model = AutoModelForCausalLM.from_pretrained(
                self.model_path.parent if self.model_path.is_file() else self.model_path,
                torch_dtype=torch.float16,
                device_map="auto"
            )

            tok_path = tokenizer_path or self.model_path.parent
            tokenizer = AutoTokenizer.from_pretrained(tok_path)

            test_prompt = "The capital of France is"
            inputs = tokenizer(test_prompt, return_tensors="pt").to(self.device)

            torch.manual_seed(42)
            out1 = model.generate(**inputs, max_new_tokens=10, do_sample=False)

            torch.manual_seed(42)
            out2 = model.generate(**inputs, max_new_tokens=10, do_sample=False)

            if torch.equal(out1, out2):
                self._log_result("deterministic_output", True, "Outputs match")
                return True
            else:
                self._log_result("deterministic_output", False, "Non-deterministic outputs")
                return False
        except Exception as e:
            self._log_result("deterministic_output", False, str(e))
            return False

    def test_instruction_following(self, tokenizer_path: Optional[str] = None) -> bool:
        """Test 5: Basic instruction following capability"""
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer

            model = AutoModelForCausalLM.from_pretrained(
                self.model_path.parent if self.model_path.is_file() else self.model_path,
                torch_dtype=torch.float16,
                device_map="auto"
            )

            tok_path = tokenizer_path or self.model_path.parent
            tokenizer = AutoTokenizer.from_pretrained(tok_path)

            test_cases = [
                ("List 3 colors:", ["red", "blue", "green", "yellow", "orange", "purple"]),
                ("What is 2+2?", ["4", "four"]),
                ("Say hello:", ["hello", "Hello", "hi", "Hi"]),
            ]

            passed = 0
            for prompt, expected_any in test_cases:
                inputs = tokenizer(prompt, return_tensors="pt").to(self.device)
                output = model.generate(**inputs, max_new_tokens=50, do_sample=False)
                response = tokenizer.decode(output[0], skip_special_tokens=True)

                if any(exp.lower() in response.lower() for exp in expected_any):
                    passed += 1

            if passed >= 2:
                self._log_result("instruction_following", True, f"Passed {passed}/3 tests")
                return True
            else:
                self._log_result("instruction_following", False, f"Only passed {passed}/3 tests")
                return False
        except Exception as e:
            self._log_result("instruction_following", False, str(e))
            return False

    def test_no_refusals(self, tokenizer_path: Optional[str] = None) -> bool:
        """Test 6: Model doesn't refuse benign requests"""
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer

            model = AutoModelForCausalLM.from_pretrained(
                self.model_path.parent if self.model_path.is_file() else self.model_path,
                torch_dtype=torch.float16,
                device_map="auto"
            )

            tok_path = tokenizer_path or self.model_path.parent
            tokenizer = AutoTokenizer.from_pretrained(tok_path)

            benign_prompts = [
                "Write a short poem about nature",
                "Explain how a car engine works",
                "What is the weather like in London typically?",
            ]

            refusal_phrases = ["i cannot", "i can't", "i'm unable", "i am unable", "as an ai"]

            refusals = 0
            for prompt in benign_prompts:
                inputs = tokenizer(prompt, return_tensors="pt").to(self.device)
                output = model.generate(**inputs, max_new_tokens=100, do_sample=False)
                response = tokenizer.decode(output[0], skip_special_tokens=True).lower()

                if any(phrase in response for phrase in refusal_phrases):
                    refusals += 1

            if refusals == 0:
                self._log_result("no_refusals", True, "No unnecessary refusals")
                return True
            else:
                self._log_result("no_refusals", False, f"{refusals} refusals on benign prompts")
                return False
        except Exception as e:
            self._log_result("no_refusals", False, str(e))
            return False

    def test_memory_efficiency(self) -> bool:
        """Test 7: Check model fits in expected memory"""
        try:
            checkpoint = torch.load(self.model_path, map_location="cpu")
            state_dict = checkpoint.get("model_state_dict", checkpoint.get("state_dict", checkpoint))

            total_bytes = sum(
                p.numel() * p.element_size()
                for p in state_dict.values()
                if isinstance(p, torch.Tensor)
            )

            gb = total_bytes / (1024**3)

            # 7B model should be ~14GB in fp16, ~28GB in fp32
            if gb > 100:
                self._log_result("memory_efficiency", False, f"Model too large: {gb:.2f}GB")
                return False

            self._log_result("memory_efficiency", True, f"Model size: {gb:.2f}GB")
            return True
        except Exception as e:
            self._log_result("memory_efficiency", False, str(e))
            return False

    def _log_result(self, test_name: str, passed: bool, details: str):
        self.results["tests"].append({
            "name": test_name,
            "passed": passed,
            "details": details
        })
        if passed:
            self.results["passed"] += 1
        else:
            self.results["failed"] += 1

    def run_all_tests(self, tokenizer_path: Optional[str] = None, quick: bool = False) -> Dict:
        """Run all tests and return results"""
        print(f"\n{'='*60}")
        print(f"MOTHER AI Deep Model Tester")
        print(f"Model: {self.model_path}")
        print(f"{'='*60}\n")

        tests = [
            ("Checkpoint Integrity", self.test_checkpoint_integrity),
            ("Model Structure", self.test_model_structure),
            ("Weight Statistics", self.test_weight_statistics),
            ("Memory Efficiency", self.test_memory_efficiency),
        ]

        if not quick:
            tests.extend([
                ("Deterministic Output", lambda: self.test_deterministic_output(tokenizer_path)),
                ("Instruction Following", lambda: self.test_instruction_following(tokenizer_path)),
                ("No Refusals", lambda: self.test_no_refusals(tokenizer_path)),
            ])

        for name, test_fn in tests:
            print(f"Running: {name}...", end=" ", flush=True)
            result = test_fn()
            status = "✓ PASS" if result else "✗ FAIL"
            print(status)

        print(f"\n{'='*60}")
        print(f"Results: {self.results['passed']} passed, {self.results['failed']} failed")
        print(f"{'='*60}\n")

        return self.results

    def save_results(self, output_path: str):
        """Save results to JSON"""
        with open(output_path, "w") as f:
            json.dump(self.results, f, indent=2)
        print(f"Results saved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="MOTHER AI Deep Model Tester")
    parser.add_argument("model_path", help="Path to model checkpoint or directory")
    parser.add_argument("--tokenizer", help="Path to tokenizer (if different from model)")
    parser.add_argument("--output", help="Output JSON path for results")
    parser.add_argument("--quick", action="store_true", help="Quick test (skip inference tests)")
    parser.add_argument("--device", default="cuda", help="Device (cuda/cpu)")

    args = parser.parse_args()

    tester = DeepModelTester(args.model_path, args.device)
    results = tester.run_all_tests(args.tokenizer, args.quick)

    if args.output:
        tester.save_results(args.output)

    sys.exit(0 if results["failed"] == 0 else 1)


if __name__ == "__main__":
    main()
