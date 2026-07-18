// Sustainability math: how much carpooling saved vs everyone driving alone.
// Each shared seat = one car trip avoided → fuel, CO₂ and money saved.
import { query } from "./db";

// kg CO₂ per litre burned (well-to-wheel, approx). EV counted as ~0 tailpipe.
const EMISSION: Record<string, number> = {
  petrol: 2.31,
  diesel: 2.68,
  cng: 2.16,
  ev: 0,
};
const CO2_PER_TREE_YEAR = 21; // kg absorbed by one tree per year

export interface EcoSummary {
  savedKm: number;
  fuelSavedL: number;
  co2Kg: number;
  moneySaved: number;
  trees: number;
  sharedTrips: number;
  greenScore: number; // 0–100, gamified
}

interface EcoRow {
  distance_km: number;
  pax: number;
  mileage_kmpl: number;
  fuel_type: string;
}

function summarize(rows: EcoRow[], fuelPrice: number): EcoSummary {
  let savedKm = 0, fuelSavedL = 0, co2Kg = 0, moneySaved = 0, sharedTrips = 0;
  for (const r of rows) {
    const pax = Math.max(0, Number(r.pax));
    if (pax <= 0) continue;
    sharedTrips += 1;
    const avoidedKm = Number(r.distance_km) * pax; // separate car trips avoided
    const litres = avoidedKm / (Number(r.mileage_kmpl) || 15);
    const ef = EMISSION[r.fuel_type] ?? EMISSION.petrol;
    savedKm += avoidedKm;
    fuelSavedL += litres;
    co2Kg += litres * ef;
    moneySaved += litres * fuelPrice;
  }
  return {
    savedKm: round(savedKm),
    fuelSavedL: round(fuelSavedL),
    co2Kg: round(co2Kg),
    moneySaved: Math.round(moneySaved),
    trees: round(co2Kg / CO2_PER_TREE_YEAR, 2),
    sharedTrips,
    greenScore: Math.min(100, Math.round(co2Kg * 6 + sharedTrips * 4)),
  };
}

function round(n: number, dp = 1): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/**
 * Personal impact: rides the user drove (credited for every passenger they
 * carried) + rides they took as a passenger (their own avoided car trip).
 */
export async function loadUserEco(userId: string, fuelPrice: number): Promise<EcoSummary> {
  const { rows } = await query<EcoRow>(
    `SELECT r.distance_km, (r.seats_total - r.seats_available) pax, v.mileage_kmpl, v.fuel_type
       FROM rides r JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.driver_id = $1 AND r.status = 'completed'
     UNION ALL
     SELECT r.distance_km, 1 pax, v.mileage_kmpl, v.fuel_type
       FROM bookings b JOIN rides r ON r.id = b.ride_id JOIN vehicles v ON v.id = r.vehicle_id
      WHERE b.passenger_id = $1 AND b.status = 'completed'`,
    [userId],
  );
  return summarize(rows, fuelPrice);
}

// ponytail: self-check — a shared 10km petrol trip with 2 pax saves ~20 car-km.
export function __demo(): boolean {
  const s = summarize([{ distance_km: 10, pax: 2, mileage_kmpl: 20, fuel_type: "petrol" }], 100);
  return s.savedKm === 20 && s.fuelSavedL === 1 && s.co2Kg > 2 && s.moneySaved === 100;
}
