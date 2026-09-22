from typing import List
from app.core.config import settings

_fastembed_model = None

def get_fastembed_model():
    global _fastembed_model
    if _fastembed_model is None:
        from fastembed import TextEmbedding
        # Default model: BAAI/bge-small-en-v1.5 or sentence-transformers/all-MiniLM-L6-v2
        # 'sentence-transformers/all-MiniLM-L6-v2' outputs 384-dimensional vectors
        _fastembed_model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
    return _fastembed_model

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generates dense vector embeddings for a list of strings.
    Supports local 384-dim MiniLM model (zero cost, in-memory)
    or Google Gemini text-embedding-004.
    """
    if not texts:
        return []

    cleaned_texts = [t.replace("\n", " ").strip() for t in texts]

    if settings.EMBEDDING_PROVIDER == "gemini":
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        embeddings_model = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key=settings.GOOGLE_API_KEY
        )
        return embeddings_model.embed_documents(cleaned_texts)

    # Local in-process FastEmbed (all-MiniLM-L6-v2, 384 dimensions)
    model = get_fastembed_model()
    embeddings_generator = model.embed(cleaned_texts)
    return [embedding.tolist() for embedding in embeddings_generator]

def generate_embedding(text: str) -> List[float]:
    """
    Generates a single dense vector embedding for a query string.
    """
    results = generate_embeddings([text])
    return results[0] if results else []
