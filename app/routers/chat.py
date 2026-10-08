import logging
from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models import SessionModel, MessageModel
from app.schemas import ChatRequest
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["Chat"])

@router.post("/stream")
async def stream_chat(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Streaming AI chat endpoint with multi-turn conversation memory.
    Saves user message, streams tokens in real-time from Gemini,
    and automatically persists the final assistant reply upon completion.
    """
    user_prompt = request.message.strip()
    if not user_prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt message cannot be empty."
        )

    # 1. Resolve or create session
    session = None
    if request.session_id:
        session = db.query(SessionModel).filter(SessionModel.id == request.session_id).first()

    is_new_session = False
    if not session:
        is_new_session = True
        # Auto-name session with first 30 chars
        initial_title = (user_prompt[:30] + "...") if len(user_prompt) > 30 else user_prompt
        session = SessionModel(title=initial_title.replace("\n", " ").strip())
        db.add(session)
        db.commit()
        db.refresh(session)
    elif session.title in ["New Chat", "Obrolan Baru"]:
        # Rename session if it's currently the default title
        new_title = (user_prompt[:30] + "...") if len(user_prompt) > 30 else user_prompt
        session.title = new_title.replace("\n", " ").strip()
        db.commit()
        db.refresh(session)

    session_id = session.id
    session_title = session.title

    # 2. Fetch existing session history before adding the new message
    past_messages = (
        db.query(MessageModel)
        .filter(MessageModel.session_id == session_id)
        .order_by(MessageModel.id.asc())
        .all()
    )
    history: List[Dict[str, str]] = [
        {"role": m.role, "content": m.content} for m in past_messages
    ]

    # 3. Persist user message to SQLite
    user_message = MessageModel(
        session_id=session_id,
        role="user",
        content=user_prompt
    )
    db.add(user_message)
    db.commit()

    # 4. Asynchronous generator that streams chunks and accumulates final response
    async def response_generator():
        accumulated_chunks = []
        try:
            async for token in ai_service.stream_chat(history=history, user_prompt=user_prompt):
                accumulated_chunks.append(token)
                yield token
        except Exception as exc:
            logger.exception("Error during response streaming: %s", exc)
            yield f"\n\n[Stream interrupted: {str(exc)}]"
        finally:
            full_response = "".join(accumulated_chunks).strip()
            if full_response:
                # Open isolated DB session for background persistence
                save_db = SessionLocal()
                try:
                    assistant_message = MessageModel(
                        session_id=session_id,
                        role="assistant",
                        content=full_response
                    )
                    save_db.add(assistant_message)
                    save_db.commit()
                    logger.info("Successfully persisted assistant response for session %s", session_id)
                except Exception as save_err:
                    save_db.rollback()
                    logger.error("Failed to persist assistant response: %s", save_err)
                finally:
                    save_db.close()

    response_headers = {
        "X-Session-Id": session_id,
        "X-Session-Title": session_title,
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Expose-Headers": "X-Session-Id, X-Session-Title",
    }

    return StreamingResponse(
        response_generator(),
        media_type="text/plain; charset=utf-8",
        headers=response_headers,
    )

