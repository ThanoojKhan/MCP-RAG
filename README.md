# AI Knowledge Assistant (https://mcp-rag-frontend.vercel.app/)

Production-grade full-stack RAG application for uploading internal knowledge documents, indexing them with embeddings, retrieving relevant chunks with PostgreSQL `pgvector`, and answering questions through a Gemini-powered chat experience with backend tool calling.

The codebase is organized around clean architecture principles:
- controller -> service -> repository flow
- AI concerns isolated in `backend/src/ai`
- database access isolated in repositories
- centralized validation and error handling
- minimal but production-oriented frontend state management with TanStack Query

## What the App Does

1. Users upload `.txt` or `.md` files
2. The backend stores the original raw document content
3. The document is chunked into smaller text segments
4. Gemini embeddings are generated for each chunk
5. Chunks are stored in PostgreSQL with a `VECTOR(1536)` embedding column
6. Users ask a question in the chat UI
7. The backend embeds the question
8. PostgreSQL returns the most similar chunks using vector similarity search
9. Gemini generates an answer grounded in those retrieved chunks
10. The model can also call backend tools such as searching or listing documents

## Tech Stack

### Frontend
- React
- Vite
- TypeScript
- Tailwind CSS
- TanStack Query
- Axios

### Backend
- Node.js
- Express
- TypeScript
- Zod
- Pino
- dotenv

### Database
- PostgreSQL
- `pgvector`

### AI
- Gemini API via `@google/genai`

### Hosting Considerations
- Standard long-running Node.js backend
- Shared PostgreSQL connection pool
- Background retry worker runs inside the backend process

## Monorepo Layout

```text
.
+- backend/
¦  +- sql/
¦  ¦  +- init.sql
¦  +- src/
¦     +- ai/
¦     +- config/
¦     +- middleware/
¦     +- modules/
¦     ¦  +- chat/
¦     ¦  +- documents/
¦     +- repositories/
¦     +- types/
¦     +- utils/
+- frontend/
¦  +- src/
¦     +- components/
¦     +- hooks/
¦     +- pages/
¦     +- services/
¦     +- types/
+- .env.example
+- README.md
```

## Core Architecture

### Backend layers

#### 1. Controllers
Controllers only:
- parse request inputs
- call services
- send normalized responses

Files:
- [chat.controller.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\modules\chat\chat.controller.ts)
- [documents.controller.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\modules\documents\documents.controller.ts)

#### 2. Services
Services contain business logic:
- document upload workflow
- duplicate prevention
- retry orchestration
- RAG request orchestration

Files:
- [chat.service.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\modules\chat\chat.service.ts)
- [documents.service.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\modules\documents\documents.service.ts)

#### 3. Repositories
Repositories are the only layer that talks to PostgreSQL directly.

File:
- [document.repository.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\repositories\document.repository.ts)

#### 4. AI module
The AI module is provider-specific and currently implemented with Gemini.

Files:
- [gemini.client.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\ai\gemini.client.ts)
- [embedding.service.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\ai\embedding.service.ts)
- [rag.service.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\ai\rag.service.ts)
- [tool.registry.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\ai\tool.registry.ts)

#### 5. Middleware and utilities
These provide cross-cutting behavior:
- logging
- centralized error translation
- async route wrapping
- typed app errors

Files:
- [error.middleware.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\middleware\error.middleware.ts)
- [requestLogger.middleware.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\middleware\requestLogger.middleware.ts)
- [apiError.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\utils\apiError.ts)
- [asyncHandler.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\utils\asyncHandler.ts)

## Frontend Architecture

### Pages
- [AssistantPage.tsx](C:\Users\thanu\Desktop\MCP+RAG\frontend\src\pages\AssistantPage.tsx)
  - main composition layer
  - notification/toast state
  - layout for hero, upload, chat, and indexed library

### Components
- [ChatWindow.tsx](C:\Users\thanu\Desktop\MCP+RAG\frontend\src\components\ChatWindow.tsx)
  - streaming chat UI
  - long-conversation viewport control
  - automatic scroll to latest message
- [DocumentUpload.tsx](C:\Users\thanu\Desktop\MCP+RAG\frontend\src\components\DocumentUpload.tsx)
  - upload surface
- [DocumentList.tsx](C:\Users\thanu\Desktop\MCP+RAG\frontend\src\components\DocumentList.tsx)
  - paginated indexed document rail
  - retry action for pending documents

### Services and hooks
- [documents.ts](C:\Users\thanu\Desktop\MCP+RAG\frontend\src\services\documents.ts)
- [chat.ts](C:\Users\thanu\Desktop\MCP+RAG\frontend\src\services\chat.ts)
- [useDocuments.ts](C:\Users\thanu\Desktop\MCP+RAG\frontend\src\hooks\useDocuments.ts)

TanStack Query is used for:
- paginated document fetching
- cache reuse across page transitions
- invalidation after uploads and retries

## Data Model

### `documents`
Stores top-level document metadata and raw source content.

Columns:
- `id`
- `title`
- `status`
- `raw_content`
- `created_at`

### `document_chunks`
Stores chunk-level searchable text with embeddings.

Columns:
- `id`
- `document_id`
- `content`
- `embedding VECTOR(1536)`

## Document Status Model

Each document has one of two states:

### `ready`
- embeddings exist
- chunks exist
- document is searchable by RAG

### `pending_embeddings`
- raw content exists
- chunk embeddings are not yet available
- document is not yet searchable
- can be retried manually or automatically

## Upload Workflow

