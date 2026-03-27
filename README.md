# AI Knowledge Assistant

Production-oriented full-stack RAG application built with React, Express, PostgreSQL, `pgvector`, and the Gemini API.

Users can upload text or markdown knowledge files, index them as embeddings, and ask questions against that knowledge base. The backend retrieves relevant chunks with vector search and generates answers with Gemini. The chat layer also supports MCP-style backend tool calling for document inspection tasks.

## Stack

### Frontend
- React + Vite
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

### Data + AI
- PostgreSQL
- `pgvector`
- Gemini API

## Features

- Upload `.txt` and `.md` files
- Chunk and embed document content
- Store embeddings in PostgreSQL with `VECTOR(1536)`
- Retrieve top matching chunks with cosine similarity
- Stream chat answers back to the UI
- MCP-style tool registry for backend tool calls
- Centralized error handling and input validation
- Pending-ingestion mode when the AI provider is unavailable during upload

## Project Structure

```text
backend/
  src/
    ai/
    config/
    middleware/
    modules/
      chat/
      documents/
    repositories/
    types/
    utils/
  sql/

frontend/
  src/
    components/
    hooks/
    pages/
    services/
    types/
```

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 15+ with `pgvector`
- Gemini API key

## Environment

Copy [/.env.example](C:\Users\thanu\Desktop\MCP+RAG\.env.example) into `.env` and fill in the values.

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

# Frontend
VITE_API_URL=http://localhost:4000/api
```

### Managed PostgreSQL note

If you are using a hosted provider such as Aiven, your connection string may require SSL, for example:

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/ai_knowledge_assistant?sslmode=require
```

## Database Setup

The application will attempt to bootstrap its schema on startup. It creates:
- `documents`
- `document_chunks`
- `pgvector` extension
- vector and lookup indexes

You can also run [init.sql](C:\Users\thanu\Desktop\MCP+RAG\backend\sql\init.sql) manually if you prefer explicit setup.

## Install Dependencies

From the repo root:

```powershell
npm install
```

## Run the App

Use two terminals from the repo root.

### 1. Start the backend

```powershell
npm run dev --workspace backend
```

Backend runs on `http://localhost:4000`.

### 2. Start the frontend

```powershell
npm run dev --workspace frontend
```

Frontend runs on `http://localhost:5173`.

## Build for Production

From the repo root:

```powershell
npm run build
```

## API Overview

### Health

`GET /health`

### Upload document

`POST /api/documents/upload`

Multipart form-data:
- `file`: `.txt` or `.md`

Success response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "notes.md",
    "status": "ready",
    "createdAt": "2026-03-27T10:00:00.000Z",
    "chunkCount": 8
  }
}
```

If Gemini embeddings are temporarily unavailable, upload still succeeds and the document is marked `pending_embeddings`.

### List documents

`GET /api/documents`

### Get document by id

`GET /api/documents/:id`

### Chat with RAG

`POST /api/chat`

Request:

```json
{
  "question": "How does JWT refresh token work?"
}
```

The backend:
1. embeds the query with Gemini embeddings
2. retrieves the top 5 similar chunks
3. optionally executes backend tools
4. streams the final answer back to the frontend

## RAG Flow

1. User uploads a knowledge file
2. Backend reads the file into memory
3. Content is split into chunks
4. Gemini embeddings are generated for each chunk
5. Chunks are stored in `document_chunks`
6. User asks a question
7. Backend embeds the question
8. PostgreSQL vector search retrieves relevant chunks
9. Gemini generates an answer grounded in retrieved context

## MCP-Style Tools

The chat layer supports a small tool registry for backend operations.

Current tools:
- `search_documents`
- `get_document_by_id`
- `list_documents`

Tool execution is validated with Zod and logged on the backend.

## Backend Design Notes

- Controller -> Service -> Repository flow
- DB access lives in repositories
- AI logic lives in `backend/src/ai`
- Validation uses Zod
- Errors are normalized through a central middleware
- Requests and failures are logged with Pino

## Common Issues

### Database schema startup failure

If the backend cannot create its schema automatically, your DB user likely lacks permission to create the `vector` extension, tables, or indexes. In that case, run [init.sql](C:\Users\thanu\Desktop\MCP+RAG\backend\sql\init.sql) manually or adjust provider permissions.

### `GEMINI_API_KEY is required`

Make sure `.env` exists at the repo root and contains a valid Gemini key.

### Upload fails

Only `.txt` and `.md` files are supported. The backend also enforces a size limit through `MAX_UPLOAD_SIZE_MB`.

### Duplicate upload blocked

Document titles are unique by file name, case-insensitively. Uploading `Notes.md` after `notes.md` will be rejected as a duplicate.

## Useful Commands

```powershell
npm run dev --workspace backend
npm run dev --workspace frontend
npm run build
```

## Future Improvements

- add automated tests
- add document ownership and auth
- add migrations
- add background retry for `pending_embeddings`
