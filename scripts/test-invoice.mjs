// Verifies the invoice endpoint: auth gating, formatting (total + items),
// and graceful fallback. Works WITHOUT Twilio creds — the route returns the
// formatted `message` it would have sent.
const BASE = process.env.BASE ?? "http://localhost:3000";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("ok:", msg);
}

async function main() {
  // Unauthenticated -> 401
  let r = await fetch(`${BASE}/api/whatsapp/invoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: "+15550000000", items: [{ name: "X", qty: 1, price: 1 }] }),
  });
  assert(r.status === 401, `unauthenticated invoice returns 401 (got ${r.status})`);

  // Sign up for a cookie
  const email = `inv+${process.pid}-${process.hrtime.bigint()}@test.local`;
  r = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Inv", email, password: "supersecret123" }),
  });
  assert(r.status === 201, "signup returns 201");
  const cookie = r.headers.get("set-cookie");

  // Valid invoice, no creds -> 503 not-configured, but message is formatted
  r = await fetch(`${BASE}/api/whatsapp/invoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      to: "+15550000000",
      customerName: "Alice",
      invoiceNo: "INV-42",
      items: [
        { name: "Widget", qty: 2, price: 100 },
        { name: "Gadget", qty: 1, price: 150 },
      ],
    }),
  });
  const data = await r.json();
  assert(r.status === 503 && data.configured === false, `authed invoice, no creds -> 503 (got ${r.status})`);
  assert(data.message.includes("Widget × 2 — ₹200.00"), "line item formatted with computed amount");
  assert(data.message.includes("*Total: ₹350.00*"), "total is correct (₹350.00)");
  console.log("\n--- formatted invoice preview ---\n" + data.message + "\n");

  // No items -> 400
  r = await fetch(`${BASE}/api/whatsapp/invoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ to: "+15550000000", items: [] }),
  });
  assert(r.status === 400, `empty items -> 400 (got ${r.status})`);

  console.log("Invoice checks passed. Add Twilio creds to actually deliver.");
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
