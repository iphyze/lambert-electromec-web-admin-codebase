"use client";

const at = (path) => `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`;

export default function OfflinePage() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "24px", paddingTop: "max(24px,env(safe-area-inset-top))", background: "var(--background, #f6f8f7)", color: "var(--text-primary, #172920)" }}>
      <section style={{ maxWidth: 440, width: "100%", padding: "32px", textAlign: "center", background: "var(--card-background, #fff)", borderRadius: 20, boxShadow: "0 14px 40px -15px rgba(16, 32, 24, .16)" }}>
        <img src={at("/images/brand/favicon.png")} alt="Lambert Electromec" width="64" height="64" style={{ display: "block", margin: "0 auto 20px", borderRadius: 14 }} />
        <h1 style={{ fontSize: 24, lineHeight: 1.2, margin: "0 0 12px", fontWeight: 650 }}>You're offline</h1>
        <p style={{ color: "var(--text-secondary, #516357)", fontSize: 13, lineHeight: 1.6, margin: "0 0 24px" }}>
          Lambert Admin needs an internet connection to load and save data. Check your connection and try again.
        </p>
        <button type="button" onClick={() => window.location.reload()} style={{ height: 44, padding: "0 22px", border: 0, borderRadius: 12, background: "linear-gradient(135deg,#1b8547,#087760)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Try again</button>
      </section>
    </main>
  );
}
