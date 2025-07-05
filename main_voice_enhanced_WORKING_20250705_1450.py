from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
import os
import tempfile
from datetime import datetime
from typing import Optional, Dict, Any
import openai
from dotenv import load_dotenv
import aiofiles

# Import our voice processor
from voice_processor_simple import VoiceProcessor

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Chief of Staff Agent - Voice Enhanced",
    description="AI-powered Chief of Staff with voice capabilities",
    version="3.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
voice_processor = VoiceProcessor()

# Initialize OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
AGENT_NAME = os.getenv("AGENT_NAME", "Chief of Staff")
AGENT_PERSONALITY = os.getenv("AGENT_PERSONALITY", "professional, strategic, and supportive")

# Pydantic models for requests
class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None

# System prompt for the Chief of Staff
SYSTEM_PROMPT = f"""You are an AI {AGENT_NAME}. Your personality is {AGENT_PERSONALITY}.

Your core responsibilities include:
1. Cost tracking and budget management
2. Project health monitoring and risk assessment  
3. Knowledge management and information retrieval
4. Team coordination and workflow optimization
5. Strategic planning and decision support
6. Escalation management and guardrail enforcement

Current system status:
- Cost tracking: Monthly spend $12,450 / Budget $15,000 (83% utilization)
- Project health: 3 projects total, 2 on track, 1 at risk
- Team status: All AI team members operational

Guidelines:
- Be proactive in identifying risks and opportunities
- Provide clear, actionable recommendations
- Maintain transparency in your reasoning process
- Escalate critical issues appropriately
- Balance efficiency with thoroughness
- Support team productivity and well-being
- When responding to voice messages, be conversational but professional
- Keep voice responses concise but informative

Always respond in a professional, helpful manner while being strategic and forward-thinking.
"""

async def get_ai_response(message: str, context: Optional[Dict] = None) -> str:
    """Get AI response from OpenAI"""
    try:
        # Check if API key is configured
        if not openai.api_key or openai.api_key == "your_openai_api_key_here":
            return f"Hello! I'm your {AGENT_NAME} agent. I'm currently running in demo mode since no OpenAI API key is configured. I can still help you with basic information about cost tracking (current: $12,450/$15,000 budget) and project health (2 projects on track, 1 at risk). To enable full AI capabilities, please add your OpenAI API key to the .env file."
        
        # Prepare context information
        context_info = ""
        if context:
            context_info = f"\nAdditional context: {context}"
        
        # Create the chat completion
        response = openai.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"{message}{context_info}"}
            ],
            temperature=OPENAI_TEMPERATURE,
            max_tokens=1000
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        return f"I apologize, but I encountered an error processing your request: {str(e)}. I'm still available for basic status updates and can help with cost tracking and project health information."

# ===== EXISTING ENDPOINTS =====

