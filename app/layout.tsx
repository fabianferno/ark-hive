// app/layout.tsx
import "./globals.css";
import "@xyflow/react/dist/style.css";
import type { Metadata } from "next";
import { JetBrains_Mono, IBM_Plex_Sans } from "next/font/google";
import { Providers } from "./providers";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = { title: "AgentState", description: "Agent state visualizer" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${sans.variable} dark`}>
      <body className="bg-[#0F172A] text-[#F8FAFC] font-sans antialiased"><Providers>{children}</Providers></body>
    </html>
  );
}
