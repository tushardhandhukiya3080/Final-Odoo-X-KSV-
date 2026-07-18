// Smoke test: proves the free WhatsApp engine (Baileys) actually reaches
// WhatsApp and produces a pairing QR — no phone scan needed to pass.
// Run: node scripts/test-baileys.mjs   (Ctrl+C or it auto-exits in ~25s)
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import P from "pino";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "wa-smoke-"));

async function main() {
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch {}

  const sock = makeWASocket({ auth: state, version, logger: P({ level: "silent" }) });
  sock.ev.on("creds.update", saveCreds);

  const done = (code, msg) => {
    console.log(msg);
    try { sock.end?.(); rmSync(dir, { recursive: true, force: true }); } catch {}
    process.exit(code);
  };

  sock.ev.on("connection.update", (u) => {
    if (u.qr) done(0, "PASS: WhatsApp reachable, pairing QR received. Engine works.");
    if (u.connection === "open") done(0, "PASS: already connected.");
  });

  setTimeout(() => done(1, "FAIL: no QR within 25s (network/WhatsApp blocked?)."), 25_000);
}

main().catch((e) => {
  console.error("FAIL:", e?.message ?? e);
  process.exit(1);
});
