from fastapi import APIRouter
from app.schemas import PurchaseIntentPacket, PurchaseResultPacket
from app.graph.purchase_graph import purchase_graph

router = APIRouter()


@router.post("/agent/purchase", response_model=PurchaseResultPacket)
async def agent_purchase(packet: PurchaseIntentPacket):
    """
    The entry point an autonomous AI buyer calls to actually place an
    order. Runs the LangGraph pipeline (app/graph/purchase_graph.py),
    which ingests the request, does a cheap sanity precheck, hands off
    to the Part 2 backend for the real guardrail+payment work, and maps
    whatever comes back into one predictable response shape.
    """
    initial_state = {
        "buyer_agent_id": packet.buyer_agent_id,
        "product_id": packet.product_id,
        "quantity": packet.quantity,
        "customer_name": packet.customer_name,
        "customer_email": packet.customer_email,
        "customer_phone": packet.customer_phone,
        "delivery_address": packet.delivery_address.model_dump() if packet.delivery_address else None,
    }

    final_state = await purchase_graph.ainvoke(initial_state)
    return PurchaseResultPacket(**final_state["result"])
