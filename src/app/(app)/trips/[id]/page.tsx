import { getCurrentUser } from "@/lib/auth";
import TripClient from "@/components/trip/TripClient";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  return <TripClient id={id} currentUserId={user.id} />;
}
