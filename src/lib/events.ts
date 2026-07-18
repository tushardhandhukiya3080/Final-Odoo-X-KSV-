// ponytail: in-process pub/sub for Server-Sent Events. Single instance only —
// swap for Redis pub/sub (or Postgres LISTEN/NOTIFY) if you run multiple nodes.
import { EventEmitter } from "node:events";

export type AppEvent = { type: string; data: unknown; at: string };

const globalForBus = globalThis as unknown as { eventBus?: EventEmitter };
const bus = globalForBus.eventBus ?? new EventEmitter();
bus.setMaxListeners(0); // many SSE clients
if (process.env.NODE_ENV !== "production") globalForBus.eventBus = bus;

export function publish(type: string, data: unknown = {}): AppEvent {
  const event: AppEvent = { type, data, at: new Date().toISOString() };
  bus.emit("event", event);
  return event;
}

export function subscribe(listener: (e: AppEvent) => void): () => void {
  bus.on("event", listener);
  return () => bus.off("event", listener);
}
