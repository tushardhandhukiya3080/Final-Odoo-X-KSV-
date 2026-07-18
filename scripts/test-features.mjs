// End-to-end check for the new capabilities: semantic search + live SSE.
const BASE = process.env.BASE ?? "http://localhost:3000";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("ok:", msg);
}

async function main() {
  // --- Semantic search ---
  const docs = [
    "The mitochondria is the powerhouse of the cell.",
    "Our Q3 revenue grew 18% driven by enterprise subscriptions.",
    "Espresso is brewed by forcing hot water through finely-ground coffee beans.",
  ];
  for (const content of docs) {
    const r = await fetch(`${BASE}/api/search/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    assert(r.status === 201, `ingest: "${content.slice(0, 32)}…"`);
  }

  const r = await fetch(`${BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "a caffeinated morning drink" }),
  });
  const data = await r.json();
  assert(r.status === 200 && data.results.length > 0, "search returns results");
  assert(
    data.results[0].content.toLowerCase().includes("espresso"),
    `top hit for 'caffeinated drink' is the coffee doc (got: "${data.results[0].content.slice(0, 40)}…", sim ${(data.results[0].similarity * 100).toFixed(0)}%)`,
  );

  // --- Live SSE ---
  const controller = new AbortController();
  const received = [];
  const streamDone = (async () => {
    const res = await fetch(`${BASE}/api/events`, { signal: controller.signal });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const line = chunk.split("\n").find((l) => l.startsWith("data:"));
        if (line) {
          try {
            received.push(JSON.parse(line.slice(5).trim()));
          } catch {
            /* ignore */
          }
        }
      }
    }
  })().catch(() => {});

  await new Promise((res) => setTimeout(res, 600));
  await fetch(`${BASE}/api/events/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "test.event", data: { x: 1 } }),
  });
  await new Promise((res) => setTimeout(res, 600));
  controller.abort();
  await streamDone;

  assert(received.some((e) => e.type === "connected"), "SSE sends initial 'connected' event");
  assert(received.some((e) => e.type === "test.event"), "SSE delivers a published event live");

  console.log("\nAll feature checks passed.");
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
