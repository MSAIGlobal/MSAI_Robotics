"""
IntuiTV Pipeline API Service
FastAPI endpoints for Text-to-TV generation
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncio
import json

from .pipeline import pipeline, broadcast_router, GenerationJob, JobStatus
from ..inference.node import node_manager, auto_trainer
from ..models.registry import registry, PipelineStage

app = FastAPI(
    title="IntuiTV Text-to-TV API",
    description="Generate complete TV episodes from text prompts",
    version="1.0.0",
)

# ============================================
# REQUEST/RESPONSE MODELS
# ============================================

class GenerateRequest(BaseModel):
    prompt: str = Field(..., description="Text prompt for episode generation")
    user_id: str = Field(..., description="User identifier")
    session_id: str = Field(..., description="Session identifier")
    duration_minutes: int = Field(60, ge=5, le=120, description="Episode duration in minutes")
    genre: Optional[str] = Field(None, description="Episode genre")
    target_channel: Optional[str] = Field(None, description="Broadcast channel")
    
class JobResponse(BaseModel):
    job_id: str
    viewer_uid: str
    status: str
    progress: float
    created_at: str
    message: Optional[str] = None

class StreamInfo(BaseModel):
    uid: str
    channel: str
    hls_manifest: str
    status: str

# ============================================
# GENERATION ENDPOINTS
# ============================================

@app.post("/api/v1/generate", response_model=JobResponse)
async def create_episode(request: GenerateRequest):
    """Create a new TV episode from a text prompt"""
    job = await pipeline.create_episode(
        prompt=request.prompt,
        user_id=request.user_id,
        session_id=request.session_id,
        duration_minutes=request.duration_minutes,
        genre=request.genre,
        target_channel=request.target_channel,
    )
    
    return JobResponse(
        job_id=job.job_id,
        viewer_uid=job.viewer_uid.uid,
        status=job.status.value,
        progress=job.progress,
        created_at=job.created_at.isoformat(),
        message="Episode generation started",
    )

@app.get("/api/v1/jobs/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str):
    """Get status of a generation job"""
    job = pipeline.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobResponse(
        job_id=job.job_id,
        viewer_uid=job.viewer_uid.uid,
        status=job.status.value,
        progress=job.progress,
        created_at=job.created_at.isoformat(),
        message=job.error,
    )

@app.get("/api/v1/jobs/{job_id}/stream")
async def stream_job_updates(job_id: str):
    """Stream real-time job updates via SSE"""
    async def event_stream():
        while True:
            job = pipeline.get_job_status(job_id)
            if not job:
                yield f"data: {json.dumps({'error': 'Job not found'})}\n\n"
                break
            
            data = {
                "job_id": job.job_id,
                "status": job.status.value,
                "progress": job.progress,
            }
            yield f"data: {json.dumps(data)}\n\n"
            
            if job.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                break
            
            await asyncio.sleep(1)
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
    )

@app.get("/api/v1/users/{user_id}/jobs")
async def get_user_jobs(user_id: str):
    """Get all jobs for a user"""
    jobs = pipeline.get_user_jobs(user_id)
    return [
        JobResponse(
            job_id=j.job_id,
            viewer_uid=j.viewer_uid.uid,
            status=j.status.value,
            progress=j.progress,
            created_at=j.created_at.isoformat(),
        )
        for j in jobs
    ]

# ============================================
# BROADCAST ENDPOINTS
# ============================================

@app.get("/api/v1/stream/{uid}", response_model=StreamInfo)
async def get_stream_info(uid: str):
    """Get stream information for a viewer UID"""
    stream = broadcast_router.get_viewer_stream(uid)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    return StreamInfo(
        uid=uid,
        channel=stream["channel"],
        hls_manifest=stream["manifest"],
        status="active",
    )

# ============================================
# MODEL MANAGEMENT ENDPOINTS
# ============================================

@app.get("/api/v1/models")
async def list_models():
    """List all available models"""
    return {
        "teachers": {k: {"name": v.name, "stage": v.stage.value, "active": v.is_active} 
                     for k, v in registry.teachers.items()},
        "students": {k: {"name": v.name, "stage": v.stage.value, "score": v.performance_score}
                     for k, v in registry.students.items()},
    }

@app.get("/api/v1/models/active")
async def get_active_models():
    """Get currently active model for each pipeline stage"""
    active = {}
    for stage in PipelineStage:
        model = registry.get_active_model(stage)
        if model:
            active[stage.value] = {
                "name": model.name,
                "role": model.role.value,
                "score": model.performance_score,
            }
    return active

@app.post("/api/v1/models/{model_name}/feedback")
async def submit_model_feedback(model_name: str, score: float):
    """Submit performance feedback for a model"""
    auto_trainer.log_performance(model_name, score)
    return {"status": "recorded", "model": model_name, "score": score}

# ============================================
# INFERENCE NODE ENDPOINTS
# ============================================

@app.get("/api/v1/nodes")
async def get_node_status():
    """Get status of all inference nodes"""
    return node_manager.get_status()

@app.get("/api/v1/training/queue")
async def get_training_queue():
    """Get pending training jobs"""
    return auto_trainer.get_pending_training()

# ============================================
# HEALTH CHECK
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_jobs": len(pipeline.active_jobs),
        "nodes_ready": sum(1 for n in node_manager.nodes.values() if n.status.value == "ready"),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