@app.get("/")
async def root():
    return {
        "message": f"{AGENT_NAME} Agent - Voice Enhanced",
        "version": "3.0.0",
        "status": "operational",
        "ai_enabled": bool(openai.api_key and openai.api_key != "your_openai_api_key_here"),
        "voice_enabled": True,
        "model": OPENAI_MODEL,
        "capabilities": [
            "AI-powered conversations",
            "Voice input (Speech-to-Text)",
            "Voice output (Text-to-Speech)",
            "Cost tracking and budget management",
            "Project health monitoring",
            "Strategic planning assistance",
            "Risk assessment and recommendations"
        ],
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    voice_status = voice_processor.get_voice_status()
    return {
        "status": "healthy",
        "agent": f"{AGENT_NAME} (Voice Enhanced)",
        "ai_status": "enabled" if (openai.api_key and openai.api_key != "your_openai_api_key_here") else "demo_mode",
        "voice_status": voice_status,
        "model": OPENAI_MODEL,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/dashboard")
async def get_dashboard():
    voice_status = voice_processor.get_voice_status()
    return {
        "cost_tracking": {
            "total_monthly_spend": 12450.00,
            "monthly_budget": 15000.00,
            "budget_utilization": 0.83,
            "status": "under_budget",
            "top_categories": [
                {"category": "AI API Calls", "amount": 4200.00},
                {"category": "Cloud Infrastructure", "amount": 3800.00},
                {"category": "Data Storage", "amount": 2100.00}
            ]
        },
        "project_health": {
            "overall_status": "healthy",
            "total_projects": 3,
            "projects_on_track": 2,
            "projects_at_risk": 1,
            "average_health_score": 0.78
        },
        "ai_status": {
            "model": OPENAI_MODEL,
            "enabled": bool(openai.api_key and openai.api_key != "your_openai_api_key_here"),
            "conversations_today": 0
        },
        "voice_status": voice_status,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/chat")
async def chat_with_cos(request: ChatRequest):
    """Main chat interface for AI-powered conversations"""
    try:
        ai_response = await get_ai_response(request.message, request.context)
        
        return {
            "response": ai_response,
            "timestamp": datetime.now().isoformat(),
            "agent": AGENT_NAME,
            "model_used": OPENAI_MODEL
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/quick-chat")
async def quick_chat(message: str = Query(..., description="Your message to the Chief of Staff")):
    """Simple chat endpoint for quick questions via URL parameters"""
    try:
        ai_response = await get_ai_response(message)
        return {
            "question": message,
            "response": ai_response,
            "timestamp": datetime.now().isoformat(),
            "agent": AGENT_NAME,
            "model": OPENAI_MODEL
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ai-status")
async def get_ai_status():
    """Get current AI configuration status"""
    voice_status = voice_processor.get_voice_status()
    return {
        "openai_configured": bool(openai.api_key and openai.api_key != "your_openai_api_key_here"),
        "model": OPENAI_MODEL,
        "temperature": OPENAI_TEMPERATURE,
        "agent_name": AGENT_NAME,
        "personality": AGENT_PERSONALITY,
        "system_prompt_length": len(SYSTEM_PROMPT),
        "voice_capabilities": voice_status,
        "timestamp": datetime.now().isoformat()
    }

# ===== NEW VOICE ENDPOINTS =====

@app.post("/voice/speech-to-text")
async def speech_to_text(audio: UploadFile = File(...)):
    """Convert uploaded audio to text using Whisper"""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await audio.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Process with Whisper
        result = await voice_processor.speech_to_text(temp_file_path)
        
        # Clean up temp file
        os.unlink(temp_file_path)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/text-to-speech")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech using ElevenLabs"""
    try:
        result = await voice_processor.text_to_speech(
            text=request.text,
            output_path=None
        )
        
        if result["success"]:
            return {
                "success": True,
                "audio_url": f"/voice/audio/{os.path.basename(result['audio_path'])}",
                "text": request.text
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/conversation")
async def voice_conversation(audio: UploadFile = File(...)):
    """Complete voice conversation: Speech -> AI -> Speech"""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await audio.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Step 1: Speech to text
        stt_result = await voice_processor.speech_to_text(temp_file_path)
        
        # Clean up temp file
        os.unlink(temp_file_path)
        
        if not stt_result["success"]:
            raise HTTPException(status_code=500, detail=f"Speech recognition failed: {stt_result['error']}")
        
        user_text = stt_result["text"]
        
        # Step 2: Get AI response
        ai_response = await get_ai_response(user_text)
        
        # Step 3: Convert AI response to speech
        tts_result = await voice_processor.text_to_speech(ai_response)
        
        return {
            "user_text": user_text,
            "ai_response": ai_response,
            "audio_response_url": f"/voice/audio/{os.path.basename(tts_result['audio_path'])}" if tts_result["success"] else None,
            "stt_success": stt_result["success"],
            "tts_success": tts_result["success"],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/voice/audio/{filename}")
async def get_audio_file(filename: str):
    """Serve audio files"""
    try:
        file_path = os.path.join(voice_processor.temp_dir, filename)
        if os.path.exists(file_path):
            return FileResponse(file_path, media_type="audio/mpeg")
        else:
            raise HTTPException(status_code=404, detail="Audio file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/voice/status")
async def get_voice_status():
    """Get voice processing capabilities status"""
    return voice_processor.get_voice_status()

@app.post("/voice/cleanup")
async def cleanup_audio_files(max_age_hours: int = 24):
    """Clean up old audio files"""
    result = await voice_processor.cleanup_old_files(max_age_hours)
    return result

if __name__ == "__main__":
    print(f"Starting {AGENT_NAME} Agent with Voice capabilities on http://localhost:8001" )
    print(f"AI Status: {'Enabled' if (openai.api_key and openai.api_key != 'your_openai_api_key_here') else 'Demo Mode'}")
    print(f"Voice Status: Whisper (STT) + ElevenLabs (TTS)")
    print("Press Ctrl+C to stop")
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="info")
