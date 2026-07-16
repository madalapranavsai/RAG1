# Project Rules

## Product Rules

- The app must behave like a real SaaS product, not a single-page demo.
- Every user-facing answer must be grounded in uploaded documents.
- If retrieved context is insufficient, the app must say the answer was not found.
- Citations are required for generated answers.
- A2UI components may enhance answers, but they must not replace citations.
- Tenant isolation is mandatory for every feature.
- MVP should stay small enough to finish and demo.

## Engineering Rules

- Use TypeScript throughout the app.
- Prefer simple, explicit code over premature abstractions.
- Keep database access behind typed helper functions or API handlers.
- Validate all API inputs.
- Never trust workspace IDs from the client without checking membership.
- Store all timestamps in UTC.
- Keep environment variables out of source control.
- Do not expose service role keys in browser code.
- Log processing failures with enough detail to debug.

## RAG Rules

- Chunk documents before embedding.
- Store source metadata with every chunk.
- Use the same embedding model for document chunks and queries.
- Filter retrieval by `workspace_id` before or during vector search.
- Use top K retrieval with a sensible default of 5.
- Keep prompts deterministic for factual QA.
- Do not allow the model to invent citations.
- Save retrieved chunk IDs with every assistant response.

## A2UI Rules

- Use a strict JSON schema for all generated UI.
- Render only known component types.
- Never render raw HTML from the model.
- Never execute JavaScript from the model.
- Validate all document IDs and chunk IDs against the current workspace.
- Treat model-generated UI as untrusted input.
- Sensitive actions must require explicit user confirmation.
- A2UI should improve exploration with source cards, filters, follow-ups, and previews.
- Keep the first A2UI version small: citation cards and suggested prompts are enough.

## Database Rules

- Every tenant-owned table must include `workspace_id`.
- Enable Row Level Security for tenant-owned tables.
- Add indexes for common filters before demo day.
- Use migrations for schema changes.
- Avoid deleting user data permanently unless explicitly requested.
- Keep original documents and chunks connected by foreign keys.

## UI Rules

- The first screen after login is the dashboard, not a marketing page.
- Show document status clearly.
- Show citations near the answer.
- Make upload, processing, and chat states obvious.
- Avoid cluttered demo-only UI.
- Use empty states for no documents and no chats.
- Keep navigation simple: Dashboard, Documents, Chat, Usage.

## Security Rules

- Check authentication on every protected route.
- Check workspace membership on every workspace action.
- Use storage paths that include workspace and document IDs.
- Avoid logging full document text in production logs.
- Rate-limit expensive routes if deployed publicly.
- Use server-side calls for embedding and LLM providers.

## Resume Rules

- Prioritize features that show full-stack depth:
  - auth
  - upload
  - processing pipeline
  - vector search
  - citations
  - tenant isolation
  - usage tracking
- Keep the README crisp with screenshots and architecture diagram.
- Include a short demo video if possible.
- Add seed/demo data so reviewers can try the app quickly.
- Mention A2UI as an advanced feature only after the core RAG workflow works.

## Done Criteria

A feature is done only when:

- It works in the browser.
- It handles loading and error states.
- It respects workspace access.
- It has basic validation.
- It is documented if setup is non-obvious.
