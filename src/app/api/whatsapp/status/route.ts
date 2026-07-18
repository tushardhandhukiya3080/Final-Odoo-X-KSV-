import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getWaStatus } from "@/lib/whatsapp";
import { getSession } from "@/lib/auth";

// Auth-gated: only a logged-in user may see the pairing QR (it links a WhatsApp
// number to this server). Polled by /whatsapp/login until `connected` is true.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { connected, qr } = await getWaStatus();
  const qrDataUrl = qr ? await QRCode.toDataURL(qr) : null;
  return NextResponse.json(
    { connected, qr: qrDataUrl },
    { headers: { "Cache-Control": "no-store" } },
  );
}
