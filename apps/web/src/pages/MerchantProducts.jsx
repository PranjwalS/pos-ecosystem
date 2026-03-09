import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCart } from "../utils/useCart";

const API = "http://localhost:8000";

function normalizeKeyword(k) {
  return k.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractKeywords(products) {
  const freq = {};
  products.forEach(p => {
    if (!p.keywords) return;
    p.keywords.split(",").forEach(k => {
      const norm = normalizeKeyword(k);
      if (!norm) return;
      const display = k.trim().replace(/\b\w/g, c => c.toUpperCase());
      freq[norm] = freq[norm] ?? { display, count: 0 };
      freq[norm].count++;
    });
  });
  return Object.entries(freq)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([norm, { display, count }]) => ({ norm, display, count }));
}

function stockColor(inv) {
  if (inv === 0) return "#e05c5c";
  if (inv <= 5)  return "#e6a855";
  return "#a8c4e6";
}

function QuantityControl({ product, cart, addToCart, setQuantity }) {
  const item = cart[product.id];
  const qty  = item?.quantity ?? 0;

  if (qty === 0) {
    return (
      <button
        style={q.addBtn}
        onClick={e => { e.stopPropagation(); addToCart(product, 1); }}
        disabled={product.inventory === 0}
        onMouseEnter={e => { if (product.inventory > 0) e.currentTarget.style.background = "#c8c4be"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "#e8e4df"; }}
      >
        {product.inventory === 0 ? "Out of Stock" : "Add to Cart"}
      </button>
    );
  }

  return (
    <div style={q.row}>
      <button style={q.btn} onClick={e => { e.stopPropagation(); setQuantity(product, qty - 1); }}>−</button>
      <span style={q.qty}>{qty}</span>
      <button
        style={{ ...q.btn, opacity: qty >= product.inventory ? 0.3 : 1 }}
        onClick={e => { e.stopPropagation(); setQuantity(product, qty + 1); }}
        disabled={qty >= product.inventory}
      >+</button>
    </div>
  );
}

