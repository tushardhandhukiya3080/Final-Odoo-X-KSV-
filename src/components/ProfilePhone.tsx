"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export default function ProfilePhone({ initialPhone }: { initialPhone: string | null }) {
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      await api("/api/profile", { method: "PATCH", body: { phone } });
      setMsg("WhatsApp number saved — you'll get ride invoices here.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="surface" onSubmit={save} style={{ marginBottom: 20 }}>
      <div className="section-title" style={{ marginTop: 0 }}>📱 WhatsApp number</div>
      <p className="muted sm" style={{ margin: "0 0 12px" }}>
        Payment invoices are sent here after every trip. Use E.164 format, e.g. <b>+919000000001</b>.
      </p>
      {msg && <div className="success">{msg}</div>}
      {error && <div className="error">{error}</div>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91…"
          style={{
            flex: 1,
            minWidth: 200,
            padding: "12px 13px",
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            color: "var(--text)",
            outline: "none",
          }}
        />
        <button className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
