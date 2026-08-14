import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Lease Scout | Live Leasehackr Analysis", description: "Find and rank current Leasehackr offers by effective lease cost.", icons: { icon: "/favicon.svg" } };
export const viewport: Viewport = { themeColor: "#f4f5f1", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
