import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function UserPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }

      try {
        const res = await fetch("http://localhost:8000/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to fetch user");

        // If URL slug doesn't match what the backend says, correct it
        if (data.slug !== slug) {
          navigate(`/${data.slug}`, { replace: true });
          return;
        }

        setUser(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchUser();
  }, [navigate, slug]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.logo}>⬛ POS</span>
        <button style={styles.logoutBtn} onClick={handleLogout}>Log out</button>
      </nav>

      <main style={styles.main}>
        {error && <p style={styles.error}>{error}</p>}

        {user && (
          <>
            <p style={styles.tag}>Logged in as</p>
            <h1 style={styles.email}>{user.email}</h1>
            <p style={styles.slugLine}>
              <span style={styles.slugLabel}>your space → </span>
              <span style={styles.slugVal}>/{user.slug}</span>
            </p>
            <button style={styles.btn} onClick={() => navigate(`/${user.slug}/businesses`)}>
              View businesses →
            </button>
          </>
        )}

        {!user && !error && <p style={styles.tag}>Loading...</p>}
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0a0a0a", color: "#f0ede8", fontFamily: "'Georgia', serif", display: "flex", flexDirection: "column" },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem 3rem", borderBottom: "1px solid #1e1e1e" },
  logo: { fontSize: "1.1rem", letterSpacing: "0.15em", fontFamily: "monospace" },
  logoutBtn: { background: "transparent", border: "1px solid #333", color: "#888", padding: "0.4rem 1rem", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" },
  main: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 3rem", maxWidth: "720px", margin: "0 auto", width: "100%" },
  tag: { fontSize: "0.8rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#555", marginBottom: "1rem", fontFamily: "monospace" },
  email: { fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: "normal", margin: "0 0 1rem", letterSpacing: "-0.01em" },
  slugLine: { margin: "0 0 2.5rem", fontFamily: "monospace", fontSize: "0.9rem" },
  slugLabel: { color: "#444" },
  slugVal: { color: "#666" },
  btn: { background: "transparent", border: "1px solid #f0ede8", color: "#f0ede8", padding: "0.85rem 2rem", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit", fontSize: "1rem", width: "fit-content" },
  error: { color: "#e05c5c", fontSize: "0.9rem" },
};