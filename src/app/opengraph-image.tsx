import { ImageResponse } from "next/og";
import { MARK_DATA_URI } from "@/lib/brand-art";

export const alt = "bnhm.fun: party games for everyone's phone";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GAMES = ["Ring of Fire", "Most Likely To", "Hangman", "Ride the Bus", "+ 8 more"];

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px 96px",
        background: "#f7f3e8",
        backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 47px, #dbe4f0 47px, #dbe4f0 48px)",
        color: "#1f2a44",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <img src={MARK_DATA_URI} width={132} height={132} alt="" />
        <div style={{ display: "flex", fontSize: 120, fontWeight: 800, letterSpacing: -4 }}>
          bnhm<span style={{ color: "#c2412d" }}>.fun</span>
        </div>
      </div>
      <div style={{ marginTop: 28, fontSize: 46, fontWeight: 600 }}>Party games for everyone&apos;s phone</div>
      <div style={{ marginTop: 14, fontSize: 30, color: "#5c6478" }}>
        Start a room · share the code · play on your phone · put it on the TV
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 44 }}>
        {GAMES.map((g) => (
          <div
            key={g}
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              border: "3px solid #1f2a44",
              background: "#ffffff",
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            {g}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
