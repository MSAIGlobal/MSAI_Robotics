class HardwareInterface:
    """Main hardware interface"""
    def __init__(self):
        self.connected = False

    def connect(self):
        """Connect to hardware"""
        self.connected = True
        return True

    def disconnect(self):
        """Disconnect from hardware"""
        self.connected = False

    def get_status(self):
        """Get hardware status"""
        return {"connected": self.connected}
