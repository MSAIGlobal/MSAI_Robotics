import os
import json
import base64
import io
from datetime import datetime

import requests
import pandas as pd

import dash
from dash import html, dcc, Input, Output, State, callback_context
import dash_bootstrap_components as dbc
from dash import dash_table
from flask import Flask, jsonify

# ----------------------------
# Configuration
# ----------------------------
def env(name: str, default: str = "") -> str:
    v = os.getenv(name)
    return v if (v is not None and str(v).strip() != "") else default

ENTERPRISE_API_URL = env("ENTERPRISE_API_URL")  # e.g. https://api.yourdomain.com (enterprise-api service)
ENTERPRISE_API_KEY = env("ENTERPRISE_API_KEY")  # x-api-key value
MOTHER_LLM_URL = env("MOTHER_LLM_URL")  # optional direct endpoint (bypass enterprise)
MOTHER_REASONING_URL = env("MOTHER_REASONING_URL")  # optional direct endpoint
MOTHER_API_TIMEOUT_S = int(env("MOTHER_API_TIMEOUT_S", "30"))

DIGITAL_TWIN_URL = env("DIGITAL_TWIN_URL")  # optional: backend endpoint for sim jobs
CAD_RENDER_URL = env("CAD_RENDER_URL")  # optional: backend endpoint to render/convert CAD (e.g. scad->stl)

APP_TITLE = "MOTHER Robotics — Digital Twin & Planning"

# ----------------------------
# Server + Dash
# ----------------------------
server = Flask(__name__)

@server.get("/health")
def health():
    return jsonify({"status": "healthy", "service": "mother-robotics-dashboard", "time": datetime.utcnow().isoformat() + "Z"})

@server.get("/api/status")
def status():
    return jsonify({
        "status": "running",
        "version": "2.0.0",
        "enterprise_api_configured": bool(ENTERPRISE_API_URL and ENTERPRISE_API_KEY),
        "direct_llm_configured": bool(MOTHER_LLM_URL),
        "direct_reasoning_configured": bool(MOTHER_REASONING_URL),
        "digital_twin_configured": bool(DIGITAL_TWIN_URL),
        "cad_render_configured": bool(CAD_RENDER_URL),
    })

def _post_json(url: str, payload: dict, headers: dict | None = None) -> dict:
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    r = requests.post(url, json=payload, headers=h, timeout=MOTHER_API_TIMEOUT_S)
    r.raise_for_status()
    return r.json() if r.content else {}

def call_mother_llm(prompt: str, context_pack: str | None = None, max_tokens: int = 1200) -> dict:
    if MOTHER_LLM_URL:
        return _post_json(MOTHER_LLM_URL, {"prompt": prompt, "context": context_pack, "maxTokens": max_tokens})
    if ENTERPRISE_API_URL and ENTERPRISE_API_KEY:
        return _post_json(
            ENTERPRISE_API_URL.rstrip("/") + "/mother/llm",
            {"prompt": prompt, "context": context_pack, "maxTokens": max_tokens},
            headers={"x-api-key": ENTERPRISE_API_KEY},
        )
    return {"error": "No MOTHER LLM endpoint configured. Set MOTHER_LLM_URL or ENTERPRISE_API_URL + ENTERPRISE_API_KEY."}

def call_mother_reasoning(task: str, state: dict | None = None) -> dict:
    if MOTHER_REASONING_URL:
        return _post_json(MOTHER_REASONING_URL, {"task": task, "state": state or {}})
    if ENTERPRISE_API_URL and ENTERPRISE_API_KEY:
        return _post_json(
            ENTERPRISE_API_URL.rstrip("/") + "/mother/reasoning",
            {"task": task, "state": state or {}},
            headers={"x-api-key": ENTERPRISE_API_KEY},
        )
    return {"error": "No MOTHER Reasoning endpoint configured. Set MOTHER_REASONING_URL or ENTERPRISE_API_URL + ENTERPRISE_API_KEY."}

def summarize_df(df: pd.DataFrame, max_rows: int = 5) -> str:
    lines = []
    lines.append(f"shape: {df.shape}")
    lines.append("columns: " + ", ".join([f"{c}({str(df[c].dtype)})" for c in df.columns[:80]]))
    head = df.head(max_rows).to_dict(orient="records")
    lines.append("head: " + json.dumps(head, ensure_ascii=False)[:2000])
    return "\n".join(lines)

def build_context_pack(workspace: dict) -> str:
    """Create a compact text bundle of the current dashboard workspace."""
    parts = []
    parts.append("# MOTHER Robotics Dashboard Context Pack")
    parts.append(f"generated_at_utc: {datetime.utcnow().isoformat()}Z")
    if not workspace:
        return "\n".join(parts) + "\n(no workspace data)\n"
    notes = workspace.get("notes", "")
    if notes:
        parts.append("\n## Notes\n" + notes[:6000])
    plan = workspace.get("plan", "")
    if plan:
        parts.append("\n## Current Plan\n" + plan[:8000])
    code = workspace.get("code", "")
    if code:
        parts.append("\n## Current Code\n" + code[:12000])
    cad = workspace.get("cad_code", "")
    if cad:
        parts.append("\n## CAD Code\n" + cad[:12000])
    uploads = workspace.get("uploads", [])
    if uploads:
        parts.append("\n## Uploaded Data\n")
        for u in uploads[:10]:
            parts.append(f"- {u.get('name')} ({u.get('kind')})")
            if u.get("summary"):
                parts.append("  " + u["summary"].replace("\n", "\n  ")[:4000])
    return "\n".join(parts)

