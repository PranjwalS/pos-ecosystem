import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

// ─── Helpers ────────────────────────────────────────────────────────────────
const API = "http://localhost:8000";

function stockStatus(inv) {
  if (inv === 0)  return { label: "Out of Stock", color: "#e05c5c", bg: "#e05c5c18" };
  if (inv <= 5)   return { label: "Low Stock",    color: "#e6a855", bg: "#e6a85518" };
  if (inv <= 20)  return { label: "Limited",      color: "#a8d4e6", bg: "#a8d4e618" };
  return           { label: "In Stock",           color: "#a8e6a3", bg: "#a8e6a318" };
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ─── Draggable Image Carousel ────────────────────────────────────────────────
function ImageCarousel({ images, onImagesChange }) {
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [addUrl, setAddUrl] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [urlError, setUrlError] = useState("");
  const addRef = useRef(null);

  const handleDragStart = (i) => setDragging(i);
  const handleDragOver = (e, i) => { e.preventDefault(); setDragOver(i); };
  const handleDrop = (e, i) => {
    e.preventDefault();
    if (dragging === null || dragging === i) { setDragging(null); setDragOver(null); return; }
    const next = [...images];
    const [moved] = next.splice(dragging, 1);
    next.splice(i, 0, moved);
    onImagesChange(next);
    setActive(i);
    setDragging(null);
    setDragOver(null);
  };
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  const removeImage = (i) => {
    const next = images.filter((_, idx) => idx !== i);
    onImagesChange(next);
    setActive(Math.min(active, next.length - 1));
  };

  const addImage = () => {
    if (!addUrl.trim()) return;
    try { new URL(addUrl); } catch { setUrlError("Invalid URL"); return; }
    onImagesChange([...images, addUrl.trim()]);
    setAddUrl("");
    setAddOpen(false);
    setUrlError("");
    setActive(images.length);
  };

  const prev = () => setActive(a => Math.max(0, a - 1));
  const next = () => setActive(a => Math.min(images.length - 1, a + 1));

  return (
    <div style={cs.carouselWrap}>
      {/* Main display */}
      <div style={cs.mainImgWrap}>
        {images.length > 0 ? (
          <>
            <img
              src={images[active]}
              alt="product"
              style={cs.mainImg}
              onError={e => { e.target.style.display = "none"; }}
            />
            <button style={cs.deleteImgBtn} onClick={() => removeImage(active)} title="Remove image">✕</button>
            {images.length > 1 && <>
              <button style={{ ...cs.arrowBtn, left: "0.75rem" }} onClick={prev} disabled={active === 0}>‹</button>
              <button style={{ ...cs.arrowBtn, right: "0.75rem" }} onClick={next} disabled={active === images.length - 1}>›</button>
            </>}
            <div style={cs.imgCounter}>{active + 1} / {images.length}</div>
          </>
        ) : (
          <div style={cs.noImgPlaceholder}>
            <span style={cs.noImgIcon}>⬜</span>
            <span style={cs.noImgText}>No images</span>
          </div>
        )}
      </div>

      {/* Thumbnail strip + add */}
      <div style={cs.thumbStrip}>
        {images.map((url, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={e => handleDragOver(e, i)}
            onDrop={e => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
            onClick={() => setActive(i)}
            style={{
              ...cs.thumb,
              outline: active === i ? "2px solid #e8e4df" : "2px solid transparent",
              opacity: dragging === i ? 0.4 : 1,
              background: dragOver === i && dragging !== i ? "#2a2a2a" : "#111",
              cursor: "grab",
            }}
          >
            <img src={url} alt="" style={cs.thumbImg} onError={e => { e.target.style.opacity = 0.3; }} />
            <div style={cs.thumbDragHint}>⠿</div>
          </div>
        ))}

        {/* Add button */}
        <div style={cs.addThumbBtn} onClick={() => { setAddOpen(true); setTimeout(() => addRef.current?.focus(), 50); }}>
          <span style={cs.addThumbPlus}>+</span>
        </div>
      </div>

      {/* Add URL inline panel */}
      {addOpen && (
        <div style={cs.addUrlPanel}>
          <input
            ref={addRef}
            value={addUrl}
            onChange={e => { setAddUrl(e.target.value); setUrlError(""); }}
            onKeyDown={e => { if (e.key === "Enter") addImage(); if (e.key === "Escape") setAddOpen(false); }}
            placeholder="Paste image URL..."
            style={cs.addUrlInput}
          />
          <button style={cs.addUrlConfirm} onClick={addImage}>Add</button>
          <button style={cs.addUrlCancel} onClick={() => { setAddOpen(false); setUrlError(""); }}>✕</button>
          {urlError && <span style={cs.urlError}>{urlError}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Editable Field ──────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", hint, mono, multiline, prefix }) {
  return (
    <div style={fs.wrap}>
      <label style={fs.label}>{label}</label>
      {hint && <span style={fs.hint}>{hint}</span>}
      <div style={fs.inputRow}>
        {prefix && <span style={fs.prefix}>{prefix}</span>}
        {multiline
          ? <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} style={{ ...fs.input, ...(mono ? fs.mono : {}), minHeight: "90px", resize: "vertical", paddingTop: "0.6rem" }} />
          : <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} style={{ ...fs.input, ...(mono ? fs.mono : {}), ...(prefix ? fs.inputWithPrefix : {}) }} />
        }
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CurrentProduct() {
  const navigate = useNavigate();
  const { slug, bizSlug, productId } = useParams();

  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [dirty, setDirty] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(3);

  // Fetch product
  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }
      try {
        const res = await fetch(`${API}/${bizSlug}/products/${productId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to load product");
        setProduct(data);
        setForm({ ...data });
        setImages(data.image_url ? [data.image_url] : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId, bizSlug, navigate]);

  // Track dirty state
  useEffect(() => {
    if (!product || !form) return;
    const changed = JSON.stringify({ ...form, image_url: images[0] ?? null }) !== JSON.stringify(product);
    setDirty(changed);
  }, [form, images, product]);

  // Delete countdown
  useEffect(() => {
    if (!deleteConfirm) { setDeleteCountdown(3); return; }
    if (deleteCountdown <= 0) return;
    const t = setTimeout(() => setDeleteCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [deleteConfirm, deleteCountdown]);

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const token = localStorage.getItem("token");
    try {
      const payload = { ...form, image_url: images[0] ?? null };
      const res = await fetch(`${API}/${bizSlug}/products/${productId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Save failed");
      setProduct({ ...form, image_url: images[0] ?? null });
      setSaveMsg("Saved");
      setDirty(false);
      setTimeout(() => setSaveMsg(""), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteCountdown > 0) return;
    setDeleting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/${bizSlug}/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Delete failed"); }
      navigate(`/${slug}/${bizSlug}/products`);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  if (loading) return <div style={p.splash}><span style={p.splashDot} />Loading product...</div>;
  if (error && !form) return <div style={{ ...p.splash, color: "#e05c5c" }}>⚠ {error}</div>;
  if (!form) return null;

  const stock = stockStatus(Number(form.inventory ?? 0));
  const daysOld = product?.created_at ? Math.floor((Date.now() - new Date(product.created_at)) / 86400000) : null;

  return (
    <div style={p.page}>

      {/* ── Sticky top bar ── */}
      <div style={p.topBar}>
        <div style={p.topLeft}>
          <button style={p.backBtn} onClick={() => navigate(`/${slug}/${bizSlug}/products`)}>← products</button>
          <span style={p.sep}>/</span>
          <span style={p.crumb}>{product?.title ?? "Product"}</span>
          {dirty && <span style={p.dirtyDot} title="Unsaved changes">●</span>}
        </div>
        <div style={p.topRight}>
          {saveMsg && <span style={p.saveMsg}>✓ {saveMsg}</span>}
          {error && <span style={p.errorMsg}>⚠ {error}</span>}
          <button
            style={{ ...p.actionBtn, ...p.deleteBtn }}
            onClick={() => setDeleteConfirm(true)}
          >
            Delete
          </button>
          <button
            style={{ ...p.actionBtn, ...p.saveBtn, opacity: (!dirty || saving) ? 0.4 : 1 }}
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Delete confirm modal ── */}
      {deleteConfirm && (
        <div style={p.modalOverlay} onClick={() => setDeleteConfirm(false)}>
          <div style={p.modal} onClick={e => e.stopPropagation()}>
            <h2 style={p.modalTitle}>Delete product?</h2>
            <p style={p.modalBody}>
              <strong style={{ color: "#e8e4df" }}>{product?.title}</strong> will be permanently removed.
              This cannot be undone.
            </p>
            <div style={p.modalActions}>
              <button style={p.modalCancel} onClick={() => setDeleteConfirm(false)}>Cancel</button>
              <button
                style={{ ...p.modalDelete, opacity: deleteCountdown > 0 ? 0.4 : 1, cursor: deleteCountdown > 0 ? "not-allowed" : "pointer" }}
                onClick={handleDelete}
                disabled={deleteCountdown > 0 || deleting}
              >
                {deleting ? "Deleting..." : deleteCountdown > 0 ? `Delete (${deleteCountdown})` : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <main style={p.main}>

        {/* ── Meta strip ── */}
        <div style={p.metaStrip}>
          <div style={{ ...p.statusPill, background: stock.bg, color: stock.color, border: `1px solid ${stock.color}33` }}>
            <span style={{ ...p.statusDot, background: stock.color }} />
            {stock.label}
          </div>
          {daysOld !== null && (
            <span style={p.metaItem}>
              <span style={p.metaKey}>created</span> {formatDate(product.created_at)}
            </span>
          )}
          {daysOld !== null && (
            <span style={p.metaItem}>
              <span style={p.metaKey}>age</span> {daysOld} day{daysOld !== 1 ? "s" : ""}
            </span>
          )}
          <span style={p.metaItem}>
            <span style={p.metaKey}>id</span>
            <span style={p.metaId}>{productId?.slice(0, 8)}...</span>
          </span>
        </div>

        {/* ── Two column layout ── */}
        <div style={p.cols}>

          {/* LEFT — Images + Title + Description */}
          <div style={p.leftCol}>

            <ImageCarousel images={images} onImagesChange={setImages} />

            <div style={p.divider} />

            <Field label="Product Title" value={form.title} onChange={set("title")} hint="Public-facing name" />

            <Field label="Description" value={form.description} onChange={set("description")} multiline hint="Shown on receipts and product pages" />

          </div>

          {/* RIGHT — All other fields */}
          <div style={p.rightCol}>

            {/* Price + Inventory side by side */}
            <div style={p.twoUp}>
              <Field label="Price" value={form.price} onChange={set("price")} type="number" prefix="$" hint="Selling price" />
              <Field label="Inventory" value={form.inventory} onChange={v => set("inventory")(Number(v))} type="number" hint="Units in stock" />
            </div>

            {/* Inventory visual bar */}
            <div style={p.invBarWrap}>
              <div style={p.invBarTrack}>
                <div style={{
                  ...p.invBarFill,
                  width: `${Math.min(100, (Number(form.inventory ?? 0) / 100) * 100)}%`,
                  background: stock.color,
                }} />
              </div>
              <span style={{ ...p.invBarLabel, color: stock.color }}>{form.inventory ?? 0} units</span>
            </div>

            <div style={p.fieldSep} />

            <Field label="SKU" value={form.sku} onChange={set("sku")} mono hint="Stock keeping unit" />
            <Field label="Barcode" value={form.barcode_number} onChange={set("barcode_number")} mono hint="EAN / UPC / custom" />

            <div style={p.fieldSep} />

            <Field label="Keywords" value={form.keywords} onChange={set("keywords")} hint="Comma-separated tags for search" />

            <div style={p.fieldSep} />

            {/* Revenue estimate card */}
            <div style={p.calcCard}>
              <p style={p.calcTitle}>Revenue Estimate</p>
              <div style={p.calcRow}>
                <span style={p.calcKey}>If all sold</span>
                <span style={p.calcVal}>${(Number(form.price ?? 0) * Number(form.inventory ?? 0)).toFixed(2)}</span>
              </div>
              <div style={p.calcRow}>
                <span style={p.calcKey}>Unit price</span>
                <span style={p.calcVal}>${Number(form.price ?? 0).toFixed(2)}</span>
              </div>
              <div style={p.calcRow}>
                <span style={p.calcKey}>Stock value</span>
                <span style={{ ...p.calcVal, color: "#a8e6a3" }}>${(Number(form.price ?? 0) * Number(form.inventory ?? 0)).toFixed(2)}</span>
              </div>
            </div>

          </div>
        </div>

        {/* ── Change log strip ── */}
        {dirty && (
          <div style={p.changeLog}>
            <span style={p.changeLogIcon}>◈</span>
            <span style={p.changeLogText}>You have unsaved changes — remember to save before leaving.</span>
            <button style={p.changeLogSave} onClick={handleSave} disabled={saving}>
              {saving ? "..." : "Save now"}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

// ─── Carousel Styles ─────────────────────────────────────────────────────────
const cs = {
  carouselWrap:   { display: "flex", flexDirection: "column", gap: "0.75rem" },
  mainImgWrap:    { position: "relative", width: "100%", height: "360px", background: "#0e0e0e", borderRadius: "10px", overflow: "hidden", border: "1px solid #1a1a1a" },
  mainImg:        { width: "100%", height: "100%", objectFit: "contain" },
  deleteImgBtn:   { position: "absolute", top: "0.75rem", right: "0.75rem", background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#e05c5c", width: "28px", height: "28px", borderRadius: "6px", cursor: "pointer", fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center" },
  arrowBtn:       { position: "absolute", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.7)", border: "1px solid #2a2a2a", color: "#888", width: "36px", height: "36px", borderRadius: "8px", cursor: "pointer", fontSize: "1.4rem", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 },
  imgCounter:     { position: "absolute", bottom: "0.75rem", right: "0.75rem", background: "rgba(0,0,0,0.6)", border: "1px solid #222", borderRadius: "4px", padding: "0.15rem 0.5rem", fontFamily: "monospace", fontSize: "0.7rem", color: "#555" },
  noImgPlaceholder:{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem" },
  noImgIcon:      { fontSize: "2.5rem", opacity: 0.15 },
  noImgText:      { fontFamily: "monospace", fontSize: "0.75rem", color: "#333" },
  thumbStrip:     { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  thumb:          { width: "60px", height: "60px", borderRadius: "6px", overflow: "hidden", position: "relative", transition: "outline 0.15s", flexShrink: 0 },
  thumbImg:       { width: "100%", height: "100%", objectFit: "cover" },
  thumbDragHint:  { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0)", color: "rgba(255,255,255,0)", fontSize: "1rem", transition: "all 0.15s" },
  addThumbBtn:    { width: "60px", height: "60px", borderRadius: "6px", border: "1px dashed #2a2a2a", background: "#0c0c0c", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "border-color 0.15s" },
  addThumbPlus:   { fontSize: "1.4rem", color: "#333", lineHeight: 1 },
  addUrlPanel:    { display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", background: "#0e0e0e", border: "1px solid #1e1e1e", borderRadius: "8px", padding: "0.75rem 1rem" },
  addUrlInput:    { flex: 1, background: "#141414", border: "1px solid #222", color: "#e8e4df", padding: "0.45rem 0.75rem", borderRadius: "5px", fontFamily: "monospace", fontSize: "0.8rem", outline: "none", minWidth: "200px" },
  addUrlConfirm:  { background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#a8e6a3", padding: "0.45rem 0.9rem", borderRadius: "5px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.78rem" },
  addUrlCancel:   { background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "0.85rem", padding: "0.45rem" },
  urlError:       { color: "#e05c5c", fontFamily: "monospace", fontSize: "0.72rem", width: "100%" },
};

// ─── Field Styles ─────────────────────────────────────────────────────────────
const fs = {
  wrap:     { display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "1.1rem" },
  label:    { fontSize: "0.62rem", fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", color: "#3a3a3a" },
  hint:     { fontSize: "0.68rem", color: "#2a2a2a", fontFamily: "monospace", marginTop: "-0.15rem" },
  inputRow: { position: "relative", display: "flex", alignItems: "center" },
  prefix:   { position: "absolute", left: "0.75rem", color: "#555", fontFamily: "monospace", fontSize: "0.9rem", zIndex: 1, pointerEvents: "none" },
  input:    { width: "100%", background: "#0e0e0e", border: "1px solid #1e1e1e", color: "#e8e4df", padding: "0.6rem 0.85rem", borderRadius: "6px", fontSize: "0.92rem", fontFamily: "'Georgia', serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" },
  inputWithPrefix: { paddingLeft: "1.75rem" },
  mono:     { fontFamily: "monospace", fontSize: "0.85rem", letterSpacing: "0.05em" },
};

// ─── Page Styles ──────────────────────────────────────────────────────────────
const p = {
  page:     { minHeight: "100vh", background: "#080808", color: "#e8e4df", fontFamily: "'Georgia', serif" },
  splash:   { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", fontFamily: "monospace", fontSize: "0.85rem", color: "#444", background: "#080808" },
  splashDot:{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#333", animation: "pulse 1.2s infinite" },

  topBar:   { position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #141414", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.9rem 2.5rem" },
  topLeft:  { display: "flex", alignItems: "center", gap: "0.65rem" },
  backBtn:  { background: "transparent", border: "1px solid #1e1e1e", color: "#444", padding: "0.3rem 0.8rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem", transition: "border-color 0.15s, color 0.15s" },
  sep:      { color: "#1e1e1e" },
  crumb:    { fontSize: "0.85rem", color: "#555", fontFamily: "monospace", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  dirtyDot: { color: "#e6a855", fontSize: "0.55rem", marginLeft: "0.1rem" },
  topRight: { display: "flex", alignItems: "center", gap: "0.65rem" },
  saveMsg:  { fontFamily: "monospace", fontSize: "0.75rem", color: "#a8e6a3" },
  errorMsg: { fontFamily: "monospace", fontSize: "0.75rem", color: "#e05c5c" },
  actionBtn:{ padding: "0.45rem 1.1rem", borderRadius: "5px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.78rem", letterSpacing: "0.05em", border: "none", transition: "opacity 0.15s" },
  deleteBtn:{ background: "#1a0a0a", border: "1px solid #e05c5c33", color: "#e05c5c" },
  saveBtn:  { background: "#e8e4df", color: "#080808", fontWeight: "bold" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" },
  modal:        { background: "#0e0e0e", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "2.5rem", width: "420px", maxWidth: "90vw" },
  modalTitle:   { fontSize: "1.3rem", fontWeight: "normal", margin: "0 0 0.75rem", letterSpacing: "-0.02em" },
  modalBody:    { fontSize: "0.88rem", color: "#666", margin: "0 0 2rem", lineHeight: 1.6, fontFamily: "monospace" },
  modalActions: { display: "flex", gap: "0.75rem", justifyContent: "flex-end" },
  modalCancel:  { background: "transparent", border: "1px solid #2a2a2a", color: "#666", padding: "0.5rem 1.25rem", borderRadius: "5px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem" },
  modalDelete:  { background: "#e05c5c", color: "#fff", border: "none", padding: "0.5rem 1.25rem", borderRadius: "5px", fontFamily: "monospace", fontSize: "0.8rem", transition: "opacity 0.15s" },

  main:       { padding: "2rem 2.5rem 5rem", maxWidth: "1100px", margin: "0 auto" },

  metaStrip:  { display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem", flexWrap: "wrap" },
  statusPill: { display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.75rem", borderRadius: "20px", fontFamily: "monospace", fontSize: "0.72rem" },
  statusDot:  { width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0 },
  metaItem:   { fontSize: "0.75rem", fontFamily: "monospace", color: "#333", display: "flex", gap: "0.4rem" },
  metaKey:    { color: "#2a2a2a" },
  metaId:     { letterSpacing: "0.05em" },

  cols:       { display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "3rem", alignItems: "start" },
  leftCol:    { display: "flex", flexDirection: "column" },
  rightCol:   { display: "flex", flexDirection: "column", position: "sticky", top: "80px" },

  divider:    { height: "1px", background: "#141414", margin: "1.5rem 0" },
  fieldSep:   { height: "0.5rem" },

  twoUp:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },

  invBarWrap:  { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem", marginTop: "-0.5rem" },
  invBarTrack: { flex: 1, height: "3px", background: "#1a1a1a", borderRadius: "2px", overflow: "hidden" },
  invBarFill:  { height: "100%", borderRadius: "2px", transition: "width 0.4s ease, background 0.4s ease" },
  invBarLabel: { fontFamily: "monospace", fontSize: "0.68rem", flexShrink: 0 },

  calcCard:   { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "8px", padding: "1.1rem 1.25rem" },
  calcTitle:  { fontSize: "0.62rem", fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", color: "#2a2a2a", margin: "0 0 0.85rem" },
  calcRow:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0", borderBottom: "1px solid #0f0f0f" },
  calcKey:    { fontSize: "0.78rem", color: "#444", fontFamily: "monospace" },
  calcVal:    { fontSize: "0.9rem", fontFamily: "monospace", color: "#666" },

  changeLog:     { position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", background: "#0e0e0e", border: "1px solid #e6a85544", borderRadius: "8px", padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: "0.85rem", zIndex: 40, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" },
  changeLogIcon: { color: "#e6a855", fontSize: "0.85rem" },
  changeLogText: { fontFamily: "monospace", fontSize: "0.75rem", color: "#888" },
  changeLogSave: { background: "#e6a855", color: "#080808", border: "none", padding: "0.35rem 0.85rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem", fontWeight: "bold" },
};