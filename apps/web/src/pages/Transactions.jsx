import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API = "http://localhost:8000";
const fmt = (n) => Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (s) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtTime = (s) => new Date(s).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
// eslint-disable-next-line no-unused-vars
const fmtDateTime = (s) => `${fmtDate(s)} · ${fmtTime(s)}`;

export default function Transactions() {
  const navigate = useNavigate();
  const { slug, bizSlug } = useParams();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [search, setSearch]             = useState("");
  const [sortBy, setSortBy]             = useState("newest");
  const [filterMin, setFilterMin]       = useState("");
  const [filterMax, setFilterMax]       = useState("");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");
  const [showFilters, setShowFilters]   = useState(false);

  useEffect(() => {
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
        setTransactions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bizSlug, navigate]);

  const filtered = useMemo(() => {
    let list = [...transactions];

    // Search by product title or transaction id
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.id.toLowerCase().includes(q) ||
        t.items.some(i => i.title.toLowerCase().includes(q))
      );
    }

    // Amount filter
    if (filterMin !== "") list = list.filter(t => t.total_amount >= Number(filterMin));
    if (filterMax !== "") list = list.filter(t => t.total_amount <= Number(filterMax));

    // Date filter
    if (dateFrom) list = list.filter(t => new Date(t.created_at) >= new Date(dateFrom));
    if (dateTo)   list = list.filter(t => new Date(t.created_at) <= new Date(dateTo + "T23:59:59"));

    // Sort
    if (sortBy === "newest")   list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sortBy === "oldest")   list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (sortBy === "highest")  list.sort((a, b) => b.total_amount - a.total_amount);
    if (sortBy === "lowest")   list.sort((a, b) => a.total_amount - b.total_amount);
    if (sortBy === "most_items") list.sort((a, b) => b.items.length - a.items.length);

    return list;
  }, [transactions, search, sortBy, filterMin, filterMax, dateFrom, dateTo]);

  // Summary stats
  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const total   = filtered.reduce((s, t) => s + t.total_amount, 0);
    const avg     = total / filtered.length;
    const highest = Math.max(...filtered.map(t => t.total_amount));
    const units   = filtered.reduce((s, t) => s + t.items.reduce((ss, i) => ss + i.quantity, 0), 0);
    return { total, avg, highest, units, count: filtered.length };
  }, [filtered]);

  const clearFilters = () => {
    setSearch(""); setFilterMin(""); setFilterMax("");
    setDateFrom(""); setDateTo(""); setSortBy("newest");
  };

  const hasActiveFilters = search || filterMin || filterMax || dateFrom || dateTo || sortBy !== "newest";

  if (loading) return <div style={s.splash}>Loading transactions...</div>;
  if (error)   return <div style={{ ...s.splash, cursor: "pointer" }} onClick={() => navigate(-1)}>⚠ {error} — click to go back</div>;

  return (
    <div style={s.page}>
      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <button style={s.backBtn} onClick={() => navigate(`/${slug}/businesses`)}>← businesses</button>
          <span style={s.navSep}>/</span>
          <span style={s.navSlug}>{bizSlug}</span>
          <span style={s.navSep}>/</span>
          <span style={s.navCurrent}>transactions</span>
        </div>
        <span style={s.navLogo}>⬛ POS</span>
      </nav>

      <div style={s.body}>
        {/* ── HEADER ── */}
        <div style={s.pageHeader}>
          <div>
            <p style={s.pageTag}>Sales log</p>
            <h1 style={s.pageTitle}>Transactions</h1>
          </div>
          <div style={s.headerRight}>
            <span style={s.totalBadge}>{transactions.length} total</span>
          </div>
        </div>

        {/* ── SUMMARY STRIP ── */}
        {stats && (
          <div style={s.statStrip}>
            <StatChip label="Showing" value={stats.count} />
            <StatChip label="Revenue" value={`$${fmt(stats.total)}`} accent="#a8e6a3" />
            <StatChip label="Avg Order" value={`$${fmt(stats.avg)}`} accent="#a8d4e6" />
            <StatChip label="Highest" value={`$${fmt(stats.highest)}`} accent="#e6d4a8" />
            <StatChip label="Units" value={stats.units} accent="#c8a8e6" />
          </div>
        )}

        {/* ── SEARCH + CONTROLS ── */}
        <div style={s.controls}>
          <div style={s.searchWrap}>
            <span style={s.searchIcon}>⌕</span>
            <input
              style={s.searchInput}
              placeholder="Search by product or transaction ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button style={s.clearX} onClick={() => setSearch("")}>✕</button>}
          </div>

          <select style={s.select} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest amount</option>
            <option value="lowest">Lowest amount</option>
            <option value="most_items">Most items</option>
          </select>

          <button
            style={{ ...s.filterToggle, borderColor: showFilters ? "#444" : "#1e1e1e", color: showFilters ? "#e8e4df" : "#555" }}
            onClick={() => setShowFilters(f => !f)}
          >
            ⊟ Filters {hasActiveFilters && <span style={s.filterDot} />}
          </button>

          {hasActiveFilters && (
            <button style={s.clearFiltersBtn} onClick={clearFilters}>Clear all</button>
          )}
        </div>

        {/* ── FILTER PANEL ── */}
        {showFilters && (
          <div style={s.filterPanel}>
            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Min amount ($)</label>
              <input style={s.filterInput} type="number" value={filterMin} onChange={e => setFilterMin(e.target.value)} placeholder="0.00" />
            </div>
            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Max amount ($)</label>
              <input style={s.filterInput} type="number" value={filterMax} onChange={e => setFilterMax(e.target.value)} placeholder="999.99" />
            </div>
            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Date from</label>
              <input style={s.filterInput} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Date to</label>
              <input style={s.filterInput} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        )}

        {/* ── LIST ── */}
        {filtered.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyIcon}>◻</p>
            <p style={s.emptyTitle}>No transactions found</p>
            <p style={s.emptyDesc}>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div style={s.list}>
            {filtered.map((t, idx) => (
              <TransactionRow
                key={t.id}
                t={t}
                idx={idx}
                onClick={() => navigate(`/${slug}/${bizSlug}/transactions/${t.id}`, { state: { transaction: t } })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TransactionRow({ t, idx, onClick }) {
  const itemCount  = t.items.reduce((s, i) => s + i.quantity, 0);
  const productCount = t.items.length;
  const hour = new Date(t.created_at).getHours();
  const timeOfDay = hour < 12 ? "AM" : hour < 17 ? "PM" : "EVE";

  return (
    <div style={s.row} onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.background = "#0e0e0e"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#141414"; e.currentTarget.style.background = "#0c0c0c"; }}
    >
      {/* Index */}
      <span style={s.rowIdx}>#{String(idx + 1).padStart(3, "0")}</span>

      {/* Date/time */}
      <div style={s.rowDate}>
        <span style={s.rowDateMain}>{fmtDate(t.created_at)}</span>
        <span style={s.rowDateTime}>{fmtTime(t.created_at)} <span style={{ ...s.timeBadge, background: timeOfDay === "AM" ? "#1a2a1a" : timeOfDay === "PM" ? "#1a1a2a" : "#2a1a2a" }}>{timeOfDay}</span></span>
      </div>

      {/* Products preview */}
      <div style={s.rowProducts}>
        {t.items.slice(0, 3).map(i => (
          <span key={i.product_id} style={s.productPill}>{i.title}</span>
        ))}
        {t.items.length > 3 && <span style={s.productPillMore}>+{t.items.length - 3}</span>}
      </div>

      {/* Meta */}
      <div style={s.rowMeta}>
        <span style={s.metaChip}>{productCount} product{productCount !== 1 ? "s" : ""}</span>
        <span style={s.metaChip}>{itemCount} unit{itemCount !== 1 ? "s" : ""}</span>
      </div>

      {/* Amount */}
      <span style={s.rowAmount}>${fmt(t.total_amount)}</span>

      <span style={s.rowArrow}>→</span>
    </div>
  );
}

function StatChip({ label, value, accent }) {
  return (
    <div style={s.statChip}>
      <span style={s.statLabel}>{label}</span>
      <span style={{ ...s.statValue, color: accent ?? "#e8e4df" }}>{value}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page:   { minHeight: "100vh", background: "#080808", color: "#e8e4df", fontFamily: "'Georgia', serif" },
  splash: { minHeight: "100vh", background: "#080808", color: "#444", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: "0.9rem" },

  nav:        { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.1rem 2.5rem", borderBottom: "1px solid #141414", position: "sticky", top: 0, background: "rgba(8,8,8,0.97)", backdropFilter: "blur(12px)", zIndex: 40 },
  navLeft:    { display: "flex", alignItems: "center", gap: "0.6rem" },
  backBtn:    { background: "transparent", border: "1px solid #1e1e1e", color: "#444", padding: "0.3rem 0.8rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem" },
  navSep:     { color: "#222", fontSize: "0.85rem" },
  navSlug:    { fontFamily: "monospace", fontSize: "0.78rem", color: "#333" },
  navCurrent: { fontFamily: "monospace", fontSize: "0.78rem", color: "#666" },
  navLogo:    { fontFamily: "monospace", fontSize: "0.85rem", color: "#2a2a2a", letterSpacing: "0.1em" },

  body:       { maxWidth: "1100px", margin: "0 auto", padding: "2.5rem 2.5rem" },

  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" },
  pageTag:    { fontSize: "0.65rem", fontFamily: "monospace", letterSpacing: "0.2em", textTransform: "uppercase", color: "#333", margin: "0 0 0.4rem" },
  pageTitle:  { fontSize: "2.2rem", fontWeight: "normal", margin: 0, letterSpacing: "-0.025em" },
  headerRight:{ display: "flex", alignItems: "center", gap: "0.75rem" },
  totalBadge: { fontFamily: "monospace", fontSize: "0.72rem", color: "#2a2a2a", background: "#0e0e0e", border: "1px solid #1a1a1a", padding: "0.3rem 0.7rem", borderRadius: "4px" },

  statStrip:  { display: "flex", gap: "0.6rem", marginBottom: "1.5rem", flexWrap: "wrap" },
  statChip:   { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "6px", padding: "0.5rem 0.9rem", display: "flex", flexDirection: "column", gap: "0.15rem" },
  statLabel:  { fontSize: "0.58rem", fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", color: "#333" },
  statValue:  { fontSize: "0.95rem", fontFamily: "monospace" },

  controls:   { display: "flex", gap: "0.6rem", marginBottom: "0.75rem", alignItems: "center", flexWrap: "wrap" },
  searchWrap: { flex: 1, minWidth: "220px", position: "relative", display: "flex", alignItems: "center" },
  searchIcon: { position: "absolute", left: "0.75rem", color: "#333", fontSize: "1.1rem", pointerEvents: "none" },
  searchInput:{ width: "100%", background: "#0e0e0e", border: "1px solid #1e1e1e", color: "#e8e4df", padding: "0.55rem 2rem 0.55rem 2.25rem", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.82rem", outline: "none", boxSizing: "border-box" },
  clearX:     { position: "absolute", right: "0.65rem", background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "0.75rem", padding: "0.2rem" },
  select:     { background: "#0e0e0e", border: "1px solid #1e1e1e", color: "#888", padding: "0.55rem 0.85rem", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.78rem", cursor: "pointer", outline: "none" },
  filterToggle:   { background: "transparent", border: "1px solid #1e1e1e", color: "#555", padding: "0.55rem 0.85rem", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", position: "relative" },
  filterDot:      { width: "5px", height: "5px", borderRadius: "50%", background: "#a8e6a3", display: "inline-block" },
  clearFiltersBtn:{ background: "transparent", border: "none", color: "#333", fontFamily: "monospace", fontSize: "0.72rem", cursor: "pointer", padding: "0.3rem 0.5rem" },

  filterPanel:  { display: "flex", gap: "1rem", background: "#0c0c0c", border: "1px solid #161616", borderRadius: "8px", padding: "1rem 1.25rem", marginBottom: "1rem", flexWrap: "wrap" },
  filterGroup:  { display: "flex", flexDirection: "column", gap: "0.3rem" },
  filterLabel:  { fontSize: "0.6rem", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#333" },
  filterInput:  { background: "#111", border: "1px solid #1e1e1e", color: "#888", padding: "0.4rem 0.65rem", borderRadius: "4px", fontFamily: "monospace", fontSize: "0.78rem", outline: "none", width: "130px" },

  empty:      { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 2rem", gap: "0.5rem" },
  emptyIcon:  { fontSize: "2rem", color: "#1a1a1a", margin: 0 },
  emptyTitle: { fontSize: "1rem", color: "#333", margin: 0, fontWeight: "normal" },
  emptyDesc:  { fontSize: "0.75rem", fontFamily: "monospace", color: "#222", margin: 0 },

  list: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  row:  { display: "flex", alignItems: "center", gap: "1.25rem", background: "#0c0c0c", border: "1px solid #141414", borderRadius: "8px", padding: "0.9rem 1.25rem", cursor: "pointer", transition: "border-color 0.15s, background 0.15s" },

  rowIdx:      { fontFamily: "monospace", fontSize: "0.65rem", color: "#2a2a2a", flexShrink: 0, width: "32px" },
  rowDate:     { flexShrink: 0, width: "130px" },
  rowDateMain: { display: "block", fontSize: "0.82rem", color: "#888" },
  rowDateTime: { display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.7rem", fontFamily: "monospace", color: "#333", marginTop: "0.15rem" },
  timeBadge:   { fontSize: "0.58rem", padding: "0.1rem 0.35rem", borderRadius: "3px", color: "#666", fontFamily: "monospace" },

  rowProducts: { flex: 1, display: "flex", flexWrap: "wrap", gap: "0.35rem", minWidth: 0 },
  productPill: { background: "#111", border: "1px solid #1e1e1e", borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.68rem", fontFamily: "monospace", color: "#555", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" },
  productPillMore: { background: "#111", border: "1px solid #1e1e1e", borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.68rem", fontFamily: "monospace", color: "#333" },

  rowMeta:  { display: "flex", gap: "0.4rem", flexShrink: 0 },
  metaChip: { background: "#0e0e0e", border: "1px solid #181818", borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.65rem", fontFamily: "monospace", color: "#333" },

  rowAmount: { fontFamily: "monospace", fontSize: "1rem", color: "#a8e6a3", flexShrink: 0, minWidth: "80px", textAlign: "right" },
  rowArrow:  { color: "#222", fontSize: "0.85rem", flexShrink: 0 },
};