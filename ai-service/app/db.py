import asyncpg
from app.config import settings

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """
    Lazily-created shared connection pool. FastAPI's startup event opens
    it once; every request reuses it rather than opening a new Postgres
    connection per request.
    """
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=5)
    return _pool


async def close_pool():
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def semantic_search(embedding: list[float], merchant_id: str, limit: int = 5):
    """
    The actual "Semantic Discovery Endpoint" : ranks
    products by cosine distance between the buyer's query embedding and
    each product's stored embedding, using pgvector's `<=>` operator.

    Only returns products that actually have an embedding yet (ingestion
    populates this — see app/ingestion/embed_products.py) and belong to
    the requesting merchant, so one merchant's catalog never leaks into
    another's search results.
    """
    pool = await get_pool()
    """
    asyncpg needs the vector passed as a string literal in pgvector's
    own text format ('[0.1,0.2,...]'), not a Python list — vector isn't
    a type asyncpg knows how to adapt automatically.
   """
    embedding_literal = "[" + ",".join(f"{v:.6f}" for v in embedding) + "]"

    rows = await pool.fetch(
        """
        SELECT id, title, description, price_inr, stock_qty, compliance_tags,
               embedding <=> $1::vector AS distance
        FROM products
        WHERE merchant_id = $2 AND embedding IS NOT NULL
        ORDER BY distance ASC
        LIMIT $3
        """,
        embedding_literal,
        merchant_id,
        limit,
    )
    return [dict(r) for r in rows]


async def get_product(product_id: str):
    pool = await get_pool()
    row = await pool.fetchrow("SELECT * FROM products WHERE id = $1", product_id)
    return dict(row) if row else None
