export interface Passenger {
  bookingId: string;
  passengerId: string;
  name: string | null;
  phone: string | null;
  seats: number;
  pickupLabel: string;
  status: string;
  paymentStatus: string;
  fareAmount: number;
}

export interface TripDetail {
  ride: {
    id: string;
    originLabel: string;
    origin: { lat: number; lng: number };
    destLabel: string;
    dest: { lat: number; lng: number };
    route: [number, number][];
    distanceKm: number;
    durationMin: number;
    departAt: string;
    seatsTotal: number;
    seatsAvailable: number;
    farePerSeat: number;
    status: string;
    live: { lat: number; lng: number } | null;
    lastPingAt: string | null;
  };
  driver: { id: string; name: string | null; phone: string | null };
  vehicle: { model: string; registrationNumber: string; seatingCapacity: number };
  passengers: Passenger[];
  isDriver: boolean;
  myBooking: { bookingId: string; status: string; paymentStatus: string; fareAmount: number } | null;
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  body: string;
  at: string;
  mine?: boolean;
}
