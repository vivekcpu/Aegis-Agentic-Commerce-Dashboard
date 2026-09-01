"""
Backfills the `embedding` column for any product that doesn't have one
yet. Run this once after seeding new products (or on a schedule if
products get added outside this pipeline), so /discover has something
to search against.

Usage:
    python -m app.ingestion.embed_products
"""

import asyncio
from app.db import get_pool, close_pool
from app.embeddings import embed_text


async def run():
    pool = await get_pool()
    rows = await pool.fetch("SELECT id, title, description FROM products WHERE embedding IS NULL")

    if not rows:
        print("No products need embeddings.")
        await close_pool()
        return

    for row in rows:
        text = f"{row['title']}. {row['description'] or ''}"
        vector = embed_text(text)
        vector_literal = "[" + ",".join(f"{v:.6f}" for v in vector) + "]"
        await pool.execute(
            "UPDATE products SET embedding = $1::vector, updated_at = now() WHERE id = $2",
            vector_literal,
            row["id"],
        )
        print(f"Embedded: {row['id']} — {row['title']}")

    print(f"Done. Embedded {len(rows)} product(s).")
    await close_pool()


if __name__ == "__main__":
    asyncio.run(run())