# ----------------------------
# UI Components
# ----------------------------
def pill(text, color="secondary"):
    return dbc.Badge(text, color=color, className="me-1", pill=True)

def sidebar():
    return html.Div(
        [
            html.Div(
                [
                    html.Div("MOTHER", className="fw-bold", style={"fontSize": "1.2rem"}),
                    html.Div("Robotics Studio", className="text-muted", style={"marginTop": "-4px"}),
                    html.Div(
                        [
                            pill("Netlify", "info"),
                            pill("Dash", "primary"),
                            pill("Node API", "warning" if (ENTERPRISE_API_URL or MOTHER_LLM_URL or MOTHER_REASONING_URL) else "secondary"),
                        ],
                        className="mt-2"
                    ),
                ],
                className="p-3"
            ),
            dbc.Nav(
                [
                    dbc.NavLink([html.I(className="fa fa-gauge me-2"), "Overview"], href="/", active="exact"),
                    dbc.NavLink([html.I(className="fa fa-folder-open me-2"), "Workspace"], href="/workspace", active="exact"),
                    dbc.NavLink([html.I(className="fa fa-robot me-2"), "MOTHER LLM"], href="/assistant", active="exact"),
                    dbc.NavLink([html.I(className="fa fa-brain me-2"), "MOTHER Reasoning"], href="/reasoning", active="exact"),
                    dbc.NavLink([html.I(className="fa fa-cubes me-2"), "CAD Studio"], href="/cad", active="exact"),
                    dbc.NavLink([html.I(className="fa fa-vr-cardboard me-2"), "Digital Twin"], href="/digital-twin", active="exact"),
                    dbc.NavLink([html.I(className="fa fa-gear me-2"), "Settings"], href="/settings", active="exact"),
                ],
                vertical=True,
                pills=True,
                className="px-2"
            ),
            html.Hr(className="my-3 mx-3"),
            html.Div(
                [
                    html.Div("Quick actions", className="text-uppercase text-muted", style={"fontSize": ".8rem"}),
                    dbc.Button([html.I(className="fa fa-wand-magic-sparkles me-2"), "Generate plan"], id="qa-generate-plan", color="primary", className="w-100 mt-2"),
                    dbc.Button([html.I(className="fa fa-file-code me-2"), "Draft ROS2 node"], id="qa-draft-ros2", color="secondary", className="w-100 mt-2"),
                ],
                className="px-3"
            ),
            html.Div(
                [
                    html.Div("Status", className="text-uppercase text-muted", style={"fontSize": ".8rem"}),
                    html.Div(id="status-chips", className="mt-2"),
                ],
                className="p-3"
            ),
        ],
        style={
            "height": "100vh",
            "position": "sticky",
            "top": 0,
            "overflowY": "auto",
            "borderRight": "1px solid rgba(255,255,255,0.08)"
        }
    )

def page_shell(content):
    return dbc.Container(content, fluid=True, className="py-4")

def card(title, body, footer=None):
    children = [dbc.CardHeader(html.Div(title, className="fw-semibold")), dbc.CardBody(body)]
    if footer is not None:
        children.append(dbc.CardFooter(footer))
    return dbc.Card(children, className="shadow-sm")

def monospace_block(text: str):
    return html.Pre(text or "", style={
        "whiteSpace": "pre-wrap",
        "fontFamily": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        "fontSize": ".9rem"
    })

# ----------------------------
# Pages
# ----------------------------
def overview_page():
    return page_shell([
        dbc.Row([
            dbc.Col(card(
                "Mission control",
                [
                    html.Div("Design, plan, and validate robotics systems with full traceability.", className="text-muted"),
                    html.Hr(),
                    dbc.Row([
                        dbc.Col(dbc.Button([html.I(className="fa fa-upload me-2"), "Add data to workspace"], href="/workspace", color="info", className="w-100")),
                        dbc.Col(dbc.Button([html.I(className="fa fa-brain me-2"), "Ask Reasoning"], href="/reasoning", color="primary", className="w-100")),
                        dbc.Col(dbc.Button([html.I(className="fa fa-cubes me-2"), "CAD Studio"], href="/cad", color="secondary", className="w-100")),
                    ], className="g-2"),
                ]
            ), md=7),
            dbc.Col(card(
                "Configuration",
                [
                    html.Div([pill("Enterprise API", "success" if (ENTERPRISE_API_URL and ENTERPRISE_API_KEY) else "secondary")]),
                    dbc.ListGroup([
                        dbc.ListGroupItem([html.Span("ENTERPRISE_API_URL", className="text-muted"), html.Br(), html.Code(ENTERPRISE_API_URL or "(not set)")]),
                        dbc.ListGroupItem([html.Span("MOTHER_LLM_URL", className="text-muted"), html.Br(), html.Code(MOTHER_LLM_URL or "(not set)")]),
                        dbc.ListGroupItem([html.Span("MOTHER_REASONING_URL", className="text-muted"), html.Br(), html.Code(MOTHER_REASONING_URL or "(not set)")]),
                    ], flush=True),
                ]
            ), md=5),
        ], className="g-3"),
        dbc.Row([
            dbc.Col(card(
                "What this dashboard can do",
                dbc.Accordion([
                    dbc.AccordionItem(
                        [
                            html.Ul([
                                html.Li("Workspace: upload logs/CSV, keep notes, track plan + code artifacts"),
                                html.Li("MOTHER LLM: code review, bug diagnosis, refactoring"),
                                html.Li("MOTHER Reasoning: structured robotics planning + constraints"),
                                html.Li("CAD Studio: generate OpenSCAD / FreeCAD scripts for parts and fixtures"),
                                html.Li("Digital Twin: submit sim/test jobs to your backend"),
                            ])
                        ],
                        title="Capabilities"
                    ),
                    dbc.AccordionItem(
                        [
                            html.P("Netlify runs the dashboard UI (Dash) as a serverless function. Heavy compute stays in your Node backend / GPU stack.", className="text-muted"),
                            html.Ul([
                                html.Li("Use Enterprise API: /mother/llm and /mother/reasoning"),
                                html.Li("Optionally add CAD render + Digital Twin endpoints for artifact generation"), 
                            ])
                        ],
                        title="Architecture"
                    )
                ], start_collapsed=True),
            ))
        ], className="g-3 mt-1"),
    ])

