import "./globals.css";
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export const metadata = { title: "Kru — Trip Continuity", description: "Trip tetap jalan, meski Tokyo badai. Agentic continuity platform." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
