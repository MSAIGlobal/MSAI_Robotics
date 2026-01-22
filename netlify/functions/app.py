import os
import sys
from serverless_wsgi import handle_request

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from src.app import server  # noqa: E402

def handler(event, context):
    return handle_request(server, event, context)
