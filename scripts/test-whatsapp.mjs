// Verifies the WhatsApp endpoint wiring WITHOUT needing Twilio creds:
// auth gating, graceful "not configured" fallback, and input validation.
const BASE = process.env.BASE ?? "http://localhost:3000";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("ok:", msg);
}

async function main() {
  // Unauthenticated -> 401 (never an open relay)
  let r = await fetch(`${BASE}/api/whatsapp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: "+15550000000", message: "hi" }),
  });
  assert(r.status === 401, `unauthenticated send returns 401 (got ${r.status})`);

  // Sign up for a session cookie
  const email = `wa+${process.pid}-${process.hrtime.bigint()}@test.local`;
  r = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "WA", email, password: "supersecret123" }),
  });
  assert(r.status === 201, "signup returns 201");
  const cookie = r.headers.get("set-cookie");
  assert(!!cookie, "got session cookie");

  // Authenticated but no Twilio creds -> 503 not-configured (graceful)
  r = await fetch(`${BASE}/api/whatsapp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ to: "+15550000000", message: "hello 👋" }),
  });
  const data = await r.json();
  assert(
    r.status === 503 && data.configured === false,
    `authed send without creds -> 503 not-configured (got ${r.status})`,
  );

  // Bad input -> 400
  r = await fetch(`${BASE}/api/whatsapp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ to: "", message: "" }),
  });
  assert(r.status === 400, `empty payload -> 400 (got ${r.status})`);

  console.log("\nWhatsApp wiring checks passed. Add Twilio creds to actually deliver.");
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
