import { ImageResponse } from "next/og"

export const runtime = "edge"

export const alt = "Pearlie - Find the Right Dental Clinic in London & UK"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #004443 0%, #006663 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 80px",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#0fbcb0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                fill="white"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            Pearlie
          </span>
        </div>

        {/* Main text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 700,
              color: "white",
              lineHeight: 1.1,
              margin: "0 0 24px 0",
              letterSpacing: "-0.03em",
            }}
          >
            Find the Right Dental Clinic
          </h1>
          <p
            style={{
              fontSize: "24px",
              color: "rgba(255,255,255,0.75)",
              margin: 0,
              maxWidth: "700px",
              lineHeight: 1.5,
            }}
          >
            Matched with trusted, GDC-registered clinics in London & the UK.
            Free, independent, and tailored to your needs.
          </p>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "6px",
            background: "#0fbcb0",
          }}
        />
      </div>
    ),
    { ...size }
  )
}
