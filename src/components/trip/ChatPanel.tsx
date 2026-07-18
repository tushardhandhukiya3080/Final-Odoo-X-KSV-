"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { ChatMessage } from "./types";

interface Props {
  rideId: string;
  currentUserId: string;
  messages: ChatMessage[];
}

export default function ChatPanel({ rideId, currentUserId, messages }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await api(`/api/rides/${rideId}/messages`, { method: "POST", body: { body } });
      setText(""); // the message arrives back over SSE and is appended by the parent
    } catch {
      /* keep text so the user can retry */
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat">
      <div className="chat-log" ref={logRef}>
        {messages.length === 0 && <span className="muted sm">Say hi to coordinate pickup 👋</span>}
        {messages.map((m, i) => {
          const mine = m.mine ?? m.senderId === currentUserId;
          return (
            <div key={m.id ?? `${m.at}-${i}`} className={`msg ${mine ? "me" : "them"}`}>
              {!mine && <span className="who">{m.senderName}</span>}
              {m.body}
            </div>
          );
        })}
      </div>
      <form className="chat-input" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          maxLength={1000}
        />
        <button className="btn-primary" disabled={sending}>
          Send
        </button>
      </form>
    </div>
  );
}
