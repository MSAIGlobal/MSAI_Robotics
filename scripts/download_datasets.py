#!/usr/bin/env python3
"""
Download robotics training datasets
"""
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from data_farm.collector import DataCollector
from data_farm.processor import DataProcessor
from data_farm.manager import DatasetManager
import argparse

def main():
    parser = argparse.ArgumentParser(description='Download robotics datasets')
    parser.add_argument(
        '--datasets',
        nargs='+',
        default=['coco'],
        choices=['coco', 'kitti', 'waymo', 'nyu_depth', 'ycb'],
        help='Datasets to download'
    )
    parser.add_argument(
        '--data-dir',
        type=str,
        default='data',
        help='Root directory for datasets'
    )
    parser.add_argument(
        '--process',
        action='store_true',
        help='Process datasets after downloading'
    )
    parser.add_argument(
        '--subset',
        type=str,
        default='val2017',
        help='Subset to download (for COCO)'
    )

    args = parser.parse_args()

    # Create data directory
    data_dir = Path(args.data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)

    # Initialize collector and manager
    collector = DataCollector(data_dir)
    manager = DatasetManager(data_dir)

    print("=" * 60)
    print("MOTHER Robotics Dataset Downloader")
    print("=" * 60)
    print(f"Data directory: {data_dir.absolute()}")
    print(f"Datasets to download: {', '.join(args.datasets)}")
    print()

    # Download each dataset
    for dataset_name in args.datasets:
        print(f"\n{'=' * 60}")
        print(f"Downloading {dataset_name.upper()} dataset")
        print(f"{'=' * 60}")

        try:
            if dataset_name == 'coco':
                collector.download_coco_dataset(subset=args.subset)
                dataset_path = data_dir / 'coco' / args.subset

            elif dataset_name == 'kitti':
                collector.download_kitti_dataset()
                dataset_path = data_dir / 'kitti'

            elif dataset_name == 'waymo':
                print("Note: Waymo dataset requires manual download")
                print("Visit: https://waymo.com/open/download/")
                continue

            elif dataset_name == 'nyu_depth':
                collector.download_nyu_depth_dataset()
                dataset_path = data_dir / 'nyu_depth_v2'

            elif dataset_name == 'ycb':
                collector.download_ycb_objects()
                dataset_path = data_dir / 'ycb_objects'

            # Register dataset
            manager.register_dataset(
                name=dataset_name,
                path=dataset_path,
                description=f"{dataset_name.upper()} dataset downloaded on {manager.metadata.get('created', 'unknown')}"
            )

            print(f"✓ {dataset_name.upper()} dataset downloaded successfully")

        except Exception as e:
            print(f"✗ Error downloading {dataset_name}: {e}")
            continue

    # Process datasets if requested
    if args.process:
        print(f"\n{'=' * 60}")
        print("Processing downloaded datasets")
        print(f"{'=' * 60}")

        processor = DataProcessor()

        for dataset_name in args.datasets:
            try:
                # This is a placeholder - actual processing depends on dataset format
                print(f"Processing {dataset_name}...")
                # Add actual processing logic here based on dataset type

            except Exception as e:
                print(f"Error processing {dataset_name}: {e}")

    # Print summary
    print(f"\n{'=' * 60}")
    print("Download Summary")
    print(f"{'=' * 60}")

    datasets = manager.list_datasets()
    if datasets:
        for dataset_info in datasets:
            print(f"\nDataset: {dataset_info['name']}")
            print(f"  Path: {dataset_info['path']}")
            print(f"  Created: {dataset_info['created']}")
    else:
        print("No datasets found")

    print(f"\n{'=' * 60}")
    print("Download complete!")
    print(f"{'=' * 60}")

if __name__ == '__main__':
    main()
