
import os
import sys
import logging
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent))

from app import app, server
from utils.config import load_config
from utils.logging import setup_logging
from api.websocket_server import start_websocket_server
import threading

def main():
    """Main application entry point"""
    # Load configuration
    config = load_config()
    
    # Setup logging
    setup_logging(level=config.get('logging_level', 'INFO'))
    
    # Start WebSocket server in background thread
    if config.get('enable_websocket', True):
        websocket_thread = threading.Thread(
            target=start_websocket_server,
            daemon=True
        )
        websocket_thread.start()
        logging.info("WebSocket server started on port 8765")
    
    # Start the main Dash application
    port = int(os.environ.get('PORT', 8050))
    debug = config.get('debug', False)
    
    logging.info(f"Starting MOTHER Robotics Dashboard on port {port}")
    logging.info(f"Debug mode: {debug}")
    logging.info(f"Dashboard URL: http://localhost:{port}")
    logging.info(f"WebSocket URL: ws://localhost:8765")
    
    # Run the application
    app.run_server(
        host='0.0.0.0',
        port=port,
        debug=debug,
        dev_tools_ui=debug,
        dev_tools_props_check=debug
    )

if __name__ == '__main__':
    main()
