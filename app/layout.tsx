// app/layout.tsx
import "./globals.css";
import "@xyflow/react/dist/style.css";
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Inter, Bricolage_Grotesque } from "next/font/google";
import { Providers } from "./providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const sans = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });
const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-display", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const TITLE = "Ark-Hive — On-chain AI agents that remember";
const DESCRIPTION =
  "Register ERC-8004 agents, chat with them, and let them remember — every action signed by your own wallet and stored on Arkiv.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · Ark-Hive" },
  description: DESCRIPTION,
  applicationName: "Ark-Hive",
  keywords: ["ERC-8004", "Arkiv", "AI agents", "on-chain", "Privy", "agent memory", "Web3"],
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Ark-Hive",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#08090b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${sans.variable} ${display.variable} dark`}>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
