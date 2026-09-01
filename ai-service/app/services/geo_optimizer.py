import httpx
from app.config import settings

# Simplified demo tax table. A real deployment would call a tax API
# (Avalara, TaxJar, etc.) per context.md's "estimated_regional_tax_inr"
# field -- this is a stand-in flat-rate table, clearly not real tax advice.
_TAX_RATES = {
    "IN": 0.18,  # GST
    "DE": 0.19,  # VAT
    "default": 0.15,
}


def estimate_tax_rate(country_code: str) -> float:
    return _TAX_RATES.get(country_code.upper(), _TAX_RATES["default"])


async def build_geo_metadata(product: dict, geo_context) -> str:
    """
    Produces the `geo_optimized_metadata` string from the ACP spec --
    a short blurb telling the buyer why/how this product fits their
    region and compliance needs using your local Mistral model.
    """
    compliance_tags = product.get("compliance_tags") or []
    matched = [c for c in geo_context.compliance_requirements if c in compliance_tags]

    try:
        return await _generate_with_mistral(product, geo_context, matched)
    except Exception:
        # Never let a local LLM hiccup break product discovery -- fall
        # through to the deterministic template below.
        pass

    return _rule_based_metadata(product, geo_context, matched)


def _rule_based_metadata(product: dict, geo_context, matched: list[str]) -> str:
    region = geo_context.target_region or geo_context.country_code
    if matched:
        compliance_note = f"Matches required certifications: {', '.join(matched)}."
    else:
        compliance_note = "No certification match on file for this region's requirements."
    return f"Available for shipment to {region}. {compliance_note}"


async def _generate_with_mistral(product: dict, geo_context, matched: list[str]) -> str:
    prompt = (
        f"Write one short sentence (under 25 words) telling a B2B AI purchasing "
        f"agent why '{product['title']}' fits their region ({geo_context.target_region or geo_context.country_code}) "
        f"and compliance needs ({', '.join(geo_context.compliance_requirements) or 'none specified'}). "
        f"Matched certifications: {', '.join(matched) or 'none'}. Be factual, no marketing language."
    )
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{settings.ollama_url}/api/generate",
            json={
               "model": "mistral",
               "prompt": prompt,
               "stream": False,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("response", "").strip()