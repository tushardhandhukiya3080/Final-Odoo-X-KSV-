-- Runs automatically the first time the Postgres container starts.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- --- Auth ---
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Case-insensitive uniqueness AND the lookup index in one: enforces one account
-- per email regardless of case, and serves `WHERE lower(email) = $1`.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

-- --- Semantic search (384-dim = all-MiniLM-L6-v2, generated locally) ---
CREATE TABLE IF NOT EXISTS documents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content    TEXT NOT NULL,
  metadata   JSONB NOT NULL DEFAULT '{}',
  embedding  vector(384),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- HNSW index for fast cosine-similarity search.
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents USING hnsw (embedding vector_cosine_ops);
