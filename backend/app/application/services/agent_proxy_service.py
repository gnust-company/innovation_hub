"""Agent proxy service — streams SSE from Agent BE via httpx."""
import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class AgentProxyService:
    """Manages HTTP connection to Agent BE and streams SSE responses."""

    def __init__(self) -> None:
        settings = get_settings()
        self._base_url = settings.agent_base_url.rstrip("/")
        self._api_key = settings.agent_api_key
        self._timeout = httpx.Timeout(
            connect=10.0,
            read=settings.agent_timeout,
            write=10.0,
            pool=10.0,
        )
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self._timeout)
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        thread_id: Optional[str] = None,
        user_metadata: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream SSE events from Agent BE.

        Yields raw SSE lines so the caller can forward them directly.
        On connection/timeout errors, yields an SSE error line instead.
        """
        client = self._get_client()
        url = f"{self._base_url}/api/chat/stream"
        headers = {
            "X-API-Key": self._api_key,
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }
        body = {
            "messages": messages,
            "thread_id": thread_id or "",
            "user_metadata": user_metadata or {},
        }

        try:
            async with client.stream("POST", url, json=body, headers=headers) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    logger.error(
                        "Agent BE returned %s: %s",
                        response.status_code,
                        error_body.decode(errors="replace"),
                    )
                    yield _sse_error(f"Agent service error: HTTP {response.status_code}")
                    return

                async for line in response.aiter_lines():
                    if line:  # skip empty lines
                        yield line + "\n"

        except httpx.ConnectError as exc:
            logger.error("Cannot connect to Agent BE at %s: %s", url, exc)
            yield _sse_error("Agent service is unavailable. Please try again later.")
        except httpx.ReadTimeout as exc:
            logger.error("Agent BE timed out: %s", exc)
            yield _sse_error("Agent service timed out. Please try again.")


def _sse_error(message: str) -> str:
    return f"data: {json.dumps({'type': 'error', 'content': message})}\n\n"
