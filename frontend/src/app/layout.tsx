import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/ui/Sidebar";
import Header from "@/components/ui/Header";
import { WebSocketProvider } from "@/providers/WebSocketProvider";

export const metadata: Metadata = {
  title: "BorderVision AI — Surveillance & Analytics Platform",
  description: "AI-Powered Border Surveillance & Video Analytics Platform with real-time detection, geofencing, and tactical mapping for legacy CCTV infrastructure.",
  keywords: ["border surveillance", "AI analytics", "video analytics", "CCTV", "YOLOv8", "geofence"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <WebSocketProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 ml-[220px] flex flex-col">
              <Header />
              <main className="flex-1 p-5 overflow-auto">
                {children}
              </main>
            </div>
          </div>
        </WebSocketProvider>
      </body>
    </html>
  );
}
