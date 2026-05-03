"""Chat endpoints."""
import json
import logging
from typing import AsyncGenerator, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from app.application.dto.chat_dto import (
    CreateSessionDTO,
    MessageResponseDTO,
    RenameSessionDTO,
    SendMessageDTO,
    SessionResponseDTO,
)
from app.application.services.agent_proxy_service import AgentProxyService
from app.application.services.chat_session_service import ChatSessionService
from app.domain.entities.chat_message import ChatMessage
from app.domain.value_objects.chat_role import ChatRole
from app.infrastructure.database.repositories.chat_session_repository_impl import SQLChatSessionRepository
from app.infrastructure.database.repositories.chat_message_repository_impl import SQLChatMessageRepository
from app.infrastructure.security.jwt import get_current_active_user, UserResponseDTO
from app.infrastructure.web.api import deps

logger = logging.getLogger(__name__)

router = APIRouter()
service = ChatSessionService()


@router.post("/sessions", response_model=SessionResponseDTO, status_code=status.HTTP_201_CREATED)
async def create_session(
    data: CreateSessionDTO,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    session_repo: SQLChatSessionRepository = Depends(deps.get_chat_session_repo),
):
    """Create a new chat session."""
    return await service.create_session(session_repo, current_user.id, data.title)


@router.get("/sessions", response_model=List[SessionResponseDTO])
async def list_sessions(
    current_user: UserResponseDTO = Depends(get_current_active_user),
    session_repo: SQLChatSessionRepository = Depends(deps.get_chat_session_repo),
):
    """List current user's chat sessions."""
    return await service.list_sessions(session_repo, current_user.id)


@router.patch("/sessions/{session_id}", response_model=SessionResponseDTO)
async def rename_session(
    session_id: UUID,
    data: RenameSessionDTO,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    session_repo: SQLChatSessionRepository = Depends(deps.get_chat_session_repo),
):
    """Rename a chat session."""
    return await service.rename_session(session_repo, session_id, current_user.id, data.title)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: UUID,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    session_repo: SQLChatSessionRepository = Depends(deps.get_chat_session_repo),
):
    """Delete a chat session (cascade deletes messages)."""
    await service.delete_session(session_repo, session_id, current_user.id)
    return None


@router.get("/sessions/{session_id}/messages", response_model=List[MessageResponseDTO])
async def get_messages(
    session_id: UUID,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    session_repo: SQLChatSessionRepository = Depends(deps.get_chat_session_repo),
    message_repo: SQLChatMessageRepository = Depends(deps.get_chat_message_repo),
):
    """Get message history for a session."""
    return await service.get_messages(session_repo, message_repo, session_id, current_user.id)


@router.post("/sessions/{session_id}/message")
async def send_message(
    session_id: UUID,
    data: SendMessageDTO,
    request: Request,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    session_repo: SQLChatSessionRepository = Depends(deps.get_chat_session_repo),
    message_repo: SQLChatMessageRepository = Depends(deps.get_chat_message_repo),
    agent_proxy: AgentProxyService = Depends(deps.get_agent_proxy_service),
):
    """Send a message and stream the AI response via SSE."""
    # 1. Verify session ownership
    session = await session_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if not session.is_owned_by(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")

    # 2. Save user message (always, even if agent fails)
    await service.save_message(
        message_repo, session_id, ChatRole.USER, data.content
    )

    # 3. Load full conversation history
    messages = await message_repo.list_by_session(session_id)
    agent_messages = [{"role": m.role.value, "content": m.content} for m in messages]

    # 4. SSE generator — proxies Agent BE stream, saves assistant msg after done
    async def sse_generator() -> AsyncGenerator[str, None]:
        collected_parts: list[str] = []
        collected_sources = None
        db_config = request.app.state.db_config

        try:
            async for line in agent_proxy.stream_chat(
                messages=agent_messages,
                thread_id=str(session_id),
                user_metadata={
                    "user_id": str(current_user.id),
                    "username": current_user.username,
                    "role": current_user.role.value,
                },
            ):
                if await request.is_disconnected():
                    logger.info("Client disconnected during stream for session %s", session_id)
                    break

                # Forward line immediately (add \n since aiter_lines strips it)
                yield line + "\n"

                # Parse for bookkeeping
                if line.startswith("data: "):
                    try:
                        payload = json.loads(line[6:])
                        event_type = payload.get("type")

                        if event_type == "token":
                            content = payload.get("content", "")
                            if content:
                                collected_parts.append(content)
                        elif event_type == "sources":
                            collected_sources = payload.get("files")
                        elif event_type == "done":
                            full_content = "".join(collected_parts)
                            if full_content:
                                try:
                                    async with db_config.session_maker() as db_session:
                                        msg_repo = SQLChatMessageRepository(db_session)
                                        msg = ChatMessage(
                                            session_id=session_id,
                                            role=ChatRole.ASSISTANT,
                                            content=full_content,
                                            sources={"files": collected_sources} if collected_sources else None,
                                        )
                                        await msg_repo.save(msg)
                                except Exception as exc:
                                    logger.error(
                                        "Failed to save assistant message for session %s: %s",
                                        session_id, exc,
                                    )
                    except (json.JSONDecodeError, TypeError):
                        pass  # malformed data line — skip

        except Exception as exc:
            logger.error("Unexpected error in SSE generator: %s", exc)
            yield f"data: {json.dumps({'type': 'error', 'content': 'Internal streaming error'})}\n\n"

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
