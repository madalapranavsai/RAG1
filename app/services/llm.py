from typing import Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import settings

def get_gemini_llm(
    model: Optional[str] = None,
    temperature: float = 0.3
) -> ChatGoogleGenerativeAI:
    """
    Instantiates and returns a Google Gemini LLM instance via LangChain.
    """
    api_key = settings.GOOGLE_API_KEY
    if not api_key or api_key.strip() in ("", "your-google-ai-studio-api-key"):
        raise ValueError(
            "Invalid Google Gemini API Key. Please replace 'your-google-ai-studio-api-key' in your .env file "
            "with your real Gemini API key from https://aistudio.google.com/"
        )

    model_name = model or settings.GEMINI_MODEL or "gemini-1.5-flash"
    
    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        temperature=temperature
    )
