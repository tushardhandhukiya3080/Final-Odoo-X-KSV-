import { NextResponse } from "next/server";
import { triggerN8n } from "@/lib/n8n";
import { publish } from "@/lib/events";

// POST { workflow: "demo", payload: {...} } -> fires an n8n webhook workflow.
export async function POST(req: Request) {
  let body: { workflow?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const workflow = body.workflow ?? "demo";
  publish("automation.triggered", { workflow });

  try {
    const result = await triggerN8n(workflow, body.payload ?? {});
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          hint: `n8n responded ${result.status}. In n8n (http://localhost:5688) add a Webhook node with path "${workflow}", set it to POST, and Activate the workflow.`,
          result,
        },
        { status: 502 },
      );
    }
    publish("automation.completed", { workflow, result: result.data });
    return NextResponse.json({ ok: true, result: result.data });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        hint: "Could not reach n8n. Is the container up on :5688? Override with N8N_WEBHOOK_URL.",
        error: (err as Error).message,
      },
      { status: 502 },
    );
  }
}
