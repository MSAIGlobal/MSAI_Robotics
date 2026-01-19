#!/usr/bin/env python3
"""
Create sample datasets for MOTHER Robotics
"""
import numpy as np
import cv2
import json
import os
from pathlib import Path

def create_household_objects_dataset():
    """Create sample household objects dataset"""
    print("Creating household objects dataset...")

    dataset_dir = Path('data/datasets/household_objects')
    dataset_dir.mkdir(parents=True, exist_ok=True)

    categories = ['cup', 'bottle', 'book', 'remote', 'chair', 'table', 'laptop', 'keyboard']

    annotations = []

    for i in range(100):
        # Create random image
        img = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)

        # Add some shapes to simulate objects
        for _ in range(np.random.randint(1, 5)):
            x = np.random.randint(0, 600)
            y = np.random.randint(0, 440)
            w = np.random.randint(40, 120)
            h = np.random.randint(40, 120)
            color = tuple(np.random.randint(0, 255, 3).tolist())

            cv2.rectangle(img, (x, y), (x+w, y+h), color, -1)

            # Add annotation
            category = np.random.choice(categories)
            annotations.append({
                "image_id": i,
                "category": category,
                "bbox": [x, y, w, h],
                "area": w * h,
                "iscrowd": 0
            })

        # Save image
        cv2.imwrite(str(dataset_dir / f'image_{i:04d}.jpg'), img)

    # Save annotations
    with open(dataset_dir / 'annotations.json', 'w') as f:
        json.dump({
            "categories": [{"id": idx, "name": cat} for idx, cat in enumerate(categories)],
            "images": [{"id": i, "file_name": f"image_{i:04d}.jpg"} for i in range(100)],
            "annotations": annotations
        }, f, indent=2)

    print(f"✓ Created household_objects dataset with {len(annotations)} annotations")

def create_navigation_scenes():
    """Create navigation scenes dataset"""
    print("Creating navigation scenes dataset...")

    dataset_dir = Path('data/datasets/navigation_scenes')
    dataset_dir.mkdir(parents=True, exist_ok=True)

    # Create depth maps and RGB images
    for i in range(50):
        # RGB image
        rgb = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        cv2.imwrite(str(dataset_dir / f'rgb_{i:04d}.png'), rgb)

        # Depth map (simulated)
        depth = np.random.randint(100, 5000, (480, 640), dtype=np.uint16)
        cv2.imwrite(str(dataset_dir / f'depth_{i:04d}.png'), depth)

        # Pose information
        pose = {
            "position": np.random.randn(3).tolist(),
            "orientation": np.random.randn(4).tolist(),
            "timestamp": i * 0.1
        }

        with open(dataset_dir / f'pose_{i:04d}.json', 'w') as f:
            json.dump(pose, f)

    print("✓ Created navigation_scenes dataset")

def create_human_interactions():
    """Create human interaction dataset"""
    print("Creating human interactions dataset...")

    dataset_dir = Path('data/datasets/human_interactions')
    dataset_dir.mkdir(parents=True, exist_ok=True)

    interactions = [
        "handshake", "pointing", "waving", "giving_object",
        "receiving_object", "following", "leading", "observing"
    ]

    dataset = []

    for i in range(200):
        # Create interaction data
        interaction = {
            "id": i,
            "interaction_type": np.random.choice(interactions),
            "human_position": np.random.randn(3).tolist(),
            "robot_position": np.random.randn(3).tolist(),
            "distance": float(np.random.uniform(0.5, 3.0)),
            "duration": float(np.random.uniform(1.0, 10.0)),
            "success": bool(np.random.random() > 0.3),
            "timestamp": i * 0.5
        }

        dataset.append(interaction)

    # Save dataset
    with open(dataset_dir / 'interactions.json', 'w') as f:
        json.dump(dataset, f, indent=2)

    print(f"✓ Created human_interactions dataset with {len(dataset)} samples")

def main():
    """Create all sample datasets"""
    print("=" * 60)
    print("MOTHER Robotics - Sample Data Generator")
    print("=" * 60)
    print()

    create_household_objects_dataset()
    create_navigation_scenes()
    create_human_interactions()

    print()
    print("=" * 60)
    print("✓ All sample datasets created successfully!")
    print("=" * 60)

if __name__ == '__main__':
    main()
