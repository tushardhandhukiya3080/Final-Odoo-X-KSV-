import { format, formatDistanceToNow } from "date-fns";

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export const fmtTime = (d: string | Date) => format(new Date(d), "d MMM, h:mm a");
export const fmtShort = (d: string | Date) => format(new Date(d), "h:mm a");
export const fromNow = (d: string | Date) => formatDistanceToNow(new Date(d), { addSuffix: true });

export const km = (n: number) => `${n.toFixed(1)} km`;
export const mins = (n: number) => `${Math.round(n)} min`;
