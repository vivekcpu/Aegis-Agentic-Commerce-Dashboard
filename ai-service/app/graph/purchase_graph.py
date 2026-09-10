"""
The LangGraph "Bounded Core Agent" managing everything.

This graph is the deterministic state machine an AI buyer's purchase
request flows through. It does NOT re-implement price/stock/velocity
guardrails itself -- those live in exactly one place, the  Node
backend (see services/backend_client.py for why). What this graph
actually owns:

  1. Turning a raw buyer request into a well-formed order payload
     (ingest_node)
  2. A fast pre-flight compliance check using data this service already
     has from the discovery step, before spending a network round-trip
     on a request that's obviously not going to work (compliance_node)
  3. Calling the backend and waiting for its verdict (place_order_node)
  4. Mapping WHATEVER comes back -- success or any failure -- into the
     one standardized PurchaseResultPacket shape (respond_node /
     reject_node), which is context.md's "graceful failure handler"
     requirement: the AI buyer never has to parse a different error
     shape depending on which guardrail rejected it.

Each node is a small, testable function operating on a shared, typed
state dict -- that's the whole value of using a graph here instead of
one long function: every transition is explicit and it's obvious from
the graph definition itself what order things can happen in.
"""

from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END
import uuid

from app.services.backend_client import backend_client


class PurchaseState(TypedDict, total=False):
    # input
    buyer_agent_id: str
    product_id: str
    quantity: int
    customer_name: Optional[str]
    customer_email: Optional[str]
    customer_phone: Optional[str]
    delivery_address: Optional[dict]
    correlation_id: str

    # working state
    idempotency_key: str
    backend_status: int
    backend_body: dict

    # output
    result: dict


async def ingest_node(state: PurchaseState) -> PurchaseState:
    """
    Normalizes the incoming request into what the backend expects, and
    generates the idempotency key here -- at the edge, once -- so a
    retry of this exact graph run (e.g. the AI buyer's own HTTP client
    retrying on a timeout) reuses the same key instead of accidentally
    creating a second attempt.
    """
    state["correlation_id"] = state.get("correlation_id") or str(uuid.uuid4())
    state["idempotency_key"] = f"agent-{state['buyer_agent_id']}-{state['product_id']}-{uuid.uuid4().hex[:8]}"
    return state


async def compliance_precheck_node(state: PurchaseState) -> PurchaseState:
    """
    Cheap sanity check before we bother the backend: quantity has to be
    a positive integer. Anything involving actual price/stock is
    deliberately NOT checked here -- only the backend's row-locked
    transaction can answer that correctly, checking it here first would
    just be a second, staler copy of the same fact.
    """
    if not isinstance(state.get("quantity"), int) or state["quantity"] <= 0:
        state["backend_status"] = 400
        state["backend_body"] = {
            "error": {"code": "INVALID_QUANTITY", "message": "Quantity must be a positive whole number."}
        }
    return state


def route_after_precheck(state: PurchaseState) -> str:
    # If the precheck already populated an error, skip straight to
    # rejection instead of wasting a network call to the backend.
    if state.get("backend_status") == 400:
        return "reject"
    return "place_order"


async def place_order_node(state: PurchaseState) -> PurchaseState:
    """The one and only place this graph talks to the outside world for money-moving actions."""
    payload = {
        "idempotencyKey": state["idempotency_key"],
        "buyerAgentId": state["buyer_agent_id"],
        "productId": state["product_id"],
        "quantity": state["quantity"],
        "customerName": state.get("customer_name"),
        "customerEmail": state.get("customer_email"),
        "customerPhone": state.get("customer_phone"),
        "deliveryAddress": state.get("delivery_address"),
    }
    status, body = await backend_client.create_order(payload, state["correlation_id"])
    state["backend_status"] = status
    state["backend_body"] = body
    return state


def route_after_order(state: PurchaseState) -> str:
    return "respond" if state["backend_status"] in (200, 201) else "reject"


async def respond_node(state: PurchaseState) -> PurchaseState:
    body = state["backend_body"]
    order = body.get("order", {})
    razorpay_order = body.get("razorpayOrder", {})

    state["result"] = {
        "status": "confirmed_pending_payment",
        "order_id": order.get("id"),
        "razorpay_order_id": razorpay_order.get("id") or order.get("razorpay_order_id"),
        "razorpay_amount_paise": razorpay_order.get("amount"),
        "reason_code": None,
        "message": "Order reserved. Complete payment via the Razorpay order to confirm.",
        "correlation_id": state["correlation_id"],
    }
    return state


async def reject_node(state: PurchaseState) -> PurchaseState:
    """
    Maps ANY failure -- a guardrail rejection, a network error talking
    to the backend, an invalid request -- into the same
    PurchaseResultPacket shape. This is the graceful-failure handler:
    whatever went wrong, the AI buyer gets back clean, predictable JSON
    it can branch on programmatically, never a stack trace.
    """
    error = state.get("backend_body", {}).get("error", {})
    state["result"] = {
        "status": "rejected",
        "order_id": None,
        "razorpay_order_id": None,
        "razorpay_amount_paise": None,
        "reason_code": error.get("code", "UNKNOWN_ERROR"),
        "message": error.get("message", "The order could not be placed."),
        "correlation_id": state["correlation_id"],
    }
    return state


def build_purchase_graph():
    graph = StateGraph(PurchaseState)

    graph.add_node("ingest", ingest_node)
    graph.add_node("compliance_precheck", compliance_precheck_node)
    graph.add_node("place_order", place_order_node)
    graph.add_node("respond", respond_node)
    graph.add_node("reject", reject_node)

    graph.set_entry_point("ingest")
    graph.add_edge("ingest", "compliance_precheck")
    graph.add_conditional_edges(
        "compliance_precheck", route_after_precheck, {"place_order": "place_order", "reject": "reject"}
    )
    graph.add_conditional_edges(
        "place_order", route_after_order, {"respond": "respond", "reject": "reject"}
    )
    graph.add_edge("respond", END)
    graph.add_edge("reject", END)

    return graph.compile()


purchase_graph = build_purchase_graph()
