# Build Phases

## Phase 0: Project Setup

Goal: Create the foundation.

Tasks:

- Create Next.js TypeScript project.
- Add Tailwind CSS.
- Set up Supabase project.
- Add environment variables.
- Create initial README.
- Configure linting and formatting.

Deliverable:

- App runs locally with a basic protected dashboard route.

## Phase 1: Auth and Workspace

Goal: Users can sign up and access their own workspace.

Tasks:

- Implement signup and login.
- Create profile on signup.
- Create default workspace for each new user.
- Add workspace membership table.
- Protect dashboard routes.
- Add logout.

Deliverable:

- User can create an account and land in a workspace dashboard.

## Phase 2: Database and Storage

Goal: Set up document storage and core schema.

Tasks:

- Enable `pgvector`.
- Create tables:
  - profiles
  - workspaces
  - workspace_members
  - documents
  - document_chunks
  - chats
  - chat_messages
  - usage_events
- Enable Row Level Security.
- Add policies for workspace membership.
- Create Supabase Storage bucket.

Deliverable:

- Authenticated user can create and view workspace-scoped records.

## Phase 3: Document Upload

Goal: Users can upload files.

Tasks:

- Build documents page.
- Add upload control for PDF, TXT, and Markdown.
- Upload file to Supabase Storage.
- Insert document metadata.
- Show document list.
- Show status badges.

Deliverable:

- User can upload a document and see it in the dashboard.

## Phase 4: Ingestion Pipeline

Goal: Uploaded documents become searchable chunks.

Tasks:

- Implement text extraction for TXT and Markdown.
- Add PDF extraction.
- Normalize text.
- Chunk extracted text.
- Store chunks without embeddings first.
- Update document status.
- Handle processing failures.

Deliverable:

- Uploaded document is processed into stored chunks.

## Phase 5: Embeddings

Goal: Chunks get vector embeddings.

Tasks:

- Choose embedding provider.
- Add embedding generation function.
- Embed document chunks.
- Save embeddings in `document_chunks`.
- Add vector index.
- Add usage events for generated embeddings.

Deliverable:

- Processed chunks have embeddings and can be searched.

## Phase 6: Retrieval

Goal: The app can find relevant chunks for a question.

Tasks:

- Embed user query.
- Create SQL function for vector search.
- Filter search by workspace ID.
- Return top K chunks.
- Show retrieved snippets in a debug panel during development.

Deliverable:

- A question returns relevant document chunks from the current workspace only.

## Phase 7: Chat and Answer Generation

Goal: Users can ask questions and get answers.

Tasks:

- Build chat UI.
- Create chat and message records.
- Retrieve relevant chunks for each question.
- Build prompt with context.
- Generate answer using local or API model.
- Save assistant response with retrieved chunk IDs.
- Display citations.

Deliverable:

- User can chat with uploaded documents and receive citation-backed answers.

## Phase 8: Usage Dashboard

Goal: Make the SaaS feel real.

Tasks:

- Track document uploads.
- Track chunks created.
- Track questions asked.
- Track answer generations.
- Build usage page with simple stats.

Deliverable:

- Dashboard shows useful product and usage metrics.

## Phase 9: Polish and Demo Readiness

Goal: Make the project resume-ready.

Tasks:

- Improve loading states.
- Add error states.
- Add empty states.
- Add seed/demo document.
- Write README with setup steps.
- Add screenshots.
- Add architecture diagram.
- Record short demo video.

Deliverable:

- Project is ready for GitHub, resume, and interviews.

## Phase 10: Optional V2

Goal: Add advanced differentiators.

Tasks:

- Hybrid search.
- Streaming answers.
- Team invitations.
- Stripe billing.
- Feedback buttons.
- Retrieval evaluation page.
- Admin job monitor.
- A2UI response layer.
- Validated citation cards.
- Suggested follow-up prompt buttons.
- Source preview panels.
- Generated comparison tables from retrieved chunks.

Deliverable:

- Project moves from strong resume project to credible SaaS prototype.

## Phase 11: A2UI Polish

Goal: Make the AI responses feel interactive and product-grade.

Tasks:

- Define the final A2UI JSON schema.
- Add server-side schema validation.
- Store `ui_payload` on assistant messages.
- Build React renderers for allowed component types.
- Add fallback rendering if UI payload is invalid.
- Add tests for unsafe or malformed UI payloads.
- Add a README section explaining the A2UI design.

Deliverable:

- RAG answers can include safe interactive UI components without compromising tenant isolation or citation accuracy.
