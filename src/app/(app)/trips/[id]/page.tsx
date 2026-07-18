import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import TripClient from "@/components/trip/TripClient";
import RideLiveControls from "@/components/trip/RideLiveControls";
import { waypointsOf, type Stop } from "@/lib/rides";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = (await getCurrentUser())!;

  // Guard: a non-UUID id (bad link) would throw at the uuid column — skip the
  // query and let TripClient render its own "not found" state gracefully.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const rows = isUuid
    ? (
        await query<{
          driver_id: string;
          track_mode: string;
          progress_index: number;
          status: string;
          stops: Stop[] | null;
          origin_label: string;
          origin_lat: number;
          origin_lng: number;
          dest_label: string;
          dest_lat: number;
          dest_lng: number;
        }>(
          `SELECT driver_id, track_mode, progress_index, status, stops,
                  origin_label, origin_lat, origin_lng, dest_label, dest_lat, dest_lng
             FROM rides WHERE id = $1`,
          [id],
        )
      ).rows
    : [];
  const r = rows[0];
  const isDriver = r && r.driver_id === user.id;
  const waypoints =
    r
      ? waypointsOf(
          { label: r.origin_label, lat: r.origin_lat, lng: r.origin_lng },
          Array.isArray(r.stops) ? r.stops : [],
          { label: r.dest_label, lat: r.dest_lat, lng: r.dest_lng },
        ).map((w) => w.label)
      : [];

  return (
    <div className="space-y-6">
      {isDriver && (
        <RideLiveControls
          rideId={id}
          trackMode={r.track_mode === "manual" ? "manual" : "gps"}
          waypoints={waypoints}
          progressIndex={r.progress_index}
          status={r.status}
        />
      )}
      <TripClient id={id} currentUserId={user.id} trackMode={r && r.track_mode === "manual" ? "manual" : "gps"} />
    </div>
  );
}
