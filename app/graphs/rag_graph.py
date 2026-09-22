import re
import json
from typing import List, Dict, Any, Optional
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.core.supabase import get_admin_client
from app.services.embeddings import generate_embedding
from app.services.llm import get_gemini_llm

def _extract_str(val: Any) -> str:
    """Safely extracts text content from LLM response which could be str, list of parts, or object."""
    if isinstance(val, str):
        return val
    if isinstance(val, list):
        return "\n".join(str(p) for p in val)
    return str(val) if val is not None else ""


class RAGState(TypedDict, total=False):
    chat_id: str
    workspace_id: str
    user_id: str
    query: str
    search_query: str
    chat_history: List[Dict[str, str]]
    retrieved_chunks: List[Dict[str, Any]]
    retrieved_chunk_ids: List[str]
    filtered_chunks: List[Dict[str, Any]]
    retrieval_grade: str
    rewrite_count: int
    crag_status: Dict[str, Any]
    context_text: str
    response_text: str
    follow_up_questions: List[str]
    a2ui_payload: Dict[str, Any]
    prompt_tokens: int
    completion_tokens: int

def rewrite_query_node(state: RAGState) -> Dict[str, Any]:
    """
    CRAG Node 1: Conversational Query Rewriting.
    If chat history exists, reformulates follow-up queries or anaphora (it, they, that)
    into a standalone, search-optimized semantic query.
    """
    query = state.get("query", "").strip()
    history = state.get("chat_history", [])

    if not history or len(history) == 0:
        return {"search_query": query, "rewrite_count": 0}

    # If query is very short or contains conversational pronouns, ask Gemini to disambiguate
    pronoun_check = bool(re.search(r"\b(it|its|this|that|these|those|they|them|previous|former|latter|again)\b", query, re.I))
    if len(query.split()) < 4 or pronoun_check:
        try:
            llm = get_gemini_llm()
            history_context = "\n".join([f"{h.get('role', 'user')}: {h.get('content', '')}" for h in history[-4:]])
            prompt = f"""You are an expert query reformulation assistant for a document retrieval system.
Given the previous chat conversation and a follow-up user query, rephrase the follow-up query to be a completely standalone, search-optimized query.
Do NOT answer the question. Only output the reformulated search query as a single concise line.

Chat History:
{history_context}

Follow-up User Query:
{query}

Standalone Search Query:"""
            res = llm.invoke([HumanMessage(content=prompt)])
            raw_content = _extract_str(getattr(res, "content", res))
            reformulated = raw_content.strip().strip('"')
            if reformulated and len(reformulated) > 2:
                return {"search_query": reformulated, "rewrite_count": 0}
        except Exception:
            pass

    return {"search_query": query, "rewrite_count": 0}

def retrieve_node(state: RAGState) -> Dict[str, Any]:
    """
    CRAG Node 2: Vector Retrieval.
    Generates embedding for search_query and runs similarity search scoped to workspace.
    """
    search_query = state.get("search_query") or state.get("query", "").strip()
    workspace_id = state.get("workspace_id")
    supabase = get_admin_client()

    if not search_query or not workspace_id:
        return {"retrieved_chunks": [], "retrieved_chunk_ids": []}

    query_embedding = generate_embedding(search_query)

    # Call match_chunks RPC
    rpc_resp = supabase.rpc("match_chunks", {
        "query_embedding": query_embedding,
        "match_threshold": 0.15,
        "match_count": 5,
        "filter_workspace_id": workspace_id
    }).execute()

    matches = rpc_resp.data or []
    if not matches:
        return {"retrieved_chunks": [], "retrieved_chunk_ids": []}

    # Fetch document titles
    doc_ids = list(set(m["document_id"] for m in matches if "document_id" in m))
    title_map = {}
    if doc_ids:
        docs_resp = supabase.table("documents").select("id, title").in_("id", doc_ids).execute()
        if docs_resp.data:
            title_map = {d["id"]: d["title"] for d in docs_resp.data}

    retrieved = []
    chunk_ids = []
    for m in matches:
        chunk_id = m.get("id")
        if chunk_id:
            chunk_ids.append(chunk_id)
        retrieved.append({
            "id": chunk_id,
            "document_id": m.get("document_id"),
            "document_title": title_map.get(m.get("document_id"), "Unknown Document"),
            "content": m.get("content", ""),
            "source_page": m.get("source_page"),
            "similarity": m.get("similarity", 0.0)
        })

    return {
        "retrieved_chunks": retrieved,
        "retrieved_chunk_ids": chunk_ids
    }