def workspace_page():
    upload = dcc.Upload(
        id="ws-upload",
        children=html.Div([html.I(className="fa fa-cloud-arrow-up me-2"), "Drag & drop or click to upload (CSV/JSON/TXT)"], className="text-muted"),
        style={
            "width": "100%", "height": "90px", "lineHeight": "90px", "borderWidth": "2px",
            "borderStyle": "dashed", "borderRadius": "14px", "textAlign": "center"
        },
        multiple=True,
    )

    return page_shell([
        dbc.Row([
            dbc.Col(card(
                "Workspace",
                [
                    html.Div("Everything here becomes part of the Context Pack that MOTHER can use for planning and debugging.", className="text-muted"),
                    html.Hr(),
                    upload,
                    html.Div(id="ws-upload-status", className="mt-3"),
                    html.Hr(),
                    dbc.Label("Notes (requirements, constraints, issues)"),
                    dbc.Textarea(id="ws-notes", placeholder="e.g., Robot must fit in 200x200x200mm, payload 1kg, uses ROS2 Humble...", style={"minHeight": "140px"}),
                    dbc.Button([html.I(className="fa fa-floppy-disk me-2"), "Save workspace"], id="ws-save", color="primary", className="mt-2"),
                ]
            ), md=6),
            dbc.Col(card(
                "Artifacts",
                [
                    dbc.Label("Current plan"), dbc.Textarea(id="ws-plan", style={"minHeight": "120px"}, placeholder="Plan output appears here…"),
                    html.Hr(),
                    dbc.Label("Current code"), dbc.Textarea(id="ws-code", style={"minHeight": "170px"}, placeholder="Paste or generate code here…"),
                    html.Hr(),
                    dbc.Label("CAD code"), dbc.Textarea(id="ws-cad-code", style={"minHeight": "140px"}, placeholder="OpenSCAD / FreeCAD script…"),
                    dbc.Row([
                        dbc.Col(dbc.Button([html.I(className="fa fa-download me-2"), "Download code"], id="ws-download-code", color="secondary", className="w-100 mt-2")),
                        dbc.Col(dbc.Button([html.I(className="fa fa-download me-2"), "Download CAD"], id="ws-download-cad", color="secondary", className="w-100 mt-2")),
                    ], className="g-2"),
                    dcc.Download(id="ws-download"),
                ]
            ), md=6),
        ], className="g-3"),
        dbc.Row([
            dbc.Col(card(
                "Uploaded data explorer",
                [
                    html.Div(id="ws-data-list", className="mb-2"),
                    html.Div(id="ws-data-preview"),
                ]
            ))
        ], className="g-3 mt-1"),
    ])

def assistant_page():
    return page_shell([
        dbc.Row([
            dbc.Col(card(
                "MOTHER LLM — Code & System Assistant",
                [
                    html.Div("Ask for refactors, bug diagnosis, documentation, ROS2 nodes, controller logic, etc.", className="text-muted"),
                    html.Hr(),
                    dbc.Label("Prompt"),
                    dbc.Textarea(id="llm-prompt", placeholder="E.g., Review my planner code and suggest fixes…", style={"minHeight": "140px"}),
                    dbc.Row([
                        dbc.Col(dbc.Input(id="llm-max", type="number", value=1200, min=200, max=4000, step=100)),
                        dbc.Col(dbc.Button([html.I(className="fa fa-paper-plane me-2"), "Send"], id="llm-send", color="primary", className="w-100")),
                    ], className="g-2 mt-2"),
                    dbc.Checklist(
                        id="llm-use-context",
                        options=[{"label": "Include Context Pack (workspace notes/data/plan/code)", "value": "yes"}],
                        value=["yes"],
                        className="mt-2"
                    ),
                    html.Hr(),
                    html.Div("Response", className="text-muted"),
                    html.Div(id="llm-output", className="mt-2"),
                ]
            ), md=7),
            dbc.Col(card(
                "Copilot actions",
                [
                    dbc.Button([html.I(className="fa fa-wand-magic-sparkles me-2"), "Generate integration checklist"], id="llm-checklist", color="secondary", className="w-100"),
                    dbc.Button([html.I(className="fa fa-code me-2"), "Draft ROS2 node"], id="llm-ros2", color="secondary", className="w-100 mt-2"),
                    dbc.Button([html.I(className="fa fa-shield-halved me-2"), "Safety review"], id="llm-safety", color="secondary", className="w-100 mt-2"),
                    html.Hr(),
                    html.Div("Tip: Use the Workspace page to store artifacts; then include Context Pack when chatting.", className="text-muted"),
                ]
            ), md=5),
        ], className="g-3")
    ])

