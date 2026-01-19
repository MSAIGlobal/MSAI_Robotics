#!/usr/bin/env python3
"""
Create image assets for MOTHER Robotics Dashboard
"""
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from pathlib import Path

def create_logo():
    """Create robot logo"""
    print("Creating logo...")

    img = Image.new('RGB', (512, 512), color='#1a1a1a')
    draw = ImageDraw.Draw(img)

    # Draw robot body
    draw.rectangle([150, 150, 362, 362], fill='#0d6efd', outline='#ffffff', width=5)

    # Draw robot head
    draw.ellipse([200, 100, 312, 212], fill='#0d6efd', outline='#ffffff', width=5)

    # Draw eyes
    draw.ellipse([230, 130, 250, 150], fill='#ffffff')
    draw.ellipse([262, 130, 282, 150], fill='#ffffff')

    # Draw text
    try:
        font = ImageFont.truetype("arial.ttf", 36)
    except:
        font = ImageFont.load_default()

    draw.text((180, 400), "MOTHER", fill='#ffffff', font=font)
    draw.text((200, 440), "ROBOTICS", fill='#0d6efd', font=font)

    # Save
    output_path = Path('public/assets/images/logo.png')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path)
    print(f"✓ Created logo: {output_path}")

def create_icon():
    """Create robot icon"""
    print("Creating icon...")

    img = Image.new('RGBA', (128, 128), color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Robot icon
    draw.rectangle([40, 60, 88, 108], fill='#0d6efd', outline='#ffffff', width=3)
    draw.ellipse([50, 30, 78, 58], fill='#0d6efd', outline='#ffffff', width=3)

    # Save
    output_path = Path('public/assets/images/robot-icon.png')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path)
    print(f"✓ Created icon: {output_path}")

def create_background():
    """Create futuristic background"""
    print("Creating background...")

    # Create futuristic background
    img = Image.new('RGB', (1920, 1080), color='#0a0a1a')
    draw = ImageDraw.Draw(img)

    # Draw circuit lines
    for i in range(20):
        x = np.random.randint(0, 1920)
        y = np.random.randint(0, 1080)
        width = np.random.randint(50, 300)
        height = np.random.randint(50, 300)
        color = np.random.choice(['#0d6efd22', '#19875422', '#dc354522'])
        draw.rectangle([x, y, x+width, y+height], outline=color, width=2)

    # Save
    output_path = Path('public/assets/images/background.jpg')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path)
    print(f"✓ Created background: {output_path}")

def main():
    """Create all image assets"""
    print("=" * 60)
    print("MOTHER Robotics - Image Asset Generator")
    print("=" * 60)
    print()

    create_logo()
    create_icon()
    create_background()

    print()
    print("=" * 60)
    print("✓ All image assets created successfully!")
    print("=" * 60)

if __name__ == '__main__':
    main()
