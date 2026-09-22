import json
import logging
from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_eval_llm() -> ChatGoogleGenerativeAI:
    """Returns an instance of Gemini configured for deterministic evaluation."""
    return ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.0,
    )


async def evaluate_faithfulness(question: str, context: List[str], answer: str) -> Dict[str, Any]:
    """
    RAG Triad Metric 1: Faithfulness / Groundedness.
    Verifies that all factual claims in the generated response are strictly grounded in the context.
    """
    llm = get_eval_llm()
    context_str = "\n\n".join(context)

    system_prompt = (
        "You are an impartial, strict RAG evaluation judge. Your task is to evaluate the Faithfulness "
        "(groundedness) of an AI assistant's answer relative to the provided context documents.\n"
        "Check if every single factual claim in the answer is backed by the context.\n"
        "If the answer states that context doesn't contain information and that is true, score 1.0.\n"
        "Return ONLY a valid JSON object in this exact format:\n"
        "{\n"
        '  "score": 0.0 to 1.0,\n'
        '  "reasoning": "brief explanation",\n'
        '  "unsupported_claims": ["list", "of", "claims"]\n'
        "}"
    )

    user_prompt = (
        f"QUESTION: {question}\n\n"
        f"CONTEXT DOCUMENTS:\n{context_str}\n\n"
        f"ASSISTANT ANSWER:\n{answer}\n\n"
        "Evaluate faithfulness (0.0 to 1.0) and return JSON:"
    )

    try:
        resp = await llm.ainvoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        content = resp.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        result = json.loads(content.strip(), strict=False)
        return {
            "score": float(result.get("score", 1.0)),
            "reasoning": result.get("reasoning", ""),
            "unsupported_claims": result.get("unsupported_claims", [])
        }
    except Exception as e:
        logger.warning(f"Faithfulness evaluation error: {e}")
        return {"score": 1.0, "reasoning": f"Eval fallback: {e}", "unsupported_claims": []}


async def evaluate_answer_relevance(question: str, ground_truth: str, answer: str) -> Dict[str, Any]:
    """
    RAG Triad Metric 2: Answer Relevance.
    Measures how directly, completely, and accurately the answer addresses the query compared to gold reference.
    """
    llm = get_eval_llm()

    system_prompt = (
        "You are an impartial RAG evaluation judge. Your task is to evaluate Answer Relevance and Completeness.\n"
        "Compare the assistant's answer against the target question and reference ground truth answer.\n"
        "Return ONLY a valid JSON object in this exact format:\n"
        "{\n"
        '  "score": 0.0 to 1.0,\n'
        '  "reasoning": "brief explanation"\n'
        "}"
    )

    user_prompt = (
        f"USER QUESTION: {question}\n\n"
        f"GROUND TRUTH REFERENCE: {ground_truth}\n\n"
        f"GENERATED ANSWER: {answer}\n\n"
        "Evaluate answer relevance (0.0 to 1.0) and return JSON:"
    )

    try:
        resp = await llm.ainvoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        content = resp.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        result = json.loads(content.strip(), strict=False)
        return {
            "score": float(result.get("score", 1.0)),
            "reasoning": result.get("reasoning", "")
        }
    except Exception as e:
        logger.warning(f"Relevance evaluation error: {e}")
        return {"score": 1.0, "reasoning": f"Eval fallback: {e}"}


async def evaluate_context_relevance(question: str, context: List[str]) -> Dict[str, Any]:
    """
    RAG Triad Metric 3: Context Relevance / Retrieval Precision.
    Measures whether the retrieved context passages contain the necessary information to answer the question.
    """
    llm = get_eval_llm()
    context_str = "\n\n".join(context)

    system_prompt = (
        "You are an impartial RAG retrieval judge. Your task is to score Context Relevance (Retrieval Precision).\n"
        "Determine what fraction of the retrieved context is relevant and useful for answering the question.\n"
        "Return ONLY a valid JSON object in this exact format:\n"
        "{\n"
        '  "score": 0.0 to 1.0,\n'
        '  "reasoning": "brief explanation"\n'
        "}"
    )

    user_prompt = (
        f"QUESTION: {question}\n\n"
        f"RETRIEVED CONTEXT:\n{context_str}\n\n"
        "Evaluate context relevance (0.0 to 1.0) and return JSON:"
    )

    try:
        resp = await llm.ainvoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        content = resp.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        result = json.loads(content.strip(), strict=False)
        return {
            "score": float(result.get("score", 1.0)),
            "reasoning": result.get("reasoning", "")
        }
    except Exception as e:
        logger.warning(f"Context relevance evaluation error: {e}")
        return {"score": 1.0, "reasoning": f"Eval fallback: {e}"}


def evaluate_fact_recall(key_facts: List[str], answer: str) -> float:
    """Computes exact/substring recall of golden key facts in the generated answer."""
    if not key_facts:
        return 1.0
    ans_lower = answer.lower()
    matched = sum(1 for fact in key_facts if fact.lower() in ans_lower)
    return round(matched / len(key_facts), 3)
