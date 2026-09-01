import hashlib
import re
import numpy as np

EMBEDDING_DIM = 1536  # matches the `vector(1536)` column in schema.sql

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def embed_text(text: str) -> list[float]:
    """
    Turns text into a 1536-dimensional vector for pgvector similarity
    search.

    IMPORTANT — this is a deterministic hashing embedding (a bag-of-words
    vector: each token gets hashed into one of 1536 buckets and counted,
    then L2-normalized), NOT a real semantic embedding model. It exists
    so the pgvector plumbing (ingestion -> storage -> cosine similarity
    search -> ranking) is genuinely real and testable end-to-end without
    external network access to an embedding provider.

    It will correctly match on shared keywords ("grid coupling" query
    against a product titled "Industrial High-Load Grid Coupling"), but
    it has no real understanding of meaning or synonyms the way
    OpenAI's text-embedding-3, Cohere embed, or a local
    sentence-transformers model would.

    To go to production: swap this function's body for a real embedding
    API call (keeping the same `text -> list[float]` signature so
    nothing else in the codebase needs to change), and re-run
    app/ingestion/embed_products.py to backfill every product with real
    embeddings.
    """
    vector = np.zeros(EMBEDDING_DIM, dtype=np.float64)
    tokens = _TOKEN_RE.findall(text.lower())

    for token in tokens:
        digest = hashlib.md5(token.encode("utf-8")).hexdigest()
        bucket = int(digest, 16) % EMBEDDING_DIM
        vector[bucket] += 1.0

    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = vector / norm

    return vector.tolist()
