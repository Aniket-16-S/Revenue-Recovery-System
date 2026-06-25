import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthWrapper from "@/components/AuthWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "Revenue Recovery System, Government of Maharashtra",
  description:
    "AI-powered property tax defaulter management and revenue recovery dashboard for the Government of Maharashtra. Monitor KPIs, generate notices, and analyze ward-level data.",
  keywords: "revenue recovery, property tax, Maharashtra, defaulters, dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body style={{ fontFamily: "var(--font-sans)" }}>
        {/* Animated background blobs */}
        <div className="bg-blobs">
          <div className="bg-blob bg-blob--1" />
          <div className="bg-blob bg-blob--2" />
          <div className="bg-blob bg-blob--3" />
        </div>

        <div className="app-layout">
          <AuthWrapper>
            <Sidebar />
            <main className="main-content relative z-10">{children}</main>
          </AuthWrapper>
        </div>
      </body>
    </html>
  );
}
