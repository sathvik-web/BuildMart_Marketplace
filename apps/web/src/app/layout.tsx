import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuildMart - Construction Procurement Hyderabad",
  description: "Hyderabad construction material marketplace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