def reasoning_page():
    return page_shell([
        dbc.Row([
            dbc.Col(card(
                "MOTHER Reasoning — Planning & Diagnostics",
                [
                    html.Div("Use structured reasoning for robotics planning, constraint checking, failure analysis, and test design.", className="text-muted"),
                    html.Hr(),
                    dbc.Label("Task"), dbc.Textarea(id="rs-task", style={"minHeight": "140px"}, placeholder="E.g., Produce a motion plan + risk analysis for pick-and-place…"),
                    dbc.Label("State (JSON)"), dbc.Textarea(id="rs-state", style={"minHeight": "140px"}, placeholder='{"robot": "arm", "payload_kg": 1.0, "workspace_mm": [300,300,200]}'),
                    dbc.Row([
                        dbc.Col(dbc.Button([html.I(className="fa fa-play me-2"), "Run reasoning"], id="rs-run", color="primary", className="w-100")),
                        dbc.Col(dbc.Button([html.I(className="fa fa-copy me-2"), "Save output to plan"], id="rs-save-to-plan", color="secondary", className="w-100")),
                    ], className="g-2 mt-2"),
                    html.Hr(),
                    html.Div("Result", className="text-muted"),
                    html.Div(id="rs-output", className="mt-2"),
                ]
            ), md=7),
            dbc.Col(card(
                "Test harness",
                [
                    html.Div("Generate test cases and acceptance criteria for Digital Twin runs.", className="text-muted"),
                    html.Hr(),
                    dbc.Button([html.I(className="fa fa-flask me-2"), "Generate test suite"], id="rs-tests", color="secondary", className="w-100"),
                    dbc.Button([html.I(className="fa fa-bug me-2"), "Failure analysis"], id="rs-failure", color="secondary", className="w-100 mt-2"),
                    html.Hr(),
                    html.Div("You can paste sim logs / telemetry into Workspace, then run Failure analysis with Context Pack.", className="text-muted"),
                ]
            ), md=5),
        ], className="g-3")
    ])

def cad_page():
    return page_shell([
        dbc.Row([
            dbc.Col(card(
                "CAD Studio — Parts, Fixtures, and Digital Twin Assets",
                [
                    html.Div("Generate CAD scripts you can review and render in your backend (OpenSCAD/FreeCAD).", className="text-muted"),
                    html.Hr(),
                    dbc.Label("Part brief"), dbc.Textarea(id="cad-brief", style={"minHeight": "140px"}, placeholder="E.g., Design a battery tray for 18650 cells with mounting holes…"),
                    dbc.Row([
                        dbc.Col(dbc.Select(
                            id="cad-format",
                            options=[
                                {"label": "OpenSCAD (.scad)", "value": "openscad"},
                                {"label": "FreeCAD Python macro (.py)", "value": "freecad_py"},
                            ],
                            value="openscad"
                        )),
                        dbc.Col(dbc.Button([html.I(className="fa fa-wand-magic-sparkles me-2"), "Generate CAD"], id="cad-generate", color="primary", className="w-100")),
                    ], className="g-2 mt-2"),
                    dbc.Checklist(
                        id="cad-use-context",
                        options=[{"label": "Include Context Pack", "value": "yes"}],
                        value=["yes"],
                        className="mt-2"
                    ),
                    html.Hr(),
                    dbc.Label("Generated CAD code"), dbc.Textarea(id="cad-code", style={"minHeight": "260px"}, placeholder="CAD code will appear here…"),
                    dbc.Row([
                        dbc.Col(dbc.Button([html.I(className="fa fa-download me-2"), "Download CAD script"], id="cad-download", color="secondary", className="w-100 mt-2")),
                        dbc.Col(dbc.Button([html.I(className="fa fa-cube me-2"), "Request render/convert"], id="cad-render", color="warning", className="w-100 mt-2")),
                    ], className="g-2"),
                    dcc.Download(id="cad-download-out"),
                    html.Div(id="cad-render-out", className="mt-2"),
                ]
            ), md=7),
            dbc.Col(card(
                "Guidance",
                [
                    html.Div("Suggested workflow", className="fw-semibold"),
                    html.Ul([
                        html.Li("Define requirements in Workspace (dims, loads, materials)"),
                        html.Li("Generate CAD script here"), 
                        html.Li("Render in backend (OpenSCAD/FreeCAD) to STL"), 
                        html.Li("Load STL into simulation / Digital Twin"),
                    ]),
                    html.Hr(),
                    html.Div("Backend integration", className="fw-semibold"),
                    html.Div("Set CAD_RENDER_URL to an endpoint that accepts {format, code} and returns a rendered asset or job id.", className="text-muted"),
                    html.Div(html.Code("CAD_RENDER_URL")),
                ]
            ), md=5),
        ], className="g-3")
    ])

