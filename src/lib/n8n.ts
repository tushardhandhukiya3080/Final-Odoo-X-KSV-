// Bridge to your running n8n instance (docker: localhost:5688).
// Fires a payload at an n8n Webhook node so a workflow runs.
const BASE = process.env.N8N_WEBHOOK_URL ?? "http://localhost:5688/webhook";

export type N8nResult = { ok: boolean; status: number; data: unknown };

export async function triggerN8n(path: string, payload: unknown): Promise<N8nResult> {
  const url = `${BASE}/${path.replace(/^\/+/, "")}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* n8n may return plain text */
  }
  return { ok: res.ok, status: res.status, data };
}