def grade_documents_node(state: RAGState) -> Dict[str, Any]:
    """
    CRAG Node 3: Document Relevance Grader.
    Assesses retrieved chunks against the search query to filter out irrelevant noise.
    """
    chunks = state.get("retrieved_chunks", [])
    search_query = state.get("search_query") or state.get("query", "")

    if not chunks:
        return {
            "filtered_chunks": [],
            "retrieval_grade": "not_relevant",
            "crag_status": {
                "search_query": search_query,
                "rewritten": search_query != state.get("query"),
                "chunks_retrieved": 0,
                "chunks_retained": 0,
                "grade": "not_relevant"
            }
        }

    # Format chunks for evaluation
    chunk_summaries = []
    for idx, c in enumerate(chunks):
        snippet = (c.get("content", "")[:250]).replace("\n", " ")
        chunk_summaries.append(f"[{c.get('id')}] (Doc: {c.get('document_title')}): {snippet}")

    chunks_text = "\n".join(chunk_summaries)

    prompt = f"""You are a strict retrieval relevance evaluator.
Assess whether each retrieved document chunk contains information, definitions, or context relevant to answering the query.

User Query: {search_query}

Retrieved Chunks:
{chunks_text}

Output JSON containing the list of relevant chunk IDs:
{{"relevant_ids": ["id1", "id2"]}}
If none are relevant, output: {{"relevant_ids": []}}
Only return valid JSON."""

    relevant_ids = set()
    try:
        llm = get_gemini_llm()
        eval_resp = llm.invoke([HumanMessage(content=prompt)])
        eval_content = _extract_str(getattr(eval_resp, "content", eval_resp))
        match = re.search(r"\{[\s\S]*\}", eval_content)
        if match:
            parsed = json.loads(match.group(0), strict=False)
            relevant_ids = set(parsed.get("relevant_ids", []))
    except Exception:
        # Fallback: keep all chunks if grading call encounters an error
        relevant_ids = set(c["id"] for c in chunks if c.get("id"))

    filtered = [c for c in chunks if c.get("id") in relevant_ids]
    # If grading filtered everything out, keep top 1 if similarity > 0.40
    if not filtered and chunks:
        if chunks[0].get("similarity", 0) >= 0.40:
            filtered = [chunks[0]]

    grade = "relevant" if len(filtered) > 0 else "not_relevant"
    return {
        "filtered_chunks": filtered,
        "retrieval_grade": grade,
        "crag_status": {
            "search_query": search_query,
            "rewritten": search_query != state.get("query"),
            "chunks_retrieved": len(chunks),
            "chunks_retained": len(filtered),
            "grade": grade
        }
    }

def transform_query_node(state: RAGState) -> Dict[str, Any]:
    """
    CRAG Node 4: Query Transformation.
    If initial retrieval found no relevant chunks, reformulates keywords with broader terms.
    """
    search_query = state.get("search_query") or state.get("query", "")
    rewrite_count = state.get("rewrite_count", 0) + 1

    try:
        llm = get_gemini_llm()
        prompt = f"""The previous search query '{search_query}' retrieved zero relevant passages from the document repository.
Please formulate a broader, more general technical search query that captures the core concepts using synonyms or alternative terms.
Output ONLY the new query string on a single line."""
        res = llm.invoke([HumanMessage(content=prompt)])
        raw_res = _extract_str(getattr(res, "content", res))
        expanded = raw_res.strip().strip('"')
    except Exception:
        expanded = search_query

    return {
        "search_query": expanded,
        "rewrite_count": rewrite_count
    }

def decide_to_generate(state: RAGState) -> str:
    """
    Conditional Edge: Decides whether to generate an answer or attempt query transformation.
    """
    filtered = state.get("filtered_chunks", [])
    rewrite_count = state.get("rewrite_count", 0)

    if filtered and len(filtered) > 0:
        return "format_context"

    if rewrite_count < 1:
        return "transform_query"

    return "format_context"

