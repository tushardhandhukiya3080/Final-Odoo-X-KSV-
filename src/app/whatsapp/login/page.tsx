"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Status = { connected: boolean; qr: string | null };

export default function WhatsAppLoginPage() {
  const [status, setStatus] = useState<Status>({ connected: false, qr: null });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
        if (res.status === 401) {
          setError("Please log in first.");
          return;
        }
        const data = (await res.json()) as Status;
        if (active) setStatus(data);
      } catch {
        if (active) setError("Could not reach the server.");
      }
    }
    poll();
    const id = setInterval(poll, 2000); // QR rotates ~every 20s; re-fetch keeps it fresh
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h1>Connect WhatsApp</h1>
          <p className="muted sm">
            Scan this QR with WhatsApp on your phone: <b>Settings → Linked devices → Link a device</b>.
            Use a spare/business number.
          </p>
        </div>
        <Link className="btn-ghost" href="/whatsapp">
          ← Send
        </Link>
      </div>

      {error && <p className="muted sm">{error}</p>}

      {status.connected ? (
        <p style={{ fontSize: 18 }}>✅ Connected. You can now send messages and invoices to any number.</p>
      ) : status.qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={status.qr} alt="WhatsApp QR code" width={280} height={280} style={{ imageRendering: "pixelated" }} />
      ) : (
        <p className="muted sm">Generating QR code…</p>
      )}
    </div>
  );
}