def digital_twin_page():
    return page_shell([
        dbc.Row([
            dbc.Col(card(
                "Digital Twin — Simulation & Validation",
                [
                    html.Div("Submit simulation jobs (Isaac Sim, Gazebo, custom) to your backend. Store results back into Workspace.", className="text-muted"),
                    html.Hr(),
                    dbc.Label("Scenario"), dbc.Textarea(id="dt-scenario", style={"minHeight": "140px"}, placeholder="E.g., palletizing with 6DOF arm, random object poses, friction sweep…"),
                    dbc.Label("Parameters (JSON)"), dbc.Textarea(id="dt-params", style={"minHeight": "120px"}, placeholder='{"runs": 50, "seed": 42, "metrics": ["success_rate","time_s","collisions"]}'),
                    dbc.Row([
                        dbc.Col(dbc.Button([html.I(className="fa fa-rocket me-2"), "Submit job"], id="dt-submit", color="primary", className="w-100")),
                        dbc.Col(dbc.Button([html.I(className="fa fa-chart-line me-2"), "Analyze last result"], id="dt-analyze", color="secondary", className="w-100")),
                    ], className="g-2 mt-2"),
                    dbc.Checklist(
                        id="dt-use-context",
                        options=[{"label": "Include Context Pack", "value": "yes"}],
                        value=["yes"],
                        className="mt-2"
                    ),
                    html.Hr(),
                    html.Div("Backend response", className="text-muted"),
                    html.Div(id="dt-output", className="mt-2"),
                ]
            ), md=7),
            dbc.Col(card(
                "Integration notes",
                [
                    html.Div("Set DIGITAL_TWIN_URL to your backend endpoint.", className="text-muted"),
                    html.Div(html.Code("DIGITAL_TWIN_URL")),
                    html.Hr(),
                    html.Div("Recommended payload", className="fw-semibold"),
                    monospace_block(json.dumps({
                        "scenario": "...",
                        "params": {"runs": 50},
                        "context_pack": "(optional)",
                        "cad_assets": ["(optional urls/ids)"] 
                    }, indent=2)),
                ]
            ), md=5),
        ], className="g-3")
    ])

def settings_page():
    return page_shell([
        dbc.Row([
            dbc.Col(card(
                "Settings & API",
                [
                    html.Div("Configure endpoints via environment variables in Netlify.", className="text-muted"),
                    html.Hr(),
                    dbc.Table([
                        html.Thead(html.Tr([html.Th("Variable"), html.Th("Purpose")])),
                        html.Tbody([
                            html.Tr([html.Td(html.Code("ENTERPRISE_API_URL")), html.Td("Base URL for enterprise-api (Node)" )]),
                            html.Tr([html.Td(html.Code("ENTERPRISE_API_KEY")), html.Td("x-api-key for enterprise-api scopes (mother:llm, mother:reasoning)" )]),
                            html.Tr([html.Td(html.Code("MOTHER_LLM_URL")), html.Td("Direct LLM endpoint (optional)")]),
                            html.Tr([html.Td(html.Code("MOTHER_REASONING_URL")), html.Td("Direct Reasoning endpoint (optional)")]),
                            html.Tr([html.Td(html.Code("CAD_RENDER_URL")), html.Td("Render/convert CAD scripts (optional)")]),
                            html.Tr([html.Td(html.Code("DIGITAL_TWIN_URL")), html.Td("Submit simulation jobs (optional)")]),
                        ])
                    ], bordered=True, hover=True, responsive=True, size="sm"),
                    html.Hr(),
                    html.Div("Security", className="fw-semibold"),
                    html.Div("Do not expose API keys in the browser. This app calls your APIs server-side within Netlify Functions.", className="text-muted"),
                ]
            ))
        ])
    ])

app = dash.Dash(
    __name__,
    server=server,
    external_stylesheets=[dbc.themes.DARKLY, dbc.icons.FONT_AWESOME],
    meta_tags=[{"name": "viewport", "content": "width=device-width, initial-scale=1"}],
    suppress_callback_exceptions=True,
    title=APP_TITLE,
    update_title="Working...",
)


app.layout = dbc.Container(
    [
        dcc.Location(id="url", refresh=False),
        dcc.Store(id="ws-store", storage_type="session", data={"uploads": []}),
        dcc.Store(id="last-dt-result", storage_type="session"),
        dbc.Row(
            [
                dbc.Col(sidebar(), width=3),
                dbc.Col(html.Div(id="page-content"), width=9),
            ],
            className="g-0",
        ),
        dcc.Interval(id="status-tick", interval=4000, n_intervals=0),
    ],
    fluid=True,
    style={"maxWidth": "100%"},
)

# ----------------------------
# Routing
# ----------------------------
@app.callback(Output("page-content", "children"), Input("url", "pathname"))
def route(pathname):
    if pathname == "/":
        return overview_page()
    if pathname == "/workspace":
        return workspace_page()
    if pathname == "/assistant":
        return assistant_page()
    if pathname == "/reasoning":
        return reasoning_page()
    if pathname == "/cad":
        return cad_page()
    if pathname == "/digital-twin":
        return digital_twin_page()
    if pathname == "/settings":
        return settings_page()
    return page_shell([dbc.Alert("Page not found", color="warning")])

