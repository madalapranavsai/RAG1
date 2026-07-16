# Testing Guide

## Goal

This guide defines how to test the RAG SaaS application from MVP through the optional A2UI layer. The focus is to prove that the app works like a real SaaS product: users can upload documents, query them safely, receive grounded answers, and never access another workspace's data.

## Test Accounts

Create two test users:

- `user-a@example.com`
- `user-b@example.com`

Each user should have a separate workspace.

## Sample Test Documents

Use small documents first so failures are easy to debug.

### Document 1: Refund Policy

File name: `refund-policy.md`

```md
# Refund Policy

Customers can request a refund within 7 days of purchase.
Refunds are not available for custom enterprise plans.
Refund requests must include the order ID and customer email.
Approved refunds are processed within 5 business days.
```

### Document 2: Security Policy

File name: `security-policy.md`

```md
# Security Policy

All user documents are private to their workspace.
Workspace members can view documents in their own workspace only.
The system uses row-level security to prevent cross-workspace access.
Service keys must never be exposed in browser code.
```

### Document 3: Product FAQ

File name: `product-faq.md`

```md
# Product FAQ

The product supports PDF, TXT, and Markdown uploads.
Documents are split into chunks before embeddings are generated.
Answers include citations from retrieved document chunks.
If the answer is not found in the uploaded documents, the assistant should say so.
```

## Manual MVP Test Checklist

### Authentication

- User can sign up.
- User can log in.
- User can log out.
- Logged-out users cannot access dashboard pages.
- Refreshing the page preserves the session.

### Workspace

- New user gets a default workspace.
- Dashboard shows the current workspace.
- User A cannot see User B's workspace data.

### Document Upload

- User can upload Markdown.
- User can upload TXT.
- User can upload PDF.
- Unsupported file types show a clear error.
- Uploaded document appears in the document list.
- Upload status changes from `uploaded` to `processing` to `ready`.
- Failed processing shows `failed` with a useful error message.

### Ingestion

- Text is extracted from uploaded documents.
- Text is chunked into `document_chunks`.
- Each chunk has `workspace_id`.
- Each chunk has `document_id`.
- Each chunk has source metadata.
- Document status becomes `ready` only after chunks are saved.

### Embeddings

- Each chunk receives an embedding.
- Query embedding uses the same model as chunk embeddings.
- Vector dimension matches the database column.
- Failed embedding calls do not mark the document as ready.

### Retrieval

- Query: `How many days do customers have to request a refund?`
- Expected source: `refund-policy.md`
- Expected answer: `7 days`

- Query: `Are enterprise plans refundable?`
- Expected source: `refund-policy.md`
- Expected answer: custom enterprise plans are not refundable.

- Query: `Which file formats are supported?`
- Expected source: `product-faq.md`
- Expected answer: PDF, TXT, and Markdown.

- Query: `What database does the app use?`
- Expected behavior: if not present in uploaded documents, the assistant should say the answer was not found.

### Answer Generation

- Answer uses retrieved context.
- Answer includes citations.
- Answer does not invent unsupported facts.
- Answer says not found when the documents do not contain the answer.
- Retrieved chunk IDs are saved with assistant messages.

### Chat History

- User question is saved.
- Assistant answer is saved.
- Chat reload shows previous messages.
- Citations still display after reload.

### Usage Dashboard

- Document upload increments usage.
- Chunk creation increments usage.
- Question asking increments usage.
- Answer generation increments usage.

## Tenant Isolation Tests

These are critical.

1. Log in as User A and upload `refund-policy.md`.
2. Log in as User B and upload `security-policy.md`.
3. Ask as User A: `What does the security policy say?`
4. Expected: User A should not retrieve User B's security document.
5. Ask as User B: `What is the refund period?`
6. Expected: User B should not retrieve User A's refund document.

Database checks:

- All `documents` rows have the correct `workspace_id`.
- All `document_chunks` rows have the correct `workspace_id`.
- Vector search SQL filters by `workspace_id`.
- RLS policies block direct access to another workspace.

