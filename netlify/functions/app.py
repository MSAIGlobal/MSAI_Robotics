import os
import sys
from serverless_wsgi import handle

# Ensure repo root is importable
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from src.app import server  # noqa: E402


def handler(event, context):
    # 🔥 CRITICAL FIX: normalize Netlify path for Dash
    event["path"] = "/"
    event["rawPath"] = "/"

    if "requestContext" in event and "http" in event["requestContext"]:
        event["requestContext"]["http"]["path"] = "/"

    return handle(server, event, context)
