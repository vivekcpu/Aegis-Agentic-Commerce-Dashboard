import httpx
from app.config import settings

# Standard output dimension for the local 'nomic-embed-text' model.
# Remember to update your schema.sql or alter your database table to match vector(768).
EMBEDDING_DIM = 768  


def embed_text(text: str) -> list[float]:
    """
    Turns text into a 768-dimensional semantic vector using a local Ollama embedding model.

    This replaces the historical deterministic bag-of-words hashing loop with a genuine 
    deep-learning text-embedding model. It communicates directly with your local Ollama 
    instance over HTTP, giving the system native comprehension of semantic meaning, 
    synonyms, and intent.

   Embeeding (768-dim) vectors are stored in the `embedding` column of the `products` table,
   and are used for semantic search in the /discover endpoint via pgvector's cosine distance operator.
    """
    try:
        # We use a synchronous context client to maintain compatibility with the 
        # existing synchronous execution pipeline across ingestion and discovery.
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{settings.ollama_url}/api/embeddings",
                json={
                    "model": "nomic-embed-text",
                    "prompt": text.strip()
                }
            )
            resp.raise_for_status()
            data = resp.json()
            return data["embedding"]
            
    except Exception as e:
        print(f"Ollama embedding network call failed: {e}. Falling back to zero-vector array.")
        # Graceful fallback: always return a validly sized numeric list 
        # so pgvector calculations don't throw an unhandled schema crash.
        return [0.0] * EMBEDDING_DIM
