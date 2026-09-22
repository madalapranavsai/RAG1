import re
from typing import List, Dict, Any, TypedDict
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.core.supabase import get_admin_client
from app.services.embeddings import generate_embedding
from app.services.llm import get_gemini_llm

class RAGState(TypedDict, total=False):
    chat_id: str
    workspace_id: str
    user_id: str
    query: str
    chat_history: List[Dict[str, str]]
    retrieved_chunks: List[Dict[str, Any]]
    retrieved_chunk_ids: List[str]
    context_text: str
    response_text: str
    follow_up_questions: List[str]
    a2ui_payload: Dict[str, Any]
    prompt_tokens: int
    completion_tokens: int

def retrieve_node(state: RAGState) -> Dict[str, Any]:
    """
    Node: Generates query embedding and runs similarity search
    scoped strictly to the user's active workspace.
    """
    query = state.get("query", "").strip()
    workspace_id = state.get("workspace_id")
    supabase = get_admin_client()

    if not query or not workspace_id:
        return {"retrieved_chunks": [], "retrieved_chunk_ids": []}

    query_embedding = generate_embedding(query)

    # Call match_chunks RPC
    rpc_resp = supabase.rpc("match_chunks", {
        "query_embedding": query_embedding,
        "match_threshold": 0.15,
        "match_count": 4,
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

def format_context_node(state: RAGState) -> Dict[str, Any]:
    """
    Node: Assembles retrieved chunks into a clean context block.
    """
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
    Node: Calls Google Gemini with the grounded system prompt and chat history.
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

    messages = [SystemMessage(content=system_prompt)]
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
    content = ai_response.content if hasattr(ai_response, "content") else str(ai_response)

    # Extract follow-up questions if formatted
    follow_ups = []
    follow_up_match = re.search(r"Follow-up Questions:\s*\n1\.\s*(.+?)\n2\.\s*(.+)", content, re.DOTALL)
    if follow_up_match:
        q1 = follow_up_match.group(1).strip()
        q2 = follow_up_match.group(2).strip()
        q2 = q2.split("\n")[0].strip()
        follow_ups = [q1, q2]

    # Extract A2UI payload if present
    import json
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
    Builds and compiles the LangGraph StateGraph workflow for RAG.
    """
    builder = StateGraph(RAGState)

    builder.add_node("retrieve", retrieve_node)
    builder.add_node("format_context", format_context_node)
    builder.add_node("generate", generate_node)
    builder.add_node("track_and_save", track_and_save_node)

    builder.set_entry_point("retrieve")
    builder.add_edge("retrieve", "format_context")
    builder.add_edge("format_context", "generate")
    builder.add_edge("generate", "track_and_save")
    builder.add_edge("track_and_save", END)

    return builder.compile()

# Global compiled graph instance
rag_graph = create_rag_graph()
