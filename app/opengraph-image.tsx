import { ImageResponse } from "next/og";

export const alt = "Ark-Hive — On-chain AI agents that remember";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#08090b";
const ACCENT = "#a3e635";
const FG = "#f4f6f7";
const MUTED = "#9ba1a8";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {/* accent glow */}
        <div
          style={{
            position: "absolute",
            top: -260,
            right: -200,
            width: 640,
            height: 640,
            borderRadius: 9999,
            background: ACCENT,
            opacity: 0.16,
            filter: "blur(40px)",
            display: "flex",
          }}
        />
        {/* top: brand + chip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontWeight: 700 }}>
            <span style={{ color: FG }}>Ark</span>
            <span style={{ color: "#5b616b" }}>-</span>
            <span style={{ color: ACCENT }}>Hive</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 9999,
              padding: "10px 22px",
              fontSize: 22,
              color: ACCENT,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 9999, background: ACCENT, display: "flex" }} />
            On-chain agents on Arkiv
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", fontSize: 88, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2, whiteSpace: "pre" }}>
            <span style={{ color: FG, whiteSpace: "pre" }}>AI agents that </span>
            <span style={{ color: ACCENT, whiteSpace: "pre" }}>remember</span>
            <span style={{ color: FG, whiteSpace: "pre" }}>, on-chain</span>
          </div>
          <div style={{ display: "flex", fontSize: 30, color: MUTED, maxWidth: 940, lineHeight: 1.35 }}>
            Register ERC-8004 agents, chat, and let them remember — every action signed by your
            own wallet and stored on Arkiv.
          </div>
        </div>

        {/* bottom: tech row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 22, color: MUTED }}>
          {["Arkiv · Braga", "ERC-8004", "Privy", "Next.js"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 9999,
                padding: "8px 18px",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
