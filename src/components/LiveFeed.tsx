"use client";

import { useEffect, useState } from "react";

type Ev = { type: string; data?: unknown; at: string };

export default function LiveFeed() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onopen = () => setConnected(true);
    es.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data) as Ev;
        setEvents((prev) => [ev, ...prev].slice(0, 15));
      } catch {
        /* heartbeat / non-JSON */
      }
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  async function sendTest() {
    await fetch("/api/events/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "demo.ping", data: { at: "dashboard" } }),
    });
  }

  return (
    <div className="panel">
      <div className="feed-head">
        <span className={`dot ${connected ? "on" : "off"}`} />
        <strong>Live activity</strong>
        <span className="muted sm">{connected ? "connected" : "reconnecting…"}</span>
        <button className="btn-ghost sm" onClick={sendTest}>
          Send test event
        </button>
      </div>
      <ul className="feed">
        {events.length === 0 && <li className="muted">Waiting for events…</li>}
        {events.map((e, i) => (
          <li key={i}>
            <code>{e.type}</code>
            <span className="ts">{new Date(e.at).toLocaleTimeString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
