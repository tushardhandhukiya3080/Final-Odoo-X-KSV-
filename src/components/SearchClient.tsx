"use client";

import { useState } from "react";

const SAMPLES = [
  "The mitochondria is the powerhouse of the cell.",
  "Our Q3 revenue grew 18% driven by enterprise subscriptions.",
  "To reset your password, click the link in the email we sent you.",
  "The Great Barrier Reef is the world's largest coral reef system.",
  "React hooks let you use state without writing a class.",
  "Espresso is brewed by forcing hot water through finely-ground coffee beans.",
];

type Result = { id: string; content: string; similarity: number };

export default function SearchClient() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [doc, setDoc] = useState("");

  async function ingest(content: string) {
    await fetch("/api/search/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    const data = await res.json();
    const rows: Result[] = data.results ?? [];
    setResults(rows);
    if (rows.length === 0) setNote("No documents indexed yet — seed samples below.");
    setBusy(false);
  }

  async function seed() {
    setBusy(true);
    setNote("Indexing sample documents (embedding locally)…");
    for (const s of SAMPLES) await ingest(s);
    setNote(`Indexed ${SAMPLES.length} docs. Try "cell biology", "how do I log in", or "coffee".`);
    setBusy(false);
  }

  async function addDoc() {
    if (!doc.trim()) return;
    setBusy(true);
    await ingest(doc);
    setNote("Document added to the index.");
    setDoc("");
    setBusy(false);
  }

  return (
    <>
      <form className="panel" onSubmit={search}>
        <div className="search-row">
          <input
            className="search-input"
            placeholder="Search by meaning, not keywords…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn sm" type="submit" disabled={busy}>
            {busy ? "…" : "Search"}
          </button>
        </div>
        {note && <p className="muted sm" style={{ marginTop: 12 }}>{note}</p>}
        <ul className="results">
          {results.map((r) => (
            <li key={r.id}>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${Math.max(0, r.similarity * 100)}%` }} />
              </div>
              <span className="score">{(r.similarity * 100).toFixed(0)}%</span>
              <span className="content">{r.content}</span>
            </li>
          ))}
        </ul>
      </form>

      <div className="panel" style={{ marginTop: 16 }}>
        <strong>Index documents</strong>
        <div className="search-row" style={{ marginTop: 12 }}>
          <input
            className="search-input"
            placeholder="Add any text to the index…"
            value={doc}
            onChange={(e) => setDoc(e.target.value)}
          />
          <button className="btn-ghost sm" onClick={addDoc} disabled={busy}>
            Add
          </button>
        </div>
        <button className="btn-ghost sm" style={{ marginTop: 12 }} onClick={seed} disabled={busy}>
          Seed sample documents
        </button>
      </div>
    </>
  );
}
