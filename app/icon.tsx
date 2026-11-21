import { ImageResponse } from "next/og"

export const size = {
  width: 32,
  height: 32,
}

export const contentType = "image/png"

export default function Icon() {
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
          borderRadius: "8px",
          color: "white",
          fontSize: "20px",
          fontWeight: 800,
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: "absolute",
            top: "-10px",
            right: "-10px",
            width: "30px",
            height: "30px",
            background: "rgba(255, 255, 255, 0.4)",
            filter: "blur(12px)",
            borderRadius: "50%",
          }}
        />
        
        {/* Abstract "Bullish" Trend Lines */}
        <div
          style={{
            position: "absolute",
            bottom: "4px",
            left: "4px",
            width: "2px",
            height: "8px",
            background: "rgba(255,255,255,0.4)",
            borderRadius: "1px",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "4px",
            left: "8px",
            width: "2px",
            height: "12px",
            background: "rgba(255,255,255,0.6)",
            borderRadius: "1px",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "4px",
            left: "12px",
            width: "2px",
            height: "16px",
            background: "rgba(255,255,255,0.8)",
            borderRadius: "1px",
          }}
        />
        
        {/* The 'H' */}
        <span style={{ position: "relative" }}>H</span>
      </div>
    ),
    {
      ...size,
    }
  )
}
