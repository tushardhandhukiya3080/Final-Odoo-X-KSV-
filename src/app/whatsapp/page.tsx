import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import WhatsAppSender from "@/components/WhatsAppSender";
import InvoiceSender from "@/components/InvoiceSender";

export const dynamic = "force-dynamic";

export default async function WhatsAppPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h1>Send WhatsApp</h1>
          <p className="muted sm">
            Free, sends to any number. First{" "}
            <Link href="/whatsapp/login">connect your WhatsApp</Link> (scan a QR once).
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn-ghost" href="/whatsapp/login">
            Connect
          </Link>
          <Link className="btn-ghost" href="/dashboard">
            ← Dashboard
          </Link>
        </div>
      </div>
      <WhatsAppSender />
      <div style={{ marginTop: 16 }}>
        <InvoiceSender />
      </div>
    </div>
  );
}
