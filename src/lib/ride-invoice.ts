// On payment, send a WhatsApp invoice to BOTH parties: the passenger (payer)
// and the driver (payee). Uses the Baileys sender (scan QR once at
// /whatsapp/login). Best-effort: never throws into the payment path, and
// silently skips a party who has no phone number on file.
import { query } from "./db";
import { sendWhatsApp } from "./whatsapp";

interface Row {
  fare_amount: string;
  seats: number;
  p_name: string | null;
  p_phone: string | null;
  d_name: string | null;
  d_phone: string | null;
  origin_label: string;
  dest_label: string;
  distance_km: string;
  depart_at: Date;
}

const short = (label: string) => label.split(",")[0];

function receipt(opts: {
  lead: string;
  route: string;
  km: number;
  when: string;
  seats: number;
  fare: number;
  method: string;
  ref: string;
}): string {
  return [
    "🧾 *RideShare — Payment Receipt*",
    "",
    opts.lead,
    "",
    `*Route:* ${opts.route}`,
    `*Distance:* ${opts.km} km`,
    `*When:* ${opts.when}`,
    `*Seats:* ${opts.seats}`,
    `*Amount:* ₹${opts.fare.toFixed(2)}`,
    `*Method:* ${opts.method.toUpperCase()}`,
    `*Ref:* #${opts.ref}`,
    "",
    "Thanks for carpooling with RideShare 🌱",
  ].join("\n");
}

export async function sendPaymentInvoices(bookingId: string, method: string): Promise<void> {
  const { rows } = await query<Row>(
    `SELECT b.fare_amount, b.seats,
            p.name p_name, p.phone p_phone,
            d.name d_name, d.phone d_phone,
            r.origin_label, r.dest_label, r.distance_km, r.depart_at
       FROM bookings b
       JOIN users p ON p.id = b.passenger_id
       JOIN rides r ON r.id = b.ride_id
       JOIN users d ON d.id = r.driver_id
      WHERE b.id = $1`,
    [bookingId],
  );
  const r = rows[0];
  if (!r) return;

  const fare = Number(r.fare_amount);
  const common = {
    route: `${short(r.origin_label)} → ${short(r.dest_label)}`,
    km: Number(r.distance_km),
    when: new Date(r.depart_at).toLocaleString(),
    seats: r.seats,
    fare,
    method,
    ref: bookingId.slice(0, 8).toUpperCase(),
  };

  const tasks: Promise<unknown>[] = [];
  if (r.p_phone) {
    tasks.push(
      sendWhatsApp(
        r.p_phone,
        receipt({ ...common, lead: `Hi ${r.p_name ?? "there"}, you *paid ₹${fare.toFixed(2)}* to ${r.d_name ?? "your driver"} for this ride.` }),
      ).catch(() => {}),
    );
  }
  if (r.d_phone) {
    tasks.push(
      sendWhatsApp(
        r.d_phone,
        receipt({ ...common, lead: `Hi ${r.d_name ?? "there"}, you *received ₹${fare.toFixed(2)}* from ${r.p_name ?? "your passenger"} for this ride.` }),
      ).catch(() => {}),
    );
  }
  await Promise.all(tasks);
}