Implemented primarily in [documents.service.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\modules\documents\documents.service.ts).

### Steps
1. Validate file extension / MIME type
2. Reject binary content
3. Read raw text content
4. Block duplicates if a `ready` document with the same filename already exists
5. If a matching `pending_embeddings` document exists, replace its raw content and reuse that record
6. Save the document as `pending_embeddings`
7. Try to generate Gemini embeddings
8. If embeddings succeed:
   - create chunk rows
   - mark document as `ready`
9. If embeddings fail because the provider is unavailable:
   - keep the document in `pending_embeddings`
   - surface a friendly warning to the UI

## Retry Architecture

### Manual retry
Users can trigger a retry from the indexed library UI.

Endpoint:
- `POST /api/documents/:id/retry`

### Automatic retry
A background retry loop runs inside the backend process and periodically attempts to process pending documents.

Configured by:
- `EMBEDDING_RETRY_INTERVAL_MS`


## RAG Request Flow

Implemented across:
- [chat.service.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\modules\chat\chat.service.ts)
- [rag.service.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\ai\rag.service.ts)

### Steps
1. Validate the incoming question
2. Generate a Gemini embedding for the question
3. Run vector similarity search in PostgreSQL
4. Build a grounded prompt from retrieved chunks
5. Allow the model to decide whether a backend tool should be called
6. Execute any tool calls server-side
7. Generate and stream the final answer to the frontend via SSE

## MCP-Style Tool Calling

Registered in:
- [chat.tools.ts](C:\Users\thanu\Desktop\MCP+RAG\backend\src\modules\chat\chat.tools.ts)

Current tools:
- `search_documents`
- `get_document_by_id`
- `list_documents`

Tool execution behavior:
- model proposes function call
- backend validates arguments with Zod
- backend executes tool function
- tool output is added back into the prompt flow

## API Surface

### Health
`GET /health`

Returns application and database readiness.

### Upload document
`POST /api/documents/upload`

Multipart form-data:
- `file`

### List documents
`GET /api/documents?page=1&pageSize=6`

Returns:
- `items`
- `page`
- `pageSize`
- `totalItems`
- `totalPages`

### Get document by id
`GET /api/documents/:id`

### Retry embeddings for a document
`POST /api/documents/:id/retry`

### Chat
`POST /api/chat`

Request:
```json
{
  "question": "How does JWT refresh token work?"
}
```

Response:
- streamed over server-sent events

## Frontend UX Improvements Already Included

### Indexed library
- backend pagination
- controlled height and scroll region
- retry button for pending documents
- stable page transitions with cached previous data

### Chat
- fixed-height viewport
- scrollable conversation area
- streaming token display
- error-aware fallback messaging

### Query caching
Document pagination uses TanStack Query with:
- `placeholderData: keepPreviousData`
- `staleTime: 30000`
- `gcTime: 5 minutes`

This improves perceived responsiveness while reducing unnecessary document refetches.

## Environment Variables

Copy [/.env.example](C:\Users\thanu\Desktop\MCP+RAG\.env.example) to `.env`.

```env
# Backend
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_knowledge_assistant
GEMINI_API_KEY=
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_DIMENSION=1536
FRONTEND_ORIGIN=http://localhost:5173
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
MAX_UPLOAD_SIZE_MB=2
EMBEDDING_RETRY_INTERVAL_MS=60000

# Frontend
VITE_API_URL=http://localhost:4000/api
```

## PostgreSQL and `pgvector`

### Local
Use PostgreSQL 15+ with `pgvector` installed.

### Managed providers
For providers such as Aiven, SSL is typically required.

Example:
```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/ai_knowledge_assistant?sslmode=require
```

## Database Bootstrap Behavior

### Local / long-running backend
On startup the backend attempts to:
- create the `vector` extension
- create tables
- add missing columns
- create indexes
- verify schema readiness

## Running Locally

Install dependencies from the repo root:

```powershell
npm install
```

Start backend:

```powershell
npm run dev --workspace backend
```

Start frontend:

```powershell
npm run dev --workspace frontend
```

Build everything:

```powershell
npm run build
```

## Response Shapes

### Success
```json
{
  "success": true,
  "data": {}
}
```

### Error
```json
{
  "success": false,
  "error": {
    "message": "",
    "code": ""
  }
}
```

## Error Handling Strategy

The backend converts common failures into structured API errors, including:
- validation failures
- file upload failures
- duplicate filenames
- missing schema
- AI provider failures
- missing unrecoverable content for old pending documents

This keeps controllers thin and prevents raw infrastructure errors from leaking into responses.

## Logging Strategy

Pino is used across the backend for:
- incoming requests
- startup events
- tool execution logs
- retry worker logs
- error events

Development logging is pretty-printed for easier reading.

## Common Operational Scenarios

### 1. Upload succeeds but status is `pending_embeddings`
The AI provider was unavailable during embedding generation. The system stored the raw document and will allow retry.

### 2. Retry says re-upload is required
That document was created before raw content storage was introduced. Re-uploading the same file now replaces the old pending record.

### 3. Duplicate upload is blocked
A `ready` document with the same filename already exists.

### 4. Chat says no context was retrieved
Usually means there are no `ready` documents with embeddings yet, or the question has no strong match in indexed chunks.

## Recommended Next Improvements

1. Add automated tests for upload, retry, and chat flows
2. Add background job infrastructure for production retry orchestration
3. Add auth and document ownership
4. Add document search/filter UI in the library
5. Add a container or traditional Node deployment target for production

