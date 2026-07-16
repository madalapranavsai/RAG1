# Design Guide

## Product Feel

The app should feel like a focused SaaS dashboard for managing a private knowledge base. It should be clean, structured, and practical. Avoid a landing-page-heavy feel. The main experience should be upload, manage documents, ask questions, and verify citations. A2UI components should make answers easier to explore without making the interface feel unpredictable.

## Visual Direction

- Quiet professional interface.
- Light theme first.
- Clear hierarchy.
- Dense but readable dashboard layout.
- Minimal decoration.
- Use status badges, tables, panels, and clean empty states.

## Core Navigation

Primary navigation:

- Dashboard
- Documents
- Chat
- Usage
- Settings

## Pages

### Dashboard

Purpose:

- Show product overview and current workspace status.

Content:

- Total documents.
- Ready documents.
- Processing documents.
- Total questions.
- Recent documents.
- Recent chats.

### Documents

Purpose:

- Upload and manage documents.

Content:

- Upload area.
- Document table.
- Status badge.
- File type.
- Created date.
- Chunk count.
- Error state if processing failed.

### Chat

Purpose:

- Ask questions over uploaded documents.

Layout:

- Left sidebar: chat history or document filters.
- Main panel: message thread.
- Bottom input: question composer.
- Citation area under assistant answers.

Answer display:

- Assistant answer text.
- Citation chips or numbered source references.
- Expandable source snippets.
- Optional A2UI blocks below the answer.

### Usage

Purpose:

- Show SaaS-like activity and cost awareness.

Content:

- Documents uploaded.
- Chunks indexed.
- Questions asked.
- Embeddings generated.
- Answers generated.

### Settings

Purpose:

- Manage workspace basics.

Content:

- Workspace name.
- Current user email.
- Future area for team members and billing.

## Components

### Status Badge

Statuses:

- Uploaded: neutral
- Processing: blue
- Ready: green
- Failed: red

### Upload Dropzone

States:

- Idle
- Dragging
- Uploading
- Uploaded
- Error

### Citation

Citation should show:

- Document title.
- Page number if available.
- Chunk/source label.
- Short preview.

### A2UI Components

Allowed components:

- Citation cards.
- Source preview panels.
- Suggested prompt buttons.
- Document filter chips.
- Comparison tables.

Design rules:

- A2UI components appear below the assistant answer.
- Components must be visually connected to the answer they belong to.
- Suggested prompts should look like secondary actions.
- Source previews should prioritize document title, page, and snippet.
- Comparison tables should be compact and readable.
- Invalid or unsupported components should not render.

### Empty States

Examples:

- No documents: show upload action.
- No chats: show suggested first question.
- No usage: explain that activity appears after uploads and questions.

## Layout Rules

- Use a fixed sidebar on desktop.
- Use top navigation or drawer on mobile.
- Keep dashboard cards compact.
- Keep tables readable.
- Do not hide document status.
- Do not make the chat input hard to find.

## Suggested Color Tokens

Use a balanced palette:

- Background: `#f8fafc`
- Surface: `#ffffff`
- Text: `#0f172a`
- Muted text: `#64748b`
- Border: `#e2e8f0`
- Primary: `#2563eb`
- Success: `#16a34a`
- Warning: `#d97706`
- Error: `#dc2626`

## Typography

- Use a modern sans-serif font.
- Keep headings clear but not oversized.
- Use readable line height for chat answers.
- Avoid tiny citation text.

## Interaction Rules

- Upload should give immediate feedback.
- Processing should update status clearly.
- Ask button should disable while answering.
- Chat should preserve scroll position sensibly.
- Errors should explain what failed and what the user can do next.
- Generated UI should never trigger sensitive actions without confirmation.

## Demo Polish

For resume/demo:

- Include one sample document.
- Include example questions.
- Show citations visibly.
- Include a short "retrieved sources" section for credibility.
- Show at least one A2UI interaction, such as a suggested follow-up or source preview.
- Make the usage dashboard look like a real SaaS feature.
