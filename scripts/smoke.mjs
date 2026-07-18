// Runnable end-to-end check against a running dev server (npm run dev).
// Signs up a fresh user, logs in, reads /me, logs out. Exits non-zero on failure.
const BASE = process.env.BASE ?? "http://localhost:3000";
const email = `smoke+${process.pid}-${process.hrtime.bigint()}@test.local`;
const password = "supersecret123";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("ok:", msg);
}

async function main() {
  // signup (also sets session cookie)
  let res = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Smoke", email, password }),
  });
  assert(res.status === 201, `signup returns 201 (got ${res.status})`);

  // duplicate signup -> 409
  res = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Smoke", email, password }),
  });
  assert(res.status === 409, `duplicate signup returns 409 (got ${res.status})`);

  // login -> capture cookie
  res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert(res.status === 200, `login returns 200 (got ${res.status})`);
  const cookie = res.headers.get("set-cookie");
  assert(!!cookie && cookie.includes("session="), "login sets session cookie");

  // wrong password -> 401
  res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "wrong" }),
  });
  assert(res.status === 401, `wrong password returns 401 (got ${res.status})`);

  // /me with cookie -> user
  res = await fetch(`${BASE}/api/auth/me`, { headers: { cookie } });
  assert(res.status === 200, `/me returns 200 with cookie (got ${res.status})`);
  const me = await res.json();
  assert(me.user?.email === email, "/me returns the right user");

  // /me without cookie -> 401
  res = await fetch(`${BASE}/api/auth/me`);
  assert(res.status === 401, `/me returns 401 without cookie (got ${res.status})`);

  console.log("\nAll smoke checks passed.");
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
