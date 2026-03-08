import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function Products() {
  const navigate = useNavigate();
  const { slug, bizSlug } = useParams();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }
      try {
        const res = await fetch(`http://localhost:8000/${bizSlug}/products`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to fetch products");
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bizSlug, navigate]);

  const stockColor = (inv) => {
    if (inv === 0) return "#e05c5c";
    if (inv <= 5)  return "#e6a855";
    return "#a8e6a3";
  };

  const stockLabel = (inv) => {
    if (inv === 0) return "Out of stock";
    if (inv <= 5)  return "Low stock";
    return "In stock";
  };

  return (
    <div style={s.page}>

      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <button style={s.backBtn} onClick={() => navigate(`/${slug}/businesses`)}>
            ← businesses
          </button>
          <span style={s.navSep}>/</span>
          <span style={s.navCrumb}>products</span>
        </div>
        <span style={s.navLogo}>⬛ POS</span>
      </nav>

      {/* HEADER */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <p style={s.headerTag}>catalogue</p>
          <h1 style={s.headerTitle}>Products</h1>
          {!loading && !error && (
            <span style={s.countBadge}>{products.length} item{products.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <button style={s.addBtn} onClick={() => navigate(`/${slug}/${bizSlug}/add-product`)}>
          + New Product
        </button>
      </div>

      <main style={s.main}>

        {loading && (
          <div style={s.stateBox}>
            <span style={s.stateText}>Loading products...</span>
          </div>
        )}

        {error && (
          <div style={s.stateBox}>
            <span style={{ ...s.stateText, color: "#e05c5c" }}>⚠ {error}</span>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div style={s.emptyState}>
            <p style={s.emptyIcon}>📦</p>
            <p style={s.emptyTitle}>No products yet</p>
            <p style={s.emptyDesc}>Add your first product to get started</p>
            <button style={s.emptyBtn} onClick={() => navigate(`/${slug}/${bizSlug}/add-product`)}>
              + Add Product
            </button>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div style={s.grid}>
            {products.map((p) => (
              <div
                key={p.id}
                style={s.card}
                onClick={() => navigate(`/${slug}/${bizSlug}/products/${p.id}`)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "#2a2a2a";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "#161616";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Image */}
                <div style={s.imgWrap}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.title} style={s.img} />
                    : (
                      <div style={s.imgFallback}>
                        <span style={s.imgFallbackLetter}>{p.title?.[0]?.toUpperCase()}</span>
                      </div>
                    )
                  }
                  {/* Stock pill overlaid on image */}
                  <div style={{ ...s.stockPill, background: stockColor(p.inventory) + "22", border: `1px solid ${stockColor(p.inventory)}44`, color: stockColor(p.inventory) }}>
                    <span style={{ ...s.stockDot, background: stockColor(p.inventory) }} />
                    {stockLabel(p.inventory)}
                  </div>
                </div>

                {/* Body */}
                <div style={s.cardBody}>
                  <div style={s.cardTop}>
                    <h2 style={s.cardTitle}>{p.title}</h2>
                    <span style={s.cardPrice}>${Number(p.price).toFixed(2)}</span>
                  </div>

                  {p.description && (
                    <p style={s.cardDesc}>{p.description}</p>
                  )}

                  {/* Footer row */}
                  <div style={s.cardFooter}>
                    <div style={s.invRow}>
                      <span style={s.invLabel}>inventory</span>
                      <span style={{ ...s.invVal, color: stockColor(p.inventory) }}>
                        {p.inventory}
                      </span>
                    </div>
                    {p.sku && (
                      <span style={s.sku}>SKU {p.sku}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  page:    { minHeight: "100vh", background: "#080808", color: "#e8e4df", fontFamily: "'Georgia', serif" },

  nav:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 2.5rem", borderBottom: "1px solid #141414" },
  navLeft: { display: "flex", alignItems: "center", gap: "0.75rem" },
  backBtn: { background: "transparent", border: "1px solid #222", color: "#555", padding: "0.35rem 0.9rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem" },
  navSep:  { color: "#2a2a2a" },
  navCrumb:{ color: "#444", fontSize: "0.85rem", fontFamily: "monospace" },
  navLogo: { fontSize: "1rem", letterSpacing: "0.15em", fontFamily: "monospace", color: "#333" },

  header:     { display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "2.5rem 2.5rem 0" },
  headerLeft: { display: "flex", flexDirection: "column", gap: "0.25rem" },
  headerTag:  { fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#444", margin: 0, fontFamily: "monospace" },
  headerTitle:{ fontSize: "2.2rem", fontWeight: "normal", margin: "0.25rem 0 0", letterSpacing: "-0.02em" },
  countBadge: { display: "inline-block", background: "#111", border: "1px solid #1e1e1e", borderRadius: "4px", padding: "0.2rem 0.6rem", fontFamily: "monospace", fontSize: "0.7rem", color: "#555", marginTop: "0.4rem", width: "fit-content" },
  addBtn:     { background: "transparent", border: "1px solid #e8e4df", color: "#e8e4df", padding: "0.6rem 1.25rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem", letterSpacing: "0.05em", transition: "background 0.15s", whiteSpace: "nowrap" },

  main: { padding: "2rem 2.5rem 4rem", maxWidth: "1400px", margin: "0 auto" },

  stateBox:  { display: "flex", justifyContent: "center", padding: "5rem 0" },
  stateText: { fontFamily: "monospace", fontSize: "0.85rem", color: "#444" },

  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8rem 0", gap: "0.75rem" },
  emptyIcon:  { fontSize: "2.5rem", margin: 0 },
  emptyTitle: { fontSize: "1.2rem", color: "#555", margin: 0, fontWeight: "normal" },
  emptyDesc:  { fontSize: "0.85rem", color: "#333", margin: 0, fontFamily: "monospace" },
  emptyBtn:   { marginTop: "1rem", background: "transparent", border: "1px solid #333", color: "#666", padding: "0.6rem 1.5rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem" },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "1rem",
    marginTop: "2rem",
  },

  card: {
    background: "#0c0c0c",
    border: "1px solid #161616",
    borderRadius: "10px",
    overflow: "hidden",
    cursor: "pointer",
    transition: "border-color 0.2s, transform 0.2s",
  },

  imgWrap:         { position: "relative", width: "100%", height: "180px", background: "#111", overflow: "hidden" },
  img:             { width: "100%", height: "100%", objectFit: "cover" },
  imgFallback:     { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #111 0%, #1a1a1a 100%)" },
  imgFallbackLetter: { fontSize: "3rem", color: "#2a2a2a", fontFamily: "monospace" },

  stockPill: { position: "absolute", bottom: "0.6rem", left: "0.6rem", display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.25rem 0.6rem", borderRadius: "20px", fontSize: "0.65rem", fontFamily: "monospace", backdropFilter: "blur(4px)" },
  stockDot:  { width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0 },

  cardBody:   { padding: "1rem 1.1rem 1.1rem" },
  cardTop:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem" },
  cardTitle:  { fontSize: "0.95rem", fontWeight: "normal", margin: 0, color: "#e8e4df", letterSpacing: "-0.01em", lineHeight: 1.3 },
  cardPrice:  { fontSize: "1rem", fontFamily: "monospace", color: "#a8e6a3", flexShrink: 0, letterSpacing: "-0.02em" },
  cardDesc:   { fontSize: "0.78rem", color: "#444", margin: "0 0 0.85rem", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },

  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.85rem", paddingTop: "0.75rem", borderTop: "1px solid #141414" },
  invRow:     { display: "flex", alignItems: "center", gap: "0.5rem" },
  invLabel:   { fontSize: "0.65rem", fontFamily: "monospace", color: "#333", textTransform: "uppercase", letterSpacing: "0.1em" },
  invVal:     { fontSize: "0.85rem", fontFamily: "monospace", fontWeight: "bold" },
  sku:        { fontSize: "0.65rem", fontFamily: "monospace", color: "#2a2a2a", letterSpacing: "0.05em" },
};