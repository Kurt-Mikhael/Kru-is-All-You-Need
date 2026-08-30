import "./globals.css";
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export const metadata = {
  title: "Kru Trip Continuity",
  description: "Keep every trip on track with Kru Trip Continuity.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