## RAG Quality Tests

Create a small spreadsheet or table with:

- Question
- Expected answer
- Expected document
- Expected citation
- Actual answer
- Pass/fail

Minimum evaluation set:

| Question | Expected |
| --- | --- |
| How long is the refund window? | 7 days |
| Are custom enterprise plans refundable? | No |
| What details are needed for refund requests? | Order ID and customer email |
| How long do approved refunds take? | 5 business days |
| What file types are supported? | PDF, TXT, Markdown |
| What should happen when the answer is missing? | Say not found |

Passing target for resume demo:

- 5 out of 6 questions should retrieve the right document.
- 5 out of 6 answers should be factually correct.
- 6 out of 6 grounded answers should show citations.

## A2UI Tests

Run these after the core RAG flow works.

### Valid UI Payload

Input:

```json
{
  "components": [
    {
      "type": "citation_cards",
      "items": [
        {
          "document_id": "doc_123",
          "chunk_id": "chunk_456",
          "title": "Refund Policy",
          "page": 1,
          "snippet": "Customers can request a refund within 7 days."
        }
      ]
    },
    {
      "type": "suggested_prompts",
      "items": [
        {
          "label": "Ask about exceptions",
          "prompt": "What refund exceptions exist?"
        }
      ]
    }
  ],
  "actions": []
}
```

Expected:

- Citation card renders.
- Suggested prompt button renders.
- Clicking suggested prompt fills or sends the prompt.

### Invalid Component Type

Input:

```json
{
  "components": [
    {
      "type": "raw_html",
      "html": "<script>alert('bad')</script>"
    }
  ],
  "actions": []
}
```

Expected:

- Component does not render.
- No script runs.
- App logs a validation error.

### Cross-Workspace Reference

Input:

```json
{
  "components": [
    {
      "type": "citation_cards",
      "items": [
        {
          "document_id": "document_from_another_workspace",
          "chunk_id": "chunk_from_another_workspace",
          "title": "Private Document",
          "snippet": "Should not be visible."
        }
      ]
    }
  ],
  "actions": []
}
```

Expected:

- Component is rejected.
- No private document metadata is displayed.

## Suggested Automated Tests

### Unit Tests

- Chunking function returns stable chunk sizes.
- Chunking preserves source labels.
- Embedding function rejects empty text.
- Prompt builder includes retrieved context.
- Prompt builder includes not-found instruction.
- A2UI validator accepts valid payloads.
- A2UI validator rejects unknown component types.

### Integration Tests

- Upload creates a document record.
- Processing creates chunks.
- Embedding updates chunk vectors.
- Retrieval only returns chunks from current workspace.
- Chat request saves user and assistant messages.
- Usage events are created for key actions.

### End-to-End Tests

Use Playwright once the UI exists.

Flows:

- Signup -> dashboard.
- Upload document -> status ready.
- Ask question -> answer with citation.
- Reload chat -> previous answer appears.
- User A cannot access User B document route.

## Demo Test Script

Use this before recording a resume demo:

1. Create a fresh test account.
2. Upload `refund-policy.md`.
3. Wait for status `ready`.
4. Ask: `How long do customers have to request a refund?`
5. Confirm answer says `7 days`.
6. Confirm citation points to `refund-policy.md`.
7. Ask: `Are custom enterprise plans refundable?`
8. Confirm answer says they are not refundable.
9. Open Usage page.
10. Show documents, chunks, and questions counters.
11. If A2UI is implemented, click a suggested follow-up prompt.

## Final Acceptance Criteria

The application is demo-ready when:

- Auth works.
- Upload works.
- Ingestion works.
- Retrieval works.
- Answers are cited.
- Missing answers are handled honestly.
- Tenant isolation passes manual tests.
- Usage dashboard shows real activity.
- A2UI, if enabled, validates payloads before rendering.

