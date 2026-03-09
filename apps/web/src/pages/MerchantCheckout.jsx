import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCart } from "../utils/useCart";

const API = "http://localhost:8000";

function formatTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ─── Stock warning helper ─────────────────────────────────────────────────────
function stockWarning(item) {
  if (item.quantity > item.inventory) return "exceeds";
  if (item.inventory <= 5 && item.inventory > 0) return "low";
  if (item.inventory === 0) return "out";
  return null;
}

export default function MerchantCheckout() {
  const navigate = useNavigate();
  const { slug, bizSlug } = useParams();
  // eslint-disable-next-line no-unused-vars
  const { cartList, cart, setQuantity, removeFromCart, clearCart, totalItems, totalPrice } = useCart(bizSlug);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [note, setNote]             = useState("");
  const [checkoutTime]              = useState(formatTime());
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Live clock
  const [clock, setClock] = useState(formatTime());
  useEffect(() => {
    const t = setInterval(() => setClock(formatTime()), 10000);
    return () => clearInterval(t);
  }, []);

  // Block checkout if any item exceeds stock
  const hasStockError = cartList.some(item => item.quantity > item.inventory || item.inventory === 0);
  const isEmpty = cartList.length === 0;

  const handleCheckout = async () => {
    if (hasStockError || isEmpty) return;
    setConfirmOpen(false);
    setSubmitting(true);
    setError("");
    const token = localStorage.getItem("token");
    try {
      const payload = {
        total_amount: totalPrice,
        items: cartList.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price_at_time: item.price,
        })),
      };
      const res = await fetch(`${API}/${bizSlug}/create_transaction`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Transaction failed");
      setTransactionId(data.transaction_id);
      setSuccess(true);
      clearCart();
      setTimeout(() => navigate(`/${slug}/${bizSlug}/merchant/products`), 3500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={sc.page}>
        <div style={sc.successWrap}>
          <div style={sc.successRing}>
            <span style={sc.successCheck}>✓</span>
          </div>
          <h1 style={sc.successTitle}>Transaction Complete</h1>
          <p style={sc.successSub}>Thank you — have a great day!</p>
          <p style={sc.successId}>ref {transactionId.slice(0, 8).toUpperCase()}</p>
          <p style={sc.successTime}>{checkoutTime}</p>
          <p style={sc.successRedirect}>Returning to register...</p>
        </div>
      </div>
    );
  }

  // ── Empty cart ──────────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div style={sc.page}>
        <div style={sc.topBar}>
          <button style={sc.backBtn} onClick={() => navigate(`/${slug}/${bizSlug}/merchant/products`)}>← back to register</button>
          <span style={sc.navLogo}>⊡ Checkout</span>
          <span style={sc.clock}>{clock}</span>
        </div>
        <div style={sc.emptyWrap}>
          <p style={sc.emptyIcon}>◻</p>
          <p style={sc.emptyTitle}>Cart is empty</p>
          <p style={sc.emptyDesc}>Add products from the register</p>
          <button style={sc.emptyBtn} onClick={() => navigate(`/${slug}/${bizSlug}/merchant/products`)}>
            → Go to Register
          </button>
        </div>
      </div>
    );
  }

  const tax      = totalPrice * 0.13; // Ontario HST — adjust as needed
  const grandTotal = totalPrice + tax;

  return (
    <div style={sc.page}>

      {/* ── Confirm modal ── */}
      {confirmOpen && (
        <div style={sc.overlay} onClick={() => setConfirmOpen(false)}>
          <div style={sc.modal} onClick={e => e.stopPropagation()}>
            <h2 style={sc.modalTitle}>Confirm Payment</h2>
            <p style={sc.modalAmt}>${grandTotal.toFixed(2)}</p>
            <p style={sc.modalSub}>{totalItems} item{totalItems !== 1 ? "s" : ""} · {checkoutTime}</p>
            <div style={sc.modalActions}>
              <button style={sc.modalCancel} onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button style={sc.modalConfirm} onClick={handleCheckout} disabled={submitting}>
                {submitting ? "Processing..." : "Confirm & Pay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      <div style={sc.topBar}>
        <button style={sc.backBtn} onClick={() => navigate(`/${slug}/${bizSlug}/merchant/products`)}>← register</button>
        <span style={sc.navLogo}>⊡ Checkout</span>
        <span style={sc.clock}>{clock}</span>
      </div>

      <div style={sc.body}>

        {/* ── LEFT: Cart items ── */}
        <div style={sc.left}>
          <div style={sc.leftHeader}>
            <span style={sc.leftTitle}>Order Items</span>
            <span style={sc.leftCount}>{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
          </div>

          {hasStockError && (
            <div style={sc.stockBanner}>
              <span style={sc.stockBannerIcon}>⚠</span>
              <span style={sc.stockBannerText}>Some items exceed available stock — resolve before checkout</span>
            </div>
          )}

          <div style={sc.itemList}>
            {cartList.map(item => {
              const warn = stockWarning(item);
              return (
                <div key={item.id} style={{ ...sc.itemRow, borderColor: warn === "exceeds" || warn === "out" ? "#e05c5c33" : "#141414", background: warn === "exceeds" || warn === "out" ? "#0e0a0a" : "#0c0c0c" }}>

                  {/* Image */}
                  <div style={sc.itemImg}>
                    {item.image_url
                      ? <img src={item.image_url} alt={item.title} style={sc.itemImgEl} />
                      : <div style={sc.itemImgFallback}>{item.title?.[0]?.toUpperCase()}</div>
                    }
                  </div>

                  {/* Info */}
                  <div style={sc.itemInfo}>
                    <p style={sc.itemTitle}>{item.title}</p>
                    <p style={sc.itemUnitPrice}>${Number(item.price).toFixed(2)} each</p>
                    {warn === "exceeds" && (
                      <p style={sc.itemWarn}>⚠ Only {item.inventory} in stock</p>
                    )}
                    {warn === "out" && (
                      <p style={sc.itemWarn}>⚠ Out of stock</p>
                    )}
                    {warn === "low" && (
                      <p style={{ ...sc.itemWarn, color: "#e6a85588" }}>Low stock — {item.inventory} left</p>
                    )}
                  </div>

                  {/* Qty controls */}
                  <div style={sc.itemQtyWrap}>
                    <div style={sc.itemQtyRow}>
                      <button style={sc.qBtn} onClick={() => setQuantity(item, item.quantity - 1)}>−</button>
                      <span style={{ ...sc.qNum, color: warn === "exceeds" ? "#e05c5c" : "#e8e4df" }}>{item.quantity}</span>
                      <button
                        style={{ ...sc.qBtn, opacity: item.quantity >= item.inventory ? 0.25 : 1 }}
                        onClick={() => setQuantity(item, item.quantity + 1)}
                        disabled={item.quantity >= item.inventory}
                      >+</button>
                    </div>
                    <p style={sc.itemSubtotal}>${(item.price * item.quantity).toFixed(2)}</p>
                  </div>

                  {/* Remove */}
                  <button style={sc.removeBtn} onClick={() => removeFromCart(item.id)} title="Remove">✕</button>
                </div>
              );
            })}
          </div>

          {/* Note field */}
          <div style={sc.noteWrap}>
            <label style={sc.noteLabel}>Order Note (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any special instructions..."
              style={sc.noteInput}
              rows={2}
            />
          </div>
        </div>

        {/* ── RIGHT: Summary ── */}
        <div style={sc.right}>
          <div style={sc.summaryCard}>

            <p style={sc.summaryTitle}>Order Summary</p>

            {/* Per-item price breakdown */}
            <div style={sc.summaryLines}>
              {cartList.map(item => (
                <div key={item.id} style={sc.summaryLine}>
                  <span style={sc.summaryLineLabel}>
                    {item.title}
                    <span style={sc.summaryLineQty}> ×{item.quantity}</span>
                  </span>
                  <span style={sc.summaryLineVal}>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={sc.summaryDivider} />

            {/* Subtotal / tax / total */}
            <div style={sc.summaryTotals}>
              <div style={sc.totalRow}>
                <span style={sc.totalKey}>Subtotal</span>
                <span style={sc.totalVal}>${totalPrice.toFixed(2)}</span>
              </div>
              <div style={sc.totalRow}>
                <span style={sc.totalKey}>HST (13%)</span>
                <span style={sc.totalVal}>${tax.toFixed(2)}</span>
              </div>
              <div style={{ ...sc.totalRow, ...sc.totalGrand }}>
                <span style={sc.grandKey}>Total</span>
                <span style={sc.grandVal}>${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Items count chip */}
            <div style={sc.summaryMeta}>
              <span style={sc.metaChip}>{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
              <span style={sc.metaChip}>{cartList.length} product{cartList.length !== 1 ? "s" : ""}</span>
              <span style={sc.metaChip}>{clock}</span>
            </div>

            {error && <p style={sc.errorMsg}>⚠ {error}</p>}

            {/* Pay button */}
            <button
              style={{
                ...sc.payBtn,
                opacity: hasStockError || submitting ? 0.35 : 1,
                cursor: hasStockError || submitting ? "not-allowed" : "pointer",
              }}
              onClick={() => !hasStockError && !submitting && setConfirmOpen(true)}
              disabled={hasStockError || submitting}
            >
              {submitting ? "Processing..." : hasStockError ? "Resolve Stock Issues" : `Pay $${grandTotal.toFixed(2)}`}
            </button>

            {hasStockError && (
              <p style={sc.payBlockedNote}>Fix quantities above to proceed</p>
            )}

            {/* Clear cart */}
            <button style={sc.clearBtn} onClick={() => { clearCart(); navigate(`/${slug}/${bizSlug}/merchant/products`); }}>
              ✕ Clear cart & cancel
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sc = {
  page:    { minHeight: "100vh", background: "#080808", color: "#e8e4df", fontFamily: "'Georgia', serif", display: "flex", flexDirection: "column" },

  // Success
  successWrap:     { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", padding: "4rem 2rem", minHeight: "100vh" },
  successRing:     { width: "80px", height: "80px", borderRadius: "50%", border: "2px solid #a8e6a3", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.5rem" },
  successCheck:    { fontSize: "2rem", color: "#a8e6a3" },
  successTitle:    { fontSize: "2rem", fontWeight: "normal", margin: 0, letterSpacing: "-0.025em" },
  successSub:      { fontSize: "0.9rem", color: "#666", margin: 0, fontFamily: "monospace" },
  successId:       { fontSize: "0.72rem", fontFamily: "monospace", color: "#2a2a2a", letterSpacing: "0.15em", margin: 0 },
  successTime:     { fontSize: "0.72rem", fontFamily: "monospace", color: "#222", margin: 0 },
  successRedirect: { fontSize: "0.72rem", fontFamily: "monospace", color: "#333", marginTop: "1rem", animation: "pulse 1.5s infinite" },

  // Empty
  emptyWrap:  { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.6rem", minHeight: "80vh" },
  emptyIcon:  { fontSize: "2.5rem", color: "#1e1e1e", margin: 0 },
  emptyTitle: { fontSize: "1.2rem", color: "#444", margin: 0, fontWeight: "normal" },
  emptyDesc:  { fontSize: "0.78rem", fontFamily: "monospace", color: "#2a2a2a", margin: 0 },
  emptyBtn:   { marginTop: "0.75rem", background: "transparent", border: "1px solid #222", color: "#555", padding: "0.55rem 1.25rem", borderRadius: "5px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem" },

  // Top bar
  topBar:  { position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,8,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid #141414", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 2rem" },
  backBtn: { background: "transparent", border: "1px solid #1e1e1e", color: "#444", padding: "0.3rem 0.8rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem" },
  navLogo: { fontFamily: "monospace", fontSize: "0.85rem", color: "#333", letterSpacing: "0.1em" },
  clock:   { fontFamily: "monospace", fontSize: "0.78rem", color: "#2a2a2a" },

  // Confirm modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" },
  modal:   { background: "#0e0e0e", border: "1px solid #2a2a2a", borderRadius: "14px", padding: "2.5rem", width: "360px", maxWidth: "90vw", textAlign: "center" },
  modalTitle:   { fontSize: "1.1rem", fontWeight: "normal", margin: "0 0 0.5rem", color: "#888", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" },
  modalAmt:     { fontSize: "2.8rem", fontFamily: "monospace", color: "#a8e6a3", margin: "0 0 0.25rem", letterSpacing: "-0.03em" },
  modalSub:     { fontSize: "0.75rem", fontFamily: "monospace", color: "#333", margin: "0 0 2rem" },
  modalActions: { display: "flex", gap: "0.75rem" },
  modalCancel:  { flex: 1, background: "transparent", border: "1px solid #2a2a2a", color: "#555", padding: "0.65rem", borderRadius: "6px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem" },
  modalConfirm: { flex: 1, background: "#a8e6a3", color: "#080808", border: "none", padding: "0.65rem", borderRadius: "6px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem", fontWeight: "bold" },

  // Body layout
  body:  { display: "flex", flex: 1, gap: 0 },

  // Left
  left:       { flex: 1, padding: "2rem", borderRight: "1px solid #141414", overflowY: "auto" },
  leftHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" },
  leftTitle:  { fontSize: "0.6rem", fontFamily: "monospace", letterSpacing: "0.2em", textTransform: "uppercase", color: "#333" },
  leftCount:  { fontFamily: "monospace", fontSize: "0.72rem", color: "#2a2a2a" },

  stockBanner:     { display: "flex", alignItems: "center", gap: "0.65rem", background: "#0e0a0a", border: "1px solid #e05c5c33", borderRadius: "6px", padding: "0.65rem 1rem", marginBottom: "1rem" },
  stockBannerIcon: { color: "#e05c5c", fontSize: "0.85rem" },
  stockBannerText: { fontFamily: "monospace", fontSize: "0.72rem", color: "#e05c5c88" },

  itemList:  { display: "flex", flexDirection: "column", gap: "0.65rem" },
  itemRow:   { display: "flex", alignItems: "center", gap: "1rem", background: "#0c0c0c", border: "1px solid #141414", borderRadius: "8px", padding: "0.85rem 1rem", transition: "border-color 0.2s, background 0.2s" },
  itemImg:   { width: "52px", height: "52px", borderRadius: "6px", overflow: "hidden", flexShrink: 0, background: "#111" },
  itemImgEl: { width: "100%", height: "100%", objectFit: "cover" },
  itemImgFallback: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", color: "#2a2a2a", fontFamily: "monospace" },
  itemInfo:  { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: "0.9rem", margin: "0 0 0.2rem", color: "#e8e4df", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  itemUnitPrice: { fontSize: "0.7rem", fontFamily: "monospace", color: "#333", margin: 0 },
  itemWarn:  { fontSize: "0.68rem", fontFamily: "monospace", color: "#e05c5c88", margin: "0.2rem 0 0" },

  itemQtyWrap:  { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", flexShrink: 0 },
  itemQtyRow:   { display: "flex", alignItems: "center", background: "#111", border: "1px solid #1e1e1e", borderRadius: "6px", overflow: "hidden" },
  qBtn:         { background: "transparent", border: "none", color: "#e8e4df", width: "32px", height: "30px", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.15s" },
  qNum:         { minWidth: "28px", textAlign: "center", fontSize: "0.88rem", fontFamily: "monospace" },
  itemSubtotal: { fontSize: "0.72rem", fontFamily: "monospace", color: "#a8e6a3", margin: 0 },

  removeBtn: { background: "transparent", border: "none", color: "#333", cursor: "pointer", fontSize: "0.75rem", padding: "0.25rem", flexShrink: 0, transition: "color 0.15s" },

  noteWrap:  { marginTop: "1.5rem" },
  noteLabel: { fontSize: "0.6rem", fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", color: "#2a2a2a", display: "block", marginBottom: "0.4rem" },
  noteInput: { width: "100%", background: "#0e0e0e", border: "1px solid #1a1a1a", color: "#555", padding: "0.6rem 0.85rem", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.8rem", outline: "none", resize: "none", boxSizing: "border-box" },

  // Right
  right:       { width: "340px", flexShrink: 0, padding: "2rem 1.75rem" },
  summaryCard: { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "12px", padding: "1.5rem", position: "sticky", top: "72px", display: "flex", flexDirection: "column", gap: "0" },
  summaryTitle:{ fontSize: "0.6rem", fontFamily: "monospace", letterSpacing: "0.2em", textTransform: "uppercase", color: "#2a2a2a", margin: "0 0 1rem" },

  summaryLines:   { display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem" },
  summaryLine:    { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  summaryLineLabel:{ fontSize: "0.78rem", fontFamily: "monospace", color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" },
  summaryLineQty: { color: "#333" },
  summaryLineVal: { fontSize: "0.78rem", fontFamily: "monospace", color: "#555", flexShrink: 0 },

  summaryDivider: { height: "1px", background: "#141414", margin: "0.75rem 0" },

  summaryTotals: { display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem" },
  totalRow:  { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  totalKey:  { fontSize: "0.75rem", fontFamily: "monospace", color: "#3a3a3a" },
  totalVal:  { fontSize: "0.78rem", fontFamily: "monospace", color: "#555" },
  totalGrand:{ borderTop: "1px solid #1a1a1a", paddingTop: "0.6rem", marginTop: "0.2rem" },
  grandKey:  { fontSize: "0.85rem", fontFamily: "monospace", color: "#e8e4df" },
  grandVal:  { fontSize: "1.3rem", fontFamily: "monospace", color: "#a8e6a3", letterSpacing: "-0.02em" },

  summaryMeta: { display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.25rem" },
  metaChip:    { background: "#111", border: "1px solid #1a1a1a", borderRadius: "4px", padding: "0.15rem 0.5rem", fontFamily: "monospace", fontSize: "0.62rem", color: "#333" },

  errorMsg: { fontSize: "0.72rem", fontFamily: "monospace", color: "#e05c5c", margin: "0 0 0.75rem", textAlign: "center" },

  payBtn:  { width: "100%", background: "#a8e6a3", color: "#080808", border: "none", padding: "0.9rem", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.9rem", fontWeight: "bold", letterSpacing: "0.05em", transition: "opacity 0.2s", marginBottom: "0.6rem" },
  payBlockedNote: { fontSize: "0.68rem", fontFamily: "monospace", color: "#e05c5c55", textAlign: "center", margin: "0 0 0.6rem" },
  clearBtn:{ width: "100%", background: "transparent", border: "none", color: "#2a2a2a", padding: "0.5rem", borderRadius: "6px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", transition: "color 0.15s" },
};