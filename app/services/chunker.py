from typing import List, Dict
from langchain_text_splitters import RecursiveCharacterTextSplitter

def chunk_text(
    text: str,
    chunk_size: int = 3000,
    chunk_overlap: int = 500
) -> List[Dict[str, any]]:
    """
    Splits input text into overlapping semantic chunks using natural boundary splitting.
    
    Args:
        text: Normalized raw text content.
        chunk_size: Target length in characters.
        chunk_overlap: Overlapping context carried into next chunk.
        
    Returns:
        List of dictionaries containing chunk_index and content.
    """
    if not text or not text.strip():
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""],
        length_function=len
    )

    documents = splitter.split_text(text)
    
    chunks = []
    for idx, content in enumerate(documents):
        cleaned = content.strip()
        if cleaned:
            chunks.append({
                "chunk_index": idx,
                "content": cleaned
            })

    return chunks