const q = {
  addBtn: { width: "100%", background: "#e8e4df", color: "#080808", border: "none", padding: "0.55rem 0", borderRadius: "6px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.78rem", letterSpacing: "0.05em", transition: "background 0.15s" },
  row:    { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111", border: "1px solid #1e1e1e", borderRadius: "6px", overflow: "hidden" },
  btn:    { background: "transparent", border: "none", color: "#e8e4df", width: "38px", height: "34px", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" },
  qty:    { fontSize: "0.9rem", fontFamily: "monospace", color: "#e8e4df", minWidth: "28px", textAlign: "center" },
};

export default function MerchantProducts() {
  const navigate = useNavigate();
  const { slug, bizSlug } = useParams();
  const { cart, addToCart, setQuantity, totalItems, totalPrice } = useCart(bizSlug);

  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [activeKws, setActiveKws] = useState([]);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }
      try {
        const res = await fetch(`${API}/${bizSlug}/products`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to fetch");
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bizSlug, navigate]);

  const keywords = useMemo(() => extractKeywords(products), [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q));
    }
    if (activeKws.length > 0) {
      list = list.filter(p => {
        if (!p.keywords) return false;
        const pKws = p.keywords.split(",").map(normalizeKeyword);
        return activeKws.some(k => pKws.includes(k));
      });
    }
    return list;
  }, [products, search, activeKws]);

  const toggleKw = (norm) => {
    setActiveKws(prev =>
      prev.includes(norm) ? prev.filter(k => k !== norm) : [...prev, norm]
    );
  };

  return (
    <div style={s.page}>

      {/* ── Top bar ── */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <button style={s.backBtn} onClick={() => navigate(`/${slug}/businesses`)}>← businesses</button>
          <span style={s.sep}>/</span>
          <span style={s.crumb}>register</span>
        </div>
        <div style={s.topCenter}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            style={s.searchInput}
          />
        </div>
        <div style={s.topRight}>
          <button
            style={s.cartBtn}
            onClick={() => navigate(`/${slug}/${bizSlug}/merchant/checkout`)}
          >
            <span style={s.cartIcon}>⊡</span>
            <span style={s.cartLabel}>Cart</span>
            {totalItems > 0 && <span style={s.cartBadge}>{totalItems}</span>}
            {totalItems > 0 && <span style={s.cartPrice}>${totalPrice.toFixed(2)}</span>}
          </button>
        </div>
      </div>

      <div style={s.body}>

        {/* ── Left sidebar: categories ── */}
        <aside style={s.sidebar}>
          <p style={s.sidebarTitle}>Categories</p>
          {!loading && keywords.length === 0 && (
            <p style={s.sidebarEmpty}>No keywords found</p>
          )}
          <div style={s.kwList}>
            {keywords.map(({ norm, display, count }) => (
              <button
                key={norm}
                style={{
                  ...s.kwBtn,
                  background: activeKws.includes(norm) ? "#1e1e1e" : "transparent",
                  color: activeKws.includes(norm) ? "#e8e4df" : "#444",
                  borderColor: activeKws.includes(norm) ? "#333" : "#141414",
                }}
                onClick={() => toggleKw(norm)}
              >
                <span style={s.kwLabel}>{display}</span>
                <span style={s.kwCount}>{count}</span>
              </button>
            ))}
          </div>
          {activeKws.length > 0 && (
            <button style={s.clearKw} onClick={() => setActiveKws([])}>
              ✕ Clear filters
            </button>
          )}

          {/* Cart summary in sidebar */}
          {totalItems > 0 && (
            <div style={s.sideCartSummary}>
              <p style={s.sideCartTitle}>In Cart</p>
              <p style={s.sideCartTotal}>${totalPrice.toFixed(2)}</p>
              <p style={s.sideCartItems}>{totalItems} item{totalItems !== 1 ? "s" : ""}</p>
              <button
                style={s.sideCartBtn}
                onClick={() => navigate(`/${slug}/${bizSlug}/merchant/checkout`)}
              >
                Checkout →
              </button>
            </div>
          )}
        </aside>

        {/* ── Main grid ── */}
        <main style={s.main}>

          {/* Count + active filters */}
          <div style={s.mainHeader}>
            <div style={s.countRow}>
              <span style={s.countTag}>
                {filtered.length} product{filtered.length !== 1 ? "s" : ""}
                {activeKws.length > 0 && <span style={s.filterTag}> · filtered</span>}
              </span>
            </div>
            {activeKws.length > 0 && (
              <div style={s.activePills}>
                {activeKws.map(k => {
                  const kw = keywords.find(x => x.norm === k);
                  return (
                    <span key={k} style={s.activePill}>
                      {kw?.display ?? k}
                      <button style={s.pillX} onClick={() => toggleKw(k)}>✕</button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {loading && <div style={s.state}>Loading products...</div>}
          {error   && <div style={{ ...s.state, color: "#e05c5c" }}>⚠ {error}</div>}

          {!loading && !error && filtered.length === 0 && (
            <div style={s.emptyState}>
              <p style={s.emptyIcon}>◻</p>
              <p style={s.emptyTitle}>No products match</p>
              <p style={s.emptyDesc}>Try a different search or clear filters</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div style={s.grid}>
              {filtered.map(product => {
                const inCart = cart[product.id]?.quantity ?? 0;
                return (
                  <div
                    key={product.id}
                    style={{
                      ...s.card,
                      outline: inCart > 0 ? "1px solid #2a3a2a" : "1px solid transparent",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#161616"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {/* Image */}
                    <div
                      style={s.imgWrap}
                      onClick={() => navigate(`/${slug}/${bizSlug}/merchant/products/${product.id}`)}
                    >
                      {product.image_url
                        ? <img src={product.image_url} alt={product.title} style={s.img} />
                        : <div style={s.imgFallback}><span style={s.imgLetter}>{product.title?.[0]?.toUpperCase()}</span></div>
                      }
                      <div style={{ ...s.stockPill, color: stockColor(product.inventory), background: stockColor(product.inventory) + "22", border: `1px solid ${stockColor(product.inventory)}44` }}>
                        <span style={{ ...s.stockDot, background: stockColor(product.inventory) }} />
                        {product.inventory}
                      </div>
                      {inCart > 0 && (
                        <div style={s.inCartBadge}>{inCart} in cart</div>
                      )}
                    </div>

                    {/* Body */}
                    <div style={s.cardBody}>
                      <div
                        style={s.cardTitleRow}
                        onClick={() => navigate(`/${slug}/${bizSlug}/merchant/products/${product.id}`)}
                      >
                        <span style={s.cardTitle}>{product.title}</span>
                        <span style={s.cardPrice}>${Number(product.price).toFixed(2)}</span>
                      </div>
                      {product.description && (
                        <p style={s.cardDesc}>{product.description}</p>
                      )}
                      <div style={s.cardActions}>
                        <QuantityControl
                          product={product}
                          cart={cart}
                          addToCart={addToCart}
                          setQuantity={setQuantity}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page:    { minHeight: "100vh", background: "#080808", color: "#e8e4df", fontFamily: "'Georgia', serif", display: "flex", flexDirection: "column" },

  topBar:  { position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,8,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid #141414", display: "grid", gridTemplateColumns: "1fr 2fr 1fr", alignItems: "center", padding: "0.85rem 2rem", gap: "1rem" },
  topLeft: { display: "flex", alignItems: "center", gap: "0.6rem" },
  backBtn: { background: "transparent", border: "1px solid #1e1e1e", color: "#444", padding: "0.3rem 0.8rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem" },
  sep:     { color: "#1e1e1e" },
  crumb:   { fontFamily: "monospace", fontSize: "0.8rem", color: "#333" },
  topCenter: { display: "flex", justifyContent: "center" },
  searchInput: { width: "100%", maxWidth: "440px", background: "#0e0e0e", border: "1px solid #1e1e1e", color: "#e8e4df", padding: "0.6rem 1rem", borderRadius: "8px", fontFamily: "'Georgia', serif", fontSize: "0.9rem", outline: "none" },
  topRight:  { display: "flex", justifyContent: "flex-end" },
  cartBtn:   { display: "flex", alignItems: "center", gap: "0.5rem", background: "#0e0e0e", border: "1px solid #1e1e1e", color: "#e8e4df", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem", position: "relative" },
  cartIcon:  { fontSize: "1rem" },
  cartLabel: { color: "#555" },
  cartBadge: { background: "#a8e6a3", color: "#080808", borderRadius: "10px", padding: "0.1rem 0.45rem", fontSize: "0.68rem", fontWeight: "bold" },
  cartPrice: { color: "#a8e6a3", fontSize: "0.85rem" },

  body:    { display: "flex", flex: 1, overflow: "hidden" },

  sidebar: { width: "220px", flexShrink: 0, borderRight: "1px solid #141414", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.4rem", overflowY: "auto", position: "sticky", top: "53px", height: "calc(100vh - 53px)" },
  sidebarTitle: { fontSize: "0.6rem", fontFamily: "monospace", letterSpacing: "0.2em", textTransform: "uppercase", color: "#2a2a2a", margin: "0 0 0.5rem" },
  sidebarEmpty: { fontSize: "0.75rem", fontFamily: "monospace", color: "#2a2a2a" },
  kwList:  { display: "flex", flexDirection: "column", gap: "0.2rem" },
  kwBtn:   { display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "1px solid #141414", borderRadius: "5px", padding: "0.4rem 0.65rem", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem", textAlign: "left", transition: "all 0.15s" },
  kwLabel: { flex: 1 },
  kwCount: { fontSize: "0.65rem", color: "#333", marginLeft: "0.5rem" },
  clearKw: { background: "transparent", border: "none", color: "#e05c5c55", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem", textAlign: "left", padding: "0.25rem 0.65rem", marginTop: "0.25rem" },

  sideCartSummary: { marginTop: "auto", background: "#0c0c0c", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.3rem" },
  sideCartTitle:   { fontSize: "0.6rem", fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", color: "#2a2a2a", margin: 0 },
  sideCartTotal:   { fontSize: "1.4rem", fontFamily: "monospace", color: "#a8e6a3", margin: 0, letterSpacing: "-0.02em" },
  sideCartItems:   { fontSize: "0.72rem", fontFamily: "monospace", color: "#444", margin: "0 0 0.5rem" },
  sideCartBtn:     { background: "#e8e4df", color: "#080808", border: "none", padding: "0.5rem", borderRadius: "5px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.78rem", fontWeight: "bold" },

  main:    { flex: 1, padding: "1.5rem 2rem 4rem", overflowY: "auto" },
  mainHeader: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" },
  countRow:   { display: "flex", alignItems: "center", gap: "0.5rem" },
  countTag:   { fontFamily: "monospace", fontSize: "0.72rem", color: "#333" },
  filterTag:  { color: "#a8d4e6" },
  activePills:{ display: "flex", gap: "0.4rem", flexWrap: "wrap" },
  activePill: { display: "flex", alignItems: "center", gap: "0.35rem", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "20px", padding: "0.2rem 0.6rem", fontFamily: "monospace", fontSize: "0.68rem", color: "#a8d4e6" },
  pillX:      { background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "0.6rem", padding: 0, lineHeight: 1 },

  state:      { fontFamily: "monospace", fontSize: "0.82rem", color: "#444", padding: "4rem 0", textAlign: "center" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: "6rem 0", gap: "0.5rem" },
  emptyIcon:  { fontSize: "2rem", color: "#222", margin: 0 },
  emptyTitle: { fontSize: "1.1rem", color: "#444", margin: 0, fontWeight: "normal" },
  emptyDesc:  { fontSize: "0.78rem", color: "#2a2a2a", fontFamily: "monospace", margin: 0 },

  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" },

  card: { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "10px", overflow: "hidden", transition: "border-color 0.2s, transform 0.2s" },

  imgWrap:   { position: "relative", width: "100%", height: "160px", background: "#111", overflow: "hidden", cursor: "pointer" },
  img:       { width: "100%", height: "100%", objectFit: "cover" },
  imgFallback: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #111 0%, #181818 100%)" },
  imgLetter: { fontSize: "2.5rem", color: "#222", fontFamily: "monospace" },
  stockPill: { position: "absolute", bottom: "0.5rem", left: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.2rem 0.5rem", borderRadius: "20px", fontFamily: "monospace", fontSize: "0.62rem", backdropFilter: "blur(4px)" },
  stockDot:  { width: "4px", height: "4px", borderRadius: "50%", flexShrink: 0 },
  inCartBadge: { position: "absolute", top: "0.5rem", right: "0.5rem", background: "#a8e6a3", color: "#080808", borderRadius: "4px", padding: "0.15rem 0.45rem", fontFamily: "monospace", fontSize: "0.62rem", fontWeight: "bold" },

  cardBody:     { padding: "0.85rem 0.9rem 0.9rem" },
  cardTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.4rem", marginBottom: "0.4rem", cursor: "pointer" },
  cardTitle:    { fontSize: "0.88rem", color: "#e8e4df", letterSpacing: "-0.01em", lineHeight: 1.3 },
  cardPrice:    { fontSize: "0.95rem", fontFamily: "monospace", color: "#a8e6a3", flexShrink: 0 },
  cardDesc:     { fontSize: "0.72rem", color: "#3a3a3a", margin: "0 0 0.75rem", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  cardActions:  { marginTop: "0.6rem" },
};