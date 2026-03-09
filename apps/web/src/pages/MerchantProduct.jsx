import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCart } from "../utils/useCart";

const API = "http://localhost:8000";

function stockStatus(inv) {
  if (inv === 0)  return { label: "Out of Stock", color: "#e05c5c", bg: "#e05c5c18" };
  if (inv <= 5)   return { label: "Low Stock",    color: "#e6a855", bg: "#e6a85518" };
  if (inv <= 20)  return { label: "Limited",      color: "#a8d4e6", bg: "#a8d4e618" };
  return           { label: "In Stock",           color: "#a8e6a3", bg: "#a8e6a318" };
}

// ─── Image viewer (read-only, arrows only) ────────────────────────────────────
function ImageViewer({ images }) {
  const [active, setActive] = useState(0);
  if (!images || images.length === 0) {
    return (
      <div style={iv.wrap}>
        <div style={iv.noImg}>
          <span style={iv.noImgIcon}>◻</span>
          <span style={iv.noImgText}>No image</span>
        </div>
      </div>
    );
  }
  return (
    <div style={iv.outer}>
      <div style={iv.wrap}>
        <img src={images[active]} alt="product" style={iv.img} onError={e => { e.target.style.opacity = 0.2; }} />
        {images.length > 1 && <>
          <button style={{ ...iv.arrow, left: "0.75rem" }} onClick={() => setActive(a => Math.max(0, a - 1))} disabled={active === 0}>‹</button>
          <button style={{ ...iv.arrow, right: "0.75rem" }} onClick={() => setActive(a => Math.min(images.length - 1, a + 1))} disabled={active === images.length - 1}>›</button>
          <div style={iv.counter}>{active + 1} / {images.length}</div>
        </>}
      </div>
      {images.length > 1 && (
        <div style={iv.thumbs}>
          {images.map((url, i) => (
            <div key={i} onClick={() => setActive(i)} style={{ ...iv.thumb, outline: active === i ? "2px solid #e8e4df" : "2px solid transparent" }}>
              <img src={url} alt="" style={iv.thumbImg} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const iv = {
  outer:   { display: "flex", flexDirection: "column", gap: "0.75rem" },
  wrap:    { position: "relative", width: "100%", height: "380px", background: "#0e0e0e", borderRadius: "10px", overflow: "hidden", border: "1px solid #1a1a1a" },
  img:     { width: "100%", height: "100%", objectFit: "contain" },
  noImg:   { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem" },
  noImgIcon: { fontSize: "2.5rem", opacity: 0.1 },
  noImgText: { fontFamily: "monospace", fontSize: "0.75rem", color: "#333" },
  arrow:   { position: "absolute", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.7)", border: "1px solid #2a2a2a", color: "#888", width: "36px", height: "36px", borderRadius: "8px", cursor: "pointer", fontSize: "1.4rem", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 },
  counter: { position: "absolute", bottom: "0.75rem", right: "0.75rem", background: "rgba(0,0,0,0.6)", border: "1px solid #222", borderRadius: "4px", padding: "0.15rem 0.5rem", fontFamily: "monospace", fontSize: "0.7rem", color: "#555" },
  thumbs:  { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  thumb:   { width: "56px", height: "56px", borderRadius: "6px", overflow: "hidden", cursor: "pointer", flexShrink: 0, background: "#111", transition: "outline 0.15s" },
  thumbImg:{ width: "100%", height: "100%", objectFit: "cover" },
};

// ─── Read-only field ──────────────────────────────────────────────────────────
function ReadField({ label, value, mono }) {
  if (!value && value !== 0) return null;
  return (
    <div style={rf.wrap}>
      <span style={rf.label}>{label}</span>
      <span style={{ ...rf.value, ...(mono ? rf.mono : {}) }}>{value}</span>
    </div>
  );
}

const rf = {
  wrap:  { display: "flex", flexDirection: "column", gap: "0.2rem", padding: "0.75rem 0", borderBottom: "1px solid #0f0f0f" },
  label: { fontSize: "0.6rem", fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", color: "#2a2a2a" },
  value: { fontSize: "0.92rem", color: "#888", lineHeight: 1.5 },
  mono:  { fontFamily: "monospace", fontSize: "0.85rem", letterSpacing: "0.04em" },
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MerchantProduct() {
  const navigate = useNavigate();
  const { slug, bizSlug, productId } = useParams();
  const { cart, addToCart, setQuantity, removeFromCart, totalItems, totalPrice } = useCart(bizSlug);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [addFlash, setAddFlash] = useState(false);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }
      try {
        const res = await fetch(`${API}/${bizSlug}/products/${productId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Product not found");
        setProduct(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId, bizSlug, navigate]);

  const inCart  = cart[productId]?.quantity ?? 0;
  const stock   = product ? stockStatus(Number(product.inventory ?? 0)) : null;
  const images  = product?.image_url ? [product.image_url] : [];

  const handleAdd = () => {
    if (!product) return;
    addToCart(product, 1);
    setAddFlash(true);
    setTimeout(() => setAddFlash(false), 800);
  };

  if (loading) return <div style={p.splash}>Loading...</div>;
  if (error)   return <div style={{ ...p.splash, color: "#e05c5c" }}>⚠ {error}</div>;
  if (!product) return null;

  return (
    <div style={p.page}>

      {/* ── Top bar ── */}
      <div style={p.topBar}>
        <div style={p.topLeft}>
          <button style={p.backBtn} onClick={() => navigate(`/${slug}/${bizSlug}/merchant/products`)}>
            ← products
          </button>
          <span style={p.sep}>/</span>
          <span style={p.crumb}>{product.title}</span>
        </div>
        <div style={p.topRight}>
          <button
            style={p.cartBtn}
            onClick={() => navigate(`/${slug}/${bizSlug}/merchant/checkout`)}
          >
            <span>⊡ Cart</span>
            {totalItems > 0 && <span style={p.cartBadge}>{totalItems}</span>}
            {totalItems > 0 && <span style={p.cartPrice}>${totalPrice.toFixed(2)}</span>}
          </button>
        </div>
      </div>

      <main style={p.main}>
        <div style={p.cols}>

          {/* LEFT — image + basic info */}
          <div style={p.leftCol}>
            <ImageViewer images={images} />

            {/* Status pill */}
            <div style={{ ...p.statusPill, background: stock.bg, color: stock.color, border: `1px solid ${stock.color}33`, marginTop: "1rem" }}>
              <span style={{ ...p.statusDot, background: stock.color }} />
              {stock.label} — {product.inventory} units remaining
            </div>

            {/* Description */}
            {product.description && (
              <div style={p.descBlock}>
                <p style={p.descLabel}>Description</p>
                <p style={p.descText}>{product.description}</p>
              </div>
            )}
          </div>

          {/* RIGHT — details + cart controls */}
          <div style={p.rightCol}>

            {/* Title + price hero */}
            <div style={p.hero}>
              <h1 style={p.heroTitle}>{product.title}</h1>
              <p style={p.heroPrice}>${Number(product.price).toFixed(2)}</p>
            </div>

            <div style={p.divider} />

            {/* Cart controls */}
            <div style={p.cartBlock}>
              <p style={p.cartBlockLabel}>Quantity</p>

              {inCart === 0 ? (
                <button
                  style={{ ...p.addBtn, background: addFlash ? "#c8c4be" : "#e8e4df", opacity: product.inventory === 0 ? 0.4 : 1 }}
                  onClick={handleAdd}
                  disabled={product.inventory === 0}
                >
                  {product.inventory === 0 ? "Out of Stock" : "+ Add to Cart"}
                </button>
              ) : (
                <div style={p.qtyBlock}>
                  <div style={p.qtyRow}>
                    <button style={p.qtyBtn} onClick={() => setQuantity(product, inCart - 1)}>−</button>
                    <span style={p.qtyNum}>{inCart}</span>
                    <button
                      style={{ ...p.qtyBtn, opacity: inCart >= product.inventory ? 0.3 : 1 }}
                      onClick={() => setQuantity(product, inCart + 1)}
                      disabled={inCart >= product.inventory}
                    >+</button>
                  </div>
                  <p style={p.qtySubtotal}>
                    subtotal <span style={{ color: "#a8e6a3" }}>${(inCart * product.price).toFixed(2)}</span>
                  </p>
                  <button style={p.removeBtn} onClick={() => removeFromCart(productId)}>
                    Remove from cart
                  </button>
                </div>
              )}
            </div>

            <div style={p.divider} />

            {/* Read-only fields */}
            <div style={p.fields}>
              <ReadField label="SKU"          value={product.sku}            mono />
              <ReadField label="Barcode"      value={product.barcode_number} mono />
              <ReadField label="Inventory"    value={`${product.inventory} units`} />
              <ReadField label="Unit Price"   value={`$${Number(product.price).toFixed(2)}`} mono />
              {product.keywords && (
                <div style={rf.wrap}>
                  <span style={rf.label}>Keywords</span>
                  <div style={p.kwTags}>
                    {product.keywords.split(",").map((k, i) => (
                      <span key={i} style={p.kwTag}>{k.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Checkout CTA if cart has items */}
            {totalItems > 0 && (
              <div style={p.checkoutCta}>
                <div style={p.ctaLeft}>
                  <span style={p.ctaItems}>{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
                  <span style={p.ctaTotal}>${totalPrice.toFixed(2)}</span>
                </div>
                <button
                  style={p.ctaBtn}
                  onClick={() => navigate(`/${slug}/${bizSlug}/merchant/checkout`)}
                >
                  Go to Checkout →
                </button>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const p = {
  page:    { minHeight: "100vh", background: "#080808", color: "#e8e4df", fontFamily: "'Georgia', serif" },
  splash:  { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: "0.85rem", color: "#444", background: "#080808" },

  topBar:  { position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,8,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid #141414", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 2rem" },
  topLeft: { display: "flex", alignItems: "center", gap: "0.6rem" },
  backBtn: { background: "transparent", border: "1px solid #1e1e1e", color: "#444", padding: "0.3rem 0.8rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem" },
  sep:     { color: "#1e1e1e" },
  crumb:   { fontFamily: "monospace", fontSize: "0.8rem", color: "#555", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  topRight:{ display: "flex", alignItems: "center", gap: "0.6rem" },
  cartBtn: { display: "flex", alignItems: "center", gap: "0.5rem", background: "#0e0e0e", border: "1px solid #1e1e1e", color: "#e8e4df", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem" },
  cartBadge: { background: "#a8e6a3", color: "#080808", borderRadius: "10px", padding: "0.1rem 0.45rem", fontSize: "0.68rem", fontWeight: "bold" },
  cartPrice: { color: "#a8e6a3" },

  main:    { padding: "2rem 2.5rem 5rem", maxWidth: "1000px", margin: "0 auto" },
  cols:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "start" },
  leftCol: { display: "flex", flexDirection: "column" },
  rightCol:{ display: "flex", flexDirection: "column", position: "sticky", top: "72px" },

  statusPill: { display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0.85rem", borderRadius: "20px", fontFamily: "monospace", fontSize: "0.72rem" },
  statusDot:  { width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0 },

  descBlock: { marginTop: "1.5rem" },
  descLabel: { fontSize: "0.6rem", fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", color: "#2a2a2a", margin: "0 0 0.5rem" },
  descText:  { fontSize: "0.88rem", color: "#666", lineHeight: 1.7, margin: 0 },

  hero:      { marginBottom: "1.25rem" },
  heroTitle: { fontSize: "1.8rem", fontWeight: "normal", margin: "0 0 0.4rem", letterSpacing: "-0.025em", lineHeight: 1.2 },
  heroPrice: { fontSize: "1.5rem", fontFamily: "monospace", color: "#a8e6a3", margin: 0, letterSpacing: "-0.02em" },

  divider:   { height: "1px", background: "#141414", margin: "1.25rem 0" },

  cartBlock:      { display: "flex", flexDirection: "column", gap: "0.75rem" },
  cartBlockLabel: { fontSize: "0.6rem", fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", color: "#2a2a2a", margin: 0 },
  addBtn:         { width: "100%", border: "none", color: "#080808", padding: "0.85rem", borderRadius: "8px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.85rem", fontWeight: "bold", transition: "background 0.15s, opacity 0.15s", letterSpacing: "0.05em" },

  qtyBlock:   { display: "flex", flexDirection: "column", gap: "0.5rem" },
  qtyRow:     { display: "flex", alignItems: "center", background: "#0e0e0e", border: "1px solid #1e1e1e", borderRadius: "8px", overflow: "hidden" },
  qtyBtn:     { background: "transparent", border: "none", color: "#e8e4df", width: "52px", height: "46px", cursor: "pointer", fontSize: "1.3rem", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.15s" },
  qtyNum:     { flex: 1, textAlign: "center", fontSize: "1.2rem", fontFamily: "monospace", color: "#e8e4df" },
  qtySubtotal:{ fontFamily: "monospace", fontSize: "0.75rem", color: "#444", margin: 0, textAlign: "center" },
  removeBtn:  { background: "transparent", border: "none", color: "#e05c5c55", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", textAlign: "center", padding: "0.25rem" },

  fields:  { display: "flex", flexDirection: "column" },

  kwTags:  { display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.35rem" },
  kwTag:   { background: "#111", border: "1px solid #1a1a1a", borderRadius: "4px", padding: "0.2rem 0.55rem", fontFamily: "monospace", fontSize: "0.68rem", color: "#444" },

  checkoutCta: { marginTop: "1.5rem", background: "#0c0c0c", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" },
  ctaLeft:     { display: "flex", flexDirection: "column", gap: "0.1rem" },
  ctaItems:    { fontFamily: "monospace", fontSize: "0.68rem", color: "#444" },
  ctaTotal:    { fontFamily: "monospace", fontSize: "1.1rem", color: "#a8e6a3" },
  ctaBtn:      { background: "#e8e4df", color: "#080808", border: "none", padding: "0.6rem 1.25rem", borderRadius: "6px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem", fontWeight: "bold", whiteSpace: "nowrap" },
};