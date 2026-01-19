
from serverless_wsgi import handle_request
from src.app import server

def handler(event, context):
    return handle_request(server, event, context)
