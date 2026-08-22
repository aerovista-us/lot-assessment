import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Lot Assessment — Can I Build That Here?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "62px 70px", background: "radial-gradient(circle at 85% 15%, #4a2411 0%, #12151d 38%, #090b10 75%)", color: "#f3f5f7", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: ".06em" }}>LOT ASSESSMENT</div>
        <div style={{ display: "flex", fontSize: 20, color: "#fbbf24", fontWeight: 700 }}>AEROVISTA LOCAL</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
        <div style={{ display: "flex", fontSize: 25, color: "#fbbf24", fontWeight: 800, letterSpacing: ".08em", marginBottom: 18 }}>EARLY SITE FEASIBILITY</div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 82, lineHeight: .95, fontWeight: 900, letterSpacing: "-.045em" }}>
          <span>Can I build that here?</span>
          <span style={{ color: "#b8bec8" }}>Find the constraints first.</span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,.18)", paddingTop: 26 }}>
        <div style={{ display: "flex", fontSize: 24 }}>Setbacks · Coverage · Garages · Access · Plain-English risks</div>
        <div style={{ display: "flex", fontSize: 18, color: "#9ba3af" }}>Made in Coeur d&apos;Alene · AeroVista</div>
      </div>
    </div>,
    size
  );
}
