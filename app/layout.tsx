// app/layout.tsx
import "./globals.css";
import "@xyflow/react/dist/style.css";
import type { Metadata } from "next";
import { JetBrains_Mono, Inter, Bricolage_Grotesque } from "next/font/google";
import { Providers } from "./providers";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const sans = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });
const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Ark-Hive",
  description: "Register agents, chat, and manage memory on Arkiv",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    title: "Ark-Hive",
    description: "Register agents, chat, and manage memory on Arkiv",
    images: [{ url: "/logo.jpg", width: 736, height: 736, alt: "Ark-Hive" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${sans.variable} ${display.variable} dark`}>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased"><Providers>{children}</Providers></body>
    </html>
  );
}
