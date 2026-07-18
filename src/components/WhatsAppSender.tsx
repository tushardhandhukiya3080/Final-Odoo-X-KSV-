"use client";

import { useState } from "react";

export default function WhatsAppSender() {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, message }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ ok: true, text: `Sent ✓ (message ${data.sid})` });
        setMessage("");
      } else {
        setStatus({ ok: false, text: data.error ?? "Failed to send" });
      }
    } catch {
      setStatus({ ok: false, text: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={send}>
      <div className="field">
        <label htmlFor="to">Recipient (E.164)</label>
        <input
          id="to"
          placeholder="+14155551234"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="msg">Message</label>
        <textarea
          id="msg"
          placeholder="Hello from the app 👋"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>
      {status && <div className={status.ok ? "success" : "error"}>{status.text}</div>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send WhatsApp"}
      </button>
    </form>
  );
}
