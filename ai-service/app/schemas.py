from pydantic import BaseModel, Field


# ---- Discovery phase (from the technical brief) ----


class BuyerGeoContext(BaseModel):
    country_code: str
    target_region: str | None = None
    compliance_requirements: list[str] = Field(default_factory=list)


class SearchIntent(BaseModel):
    query_string: str
    max_unit_budget_inr: float | None = None
    quantity_required: int = 1


class InboundQueryPacket(BaseModel):
    """Exactly the shape an external AI buyer sends to /discover."""

    protocol_version: str = "UAP/1.0.2"
    buyer_agent_id: str
    buyer_geo_context: BuyerGeoContext
    search_intent: SearchIntent


class Quote(BaseModel):
    base_price_inr: float
    estimated_regional_tax_inr: float
    final_unit_price_inr: float


class OptimizedPayload(BaseModel):
    product_id: str
    title: str
    geo_optimized_metadata: str
    quote: Quote
    inventory_status: str  # "IN_STOCK" | "OUT_OF_STOCK"


class OutboundOfferPacket(BaseModel):
    """What /discover returns — one of these per matching product."""

    transaction_id: str
    merchant_id: str
    optimized_payload: OptimizedPayload


class DiscoveryResponse(BaseModel):
    results: list[OutboundOfferPacket]


# ---- Purchase phase ( guardrails through ledger) ----


class DeliveryAddress(BaseModel):
    line1: str
    city: str
    region: str | None = None
    postal_code: str | None = None
    country: str


class PurchaseIntentPacket(BaseModel):
    """What an AI buyer sends to /agent/purchase to actually place an order."""

    buyer_agent_id: str
    product_id: str
    quantity: int
    customer_name: str | None = None
    customer_email: str | None = None
    customer_phone: str | None = None
    delivery_address: DeliveryAddress | None = None


class PurchaseResultPacket(BaseModel):
    """
    Standardized response for both success and failure -- this is the
    "clean JSON error recovery payload" for the graceful failure
    handler requires. An AI buyer can always parse this shape; it never
    has to handle an ad-hoc error format.
    """

    status: str  # "confirmed_pending_payment" | "rejected"
    order_id: str | None = None
    razorpay_order_id: str | None = None
    razorpay_amount_paise: int | None = None
    reason_code: str | None = None  # e.g. "OUT_OF_STOCK", "VELOCITY_LIMIT"
    message: str
    correlation_id: str
