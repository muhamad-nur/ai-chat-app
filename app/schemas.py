from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class ChatRequest(BaseModel):
    session_id: Optional[str] = Field(None, description="Optional UUID of the existing session. If omitted, a new session is created.")
    message: str = Field(..., min_length=1, description="User prompt or question to the AI assistant.")

class SessionCreate(BaseModel):
    title: Optional[str] = Field(default="New Chat", description="Title of the conversation session.")

class SessionUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Updated title of the conversation session.")

class MessageResponse(BaseModel):
    id: int
    session_id: str
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    message_count: int = 0
    last_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SessionDetailResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    messages: List[MessageResponse] = []

    model_config = ConfigDict(from_attributes=True)

