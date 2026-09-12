import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HT — Hospitality Talent Exchange",
  description:
    "Pan-India SaaS that lets hoteliers redeploy staff across the country by season — turning off-season payroll overhead into on-demand talent for peak-season hotels.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
