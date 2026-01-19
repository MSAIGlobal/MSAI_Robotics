#!/usr/bin/env python3
"""
Create sample log files for MOTHER Robotics
"""
from datetime import datetime, timedelta
import random
from pathlib import Path

def create_ai_training_log():
    """Create sample AI training log"""
    print("Creating AI training log...")

    log_file = Path('data/logs/ai_training.log')
    log_file.parent.mkdir(parents=True, exist_ok=True)

    with open(log_file, 'w') as f:
        start_time = datetime.now() - timedelta(days=7)

        for i in range(1000):
            timestamp = start_time + timedelta(minutes=i*10)

            # Random training events
            event_types = [
                "INFO - Starting training epoch",
                "INFO - Epoch completed",
                "INFO - Validation accuracy",
                "WARNING - Learning rate adjustment",
                "INFO - Model checkpoint saved",
                "ERROR - Gradient overflow",
                "INFO - Training completed"
            ]

            event = random.choice(event_types)

            # Add metrics for some events
            if "accuracy" in event:
                accuracy = random.uniform(0.65, 0.95)
                loss = random.uniform(0.1, 0.5)
                log_line = f"{timestamp.isoformat()} - {event}: {accuracy:.4f}, loss: {loss:.4f}\n"
            elif "checkpoint" in event:
                checkpoint = f"checkpoint_epoch_{random.randint(1, 100)}.pth"
                log_line = f"{timestamp.isoformat()} - {event}: {checkpoint}\n"
            elif "completed" in event:
                duration = random.uniform(0.5, 3.0)
                log_line = f"{timestamp.isoformat()} - {event} in {duration:.2f} hours\n"
            else:
                log_line = f"{timestamp.isoformat()} - {event}\n"

            f.write(log_line)

    print(f"✓ Created {log_file}")

def create_hardware_log():
    """Create sample hardware log"""
    print("Creating hardware log...")

    log_file = Path('data/logs/hardware.log')
    log_file.parent.mkdir(parents=True, exist_ok=True)

    components = ["motor_controller", "camera", "lidar", "imu", "battery", "gpio"]
    statuses = ["connected", "disconnected", "error", "warning", "calibrating", "operational"]

    with open(log_file, 'w') as f:
        start_time = datetime.now() - timedelta(days=1)

        for i in range(500):
            timestamp = start_time + timedelta(seconds=i*30)
            component = random.choice(components)
            status = random.choice(statuses)

            # Add details based on component
            if component == "motor_controller":
                speed = random.randint(0, 100)
                current = random.uniform(0.1, 5.0)
                log_line = f"{timestamp.isoformat()} - {component}: {status}, speed={speed}%, current={current:.2f}A\n"
            elif component == "camera":
                fps = random.randint(15, 60)
                resolution = random.choice(["640x480", "1280x720", "1920x1080"])
                log_line = f"{timestamp.isoformat()} - {component}: {status}, fps={fps}, res={resolution}\n"
            elif component == "battery":
                level = random.randint(20, 100)
                voltage = random.uniform(3.0, 4.2)
                log_line = f"{timestamp.isoformat()} - {component}: {status}, level={level}%, voltage={voltage:.2f}V\n"
            else:
                log_line = f"{timestamp.isoformat()} - {component}: {status}\n"

            f.write(log_line)

    print(f"✓ Created {log_file}")

def create_dashboard_log():
    """Create sample dashboard log"""
    print("Creating dashboard log...")

    log_file = Path('data/logs/dashboard.log')
    log_file.parent.mkdir(parents=True, exist_ok=True)

    users = ["admin", "operator", "viewer", "system"]
    actions = [
        "login", "logout", "start_ai", "stop_ai",
        "upload_model", "download_data", "control_motor",
        "calibrate_sensor", "update_settings", "export_report"
    ]

    with open(log_file, 'w') as f:
        start_time = datetime.now() - timedelta(hours=24)

        for i in range(200):
            timestamp = start_time + timedelta(minutes=i*5)
            user = random.choice(users)
            action = random.choice(actions)

            # Add success/failure
            success = random.random() > 0.1

            if success:
                log_line = f"{timestamp.isoformat()} - {user}: {action} - SUCCESS\n"
            else:
                errors = [
                    "Permission denied",
                    "Connection timeout",
                    "Invalid parameter",
                    "Resource not found",
                    "System busy"
                ]
                error = random.choice(errors)
                log_line = f"{timestamp.isoformat()} - {user}: {action} - FAILED: {error}\n"

            f.write(log_line)

    print(f"✓ Created {log_file}")

def main():
    """Create all log files"""
    print("=" * 60)
    print("MOTHER Robotics - Log File Generator")
    print("=" * 60)
    print()

    create_ai_training_log()
    create_hardware_log()
    create_dashboard_log()

    print()
    print("=" * 60)
    print("✓ All log files created successfully!")
    print("=" * 60)

if __name__ == '__main__':
    main()
