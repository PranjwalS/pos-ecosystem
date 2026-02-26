import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.logo}>⬛ POS</span>
        <div style={styles.navButtons}>
          <button style={styles.btnGhost} onClick={() => navigate("/login")}>Log in</button>
          <button style={styles.btnSolid} onClick={() => navigate("/signup")}>Sign up</button>
        </div>
      </nav>

      <main style={styles.main}>
        <p style={styles.tag}>Point of Sale, reinvented.</p>
        <h1 style={styles.headline}>
          Run your business.<br />Not your software.
        </h1>
        <p style={styles.sub}>
          A dead-simple POS system for modern merchants. Track sales, manage
          products, and close faster — all in one place.
        </p>
        <button style={styles.cta} onClick={() => navigate("/signup")}>
          Get started free →
        </button>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#f0ede8",
    fontFamily: "'Georgia', serif",
    display: "flex",
    flexDirection: "column",
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.5rem 3rem",
    borderBottom: "1px solid #1e1e1e",
  },
  logo: {
    fontSize: "1.1rem",
    letterSpacing: "0.15em",
    fontFamily: "monospace",
    color: "#f0ede8",
  },
  navButtons: { display: "flex", gap: "0.75rem" },
  btnGhost: {
    background: "transparent",
    border: "1px solid #333",
    color: "#ccc",
    padding: "0.5rem 1.25rem",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "0.9rem",
    transition: "border-color 0.2s, color 0.2s",
  },
  btnSolid: {
    background: "#f0ede8",
    border: "1px solid #f0ede8",
    color: "#0a0a0a",
    padding: "0.5rem 1.25rem",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "0.9rem",
    fontWeight: "600",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "0 3rem",
    maxWidth: "720px",
    margin: "0 auto",
    width: "100%",
  },
  tag: {
    fontSize: "0.8rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "#666",
    marginBottom: "1.5rem",
    fontFamily: "monospace",
  },
  headline: {
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
    lineHeight: 1.1,
    margin: "0 0 1.5rem",
    fontWeight: "normal",
    letterSpacing: "-0.02em",
  },
  sub: {
    fontSize: "1.1rem",
    color: "#888",
    lineHeight: 1.7,
    maxWidth: "480px",
    margin: "0 0 2.5rem",
  },
  cta: {
    background: "transparent",
    border: "1px solid #f0ede8",
    color: "#f0ede8",
    padding: "0.85rem 2rem",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "1rem",
    letterSpacing: "0.05em",
    width: "fit-content",
    transition: "background 0.2s, color 0.2s",
  },
};