// Send WhatsApp messages via Baileys — free, unlimited, sends to ANY number.
// This is WhatsApp-Web automation (not the official API): you connect your own
// number by scanning a QR once at /whatsapp/login. It is against WhatsApp's ToS,
// so use a spare/business number — the connected number can be banned.
//
// The session is held in a module singleton (this app runs as a long-lived node
// server via `next start`, so the socket stays alive between requests). Auth creds
// are written to .wa-auth/ so you only scan the QR once.
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from "@whiskeysockets/baileys";
import P from "pino";
import path from "node:path";

const AUTH_DIR = path.join(process.cwd(), ".wa-auth");

export type WhatsAppResult =
  | { ok: true; sid: string }
  | { ok: false; configured: boolean; error: string };

// Survive Next.js dev hot-reloads: a plain module-level `let` gets a fresh copy on
// every HMR reload, which would spawn duplicate sockets. Pin state on globalThis.
type WaState = {
  sock: WASocket | null;
  connected: boolean;
  qr: string | null; // latest raw QR string (null once connected)
  starting: Promise<void> | null;
};
const g = globalThis as unknown as { __wa?: WaState };
const wa: WaState =
  g.__wa ?? (g.__wa = { sock: null, connected: false, qr: null, starting: null });

function toJid(to: string): string {
  const digits = to.replace(/[^\d]/g, ""); // strip +, spaces, dashes
  return `${digits}@s.whatsapp.net`;
}

// ponytail: enough MIME types for the common invoice/receipt cases; unknown
// extensions fall back to a generic binary (still delivered as a file).
function guessMime(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return (ext && map[ext]) || "application/octet-stream";
}

async function start(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch {
    // ponytail: offline / rate-limited -> Baileys uses its bundled default version.
  }

  const sock = makeWASocket({
    auth: state,
    version,
    logger: P({ level: "silent" }),
    browser: ["AuthStarterKit", "Chrome", "1.0.0"],
  });
  wa.sock = sock;

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (u) => {
    if (u.qr) wa.qr = u.qr;
    if (u.connection === "open") {
      wa.connected = true;
      wa.qr = null;
    }
    if (u.connection === "close") {
      wa.connected = false;
      const code = (u.lastDisconnect?.error as { output?: { statusCode?: number } })
        ?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        // Number unlinked from phone — drop the socket; next call re-inits and
        // shows a fresh QR. (Stale creds in .wa-auth are overwritten on re-scan.)
        wa.sock = null;
      } else {
        // Any other drop is transient — reconnect.
        wa.starting = null;
        void ensureStarted();
      }
    }
  });
}

// Idempotent: starts the socket at most once even under concurrent callers.
function ensureStarted(): Promise<void> {
  if (wa.connected && wa.sock) return Promise.resolve();
  if (!wa.starting) wa.starting = start();
  return wa.starting;
}

// Right after a (re)start the socket is created but not yet "open". Give the
// reconnect from .wa-auth/ a moment to complete before we decide it's offline.
async function waitForConnection(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!wa.connected && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 250));
  }
}

/** For the QR login screen. */
export async function getWaStatus(): Promise<{ connected: boolean; qr: string | null }> {
  await ensureStarted();
  return { connected: wa.connected, qr: wa.qr };
}

// mediaUrl attaches a document (e.g. a PDF invoice). Baileys FETCHES it server-side,
// so it must be a PUBLICLY reachable URL — localhost won't work without a tunnel.
export async function sendWhatsApp(
  to: string,
  body: string,
  mediaUrl?: string,
): Promise<WhatsAppResult> {
  await ensureStarted();
  if (!wa.connected) await waitForConnection(10_000);
  if (!wa.connected || !wa.sock) {
    return {
      ok: false,
      configured: false,
      error: "WhatsApp not connected. Open /whatsapp/login and scan the QR from your phone.",
    };
  }

  let jid = toJid(to);
  try {
    const [res] = (await wa.sock.onWhatsApp(jid)) ?? [];
    if (!res?.exists) {
      return { ok: false, configured: true, error: `${to} is not a WhatsApp number.` };
    }
    jid = res.jid; // normalized jid from WhatsApp
  } catch {
    // ponytail: verification is best-effort; if it errors we still try to send.
  }

  try {
    const content = mediaUrl
      ? {
          document: { url: mediaUrl },
          mimetype: guessMime(mediaUrl),
          fileName: mediaUrl.split("/").pop()?.split("?")[0] || "attachment",
          caption: body,
        }
      : { text: body };
    const sent = await wa.sock.sendMessage(jid, content);
    return { ok: true, sid: sent?.key?.id ?? "" };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      error: error instanceof Error ? error.message : "Failed to send WhatsApp message.",
    };
  }
}
