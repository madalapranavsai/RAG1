import os
import sys
import json
import time
import argparse
import asyncio
from pathlib import Path
from typing import Dict, Any, List

# Ensure parent directory is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.llm import get_gemini_llm
from app.graphs.rag_graph import (
    rewrite_query_node,
    grade_documents_node,
    format_context_node,
    generate_node,
    RAGState
)
from app.services.evaluator import (
    evaluate_faithfulness,
    evaluate_answer_relevance,
    evaluate_context_relevance,
    evaluate_fact_recall
)

REPORTS_DIR = Path(__file__).resolve().parent / "reports"
DEFAULT_DATASET = Path(__file__).resolve().parent / "golden_dataset.json"


async def evaluate_single_sample(item: Dict[str, Any]) -> Dict[str, Any]:
    """Runs a single golden benchmark test case through the RAG pipeline and scores it."""
    start_time = time.perf_counter()
    question = item["question"]
    history = item.get("chat_history", [])
    context_docs = item.get("context_documents", [])
    expected_crag = item.get("expected_crag_action", "relevant")
    ground_truth = item.get("ground_truth_answer", "")
    key_facts = item.get("key_facts", [])

    # 1. State setup
    chunks = [
        {"id": f"mock-{i}", "content": doc, "similarity": 0.88}
        for i, doc in enumerate(context_docs)
    ]
    state: RAGState = {
        "query": question,
        "chat_history": history,
        "retrieved_chunks": chunks,
        "rewrite_count": 0,
        "workspace_id": "eval-workspace",
        "chat_id": "eval-chat"
    }

    # 2. Query Rewriting (if history present)
    rewrite_res = rewrite_query_node(state)
    state.update(rewrite_res)

    # 3. Grade Retrieval (CRAG)
    grade_res = grade_documents_node(state)
    state.update(grade_res)
    actual_grade = state.get("retrieval_grade", "relevant")

    # 4. Format Context
    fmt_res = format_context_node(state)
    state.update(fmt_res)

    # 5. Generate Response
    gen_res = generate_node(state)
    state.update(gen_res)

    answer = state.get("response_text", "")
    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    # 6. LLM-as-a-Judge RAG Triad Evaluations
    faithfulness_res = await evaluate_faithfulness(question, context_docs, answer)
    relevance_res = await evaluate_answer_relevance(question, ground_truth, answer)
    context_rel_res = await evaluate_context_relevance(question, context_docs)
    fact_recall = evaluate_fact_recall(key_facts, answer)

    crag_matched = (
        (expected_crag == "relevant" and actual_grade == "relevant") or
        (expected_crag == "rewrite" and state.get("rewrite_count", 0) > 0) or
        (expected_crag == "fallback" and actual_grade == "not_relevant")
    )

    return {
        "id": item.get("id"),
        "category": item.get("category"),
        "question": question,
        "search_query": state.get("search_query", question),
        "actual_answer": answer,
        "ground_truth": ground_truth,
        "crag_grade": actual_grade,
        "expected_crag": expected_crag,
        "crag_correct": crag_matched,
        "latency_ms": latency_ms,
        "scores": {
            "faithfulness": faithfulness_res["score"],
            "answer_relevance": relevance_res["score"],
            "context_relevance": context_rel_res["score"],
            "fact_recall": fact_recall
        },
        "reasoning": {
            "faithfulness": faithfulness_res.get("reasoning", ""),
            "answer_relevance": relevance_res.get("reasoning", "")
        }
    }


async def run_evaluation(dataset_path: Path, sample_size: int = None, fail_under: float = 0.75):
    """Executes the evaluation suite across the golden dataset and writes report."""
    print(f"\n========================================================")
    print(f"  DocuMind Production CI RAG Triad Evaluator")
    print(f"========================================================")
    print(f"Dataset: {dataset_path}")

    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if sample_size and sample_size < len(data):
        data = data[:sample_size]

    print(f"Running evaluation on {len(data)} golden benchmark cases...\n")

    results: List[Dict[str, Any]] = []
    for idx, item in enumerate(data, 1):
        print(f"[{idx}/{len(data)}] Evaluating '{item.get('id')}' ({item.get('category')})...", end="", flush=True)
        try:
            sample_eval = await evaluate_single_sample(item)
            results.append(sample_eval)
            s = sample_eval["scores"]
            print(f" Done! Faithfulness: {s['faithfulness']:.2f} | Relevance: {s['answer_relevance']:.2f} | Latency: {sample_eval['latency_ms']}ms")
        except Exception as e:
            print(f" FAILED! {e}")
        # Brief pause between samples to respect free-tier RPM limits
        await asyncio.sleep(1.5)

    # Compute aggregates
    total = len(results)
    if total == 0:
        print("No evaluation samples completed.")
        return 1

    avg_faithfulness = sum(r["scores"]["faithfulness"] for r in results) / total
    avg_relevance = sum(r["scores"]["answer_relevance"] for r in results) / total
    avg_context_rel = sum(r["scores"]["context_relevance"] for r in results) / total
    avg_fact_recall = sum(r["scores"]["fact_recall"] for r in results) / total
    crag_accuracy = sum(1 for r in results if r["crag_correct"]) / total
    avg_latency = sum(r["latency_ms"] for r in results) / total

    composite_score = (avg_faithfulness + avg_relevance + avg_context_rel) / 3.0

    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "sample_count": total,
        "fail_under_threshold": fail_under,
        "passed": composite_score >= fail_under,
        "metrics": {
            "composite_score": round(composite_score, 3),
            "avg_faithfulness": round(avg_faithfulness, 3),
            "avg_answer_relevance": round(avg_relevance, 3),
            "avg_context_relevance": round(avg_context_rel, 3),
            "avg_fact_recall": round(avg_fact_recall, 3),
            "crag_accuracy": round(crag_accuracy, 3),
            "avg_latency_ms": round(avg_latency, 1)
        },
        "results": results
    }

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_file = REPORTS_DIR / "latest_eval.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"\n--------------------------------------------------------")
    print(f"  EVALUATION SUMMARY & CI METRICS")
    print(f"--------------------------------------------------------")
    print(f"• Total Benchmark Tests : {total}")
    print(f"• Composite Quality     : {composite_score:.3f} (Threshold: {fail_under})")
    print(f"• Faithfulness (Grounded): {avg_faithfulness:.3f}")
    print(f"• Answer Relevance      : {avg_relevance:.3f}")
    print(f"• Context Relevance     : {avg_context_rel:.3f}")
    print(f"• Fact Recall           : {avg_fact_recall:.3f}")
    print(f"• CRAG Routing Accuracy : {crag_accuracy * 100:.1f}%")
    print(f"• Average Latency       : {avg_latency:.1f} ms")
    print(f"--------------------------------------------------------")
    print(f"Report saved to: {report_file}")

    if composite_score >= fail_under:
        print(f" Result: PASSED (Quality meets or exceeds {fail_under})")
        return 0
    else:
        print(f" Result: FAILED (Quality {composite_score:.3f} below threshold {fail_under})")
        return 1


def main():
    parser = argparse.ArgumentParser(description="DocuMind Golden Dataset & CI Evaluator")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET, help="Path to golden dataset JSON")
    parser.add_argument("--sample-size", type=int, default=None, help="Limit number of test samples to run")
    parser.add_argument("--fail-under", type=float, default=0.75, help="Composite metric threshold to pass CI")
    args = parser.parse_args()

    exit_code = asyncio.run(run_evaluation(args.dataset, args.sample_size, args.fail_under))
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