# ----------------------------
# Status chips
# ----------------------------
@app.callback(Output("status-chips", "children"), Input("status-tick", "n_intervals"))
def status_chips(_):
    chips = []
    chips.append(pill("LLM" if (MOTHER_LLM_URL or (ENTERPRISE_API_URL and ENTERPRISE_API_KEY)) else "LLM: not set", "success" if (MOTHER_LLM_URL or (ENTERPRISE_API_URL and ENTERPRISE_API_KEY)) else "secondary"))
    chips.append(pill("Reasoning" if (MOTHER_REASONING_URL or (ENTERPRISE_API_URL and ENTERPRISE_API_KEY)) else "Reasoning: not set", "success" if (MOTHER_REASONING_URL or (ENTERPRISE_API_URL and ENTERPRISE_API_KEY)) else "secondary"))
    chips.append(pill("CAD render" if CAD_RENDER_URL else "CAD render: off", "warning" if CAD_RENDER_URL else "secondary"))
    chips.append(pill("Digital Twin" if DIGITAL_TWIN_URL else "Digital Twin: off", "warning" if DIGITAL_TWIN_URL else "secondary"))
    return html.Div(chips)

# ----------------------------
# Workspace: upload + save + preview
# ----------------------------
def _decode_upload(contents: str) -> bytes:
    content_type, content_string = contents.split(',')
    return base64.b64decode(content_string)

@app.callback(
    Output("ws-upload-status", "children"),
    Output("ws-store", "data"),
    Input("ws-upload", "contents"),
    State("ws-upload", "filename"),
    State("ws-store", "data"),
    prevent_initial_call=True,
)
def handle_upload(list_of_contents, list_of_names, store):
    if not list_of_contents:
        return dash.no_update, store
    store = store or {"uploads": []}
    uploads = store.get("uploads", [])
    messages = []

    for contents, name in zip(list_of_contents, list_of_names):
        try:
            raw = _decode_upload(contents)
            kind = "txt"
            summary = ""
            preview = ""
            if name.lower().endswith(".csv"):
                kind = "csv"
                df = pd.read_csv(io.BytesIO(raw))
                summary = summarize_df(df)
                preview = df.head(25).to_dict(orient="records")
            elif name.lower().endswith(".json"):
                kind = "json"
                obj = json.loads(raw.decode("utf-8", errors="ignore"))
                preview = obj if isinstance(obj, list) else [obj]
                summary = "json keys: " + ", ".join(list(obj.keys())[:60]) if isinstance(obj, dict) else f"json list len: {len(obj)}"
            else:
                kind = "txt"
                txt = raw.decode("utf-8", errors="ignore")
                preview = txt[:2000]
                summary = f"chars: {len(txt)}"

            uploads.append({
                "name": name,
                "kind": kind,
                "summary": summary,
                "preview": preview,
                "ts": datetime.utcnow().isoformat() + "Z",
            })
            messages.append(dbc.Alert(f"Loaded {name}", color="success", dismissable=True))
        except Exception as e:
            messages.append(dbc.Alert(f"Failed to read {name}: {e}", color="danger", dismissable=True))

    store["uploads"] = uploads
    return html.Div(messages), store

@app.callback(
    Output("ws-data-list", "children"),
    Output("ws-data-preview", "children"),
    Input("ws-store", "data"),
)
def ws_preview(store):
    store = store or {}
    uploads = store.get("uploads", [])
    if not uploads:
        return dbc.Alert("No uploads yet. Add CSV/JSON/TXT to explore.", color="secondary"), html.Div()

    items = []
    for i, u in enumerate(reversed(uploads[-10:])):
        items.append(
            dbc.ListGroupItem(
                [
                    html.Div([html.Span(u.get("name"), className="fw-semibold"), html.Span(f"  ·  {u.get('kind')}", className="text-muted")]),
                    html.Div(u.get("summary", ""), className="text-muted", style={"fontSize": ".85rem"}),
                ]
            )
        )
    list_group = dbc.ListGroup(items, flush=True)

    latest = uploads[-1]
    if latest.get("kind") == "csv" and isinstance(latest.get("preview"), list):
        cols = []
        if latest["preview"]:
            cols = [{"name": k, "id": k} for k in latest["preview"][0].keys()]
        table = dash_table.DataTable(
            data=latest["preview"],
            columns=cols,
            page_size=10,
            style_table={"overflowX": "auto"},
            style_cell={"fontFamily": "inherit", "fontSize": "0.9rem", "backgroundColor": "rgba(0,0,0,0)", "color": "white"},
            style_header={"fontWeight": "bold"},
        )
        preview = table
    else:
        preview = card("Latest preview", monospace_block(str(latest.get("preview", ""))[:4000]))

    return list_group, preview

@app.callback(
    Output("ws-store", "data", allow_duplicate=True),
    Input("ws-save", "n_clicks"),
    State("ws-store", "data"),
    State("ws-notes", "value"),
    State("ws-plan", "value"),
    State("ws-code", "value"),
    State("ws-cad-code", "value"),
    prevent_initial_call=True,
)
def ws_save(_n, store, notes, plan, code, cad_code):
    store = store or {"uploads": []}
    store["notes"] = notes or ""
    store["plan"] = plan or ""
    store["code"] = code or ""
    store["cad_code"] = cad_code or ""
    return store

