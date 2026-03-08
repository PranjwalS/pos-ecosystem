import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API = "http://localhost:8000";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const REQUIRED = ["title", "price"];

function stockStatus(inv) {
  const n = Number(inv ?? 0);
  if (n === 0)  return { label: "No Stock",    color: "#e05c5c", bg: "#e05c5c18" };
  if (n <= 5)   return { label: "Low Stock",   color: "#e6a855", bg: "#e6a85518" };
  if (n <= 20)  return { label: "Limited",     color: "#a8d4e6", bg: "#a8d4e618" };
  return         { label: "Healthy Stock",    color: "#a8e6a3", bg: "#a8e6a318" };
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ─── Image Carousel (same as CurrentProduct) ─────────────────────────────────
function ImageCarousel({ images, onImagesChange }) {
  const [active, setActive]   = useState(0);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [addUrl, setAddUrl]   = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [urlError, setUrlError] = useState("");
  const addRef = useRef(null);

  const handleDragStart = (i) => setDragging(i);
  const handleDragOver  = (e, i) => { e.preventDefault(); setDragOver(i); };
  const handleDrop = (e, i) => {
    e.preventDefault();
    if (dragging === null || dragging === i) { setDragging(null); setDragOver(null); return; }
    const next = [...images];
    const [moved] = next.splice(dragging, 1);
    next.splice(i, 0, moved);
    onImagesChange(next);
    setActive(i);
    setDragging(null); setDragOver(null);
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
    setAddUrl(""); setAddOpen(false); setUrlError("");
    setActive(images.length);
  };
  const prev = () => setActive(a => Math.max(0, a - 1));
  const next = () => setActive(a => Math.min(images.length - 1, a + 1));

  return (
    <div style={cs.carouselWrap}>
      <div style={cs.mainImgWrap}>
        {images.length > 0 ? (
          <>
            <img src={images[active]} alt="product" style={cs.mainImg} onError={e => { e.target.style.display = "none"; }} />
            <button style={cs.deleteImgBtn} onClick={() => removeImage(active)} title="Remove">✕</button>
            {images.length > 1 && <>
              <button style={{ ...cs.arrowBtn, left: "0.75rem" }} onClick={prev} disabled={active === 0}>‹</button>
              <button style={{ ...cs.arrowBtn, right: "0.75rem" }} onClick={next} disabled={active === images.length - 1}>›</button>
            </>}
            <div style={cs.imgCounter}>{active + 1} / {images.length}</div>
          </>
        ) : (
          <div style={cs.noImgPlaceholder}>
            <span style={cs.noImgIcon}>□</span>
            <span style={cs.noImgText}>No images added yet</span>
            <span style={cs.noImgSub}>Add a URL below to preview</span>
          </div>
        )}
      </div>

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
              opacity: dragging === i ? 0.35 : 1,
              background: dragOver === i && dragging !== i ? "#2a2a2a" : "#111",
              cursor: "grab",
            }}
          >
            <img src={url} alt="" style={cs.thumbImg} onError={e => { e.target.style.opacity = 0.3; }} />
          </div>
        ))}
        <div
          style={cs.addThumbBtn}
          onClick={() => { setAddOpen(true); setTimeout(() => addRef.current?.focus(), 50); }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#444"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a2a"}
        >
          <span style={cs.addThumbPlus}>+</span>
        </div>
      </div>

      {addOpen && (
        <div style={cs.addUrlPanel}>
          <input
            ref={addRef}
            value={addUrl}
            onChange={e => { setAddUrl(e.target.value); setUrlError(""); }}
            onKeyDown={e => { if (e.key === "Enter") addImage(); if (e.key === "Escape") setAddOpen(false); }}
            placeholder="Paste image URL and press Enter..."
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

// ─── Editable Field ───────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", hint, mono, multiline, prefix, required, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={fs.wrap}>
      <div style={fs.labelRow}>
        <label style={fs.label}>{label}{required && <span style={fs.req}> *</span>}</label>
        {hint && <span style={fs.hint}>{hint}</span>}
      </div>
      <div style={fs.inputRow}>
        {prefix && <span style={fs.prefix}>{prefix}</span>}
        {multiline
          ? <textarea
              value={value ?? ""}
              onChange={e => onChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{ ...fs.input, ...(mono ? fs.mono : {}), minHeight: "90px", resize: "vertical", paddingTop: "0.6rem", borderColor: error ? "#e05c5c55" : focused ? "#333" : "#1e1e1e" }}
            />
          : <input
              type={type}
              value={value ?? ""}
              onChange={e => onChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{ ...fs.input, ...(mono ? fs.mono : {}), ...(prefix ? fs.inputWithPrefix : {}), borderColor: error ? "#e05c5c55" : focused ? "#333" : "#1e1e1e" }}
            />
        }
      </div>
      {error && <span style={fs.errorText}>{error}</span>}
    </div>
  );
}

// ─── Completeness Ring ────────────────────────────────────────────────────────
function CompletenessRing({ pct }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  const color = pct < 40 ? "#e05c5c" : pct < 75 ? "#e6a855" : "#a8e6a3";
  return (
    <div style={ring.wrap}>
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#1a1a1a" strokeWidth="3" />
        <circle
          cx="24" cy="24" r={r}
          fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
          style={{ transition: "stroke-dasharray 0.4s ease, stroke 0.4s ease" }}
        />
        <text x="24" y="28" textAnchor="middle" fill={color} fontSize="10" fontFamily="monospace">{pct}%</text>
      </svg>
      <span style={{ ...ring.label, color }}>Complete</span>
    </div>
  );
}

const ring = {
  wrap:  { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" },
  label: { fontSize: "0.6rem", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AddProduct() {
  const navigate = useNavigate();
  const { slug, bizSlug } = useParams();

  const [form, setForm] = useState({
    title: "", price: "", description: "", sku: "",
    barcode_number: "", keywords: "", inventory: "0",
  });
  const [images, setImages]       = useState([]);
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [skuAuto, setSkuAuto]     = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [showTips, setShowTips]   = useState(false);

  const set = (key) => (val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: "" }));
  };

  // Auto-generate SKU from title
  useEffect(() => {
    if (!skuAuto || !form.title) return;
    const base = slugify(form.title).toUpperCase().replace(/-/g, "").slice(0, 8);
    const suffix = String(Math.floor(Math.random() * 900) + 100);
    set("sku")(`${base}-${suffix}`);
  }, [form.title, skuAuto]);

  // Completeness score
  const allFields = ["title", "price", "description", "sku", "barcode_number", "keywords", "inventory"];
  const filled = allFields.filter(k => String(form[k] ?? "").trim() !== "").length + (images.length > 0 ? 1 : 0);
  const completeness = Math.round((filled / (allFields.length + 1)) * 100);

  const validate = () => {
    const errs = {};
    if (!form.title.trim())           errs.title = "Title is required";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
                                       errs.price = "Enter a valid price";
    if (form.inventory !== "" && isNaN(Number(form.inventory)))
                                       errs.inventory = "Must be a number";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setGlobalError("");
    const token = localStorage.getItem("token");
    try {
      const payload = {
        title: form.title.trim(),
        price: Number(form.price),
        description: form.description || null,
        sku: form.sku || null,
        barcode_number: form.barcode_number || null,
        keywords: form.keywords || null,
        image_url: images[0] ?? null,
        inventory: Number(form.inventory ?? 0),
      };
      const res = await fetch(`${API}/${bizSlug}/products`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create product");
      navigate(`/${slug}/${bizSlug}/products/${data.id}`);
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const stock = stockStatus(form.inventory);
  const missingRequired = REQUIRED.some(k => !String(form[k] ?? "").trim());

  return (
    <div style={p.page}>

      {/* ── Sticky topbar ── */}
      <div style={p.topBar}>
        <div style={p.topLeft}>
          <button style={p.backBtn} onClick={() => navigate(`/${slug}/${bizSlug}/products`)}>
            ← products
          </button>
          <span style={p.sep}>/</span>
          <span style={p.crumb}>{form.title ? form.title : "New Product"}</span>
        </div>
        <div style={p.topRight}>
          <CompletenessRing pct={completeness} />
          <button
            style={{ ...p.tipBtn, background: showTips ? "#1a1a1a" : "transparent" }}
            onClick={() => setShowTips(s => !s)}
          >
            {showTips ? "✕ Tips" : "? Tips"}
          </button>
          <button
            style={{ ...p.previewBtn, background: previewMode ? "#e8e4df" : "transparent", color: previewMode ? "#080808" : "#666" }}
            onClick={() => setPreviewMode(m => !m)}
          >
            {previewMode ? "✎ Edit" : "⊡ Preview"}
          </button>
          {globalError && <span style={p.errorMsg}>⚠ {globalError}</span>}
          <button
            style={{ ...p.submitBtn, opacity: (missingRequired || saving) ? 0.4 : 1 }}
            onClick={handleSubmit}
            disabled={missingRequired || saving}
          >
            {saving ? "Adding..." : "+ Add Product"}
          </button>
        </div>
      </div>

      {/* ── Tips panel ── */}
      {showTips && (
        <div style={p.tipsPanel}>
          {[
            ["Title", "Be specific — 'Blue Cotton T-Shirt M' beats 'T-Shirt'"],
            ["Price", "Set your selling price, not cost price"],
            ["SKU", "Auto-generated from title — edit freely"],
            ["Keywords", "Comma-separated: 'coffee, hot, espresso, morning'"],
            ["Images", "First image is the primary. Drag to reorder."],
            ["Inventory", "Set to 0 if you track manually or it's a service"],
          ].map(([k, v]) => (
            <div key={k} style={p.tipRow}>
              <span style={p.tipKey}>{k}</span>
              <span style={p.tipVal}>{v}</span>
            </div>
          ))}
        </div>
      )}

      <main style={p.main}>

        {/* ── Preview mode banner ── */}
        {previewMode && (
          <div style={p.previewBanner}>
            <div style={p.previewImgWrap}>
              {images[0]
                ? <img src={images[0]} alt="" style={p.previewImg} />
                : <div style={p.previewImgFallback}>{form.title?.[0]?.toUpperCase() || "?"}</div>
              }
            </div>
            <div style={p.previewInfo}>
              <p style={p.previewTitle}>{form.title || "Product Title"}</p>
              <p style={p.previewPrice}>${Number(form.price || 0).toFixed(2)}</p>
              {form.description && <p style={p.previewDesc}>{form.description}</p>}
              <div style={{ ...p.statusPill, background: stock.bg, color: stock.color, border: `1px solid ${stock.color}33`, width: "fit-content", marginTop: "0.75rem" }}>
                <span style={{ ...p.statusDot, background: stock.color }} />
                {stock.label} — {form.inventory || 0} units
              </div>
            </div>
            <button style={p.previewClose} onClick={() => setPreviewMode(false)}>✕ Close Preview</button>
          </div>
        )}

        {/* ── Required fields reminder ── */}
        {missingRequired && (
          <div style={p.requiredReminder}>
            <span style={p.reminderIcon}>◌</span>
            <span style={p.reminderText}>
              Required: {REQUIRED.filter(k => !String(form[k] ?? "").trim()).join(", ")}
            </span>
          </div>
        )}

        {/* ── Two column layout ── */}
        <div style={p.cols}>

          {/* LEFT ── Images + Title + Description */}
          <div style={p.leftCol}>
            <ImageCarousel images={images} onImagesChange={setImages} />
            <div style={p.divider} />
            <Field label="Product Title" value={form.title} onChange={set("title")} hint="What customers see" required error={errors.title} />
            <Field label="Description"   value={form.description} onChange={set("description")} multiline hint="Shown on receipts and listings" />
          </div>

          {/* RIGHT ── All metadata fields */}
          <div style={p.rightCol}>

            {/* Price + Inventory */}
            <div style={p.twoUp}>
              <Field label="Price"     value={form.price}     onChange={set("price")}     type="number" prefix="$" required error={errors.price} />
              <Field label="Inventory" value={form.inventory} onChange={set("inventory")} type="number" error={errors.inventory} hint="Starting stock" />
            </div>

            {/* Inventory bar */}
            <div style={p.invBarWrap}>
              <div style={p.invBarTrack}>
                <div style={{ ...p.invBarFill, width: `${Math.min(100, (Number(form.inventory ?? 0) / 100) * 100)}%`, background: stock.color }} />
              </div>
              <span style={{ ...p.invBarLabel, color: stock.color }}>{stock.label}</span>
            </div>

            <div style={p.fieldSep} />

            {/* SKU with auto toggle */}
            <div style={p.skuRow}>
              <div style={{ flex: 1 }}>
                <Field
                  label="SKU"
                  value={form.sku}
                  onChange={v => { setSkuAuto(false); set("sku")(v); }}
                  mono hint={skuAuto ? "Auto-generated from title" : "Custom SKU"}
                />
              </div>
              <button
                style={{ ...p.autoToggle, color: skuAuto ? "#a8e6a3" : "#444", borderColor: skuAuto ? "#a8e6a333" : "#1e1e1e" }}
                onClick={() => setSkuAuto(s => !s)}
                title={skuAuto ? "Disable auto-SKU" : "Enable auto-SKU"}
              >
                {skuAuto ? "auto ✓" : "auto"}
              </button>
            </div>

            <Field label="Barcode" value={form.barcode_number} onChange={set("barcode_number")} mono hint="EAN / UPC / custom barcode" />

            <div style={p.fieldSep} />

            <Field label="Keywords" value={form.keywords} onChange={set("keywords")} hint="Comma-separated tags" />

            <div style={p.fieldSep} />

            {/* Live estimate card */}
            <div style={p.calcCard}>
              <p style={p.calcTitle}>At A Glance</p>
              <div style={p.calcRow}>
                <span style={p.calcKey}>Unit price</span>
                <span style={p.calcVal}>${Number(form.price || 0).toFixed(2)}</span>
              </div>
              <div style={p.calcRow}>
                <span style={p.calcKey}>Starting stock</span>
                <span style={p.calcVal}>{form.inventory || 0} units</span>
              </div>
              <div style={p.calcRow}>
                <span style={p.calcKey}>Stock value</span>
                <span style={{ ...p.calcVal, color: "#a8e6a3" }}>
                  ${(Number(form.price || 0) * Number(form.inventory || 0)).toFixed(2)}
                </span>
              </div>
              <div style={{ ...p.calcRow, borderBottom: "none" }}>
                <span style={p.calcKey}>Images</span>
                <span style={p.calcVal}>{images.length} added</span>
              </div>
            </div>

            {/* Completeness checklist */}
            <div style={p.checklist}>
              <p style={p.checklistTitle}>Checklist</p>
              {[
                ["Title",       !!form.title.trim()],
                ["Price",       !!form.price && !isNaN(Number(form.price))],
                ["Description", !!form.description?.trim()],
                ["Image",       images.length > 0],
                ["SKU",         !!form.sku?.trim()],
                ["Keywords",    !!form.keywords?.trim()],
              ].map(([label, done]) => (
                <div key={label} style={p.checkRow}>
                  <span style={{ ...p.checkDot, background: done ? "#a8e6a3" : "#1e1e1e", boxShadow: done ? "0 0 6px #a8e6a355" : "none" }} />
                  <span style={{ ...p.checkLabel, color: done ? "#888" : "#333" }}>{label}</span>
                  {done && <span style={p.checkTick}>✓</span>}
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div style={p.bottomCta}>
          <div style={p.bottomLeft}>
            <span style={p.bottomInfo}>{completeness}% complete · {images.length} image{images.length !== 1 ? "s" : ""} · {form.keywords ? form.keywords.split(",").filter(Boolean).length : 0} keyword{form.keywords?.split(",").filter(Boolean).length !== 1 ? "s" : ""}</span>
          </div>
          <div style={p.bottomRight}>
            <button style={p.cancelBtn} onClick={() => navigate(`/${slug}/${bizSlug}/products`)}>Cancel</button>
            <button
              style={{ ...p.submitBtnLarge, opacity: (missingRequired || saving) ? 0.4 : 1 }}
              onClick={handleSubmit}
              disabled={missingRequired || saving}
            >
              {saving ? "Adding product..." : "Add Product →"}
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}

// ─── Carousel styles (identical to CurrentProduct) ────────────────────────────
const cs = {
  carouselWrap:    { display: "flex", flexDirection: "column", gap: "0.75rem" },
  mainImgWrap:     { position: "relative", width: "100%", height: "360px", background: "#0e0e0e", borderRadius: "10px", overflow: "hidden", border: "1px solid #1a1a1a" },
  mainImg:         { width: "100%", height: "100%", objectFit: "contain" },
  deleteImgBtn:    { position: "absolute", top: "0.75rem", right: "0.75rem", background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#e05c5c", width: "28px", height: "28px", borderRadius: "6px", cursor: "pointer", fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center" },
  arrowBtn:        { position: "absolute", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.7)", border: "1px solid #2a2a2a", color: "#888", width: "36px", height: "36px", borderRadius: "8px", cursor: "pointer", fontSize: "1.4rem", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 },
  imgCounter:      { position: "absolute", bottom: "0.75rem", right: "0.75rem", background: "rgba(0,0,0,0.6)", border: "1px solid #222", borderRadius: "4px", padding: "0.15rem 0.5rem", fontFamily: "monospace", fontSize: "0.7rem", color: "#555" },
  noImgPlaceholder:{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.4rem" },
  noImgIcon:       { fontSize: "2.5rem", opacity: 0.1 },
  noImgText:       { fontFamily: "monospace", fontSize: "0.78rem", color: "#333" },
  noImgSub:        { fontFamily: "monospace", fontSize: "0.65rem", color: "#222" },
  thumbStrip:      { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  thumb:           { width: "60px", height: "60px", borderRadius: "6px", overflow: "hidden", position: "relative", transition: "outline 0.15s", flexShrink: 0 },
  thumbImg:        { width: "100%", height: "100%", objectFit: "cover" },
  addThumbBtn:     { width: "60px", height: "60px", borderRadius: "6px", border: "1px dashed #2a2a2a", background: "#0c0c0c", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "border-color 0.2s" },
  addThumbPlus:    { fontSize: "1.4rem", color: "#333", lineHeight: 1 },
  addUrlPanel:     { display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", background: "#0e0e0e", border: "1px solid #1e1e1e", borderRadius: "8px", padding: "0.75rem 1rem" },
  addUrlInput:     { flex: 1, background: "#141414", border: "1px solid #222", color: "#e8e4df", padding: "0.45rem 0.75rem", borderRadius: "5px", fontFamily: "monospace", fontSize: "0.8rem", outline: "none", minWidth: "200px" },
  addUrlConfirm:   { background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#a8e6a3", padding: "0.45rem 0.9rem", borderRadius: "5px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.78rem" },
  addUrlCancel:    { background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "0.85rem", padding: "0.45rem" },
  urlError:        { color: "#e05c5c", fontFamily: "monospace", fontSize: "0.72rem", width: "100%" },
};

// ─── Field styles ─────────────────────────────────────────────────────────────
const fs = {
  wrap:           { display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "1.1rem" },
  labelRow:       { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  label:          { fontSize: "0.62rem", fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", color: "#3a3a3a" },
  req:            { color: "#e05c5c" },
  hint:           { fontSize: "0.65rem", color: "#2a2a2a", fontFamily: "monospace" },
  inputRow:       { position: "relative", display: "flex", alignItems: "center" },
  prefix:         { position: "absolute", left: "0.75rem", color: "#555", fontFamily: "monospace", fontSize: "0.9rem", zIndex: 1, pointerEvents: "none" },
  input:          { width: "100%", background: "#0e0e0e", border: "1px solid #1e1e1e", color: "#e8e4df", padding: "0.6rem 0.85rem", borderRadius: "6px", fontSize: "0.92rem", fontFamily: "'Georgia', serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" },
  inputWithPrefix:{ paddingLeft: "1.75rem" },
  mono:           { fontFamily: "monospace", fontSize: "0.85rem", letterSpacing: "0.05em" },
  errorText:      { fontSize: "0.68rem", color: "#e05c5c", fontFamily: "monospace" },
};

// ─── Page styles ──────────────────────────────────────────────────────────────
const p = {
  page:    { minHeight: "100vh", background: "#080808", color: "#e8e4df", fontFamily: "'Georgia', serif" },

  topBar:  { position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #141414", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.9rem 2.5rem", gap: "1rem" },
  topLeft: { display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 },
  backBtn: { background: "transparent", border: "1px solid #1e1e1e", color: "#444", padding: "0.3rem 0.8rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem", flexShrink: 0 },
  sep:     { color: "#1e1e1e", flexShrink: 0 },
  crumb:   { fontSize: "0.85rem", color: "#555", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  topRight:{ display: "flex", alignItems: "center", gap: "0.65rem", flexShrink: 0 },
  errorMsg:{ fontFamily: "monospace", fontSize: "0.72rem", color: "#e05c5c", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" },
  tipBtn:  { background: "transparent", border: "1px solid #1e1e1e", color: "#555", padding: "0.3rem 0.75rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem" },
  previewBtn: { border: "1px solid #1e1e1e", padding: "0.3rem 0.75rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", transition: "all 0.15s" },
  submitBtn:  { background: "#e8e4df", color: "#080808", border: "none", padding: "0.45rem 1.25rem", borderRadius: "5px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem", fontWeight: "bold", transition: "opacity 0.15s", whiteSpace: "nowrap" },

  tipsPanel: { background: "#0a0a0a", borderBottom: "1px solid #141414", padding: "1rem 2.5rem", display: "flex", flexWrap: "wrap", gap: "1.5rem" },
  tipRow:    { display: "flex", gap: "0.5rem", alignItems: "baseline" },
  tipKey:    { fontSize: "0.65rem", fontFamily: "monospace", color: "#a8d4e6", textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 },
  tipVal:    { fontSize: "0.72rem", fontFamily: "monospace", color: "#444" },

  main:    { padding: "2rem 2.5rem 5rem", maxWidth: "1100px", margin: "0 auto" },

  previewBanner:     { background: "#0c0c0c", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "1.75rem", display: "flex", gap: "1.5rem", alignItems: "flex-start", marginBottom: "2rem", position: "relative" },
  previewImgWrap:    { width: "100px", height: "100px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, background: "#141414", border: "1px solid #1e1e1e" },
  previewImg:        { width: "100%", height: "100%", objectFit: "cover" },
  previewImgFallback:{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", color: "#2a2a2a", fontFamily: "monospace" },
  previewInfo:       { flex: 1 },
  previewTitle:      { fontSize: "1.6rem", margin: "0 0 0.25rem", fontWeight: "normal", letterSpacing: "-0.02em" },
  previewPrice:      { fontSize: "1.1rem", fontFamily: "monospace", color: "#a8e6a3", margin: "0 0 0.5rem" },
  previewDesc:       { fontSize: "0.82rem", color: "#555", margin: 0, lineHeight: 1.6, fontFamily: "monospace" },
  previewClose:      { position: "absolute", top: "1rem", right: "1rem", background: "transparent", border: "1px solid #1e1e1e", color: "#444", padding: "0.3rem 0.75rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem" },

  requiredReminder: { display: "flex", alignItems: "center", gap: "0.65rem", background: "#0e0a0a", border: "1px solid #e05c5c22", borderRadius: "6px", padding: "0.6rem 1rem", marginBottom: "1.5rem" },
  reminderIcon:     { color: "#e05c5c", fontSize: "0.85rem" },
  reminderText:     { fontFamily: "monospace", fontSize: "0.72rem", color: "#e05c5c88" },

  cols:     { display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "3rem", alignItems: "start" },
  leftCol:  { display: "flex", flexDirection: "column" },
  rightCol: { display: "flex", flexDirection: "column", position: "sticky", top: "80px" },

  divider:  { height: "1px", background: "#141414", margin: "1.5rem 0" },
  fieldSep: { height: "0.5rem" },
  twoUp:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },

  invBarWrap:  { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem", marginTop: "-0.5rem" },
  invBarTrack: { flex: 1, height: "3px", background: "#1a1a1a", borderRadius: "2px", overflow: "hidden" },
  invBarFill:  { height: "100%", borderRadius: "2px", transition: "width 0.4s ease, background 0.4s ease" },
  invBarLabel: { fontFamily: "monospace", fontSize: "0.68rem", flexShrink: 0 },

  skuRow:     { display: "flex", gap: "0.5rem", alignItems: "flex-end" },
  autoToggle: { background: "transparent", border: "1px solid #1e1e1e", padding: "0.6rem 0.65rem", borderRadius: "6px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.05em", marginBottom: "1.1rem", flexShrink: 0, transition: "color 0.2s, border-color 0.2s" },

  calcCard:   { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "8px", padding: "1.1rem 1.25rem", marginBottom: "1rem" },
  calcTitle:  { fontSize: "0.62rem", fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", color: "#2a2a2a", margin: "0 0 0.85rem" },
  calcRow:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0", borderBottom: "1px solid #0f0f0f" },
  calcKey:    { fontSize: "0.78rem", color: "#444", fontFamily: "monospace" },
  calcVal:    { fontSize: "0.9rem", fontFamily: "monospace", color: "#666" },

  checklist:      { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "8px", padding: "1.1rem 1.25rem" },
  checklistTitle: { fontSize: "0.62rem", fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", color: "#2a2a2a", margin: "0 0 0.85rem" },
  checkRow:       { display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.3rem 0" },
  checkDot:       { width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0, transition: "background 0.3s, box-shadow 0.3s" },
  checkLabel:     { fontSize: "0.78rem", fontFamily: "monospace", flex: 1, transition: "color 0.3s" },
  checkTick:      { fontSize: "0.65rem", color: "#a8e6a3" },

  statusPill: { display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.75rem", borderRadius: "20px", fontFamily: "monospace", fontSize: "0.72rem" },
  statusDot:  { width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0 },

  bottomCta:   { marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid #141414", display: "flex", justifyContent: "space-between", alignItems: "center" },
  bottomLeft:  {},
  bottomInfo:  { fontFamily: "monospace", fontSize: "0.72rem", color: "#2a2a2a" },
  bottomRight: { display: "flex", gap: "0.75rem", alignItems: "center" },
  cancelBtn:   { background: "transparent", border: "1px solid #1e1e1e", color: "#444", padding: "0.6rem 1.25rem", borderRadius: "5px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem" },
  submitBtnLarge: { background: "#e8e4df", color: "#080808", border: "none", padding: "0.7rem 1.75rem", borderRadius: "5px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.85rem", fontWeight: "bold", transition: "opacity 0.15s" },
};