// End-to-end golden-path smoke test against the running dev server.
const BASE = "http://localhost:3000";
let ok = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { ok++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
}

function cookieFrom(res) {
  const sc = res.headers.get("set-cookie");
  if (!sc) return null;
  return sc.split(";")[0]; // session=...
}

async function req(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: BASE,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json, cookie: cookieFrom(res) };
}

async function login(email) {
  const r = await req("/api/auth/login", { method: "POST", body: { email, password: "password123" } });
  return r.cookie;
}

console.log("\n🚗 RideShare golden-path smoke test\n");

// 1. Passenger logs in
const carol = await login("carol@acme.com");
check("carol login", !!carol);
const me = await req("/api/auth/me", { cookie: carol });
check("carol /me role=employee", me.json?.user?.role === "employee");
check("carol wallet seeded", me.json?.user?.walletBalance === 1000, `got ${me.json?.user?.walletBalance}`);

// 2. Search for Bob's seeded ride
const today = new Date().toISOString().slice(0, 10);
const search = await req("/api/rides/search", {
  method: "POST",
  cookie: carol,
  body: {
    origin: { lat: 23.0225, lng: 72.5714, label: "Maninagar" },
    dest: { lat: 23.04, lng: 72.52, label: "SG Highway" },
    departDate: today,
    seats: 1,
  },
});
check("search returns matches", Array.isArray(search.json?.data) && search.json.data.length >= 1,
  `got ${JSON.stringify(search.json)?.slice(0, 120)}`);
const ride = search.json?.data?.[0];

// 3. Book it
const booking = await req("/api/bookings", { method: "POST", cookie: carol, body: { rideId: ride?.id, seats: 1 } });
check("booking created", booking.status === 201 && !!booking.json?.data?.id,
  `status ${booking.status} ${JSON.stringify(booking.json)?.slice(0, 120)}`);
const bookingId = booking.json?.data?.id;
check("fare = 45", booking.json?.data?.fareAmount === 45, `got ${booking.json?.data?.fareAmount}`);

// 4. Driver logs in and runs the lifecycle
const bob = await login("bob@acme.com");
check("bob login", !!bob);
const detail = await req(`/api/rides/${ride?.id}`, { cookie: bob });
check("bob is driver", detail.json?.data?.isDriver === true);
check("passenger manifest has carol", detail.json?.data?.passengers?.length === 1);

const started = await req(`/api/rides/${ride?.id}/status`, { method: "POST", cookie: bob, body: { status: "started" } });
check("trip started", started.json?.data?.status === "started", JSON.stringify(started.json));
const ping = await req(`/api/rides/${ride?.id}/ping`, { method: "POST", cookie: bob, body: { lat: 23.03, lng: 72.55 } });
check("driver ping accepted", ping.json?.success === true, JSON.stringify(ping.json));
const done = await req(`/api/rides/${ride?.id}/status`, { method: "POST", cookie: bob, body: { status: "completed" } });
check("trip completed", done.json?.data?.status === "completed", JSON.stringify(done.json));

// 5. Passenger pays from wallet
const pay = await req("/api/payments/direct", { method: "POST", cookie: carol, body: { bookingId, method: "wallet" } });
check("wallet payment ok", pay.json?.data?.paid === true, JSON.stringify(pay.json));
check("carol balance 1000-45=955", pay.json?.data?.balance === 955, `got ${pay.json?.data?.balance}`);

// 6. Driver earned the fare
const bobMe = await req("/api/auth/me", { cookie: bob });
check("bob earned +45 (1045)", bobMe.json?.user?.walletBalance === 1045, `got ${bobMe.json?.user?.walletBalance}`);

// 7. Chat
const chat = await req(`/api/rides/${ride?.id}/messages`, { method: "POST", cookie: carol, body: { body: "On my way!" } });
check("chat message sent", chat.status === 201, JSON.stringify(chat.json));

console.log(`\n${fail === 0 ? "🎉" : "⚠️"}  ${ok} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
