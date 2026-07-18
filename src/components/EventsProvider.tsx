"use client";

// ONE Server-Sent Events connection per tab, shared by every component that
// needs live updates. Previously AppShell, LiveFeed and TripClient each opened
// their own EventSource — with a couple of tabs that exhausts the browser's
// ~6-connections-per-host limit and new page loads hang. This fixes that.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type AppEvent = { type: string; data?: Record<string, unknown>; at?: string };
type Listener = (ev: AppEvent) => void;

const EventsCtx = createContext<{
  subscribe: (l: Listener) => () => void;
  connected: boolean;
} | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const listeners = useRef<Set<Listener>>(new Set());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data) as AppEvent;
        listeners.current.forEach((l) => l(ev));
      } catch {
        /* heartbeat / non-JSON */
      }
    };
    return () => es.close();
  }, []);

  const subscribe = useCallback((l: Listener) => {
    listeners.current.add(l);
    return () => {
      listeners.current.delete(l);
    };
  }, []);

  return <EventsCtx.Provider value={{ subscribe, connected }}>{children}</EventsCtx.Provider>;
}

/** Subscribe to app events. The handler can change each render; only one
 * subscription is kept and it always calls the latest handler. */
export function useAppEvents(handler: Listener): void {
  const ctx = useContext(EventsCtx);
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribe((ev) => ref.current(ev));
  }, [ctx]);
}

export function useEventsConnected(): boolean {
  return useContext(EventsCtx)?.connected ?? false;
}
