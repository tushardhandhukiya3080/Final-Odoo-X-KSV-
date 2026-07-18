// Shared ride-mode (transport type) config — powers the mobility identity.
export type RideMode = "BIKE" | "CAR" | "AUTO" | "TAXI";

export interface RideModeDef {
  value: RideMode;
  label: string;
  emoji: string;
  seats: number; // default seat capacity for the form
  hint: string;
  tint: string; // brutalist accent tile bg
}

export const RIDE_MODES: RideModeDef[] = [
  { value: "BIKE", label: "Bike", emoji: "🏍️", seats: 1, hint: "1 pillion seat", tint: "bg-pop-pink" },
  { value: "CAR", label: "Car", emoji: "🚗", seats: 4, hint: "up to 4 seats", tint: "bg-pop-cyan" },
];

export const modeOf = (v?: string): RideModeDef =>
  RIDE_MODES.find((m) => m.value === v) ?? RIDE_MODES[1];
