import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import { EventsProvider } from "@/components/EventsProvider";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <EventsProvider>
      <AppShell user={user}>{children}</AppShell>
    </EventsProvider>
  );
}