@app.callback(
    Output("ws-download", "data"),
    Input("ws-download-code", "n_clicks"),
    Input("ws-download-cad", "n_clicks"),
    State("ws-code", "value"),
    State("ws-cad-code", "value"),
    prevent_initial_call=True,
)
def ws_download(n_code, n_cad, code, cad_code):
    trig = callback_context.triggered[0]["prop_id"].split(".")[0]
    if trig == "ws-download-code":
        return dcc.send_string(code or "", filename="mother_robotics_code.txt")
    if trig == "ws-download-cad":
        return dcc.send_string(cad_code or "", filename="mother_robotics_part.scad")
    return dash.no_update

# ----------------------------
# Quick Actions
# ----------------------------
@app.callback(
    Output("url", "pathname", allow_duplicate=True),
    Output("ws-plan", "value", allow_duplicate=True),
    Input("qa-generate-plan", "n_clicks"),
    State("ws-store", "data"),
    prevent_initial_call=True,
)
def qa_generate_plan(_n, store):
    store = store or {}
    ctx = build_context_pack(store)
    task = "Generate a robotics development plan with milestones, risks, test plan, and integration steps. Use the context pack."
    res = call_mother_reasoning(task, state={"context_pack": ctx})
    text = json.dumps(res, indent=2) if isinstance(res, (dict, list)) else str(res)
    return "/workspace", text

@app.callback(
    Output("url", "pathname", allow_duplicate=True),
    Output("ws-code", "value", allow_duplicate=True),
    Input("qa-draft-ros2", "n_clicks"),
    State("ws-store", "data"),
    prevent_initial_call=True,
)
def qa_ros2(_n, store):
    store = store or {}
    ctx = build_context_pack(store)
    prompt = "Draft a ROS2 (Humble) Python node implementing a basic planner interface with clear TODOs for sensor input and actuator output. Include unit-test scaffolding."
    res = call_mother_llm(prompt, context_pack=ctx, max_tokens=1600)
    content = res.get("content") or res.get("response") or res.get("text") or json.dumps(res, indent=2)
    return "/workspace", content

# ----------------------------
# LLM Page callbacks
# ----------------------------
@app.callback(
    Output("llm-output", "children"),
    Input("llm-send", "n_clicks"),
    Input("llm-checklist", "n_clicks"),
    Input("llm-ros2", "n_clicks"),
    Input("llm-safety", "n_clicks"),
    State("llm-prompt", "value"),
    State("llm-max", "value"),
    State("llm-use-context", "value"),
    State("ws-store", "data"),
    prevent_initial_call=True,
)
def llm_actions(n_send, n_chk, n_ros, n_safe, prompt, max_tokens, use_ctx, store):
    trig = callback_context.triggered[0]["prop_id"].split(".")[0]
    store = store or {}
    context_pack = build_context_pack(store) if (use_ctx and "yes" in use_ctx) else None

    if trig == "llm-checklist":
        prompt = "Create an integration checklist for this robotics project: build, deploy, testing, safety, and production readiness."
    elif trig == "llm-ros2":
        prompt = "Draft a ROS2 node (Python) for the current robot plan. Add clear interfaces, topics, and parameterization."
    elif trig == "llm-safety":
        prompt = "Perform a safety review of the plan and code. Identify hazards, mitigations, and verification tests."

    if not prompt:
        return dbc.Alert("Add a prompt.", color="warning")
    res = call_mother_llm(prompt, context_pack=context_pack, max_tokens=int(max_tokens or 1200))
    if isinstance(res, dict) and res.get("error"):
        return dbc.Alert(res["error"], color="danger")
    content = (res.get("content") if isinstance(res, dict) else None) or (res.get("response") if isinstance(res, dict) else None) or (res.get("text") if isinstance(res, dict) else None)
    if not content:
        content = json.dumps(res, indent=2) if isinstance(res, (dict, list)) else str(res)
    return monospace_block(content)

# ----------------------------
# Reasoning callbacks
# ----------------------------
@app.callback(
    Output("rs-output", "children"),
    Input("rs-run", "n_clicks"),
    Input("rs-tests", "n_clicks"),
    Input("rs-failure", "n_clicks"),
    State("rs-task", "value"),
    State("rs-state", "value"),
    State("ws-store", "data"),
    prevent_initial_call=True,
)
def reasoning_actions(n_run, n_tests, n_fail, task, state_txt, store):
    trig = callback_context.triggered[0]["prop_id"].split(".")[0]
    store = store or {}
    ctx = build_context_pack(store)

    if trig == "rs-tests":
        task = "Generate a simulation test suite with acceptance criteria and metrics for the project described in the context pack."
        state = {"context_pack": ctx}
    elif trig == "rs-failure":
        task = "Analyze likely failure modes, debugging steps, and instrumentation based on the context pack and any uploaded logs."
        state = {"context_pack": ctx}
    else:
        state = {}
        if state_txt:
            try:
                state = json.loads(state_txt)
            except Exception:
                state = {"raw": state_txt}
        if task and len(task) < 10:
            task = task + "\n\nUse the context pack: \n" + ctx
        else:
            state = {**state, "context_pack": ctx}

    if not task:
        return dbc.Alert("Task required.", color="warning")
    res = call_mother_reasoning(task, state=state)
    if isinstance(res, dict) and res.get("error"):
        return dbc.Alert(res["error"], color="danger")
    return monospace_block(json.dumps(res, indent=2) if isinstance(res, (dict, list)) else str(res))

