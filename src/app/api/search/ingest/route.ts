import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { embed, toVector } from "@/lib/embeddings";
import { publish } from "@/lib/events";

// POST { content: string, metadata?: object } -> embed + store for search.
export async function POST(req: Request) {
  let body: { content?: unknown; metadata?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const content = String(body.content ?? "").trim();
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const embedding = toVector(await embed(content));
  const metadata = JSON.stringify(body.metadata ?? {});
  const result = await query<{ id: string }>(
    "INSERT INTO documents (content, metadata, embedding) VALUES ($1, $2, $3) RETURNING id",
    [content, metadata, embedding],
  );

  publish("document.ingested", {
    id: result.rows[0].id,
    preview: content.slice(0, 80),
  });
  return NextResponse.json({ ok: true, id: result.rows[0].id }, { status: 201 });
}
