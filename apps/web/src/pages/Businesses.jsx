import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function Businesses() {
  const navigate = useNavigate();
  const { slug } = useParams(); // user slug e.g. "jane-doe"
  const [businesses, setBusinesses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_businesses = async () => {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }

      try {
        const res = await fetch("http://localhost:8000/businesses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to fetch businesses");
        setBusinesses(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetch_businesses();
  }, [navigate]);

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.logo}>⬛ POS</span>
        <button style={styles.logoutBtn} onClick={() => navigate(`/${slug}`)}>← back</button>
      </nav>

      <main style={styles.main}>
      <div style={styles.header}>
        <div>
          <p style={styles.tag}>Your portfolio</p>
          <h1 style={styles.title}>Businesses</h1>
        </div>
        <button style={styles.addBtn} onClick={() => navigate(`/${slug}/businesses/add`)}>
          + Add business
        </button>
      </div>

        {loading && <p style={styles.dim}>Loading...</p>}
        {error && <p style={styles.error}>{error}</p>}

        {!loading && !error && businesses.length === 0 && (
          <p style={styles.dim}>No businesses yet.</p>
        )}

        <div style={styles.list}>
          {businesses.map((b) => (
            <div
              key={b.slug}
              style={styles.card}
              onClick={() => navigate(`/${slug}/businesses/${b.slug}`)}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#333"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#1a1a1a"}
            >
              {/* Banner */}
              <div
                style={{
                  ...styles.banner,
                  backgroundImage: b.banner 
                    ? `url(${b.banner})` 
                    : "linear-gradient(135deg, #161616 0%, #1e1e1e 100%)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />

              {/* Content row */}
              <div style={styles.content}>
                {/* Logo */}
                <div style={styles.logoWrap}>
                  {b.logo
                    ? <img src={b.logo} alt={b.name} style={styles.logoImg} />
                    : <div style={styles.logoFallback}>{b.name?.[0]?.toUpperCase()}</div>
                  }
                </div>

                {/* Text */}
                <div style={styles.text}>
                  <h2 style={styles.bizName}>{b.name}</h2>
                  {b.description && <p style={styles.desc}>{b.description}</p>}
                </div>

                <span style={styles.arrow}>→</span>
              </div>
            </div>
          ))}
        </div>
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
  logo: { fontSize: "1.1rem", letterSpacing: "0.15em", fontFamily: "monospace" },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #333",
    color: "#888",
    padding: "0.4rem 1rem",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "0.85rem",
  },
  main: {
    flex: 1,
    maxWidth: "860px",
    width: "100%",
    margin: "0 auto",
    padding: "3rem",
  },
  header: { marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" },
  addBtn: { background: "transparent", border: "1px solid #f0ede8", color: "#f0ede8", padding: "0.6rem 1.25rem", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit", fontSize: "0.9rem" },
  tag: {
    fontSize: "0.75rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "#555",
    marginBottom: "0.5rem",
    fontFamily: "monospace",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "normal",
    margin: 0,
    letterSpacing: "-0.02em",
  },
  list: { display: "flex", flexDirection: "column", gap: "1rem" },
  card: {
    border: "1px solid #1a1a1a",
    borderRadius: "8px",
    overflow: "hidden",
    cursor: "pointer",
    transition: "border-color 0.2s",
    background: "#0f0f0f",
  },
  banner: {
    width: "100%",
    height: "90px",
    backgroundSize: "cover",
    backgroundPosition: "center",
  },
  content: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
    padding: "1.25rem 1.5rem",
  },
  logoWrap: {
    flexShrink: 0,
    width: "52px",
    height: "52px",
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid #222",
  },
  logoImg: { width: "100%", height: "100%", objectFit: "cover" },
  logoFallback: {
    width: "100%",
    height: "100%",
    background: "#1e1e1e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.4rem",
    color: "#555",
    fontFamily: "monospace",
  },
  text: { flex: 1, minWidth: 0 },
  bizName: {
    fontSize: "1.15rem",
    fontWeight: "normal",
    margin: "0 0 0.25rem",
    letterSpacing: "-0.01em",
  },
  desc: {
    fontSize: "0.85rem",
    color: "#666",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  arrow: { color: "#444", fontSize: "1.2rem", flexShrink: 0 },
  dim: { color: "#555", fontFamily: "monospace", fontSize: "0.9rem" },
  error: { color: "#e05c5c", fontSize: "0.9rem" },
};