def format_context_node(state: RAGState) -> Dict[str, Any]:
    """
    Node: Assembles verified chunks into a grounded context block.
    """
    chunks = state.get("filtered_chunks")
    if chunks is None:
        chunks = state.get("retrieved_chunks", [])

    if not chunks:
        context_text = "No relevant workspace documents found."
    else:
        parts = []
        for idx, chunk in enumerate(chunks, 1):
            title = chunk.get("document_title", "Document")
            page = f" (Page {chunk['source_page']})" if chunk.get("source_page") else ""
            parts.append(f"--- CONTEXT PART {idx} [File: {title}{page}] ---\n{chunk.get('content', '')}")
        context_text = "\n\n".join(parts)

    return {"context_text": context_text}

def generate_node(state: RAGState) -> Dict[str, Any]:
    """
    Node: Calls Google Gemini with the grounded system prompt, chat history, and A2UI directives.
    """
    context_text = state.get("context_text", "No relevant workspace documents found.")
    query = state.get("query", "")
    history = state.get("chat_history", [])

    a2ui_instructions = """
### GENERATIVE A2UI & VISUAL CAPABILITIES:
You are equipped with a real-time Generative UI system (A2UI) that dynamically renders:
1. "mermaid": Flowcharts, registration procedures, architecture diagrams, decision trees, processes.
2. "line_chart" & "bar_chart": Continuous curves, economic cost curves (TC, TVC, TFC, AC, MC), comparison graphs, trend charts.
3. "table": Structured comparisons, data matrices, schedules.
4. "timeline": Sequential chronological events, roadmaps, milestones.
5. "metric_card": Key numbers and KPI metrics with trends.

CRITICAL VISUALIZATION RULES:
- Whenever the user asks for a flowchart, diagram, procedure, or sequence (e.g. patent registration procedure, circular flow):
  You MUST include an ```a2ui block of type "mermaid" or a ```mermaid block.
- Whenever the user asks for a graph, chart, curve, or visual plot (e.g. "tc and vc graph", "cost curves", "demand curve"):
  NEVER refuse or claim you cannot generate graphs!
  Use the conceptual formulas and principles explained in the Workspace Document Context (for example: TFC remains constant horizontally, TVC increases with output, TC = TFC + TVC) to construct representative data points and plot an interactive "line_chart" or "bar_chart" in an ```a2ui block!
- Always output valid JSON in the ```a2ui block:
```a2ui
{
  "type": "mermaid" | "line_chart" | "bar_chart" | "table" | "timeline" | "metric_card",
  "title": "Descriptive Widget Title",
  "definition": "graph LR\\n  A[Invention] --> B[Patent Search] ...",
  "labels": ["0", "10", "20", "30", "40", "50"],
  "datasets": [
    {"label": "Total Fixed Cost (TFC)", "data": [50, 50, 50, 50, 50, 50]},
    {"label": "Total Variable Cost (TVC)", "data": [0, 30, 55, 75, 105, 145]},
    {"label": "Total Cost (TC = TFC + TVC)", "data": [50, 80, 105, 125, 155, 195]}
  ],
  "headers": ["Col 1", "Col 2"], "rows": [["A", "B"]],
  "events": [{"date": "Step 1", "title": "...", "description": "..."}],
  "metrics": [{"label": "...", "value": "...", "change": "...", "trend": "up"}]
}
```
Accompany the ```a2ui widget with markdown explanation text.
"""

    system_prompt = f"""You are DocuMind RAG, a professional AI workspace document assistant powered by Google Gemini.
You must answer questions strictly based on the provided Workspace Document Context.
If the context does not contain sufficient information to answer the question, state that you do not know based on the uploaded workspace documents. Do not make up answers.

Workspace Document Context:
{context_text}
{a2ui_instructions}
At the very end of your response, on a new line, add exactly two concise suggested follow-up questions that the user might want to ask next based on this conversation. Format it exactly as:
Follow-up Questions:
1. [First Question]
2. [Second Question]
"""

    messages: List[Any] = [SystemMessage(content=system_prompt)]
    for msg in history:
        role = msg.get("role")
        content = msg.get("content", "")
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=query))

    llm = get_gemini_llm()
    ai_response = llm.invoke(messages)
    content = _extract_str(getattr(ai_response, "content", ai_response))

    # Extract follow-up questions if formatted
    follow_ups = []
    follow_up_match = re.search(r"Follow-up Questions:\s*\n1\.\s*(.+?)\n2\.\s*(.+)", content, re.DOTALL)
    if follow_up_match:
        q1 = follow_up_match.group(1).strip()
        q2 = follow_up_match.group(2).strip()
        q2 = q2.split("\n")[0].strip()
        follow_ups = [q1, q2]

    # Extract A2UI payload if present
    a2ui_payload = None
    a2ui_match = re.search(r"```a2ui\s*([\s\S]*?)\s*```", content)
    if a2ui_match:
        try:
            a2ui_payload = json.loads(a2ui_match.group(1).strip(), strict=False)
        except Exception:
            pass

    # Fallback: Also detect standalone ```mermaid blocks
    if not a2ui_payload:
        mermaid_match = re.search(r"```mermaid\s*([\s\S]*?)\s*```", content)
        if mermaid_match:
            a2ui_payload = {
                "type": "mermaid",
                "title": "Process Flowchart",
                "definition": mermaid_match.group(1).strip()
            }

    # Usage metadata
    metadata = getattr(ai_response, "response_metadata", {})
    usage = metadata.get("usage_metadata", {})
    prompt_tokens = usage.get("prompt_token_count", len(system_prompt.split()) + len(query.split()))
    completion_tokens = usage.get("candidates_token_count", len(content.split()))

    return {
        "response_text": content,
        "follow_up_questions": follow_ups,
        "a2ui_payload": a2ui_payload,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens
    }

