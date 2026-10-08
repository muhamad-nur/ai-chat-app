from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import SessionModel, MessageModel
from app.schemas import (
    SessionResponse,
    SessionDetailResponse,
    SessionCreate,
    SessionUpdate,
    MessageResponse,
)

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

@router.get("", response_model=List[SessionResponse])
def get_sessions(db: Session = Depends(get_db)):
    """Fetch all chat sessions ordered by creation date (newest first)."""
    sessions = db.query(SessionModel).order_by(SessionModel.created_at.desc()).all()
    results = []
    for s in sessions:
        msg_count = db.query(func.count(MessageModel.id)).filter(MessageModel.session_id == s.id).scalar() or 0
        last_msg = (
            db.query(MessageModel)
            .filter(MessageModel.session_id == s.id)
            .order_by(MessageModel.created_at.desc())
            .first()
        )
        preview = None
        if last_msg:
            preview = (last_msg.content[:60] + "...") if len(last_msg.content) > 60 else last_msg.content

        results.append(
            SessionResponse(
                id=s.id,
                title=s.title,
                created_at=s.created_at,
                message_count=msg_count,
                last_message=preview,
            )
        )
    return results

@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(data: SessionCreate = None, db: Session = Depends(get_db)):
    """Create a new chat session."""
    title = data.title if (data and data.title) else "Obrolan Baru"
    new_session = SessionModel(title=title)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return SessionResponse(
        id=new_session.id,
        title=new_session.title,
        created_at=new_session.created_at,
        message_count=0,
        last_message=None,
    )

@router.get("/{session_id}/messages", response_model=List[MessageResponse])
def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    """Fetch all messages in chronological order for a specific session."""
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID '{session_id}' not found."
        )

    messages = (
        db.query(MessageModel)
        .filter(MessageModel.session_id == session_id)
        .order_by(MessageModel.id.asc())
        .all()
    )
    return messages

@router.patch("/{session_id}", response_model=SessionResponse)
def update_session(session_id: str, data: SessionUpdate, db: Session = Depends(get_db)):
    """Update a session's title."""
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID '{session_id}' not found."
        )
    session.title = data.title.strip()
    db.commit()
    db.refresh(session)
    msg_count = db.query(func.count(MessageModel.id)).filter(MessageModel.session_id == session.id).scalar() or 0
    return SessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        message_count=msg_count,
        last_message=None,
    )

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a chat session and all its associated messages."""
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID '{session_id}' not found."
        )
    db.delete(session)
    db.commit()
    return None