@app.callback(
    Output("ws-plan", "value", allow_duplicate=True),
    Input("rs-save-to-plan", "n_clicks"),
    State("rs-output", "children"),
    prevent_initial_call=True,
)
def rs_save_to_plan(_n, rs_out):
    # rs_out is a component; try to extract text from Pre
    try:
        if hasattr(rs_out, "children"):
            return rs_out.children
    except Exception:
        pass
    return ""

# ----------------------------
# CAD callbacks
# ----------------------------
@app.callback(
    Output("cad-code", "value"),
    Input("cad-generate", "n_clicks"),
    State("cad-brief", "value"),
    State("cad-format", "value"),
    State("cad-use-context", "value"),
    State("ws-store", "data"),
    prevent_initial_call=True,
)
def cad_generate(_n, brief, fmt, use_ctx, store):
    store = store or {}
    context_pack = build_context_pack(store) if (use_ctx and "yes" in use_ctx) else ""
    if not brief:
        return "// Provide a part brief first."
    if fmt == "openscad":
        task = (
            "Generate an OpenSCAD script for the described part. Use parametric variables, include comments, and ensure it is printable. "
            "Return ONLY the OpenSCAD code.\n\nPART BRIEF:\n" + brief + "\n\nCONTEXT PACK:\n" + context_pack
        )
        res = call_mother_llm(task, context_pack=None, max_tokens=1800)
    else:
        task = (
            "Generate a FreeCAD Python macro that builds the described part. Use parametric variables, name objects, and include comments. "
            "Return ONLY the Python code.\n\nPART BRIEF:\n" + brief + "\n\nCONTEXT PACK:\n" + context_pack
        )
        res = call_mother_llm(task, context_pack=None, max_tokens=1800)
    content = res.get("content") or res.get("response") or res.get("text") or ""
    if not content:
        content = json.dumps(res, indent=2) if isinstance(res, (dict, list)) else str(res)
    return content.strip()

@app.callback(
    Output("cad-download-out", "data"),
    Input("cad-download", "n_clicks"),
    State("cad-format", "value"),
    State("cad-code", "value"),
    prevent_initial_call=True,
)
def cad_download(_n, fmt, code):
    filename = "part.scad" if fmt == "openscad" else "part_freecad_macro.py"
    return dcc.send_string(code or "", filename=filename)

@app.callback(
    Output("cad-render-out", "children"),
    Input("cad-render", "n_clicks"),
    State("cad-format", "value"),
    State("cad-code", "value"),
    prevent_initial_call=True,
)
def cad_render(_n, fmt, code):
    if not CAD_RENDER_URL:
        return dbc.Alert("CAD_RENDER_URL not configured.", color="warning")
    try:
        res = _post_json(CAD_RENDER_URL, {"format": fmt, "code": code})
        return monospace_block(json.dumps(res, indent=2))
    except Exception as e:
        return dbc.Alert(f"Render failed: {e}", color="danger")

# ----------------------------
# Digital twin callbacks
# ----------------------------
@app.callback(
    Output("dt-output", "children"),
    Output("last-dt-result", "data"),
    Input("dt-submit", "n_clicks"),
    State("dt-scenario", "value"),
    State("dt-params", "value"),
    State("dt-use-context", "value"),
    State("ws-store", "data"),
    prevent_initial_call=True,
)
def dt_submit(_n, scenario, params_txt, use_ctx, store):
    if not DIGITAL_TWIN_URL:
        return dbc.Alert("DIGITAL_TWIN_URL not configured.", color="warning"), dash.no_update
    store = store or {}
    context_pack = build_context_pack(store) if (use_ctx and "yes" in use_ctx) else None
    params = {}
    if params_txt:
        try:
            params = json.loads(params_txt)
        except Exception:
            params = {"raw": params_txt}
    payload = {"scenario": scenario or "", "params": params, "context_pack": context_pack}
    try:
        res = _post_json(DIGITAL_TWIN_URL, payload)
        return monospace_block(json.dumps(res, indent=2)), res
    except Exception as e:
        return dbc.Alert(f"Submit failed: {e}", color="danger"), dash.no_update

@app.callback(
    Output("ws-notes", "value", allow_duplicate=True),
    Input("dt-analyze", "n_clicks"),
    State("last-dt-result", "data"),
    State("ws-store", "data"),
    prevent_initial_call=True,
)
def dt_analyze(_n, last, store):
    store = store or {}
    ctx = build_context_pack(store)
    if not last:
        return (store.get("notes") or "") + "\n\n(No digital twin result to analyze.)"
    prompt = "Analyze this digital twin result. Summarize key metrics, failures, and propose next experiments.\n\nRESULT:\n" + json.dumps(last) + "\n\nCONTEXT:\n" + ctx
    res = call_mother_llm(prompt, context_pack=None, max_tokens=1400)
    content = res.get("content") or res.get("response") or res.get("text") or json.dumps(res, indent=2)
    return (store.get("notes") or "") + "\n\n---\nDigital Twin Analysis\n" + content

if __name__ == "__main__":
    app.run_server(
        host="0.0.0.0",
        port=int(env("PORT", "8050")),
        debug=False,
    )


