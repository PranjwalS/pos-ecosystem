import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

const API = "http://localhost:8000";
const fmt = (n) => Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (s) => new Date(s).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const fmtTime = (s) => new Date(s).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function TransactionDetail() {
  const navigate  = useNavigate();
  const { slug, bizSlug, transactionId } = useParams();
  const { state } = useLocation();

  // Use passed state first, fallback to fetching all transactions
  const [t, setT]           = useState(state?.transaction ?? null);
  const [loading, setLoading] = useState(!state?.transaction);
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    if (t) return; // already have data from router state
    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }
      try {
        const res = await fetch(`${API}/${bizSlug}/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed");
        const found = data.find(tx => tx.id === transactionId);
        if (!found) throw new Error("Transaction not found");
        setT(found);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [transactionId, bizSlug, navigate, t]);

  const copyId = () => {
    navigator.clipboard.writeText(t.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading) return <div style={s.splash}>Loading transaction...</div>;
  if (error)   return <div style={{ ...s.splash, cursor: "pointer" }} onClick={() => navigate(-1)}>⚠ {error} — click to go back</div>;
  if (!t)      return null;

  const totalUnits   = t.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalItems   = t.items.length;
  const avgItemPrice = t.items.length ? t.total_amount / totalUnits : 0;
  const mostExpensive = [...t.items].sort((a, b) => b.price_at_time - a.price_at_time)[0];
  const mostQuantity  = [...t.items].sort((a, b) => b.quantity - a.quantity)[0];
  const hour = new Date(t.created_at).getHours();
  const timeOfDay = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

  // Check if any item is now low or out of stock
  const stockAlerts = t.items.filter(i => i.inventory <= 5);

  return (
    <div style={s.page}>
      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <button style={s.backBtn} onClick={() => navigate(`/${slug}/${bizSlug}/transactions`)}>← transactions</button>
          <span style={s.navSep}>/</span>
          <span style={s.navId}>{t.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <span style={s.navLogo}>⬛ POS</span>
      </nav>

      <div style={s.body}>

        {/* ── RECEIPT HEADER ── */}
        <div style={s.receiptHeader}>
          <div style={s.receiptLeft}>
            <p style={s.receiptTag}>Transaction Receipt</p>
            <h1 style={s.receiptAmount}>${fmt(t.total_amount)}</h1>
            <p style={s.receiptDate}>{fmtDate(t.created_at)} · {fmtTime(t.created_at)}</p>
            <p style={s.receiptSub}>{timeOfDay} sale · {totalItems} product{totalItems !== 1 ? "s" : ""} · {totalUnits} unit{totalUnits !== 1 ? "s" : ""}</p>
          </div>
          <div style={s.receiptRight}>
            <div style={s.idBlock}>
              <span style={s.idLabel}>Transaction ID</span>
              <span style={s.idValue}>{t.id}</span>
              <button style={s.copyBtn} onClick={copyId}>{copied ? "✓ Copied" : "Copy"}</button>
            </div>
          </div>
        </div>

        {/* ── STOCK ALERTS ── */}
        {stockAlerts.length > 0 && (
          <div style={s.alertBanner}>
            <span style={s.alertIcon}>⚠</span>
            <span style={s.alertText}>
              Post-sale stock alert: {stockAlerts.map(i => `${i.title} (${i.inventory} left)`).join(", ")}
            </span>
          </div>
        )}

        <div style={s.twoCol}>

          {/* ── LEFT: Items ── */}
          <div style={s.left}>
            <p style={s.sectionLabel}>Items Purchased</p>

            <div style={s.itemList}>
              {t.items.map((item, idx) => {
                const lineTotal = item.price_at_time * item.quantity;
                const pctOfOrder = (lineTotal / t.total_amount * 100).toFixed(1);
                const stockStatus = item.inventory === 0 ? "out" : item.inventory <= 5 ? "low" : "ok";

                return (
                  <div key={item.product_id} style={s.itemCard}>
                    {/* Bar showing % of order */}
                    <div style={{ ...s.itemBar, width: `${pctOfOrder}%` }} />

                    <div style={s.itemTop}>
                      <div style={s.itemLeft}>
                        <span style={s.itemIdx}>{String(idx + 1).padStart(2, "0")}</span>
                        <div>
                          <p style={s.itemTitle}>{item.title}</p>
                          <p style={s.itemMeta}>
                            ${fmt(item.price_at_time)} × {item.quantity}
                            {item.quantity > 1 && <span style={s.itemMetaDim}> = ${fmt(lineTotal)}</span>}
                          </p>
                        </div>
                      </div>
                      <div style={s.itemRight}>
                        <span style={s.itemTotal}>${fmt(lineTotal)}</span>
                        <span style={s.itemPct}>{pctOfOrder}% of order</span>
                      </div>
                    </div>

                    <div style={s.itemFooter}>
                      <span style={s.itemStockLabel}>Current stock:</span>
                      <span style={{
                        ...s.itemStock,
                        color: stockStatus === "out" ? "#e05c5c" : stockStatus === "low" ? "#e6a855" : "#555"
                      }}>
                        {item.inventory} units {stockStatus === "out" ? "— OUT OF STOCK" : stockStatus === "low" ? "— LOW" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div style={s.totalsBox}>
              <div style={s.totalRow}>
                <span style={s.totalKey}>Subtotal</span>
                <span style={s.totalVal}>${fmt(t.total_amount / 1.13)}</span>
              </div>
              <div style={s.totalRow}>
                <span style={s.totalKey}>HST (13%)</span>
                <span style={s.totalVal}>${fmt(t.total_amount - t.total_amount / 1.13)}</span>
              </div>
              <div style={{ ...s.totalRow, ...s.totalGrand }}>
                <span style={s.grandKey}>Total Charged</span>
                <span style={s.grandVal}>${fmt(t.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Stats ── */}
          <div style={s.right}>
            <p style={s.sectionLabel}>Order Analytics</p>

            <div style={s.statCards}>
              <StatCard label="Total Units" value={totalUnits} />
              <StatCard label="Unique Products" value={totalItems} />
              <StatCard label="Avg Unit Price" value={`$${fmt(avgItemPrice)}`} accent="#a8d4e6" />
              <StatCard label="Time of Day" value={timeOfDay} accent="#e6d4a8" />
            </div>

            <div style={s.highlightCard}>
              <p style={s.highlightLabel}>Highest Value Item</p>
              <p style={s.highlightName}>{mostExpensive?.title}</p>
              <p style={s.highlightVal}>${fmt(mostExpensive?.price_at_time)} each</p>
            </div>

            <div style={s.highlightCard}>
              <p style={s.highlightLabel}>Most Units of Single Item</p>
              <p style={s.highlightName}>{mostQuantity?.title}</p>
              <p style={s.highlightVal}>{mostQuantity?.quantity} unit{mostQuantity?.quantity !== 1 ? "s" : ""}</p>
            </div>

            {/* Order breakdown visual */}
            <p style={{ ...s.sectionLabel, marginTop: "1.25rem" }}>Revenue Split</p>
            <div style={s.splitBars}>
              {t.items.map(item => {
                const pct = (item.price_at_time * item.quantity) / t.total_amount * 100;
                return (
                  <div key={item.product_id} style={s.splitRow}>
                    <span style={s.splitName}>{item.title}</span>
                    <div style={s.splitTrack}>
                      <div style={{ ...s.splitFill, width: `${pct}%` }} />
                    </div>
                    <span style={s.splitPct}>{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={s.statCard}>
      <p style={s.statLabel}>{label}</p>
      <p style={{ ...s.statValue, color: accent ?? "#e8e4df" }}>{value}</p>
    </div>
  );
}

const s = {
  page:   { minHeight: "100vh", background: "#080808", color: "#e8e4df", fontFamily: "'Georgia', serif" },
  splash: { minHeight: "100vh", background: "#080808", color: "#444", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: "0.9rem" },

  nav:        { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.1rem 2.5rem", borderBottom: "1px solid #141414", position: "sticky", top: 0, background: "rgba(8,8,8,0.97)", backdropFilter: "blur(12px)", zIndex: 40 },
  navLeft:    { display: "flex", alignItems: "center", gap: "0.6rem" },
  backBtn:    { background: "transparent", border: "1px solid #1e1e1e", color: "#444", padding: "0.3rem 0.8rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem" },
  navSep:     { color: "#222" },
  navId:      { fontFamily: "monospace", fontSize: "0.78rem", color: "#555", letterSpacing: "0.1em" },
  navLogo:    { fontFamily: "monospace", fontSize: "0.85rem", color: "#2a2a2a", letterSpacing: "0.1em" },

  body:       { maxWidth: "1100px", margin: "0 auto", padding: "2.5rem" },

  receiptHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", gap: "2rem", flexWrap: "wrap" },
  receiptLeft:   {},
  receiptTag:    { fontSize: "0.6rem", fontFamily: "monospace", letterSpacing: "0.2em", textTransform: "uppercase", color: "#333", margin: "0 0 0.5rem" },
  receiptAmount: { fontSize: "3rem", fontFamily: "monospace", color: "#a8e6a3", margin: "0 0 0.35rem", letterSpacing: "-0.03em", fontWeight: "normal" },
  receiptDate:   { fontSize: "0.9rem", color: "#666", margin: "0 0 0.2rem" },
  receiptSub:    { fontSize: "0.72rem", fontFamily: "monospace", color: "#333", margin: 0 },
  receiptRight:  {},
  idBlock:       { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "8px", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" },
  idLabel:       { fontSize: "0.58rem", fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", color: "#2a2a2a" },
  idValue:       { fontSize: "0.7rem", fontFamily: "monospace", color: "#444", letterSpacing: "0.05em", wordBreak: "break-all", maxWidth: "280px" },
  copyBtn:       { background: "transparent", border: "1px solid #1e1e1e", color: "#555", padding: "0.25rem 0.65rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.7rem", alignSelf: "flex-start" },

  alertBanner: { display: "flex", alignItems: "center", gap: "0.75rem", background: "#0e0a0a", border: "1px solid #e05c5c33", borderRadius: "8px", padding: "0.75rem 1.1rem", marginBottom: "1.5rem" },
  alertIcon:   { color: "#e05c5c", fontSize: "0.9rem", flexShrink: 0 },
  alertText:   { fontSize: "0.75rem", fontFamily: "monospace", color: "#e05c5c88" },

  twoCol: { display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", alignItems: "start" },

  left:         {},
  sectionLabel: { fontSize: "0.6rem", fontFamily: "monospace", letterSpacing: "0.2em", textTransform: "uppercase", color: "#2a2a2a", margin: "0 0 0.85rem", borderBottom: "1px solid #141414", paddingBottom: "0.5rem" },
  itemList:     { display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem" },

  itemCard:   { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "8px", padding: "0.9rem 1.1rem", position: "relative", overflow: "hidden" },
  itemBar:    { position: "absolute", top: 0, left: 0, height: "2px", background: "#a8e6a355", transition: "width 0.3s" },
  itemTop:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" },
  itemLeft:   { display: "flex", gap: "0.75rem", alignItems: "flex-start" },
  itemIdx:    { fontFamily: "monospace", fontSize: "0.65rem", color: "#2a2a2a", marginTop: "0.15rem", flexShrink: 0 },
  itemTitle:  { fontSize: "0.9rem", margin: "0 0 0.2rem", color: "#e8e4df" },
  itemMeta:   { fontSize: "0.72rem", fontFamily: "monospace", color: "#444", margin: 0 },
  itemMetaDim:{ color: "#333" },
  itemRight:  { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.15rem" },
  itemTotal:  { fontSize: "1rem", fontFamily: "monospace", color: "#a8e6a3" },
  itemPct:    { fontSize: "0.62rem", fontFamily: "monospace", color: "#2a2a2a" },
  itemFooter: { display: "flex", gap: "0.5rem", alignItems: "center", borderTop: "1px solid #141414", paddingTop: "0.45rem" },
  itemStockLabel: { fontSize: "0.62rem", fontFamily: "monospace", color: "#2a2a2a" },
  itemStock:  { fontSize: "0.62rem", fontFamily: "monospace" },

  totalsBox:  { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "8px", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" },
  totalRow:   { display: "flex", justifyContent: "space-between" },
  totalKey:   { fontSize: "0.78rem", fontFamily: "monospace", color: "#333" },
  totalVal:   { fontSize: "0.78rem", fontFamily: "monospace", color: "#555" },
  totalGrand: { borderTop: "1px solid #1a1a1a", paddingTop: "0.6rem", marginTop: "0.2rem" },
  grandKey:   { fontSize: "0.85rem", fontFamily: "monospace", color: "#e8e4df" },
  grandVal:   { fontSize: "1.2rem", fontFamily: "monospace", color: "#a8e6a3", letterSpacing: "-0.02em" },

  right:      {},
  statCards:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.85rem" },
  statCard:   { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "6px", padding: "0.75rem 0.9rem" },
  statLabel:  { fontSize: "0.58rem", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#2a2a2a", margin: "0 0 0.3rem" },
  statValue:  { fontSize: "1.05rem", margin: 0, fontFamily: "monospace" },

  highlightCard: { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "6px", padding: "0.85rem 1rem", marginBottom: "0.5rem" },
  highlightLabel:{ fontSize: "0.58rem", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#2a2a2a", margin: "0 0 0.3rem" },
  highlightName: { fontSize: "0.95rem", margin: "0 0 0.15rem", color: "#e8e4df" },
  highlightVal:  { fontSize: "0.72rem", fontFamily: "monospace", color: "#555", margin: 0 },

  splitBars:  { display: "flex", flexDirection: "column", gap: "0.5rem" },
  splitRow:   { display: "flex", alignItems: "center", gap: "0.6rem" },
  splitName:  { fontSize: "0.68rem", fontFamily: "monospace", color: "#444", width: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 },
  splitTrack: { flex: 1, height: "4px", background: "#141414", borderRadius: "2px", overflow: "hidden" },
  splitFill:  { height: "100%", background: "#a8e6a355", borderRadius: "2px" },
  splitPct:   { fontSize: "0.65rem", fontFamily: "monospace", color: "#333", flexShrink: 0, width: "38px", textAlign: "right" },
};