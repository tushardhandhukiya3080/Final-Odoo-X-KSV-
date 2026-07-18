import type { Metadata } from "next";
import "./globals.css";
import "@/styles/app.css";

export const metadata: Metadata = {
  title: "RideShare — Enterprise Carpooling",
  description: "Find, offer, track, and pay for shared rides with your colleagues.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
