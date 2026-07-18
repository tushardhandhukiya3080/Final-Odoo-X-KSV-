"use client";

import { useState } from "react";
import { useAppEvents, useEventsConnected, type AppEvent } from "@/components/EventsProvider";

export default function LiveFeed() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const connected = useEventsConnected();

  useAppEvents((ev) => setEvents((prev) => [ev, ...prev].slice(0, 15)));

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
            <span className="ts">{e.at ? new Date(e.at).toLocaleTimeString() : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
