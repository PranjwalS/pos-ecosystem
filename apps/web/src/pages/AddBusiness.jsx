import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function AddBusiness() {
  const navigate = useNavigate();
  const { slug } = useParams();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [logo, setLogo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    try {
      const res = await fetch("http://localhost:8000/create_business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          business_name: name,
          business_desc: desc || null,
          business_logo: logo || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create business");

      // Redirect back to businesses — slug from response if you ever need it: data.slug
      navigate(`/${slug}/businesses`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.logo}>⬛ POS</span>
        <button style={styles.backBtn} onClick={() => navigate(`/${slug}/businesses`)}>← back</button>
      </nav>

      <main style={styles.main}>
        <p style={styles.tag}>New business</p>
        <h1 style={styles.title}>Add a business</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Business name *</label>
          <input
            style={styles.input}
            type="text"
            placeholder="My Coffee Shop"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label style={styles.label}>Description</label>
          <textarea
            style={{ ...styles.input, resize: "vertical", minHeight: "90px" }}
            placeholder="What does this business do?"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />

          <label style={styles.label}>Logo URL</label>
          <input
            style={styles.input}
            type="url"
            placeholder="https://example.com/logo.png"
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create business →"}
          </button>
        </form>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0a0a0a", color: "#f0ede8", fontFamily: "'Georgia', serif", display: "flex", flexDirection: "column" },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem 3rem", borderBottom: "1px solid #1e1e1e" },
  logo: { fontSize: "1.1rem", letterSpacing: "0.15em", fontFamily: "monospace" },
  backBtn: { background: "transparent", border: "1px solid #333", color: "#888", padding: "0.4rem 1rem", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" },
  main: { flex: 1, maxWidth: "520px", width: "100%", margin: "0 auto", padding: "3rem" },
  tag: { fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#555", marginBottom: "0.5rem", fontFamily: "monospace" },
  title: { fontSize: "2.2rem", fontWeight: "normal", margin: "0 0 2.5rem", letterSpacing: "-0.02em" },
  form: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  label: { fontSize: "0.75rem", color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" },
  input: { background: "#161616", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "0.75rem 1rem", color: "#f0ede8", fontSize: "1rem", fontFamily: "inherit", marginBottom: "1.25rem", outline: "none", width: "100%" },
  error: { color: "#e05c5c", fontSize: "0.85rem", margin: "0 0 0.5rem" },
  btn: { marginTop: "0.5rem", background: "#f0ede8", color: "#0a0a0a", border: "none", borderRadius: "4px", padding: "0.85rem", fontSize: "1rem", fontFamily: "inherit", fontWeight: "600", cursor: "pointer" },
};