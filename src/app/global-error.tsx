"use client";

/**
 * Last resort: only reached when the locale layout itself fails, which
 * means the nav, the stylesheet and the translation provider are all
 * gone. Everything here is therefore self-contained — its own <html>,
 * inline styles rather than Tailwind, and English rather than a lookup
 * that would need the provider that just failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f2ead9",
          color: "#223526",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "28rem", display: "grid", gap: "1rem" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 500,
              fontSize: "1.75rem",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ margin: 0, color: "#5c6b58", lineHeight: 1.6 }}>
            Chavrusa Link hit an unexpected problem. Trying again often
            works — if it doesn&apos;t, please let us know at{" "}
            <a href="mailto:info@chavrusalink.com" style={{ color: "#9d7530" }}>
              info@chavrusalink.com
            </a>
            .
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: "none",
                borderRadius: "100px",
                padding: "0.65rem 1.25rem",
                background: "#b3893c",
                color: "#223526",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/* A plain anchor on purpose: this renders when the React
                tree has already failed, so a client-side <Link /> would
                be trusting the very thing that just broke. A full page
                load is what actually recovers. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                borderRadius: "100px",
                padding: "0.65rem 1.25rem",
                border: "1px solid #ddc99e",
                color: "#223526",
                fontWeight: 500,
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              Go home
            </a>
          </div>
          {error.digest && (
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#5c6b58" }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