def track_and_save_node(state: RAGState) -> Dict[str, Any]:
    """
    Node: Persists the AI response message and usage events to Supabase.
    """
    chat_id = state.get("chat_id")
    workspace_id = state.get("workspace_id")
    response_text = state.get("response_text", "")
    chunk_ids = state.get("retrieved_chunk_ids", [])
    prompt_tokens = state.get("prompt_tokens", 0)
    completion_tokens = state.get("completion_tokens", 0)

    if not chat_id or not workspace_id:
        return {}

    supabase = get_admin_client()

    # Save Assistant Message
    supabase.table("chat_messages").insert({
        "chat_id": chat_id,
        "workspace_id": workspace_id,
        "role": "assistant",
        "content": response_text,
        "retrieved_chunk_ids": chunk_ids
    }).execute()

    # Update chat title if it is still 'New Chat'
    chat_resp = supabase.table("chats").select("title").eq("id", chat_id).single().execute()
    if chat_resp.data and chat_resp.data.get("title") == "New Chat":
        query = state.get("query", "")
        title = (query[:37] + "...") if len(query) > 40 else query
        supabase.table("chats").update({"title": title}).eq("id", chat_id).execute()

    # Log usage tokens
    if prompt_tokens > 0 or completion_tokens > 0:
        events = []
        if prompt_tokens > 0:
            events.append({
                "workspace_id": workspace_id,
                "event_type": "token_used",
                "quantity": prompt_tokens,
                "metadata": {"type": "prompt", "chat_id": chat_id, "model": "gemini"}
            })
        if completion_tokens > 0:
            events.append({
                "workspace_id": workspace_id,
                "event_type": "token_used",
                "quantity": completion_tokens,
                "metadata": {"type": "completion", "chat_id": chat_id, "model": "gemini"}
            })
        supabase.table("usage_events").insert(events).execute()

    return {}

def create_rag_graph():
    """
    Builds and compiles the Corrective RAG (CRAG) LangGraph StateGraph workflow.
    """
    builder: Any = StateGraph(RAGState)

    builder.add_node("rewrite_query", rewrite_query_node)
    builder.add_node("retrieve", retrieve_node)
    builder.add_node("grade_documents", grade_documents_node)
    builder.add_node("transform_query", transform_query_node)
    builder.add_node("format_context", format_context_node)
    builder.add_node("generate", generate_node)
    builder.add_node("track_and_save", track_and_save_node)

    builder.set_entry_point("rewrite_query")
    builder.add_edge("rewrite_query", "retrieve")
    builder.add_edge("retrieve", "grade_documents")

    builder.add_conditional_edges(
        "grade_documents",
        decide_to_generate,
        {
            "format_context": "format_context",
            "transform_query": "transform_query"
        }
    )

    builder.add_edge("transform_query", "retrieve")
    builder.add_edge("format_context", "generate")
    builder.add_edge("generate", "track_and_save")
    builder.add_edge("track_and_save", END)

    return builder.compile()

# Global compiled graph instance
rag_graph = create_rag_graph()
