import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import AppShell from "@/components/AppShell";
import { EventsProvider } from "@/components/EventsProvider";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { rows } = await query<{ name: string; domain: string | null }>(
    "SELECT name, domain FROM organizations WHERE id = $1",
    [user.organizationId],
  );
  const org = { name: rows[0]?.name ?? "Your Company", domain: rows[0]?.domain ?? null };
  return (
    <EventsProvider>
      <AppShell user={user} org={org}>{children}</AppShell>
    </EventsProvider>
  );
}
