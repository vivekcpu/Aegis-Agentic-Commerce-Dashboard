import uuid
from fastapi import APIRouter
from app.schemas import InboundQueryPacket, DiscoveryResponse, OutboundOfferPacket, OptimizedPayload, Quote
from app.db import semantic_search
from app.embeddings import embed_text
from app.config import settings
from app.services.geo_optimizer import build_geo_metadata, estimate_tax_rate

router = APIRouter()


@router.post("/discover", response_model=DiscoveryResponse)
async def discover(packet: InboundQueryPacket):
    """
    (Ingestion & Parsing Gateway) +  (Geo-Optimization
    Node) from the technical brief, combined into one endpoint: an AI
    buyer sends a query packet, we embed the query text, find the
    closest-matching products in this merchant's catalog via pgvector,
    and return each one wrapped in a geo-optimized offer packet.
    """
    query_embedding = embed_text(packet.search_intent.query_string)

    matches = await semantic_search(
        embedding=query_embedding,
        merchant_id=settings.merchant_id,
        limit=5,
    )

    tax_rate = estimate_tax_rate(packet.buyer_geo_context.country_code)

    results = []
    for product in matches:
        base_price = float(product["price_inr"])
        tax = round(base_price * tax_rate, 2)
        final_price = round(base_price + tax, 2)

        # Skip anything over budget rather than returning it anyway --
        # an AI buyer with a hard budget constraint shouldn't have to
        # re-filter results we already know don't fit.
        if packet.search_intent.max_unit_budget_inr and final_price > packet.search_intent.max_unit_budget_inr:
            continue

        metadata = await build_geo_metadata(
            product=product,
            geo_context=packet.buyer_geo_context,
        )

        results.append(
            OutboundOfferPacket(
                transaction_id=f"tx_{uuid.uuid4().hex[:12]}",
                merchant_id=settings.merchant_id,
                optimized_payload=OptimizedPayload(
                    product_id=product["id"],
                    title=product["title"],
                    geo_optimized_metadata=metadata,
                    quote=Quote(
                        base_price_inr=base_price,
                        estimated_regional_tax_inr=tax,
                        final_unit_price_inr=final_price,
                    ),
                    inventory_status="IN_STOCK" if product["stock_qty"] >= packet.search_intent.quantity_required else "OUT_OF_STOCK",
                ),
            )
        )

    return DiscoveryResponse(results=results)
