import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { embed, toVector } from "@/lib/embeddings";

// POST { query: string, limit?: number } -> semantic (cosine) search.
export async function POST(req: Request) {
  let body: { query?: unknown; limit?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const q = String(body.query ?? "").trim();
  if (!q) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }
  const limit = Math.min(Math.max(Number(body.limit) || 5, 1), 20);

  const embedding = toVector(await embed(q));
  const result = await query<{ id: string; content: string; similarity: number }>(
    `SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
     FROM documents
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [embedding, limit],
  );

  return NextResponse.json({ query: q, results: result.rows });
}
