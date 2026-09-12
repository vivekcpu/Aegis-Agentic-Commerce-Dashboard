import httpx
from app.config import settings


class BackendClient:
    """
    Thin wrapper around the  Node backend's REST API. Every
    guardrail check, DB write, Razorpay call, and ledger entry happens
    over there -- this class exists so the LangGraph graph never talks
    to Postgres or Razorpay directly for anything transactional, keeping
    exactly one source of truth for "did this order actually happen."
    """

    def __init__(self, base_url: str = settings.backend_url):
        self.base_url = base_url

    async def create_order(self, payload: dict, correlation_id: str) -> tuple[int, dict]:
        """
        Calls POST /api/orders. Forwards the same correlation ID the
        LangGraph run is using, so one request can be traced through
        both services' logs as a single thread -- this is the
        cross-service half of context.md's observability requirement.

        Returns (status_code, body) rather than raising on non-2xx,
        because a 4xx guardrail rejection is an expected, valid outcome
        this function's caller (the LangGraph graph) needs to branch on
        -- not an exceptional case.
        """
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/orders",
                json=payload,
                headers={"x-correlation-id": correlation_id},
            )
            try:
                body = resp.json()
            except ValueError:
                body = {"error": {"code": "BAD_RESPONSE", "message": resp.text}}
            return resp.status_code, body


backend_client = BackendClient()
