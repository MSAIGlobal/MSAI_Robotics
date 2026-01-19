import dash
from dash import html, dcc
import dash_bootstrap_components as dbc
from flask import Flask, send_from_directory
import os

server = Flask(__name__)

@server.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

app = dash.Dash(
    __name__,
    server=server,
    external_stylesheets=[
        dbc.themes.DARKLY,
        dbc.icons.FONT_AWESOME
    ],
    meta_tags=[
        {"name": "viewport", "content": "width=device-width, initial-scale=1"}
    ],
    suppress_callback_exceptions=True,
    title="MOTHER Robotics Dashboard",
    update_title="Loading..."
)

app.layout = html.Div([
    dcc.Location(id='url', refresh=False),
    dcc.Store(id='session-state'),
    dcc.Store(id='camera-state'),
    dcc.Store(id='model-state'),
    dcc.Store(id='training-state'),
    dcc.Interval(id='camera-interval', interval=100),
    dcc.Interval(id='training-update-interval', interval=1000),
    dcc.Interval(id='system-status-interval', interval=5000),
    html.Div(id='page-content')
])

@server.route('/health')
def health_check():
    return {'status': 'healthy', 'service': 'mother-robotics'}

@server.route('/api/status')
def api_status():
    return {'status': 'running', 'version': '1.0.0'}

if __name__ == '__main__':
    app.run_server(debug=True, port=8050)
