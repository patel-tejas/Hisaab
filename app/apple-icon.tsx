import { ImageResponse } from "next/og"

export const size = {
  width: 180,
  height: 180,
}

export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
          borderRadius: "40px",
          color: "white",
          fontSize: "100px",
          fontWeight: 800,
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.1)",
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: "absolute",
            top: "-40px",
            right: "-40px",
            width: "140px",
            height: "140px",
            background: "rgba(255, 255, 255, 0.4)",
            filter: "blur(40px)",
            borderRadius: "50%",
          }}
        />
        
        {/* Premium Chart Elements (Bullish lines) */}
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            left: "30px",
            width: "10px",
            height: "40px",
            background: "rgba(255,255,255,0.4)",
            borderRadius: "5px",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            left: "50px",
            width: "10px",
            height: "60px",
            background: "rgba(255,255,255,0.6)",
            borderRadius: "5px",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            left: "70px",
            width: "10px",
            height: "80px",
            background: "rgba(255,255,255,0.8)",
            borderRadius: "5px",
          }}
        />

        <span style={{ position: "relative" }}>H</span>
      </div>
    ),
    {
      ...size,
    }
  )
}
