import Link from "next/link";
import SearchClient from "@/components/SearchClient";

export default function SearchPage() {
  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h1>Semantic search</h1>
          <p className="muted sm">
            Local embeddings (all-MiniLM-L6-v2) + pgvector cosine search. No API key.
          </p>
        </div>
        <Link className="btn-ghost" href="/dashboard">
          ← Dashboard
        </Link>
      </div>
      <SearchClient />
    </div>
  );
}
