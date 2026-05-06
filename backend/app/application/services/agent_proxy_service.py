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
        llm_api_key: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream SSE events from Agent BE.

        Yields raw SSE lines so the caller can forward them directly.
        On connection/timeout errors, yields an SSE error line instead.
        """
        client = self._get_client()
        url = f"{self._base_url}/api/chat/stream"
        headers = {
            "X-API-Key": self._api_key,
            "X-LLM-API-Key": llm_api_key or "",
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

    async def validate_key(self, llm_api_key: str, timeout: int = 20) -> Dict[str, Any]:
        """Validate an LLM API key via Agent BE's /api/validate-key endpoint."""
        url = f"{self._base_url}/api/validate-key"
        headers = {
            "X-API-Key": self._api_key,
            "X-LLM-API-Key": llm_api_key,
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(connect=5.0, read=float(timeout), write=5.0, pool=5.0)) as client:
                resp = await client.post(url, headers=headers)
                resp.raise_for_status()
                return resp.json()
        except httpx.ConnectError as exc:
            logger.error("Cannot connect to Agent BE for key validation: %s", exc)
            return {"valid": False, "reason": "agent_unreachable"}
        except httpx.ReadTimeout:
            logger.warning("Key validation timed out (timeout=%ds)", timeout)
            raise  # Let caller retry
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            logger.error("Key validation returned %s", status)
            if status == 401:
                return {"valid": False, "reason": "agent_auth_failed"}
            return {"valid": False, "reason": "error", "detail": f"Agent BE returned HTTP {status}"}
        except Exception as exc:
            logger.error("Key validation failed: %s", exc)
            return {"valid": False, "reason": "error", "detail": str(exc)[:200]}


def _sse_error(message: str) -> str:
    return f"data: {json.dumps({'type': 'error', 'content': message})}\n\n"


# Module-level singleton for reuse across requests
_proxy: Optional[AgentProxyService] = None


def get_proxy() -> AgentProxyService:
    global _proxy
    if _proxy is None:
        _proxy = AgentProxyService()
    return _proxy
