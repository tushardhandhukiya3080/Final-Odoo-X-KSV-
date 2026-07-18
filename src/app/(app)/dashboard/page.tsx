import Link from "next/link";
import {
  Search, PlusCircle, Route as RouteIcon, CheckCircle2, Wallet as WalletIcon,
  Car, Leaf, Fuel, IndianRupee, TreePine, ArrowRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { loadUserEco } from "@/lib/eco";
import LiveFeed from "@/components/LiveFeed";

export const dynamic = "force-dynamic";

async function count(sql: string, params: unknown[]): Promise<number> {
  const { rows } = await query<{ n: string }>(sql, params);
  return Number(rows[0]?.n ?? 0);
}

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const uid = user.id;

  const [upcoming, offered, completed, vehicles, nextTrip] = await Promise.all([
    count(
      `SELECT count(*) n FROM bookings b JOIN rides r ON r.id = b.ride_id
       WHERE b.passenger_id = $1 AND b.status = 'booked'
         AND r.status IN ('published','started','in_progress')`,
      [uid],
    ),
    count(
      `SELECT count(*) n FROM rides
       WHERE driver_id = $1 AND status IN ('published','started','in_progress')`,
      [uid],
    ),
    count(
      `SELECT count(*) n FROM bookings WHERE passenger_id = $1 AND status = 'completed'`,
      [uid],
    ),
    count(`SELECT count(*) n FROM vehicles WHERE user_id = $1`, [uid]),
    query<{
      id: string;
      origin_label: string;
      dest_label: string;
      depart_at: Date;
      status: string;
      role: string;
    }>(
      `SELECT r.id, r.origin_label, r.dest_label, r.depart_at, r.status, 'driver' role
         FROM rides r
        WHERE r.driver_id = $1 AND r.status IN ('published','started','in_progress')
      UNION ALL
       SELECT r.id, r.origin_label, r.dest_label, r.depart_at, r.status, 'passenger' role
         FROM bookings b JOIN rides r ON r.id = b.ride_id
        WHERE b.passenger_id = $1 AND b.status = 'booked'
          AND r.status IN ('published','started','in_progress')
        ORDER BY depart_at ASC LIMIT 1`,
      [uid],
    ),
  ]);

  const next = nextTrip.rows[0];

  const orgRow = await query<{ fuel_price_per_litre: string }>(
    "SELECT fuel_price_per_litre FROM organizations WHERE id=$1",
    [user.organizationId],
  );
  const eco = await loadUserEco(uid, Number(orgRow.rows[0]?.fuel_price_per_litre ?? 100));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase text-slate-900">Hi {user.name?.split(" ")[0] ?? "there"} 👋</h1>
        <p className="text-sm font-semibold text-slate-500">Your commute command center.</p>
      </div>

      {/* Action cards */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
        <ActionCard href="/find" tint="from-[#a6d6fb] to-[#5aadee]" icon={<Search className="h-7 w-7 text-white" />} title="Find a Ride" sub="Search rides matching your route & time" />
        <ActionCard href="/offer" tint="from-[#fcd775] to-[#efab24]" icon={<PlusCircle className="h-7 w-7 text-[#5c3702]" />} title="Offer a Ride" sub="Publish a ride and share your seats" />
      </div>

      {/* Overview */}
      <Section label="Overview">
        <div className="bento-grid">
          <OverviewTile className="lg:col-span-3" icon={<RouteIcon className="h-4 w-4" />} label="Upcoming trips" value={upcoming + offered} sub={`${offered} offered · ${upcoming} booked`} />
          <OverviewTile className="lg:col-span-3" icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={completed} sub="as passenger" />
          <OverviewTile className="lg:col-span-3" tint="from-[#ccfaf3] to-[#7fe6d6]" icon={<WalletIcon className="h-4 w-4" />} label="Wallet" value={`₹${user.walletBalance.toFixed(0)}`} link={{ href: "/wallet", text: "Recharge →" }} />
          <OverviewTile className="lg:col-span-3" icon={<Car className="h-4 w-4" />} label="Vehicles" value={vehicles} link={{ href: "/vehicles", text: "Manage →" }} />
        </div>
      </Section>

      {/* Green impact */}
      <Section label="🌱 Your Green Impact">
        <div className="bento-brand">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-brand-100">Green score</div>
              <div className="font-display text-6xl font-bold leading-none">{eco.greenScore}</div>
              <div className="mt-1 text-sm font-semibold text-brand-100">{eco.sharedTrips} shared trip{eco.sharedTrips === 1 ? "" : "s"} · {eco.savedKm} car-km avoided</div>
            </div>
            <div className="text-5xl">🌍</div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <GreenStat icon={<Leaf className="h-4 w-4" />} label="CO₂ saved" value={`${eco.co2Kg} kg`} />
            <GreenStat icon={<Fuel className="h-4 w-4" />} label="Fuel saved" value={`${eco.fuelSavedL} L`} />
            <GreenStat icon={<IndianRupee className="h-4 w-4" />} label="Money saved" value={`₹${eco.moneySaved}`} />
            <GreenStat icon={<TreePine className="h-4 w-4" />} label="Trees / yr" value={String(eco.trees)} />
          </div>
        </div>
      </Section>

      {/* Next trip */}
      <Section label="Next Trip">
        {next ? (
          <Link href={`/trips/${next.id}`} className="bento bento-hover block">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-white ring-1 ring-black/10 ${next.role === "driver" ? "bg-gradient-to-b from-[#a6d6fb] to-[#5aadee]" : "bg-gradient-to-b from-[#8a95f0] to-[#5560d8]"}`}>{next.role}</span>
                <span className="rounded-full bg-gradient-to-b from-[#fcd775] to-[#efab24] px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-[#5c3702] ring-1 ring-black/10">{next.status.replace("_", " ")}</span>
              </div>
              <div className="text-xs font-bold text-slate-400">{new Date(next.depart_at).toLocaleString()}</div>
            </div>
            <div className="mt-3 flex items-center gap-2 font-display text-lg font-bold uppercase text-slate-900">
              {next.origin_label.split(",")[0]} <ArrowRight className="h-5 w-5 text-brand-500" /> {next.dest_label.split(",")[0]}
            </div>
          </Link>
        ) : (
          <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 py-14 text-center shadow-inner">
            <RouteIcon className="mb-3 h-10 w-10 text-slate-300" />
            <div className="font-display text-lg font-bold text-slate-700">No upcoming trips</div>
            <div className="mt-1 max-w-sm text-sm font-medium text-slate-400">
              <Link href="/find" className="font-bold text-brand-600 underline">Find a ride</Link> along your commute or <Link href="/offer" className="font-bold text-brand-600 underline">offer one</Link>.
            </div>
          </div>
        )}
      </Section>

      {/* Live activity */}
      <Section label="Live Activity">
        <LiveFeed />
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">{label}</div>
      {children}
    </div>
  );
}

function ActionCard({ href, tint, icon, title, sub }: { href: string; tint: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link href={href} className="bento bento-hover group flex items-center gap-4">
      <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-b ${tint} shadow-btn ring-1 ring-black/10`}>{icon}</div>
      <div>
        <div className="flex items-center gap-1 font-display text-xl font-bold uppercase text-slate-900">{title} <ArrowRight className="h-5 w-5 text-brand-500 transition-transform group-hover:translate-x-1" /></div>
        <div className="text-sm font-semibold text-slate-500">{sub}</div>
      </div>
    </Link>
  );
}

function OverviewTile({ className = "", tint, icon, label, value, sub, link }: {
  className?: string; tint?: string; icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; link?: { href: string; text: string };
}) {
  return (
    <div className={`bento bento-hover ${tint ? `bg-gradient-to-b ${tint}` : ""} ${className}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{icon}{label}</div>
      <div className="mt-1 font-display text-3xl font-bold text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{sub}</div>}
      {link && <Link href={link.href} className="mt-1 inline-block text-[11px] font-extrabold uppercase text-brand-700 underline decoration-2 underline-offset-2">{link.text}</Link>}
    </div>
  );
}

function GreenStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/95 p-3 text-slate-900 ring-1 ring-black/10">
      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
