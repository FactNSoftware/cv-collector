import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 18% 18%, rgba(165,235,46,0.28), transparent 26%), radial-gradient(circle at 85% 20%, rgba(255,255,255,0.14), transparent 20%), linear-gradient(135deg, #03170b 0%, #0b2e16 52%, #184a25 100%)",
          color: "#f6fbf2",
          fontFamily: "Avenir Next, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 32,
            borderRadius: 36,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -90,
            width: 380,
            height: 380,
            borderRadius: 9999,
            background: "rgba(165,235,46,0.18)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.08)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "56px 64px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 24,
                background: "#a5eb2e",
                color: "#0b2e16",
                fontSize: 34,
                fontWeight: 800,
              }}
            >
              T
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "rgba(246,251,242,0.74)",
                }}
              >
                Hiring Software
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                Talent Workspace
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              maxWidth: 860,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 72,
                lineHeight: 1.05,
                fontWeight: 800,
                letterSpacing: "-0.04em",
              }}
            >
              Hire with clarity and speed.
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                lineHeight: 1.35,
                color: "rgba(246,251,242,0.82)",
                maxWidth: 920,
              }}
            >
              Manage jobs, applications, reviews, and hiring collaboration from one modern recruiting workspace.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              {["Jobs", "Applications", "Hiring reviews"].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 20px",
                    borderRadius: 9999,
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    fontSize: 22,
                    color: "#f6fbf2",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 700,
                color: "#a5eb2e",
              }}
            >
              talent workspace
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
