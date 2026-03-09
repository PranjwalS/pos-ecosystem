import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const fmt = (n) => Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => Number(n ?? 0).toLocaleString("en-US");
const fmtPct = (n) => `${Number(n ?? 0).toFixed(1)}%`;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { slug, bizSlug } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    const fetch = async () => {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }
      try {
        const res = await window.fetch(`http://localhost:8000/${bizSlug}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail || "Failed");
        setD(json);
        console.log("revenue_trend", json.graph_metrics.revenue_trend);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [bizSlug, navigate]);

  if (loading) return <div style={s.splash}>Loading dashboard...</div>;
  if (error) return <div style={{...s.splash, cursor:"pointer"}} onClick={() => navigate(`/${slug}/businesses`)}>⚠ {error} — click to go back</div>;
  if (!d)      return null;

  const { business: biz, revenue_metrics: rev, product_sales_metrics: sales,
          product_stats_metrics: stats, graph_metrics: graph, additional_metrics: extra } = d;

  const topProductsArr  = Object.values(sales.top_products  ?? {});
  const bottomProductsArr = Object.values(sales.bottom_products ?? {});

  const revTrend  = (graph.revenue_trend     ?? []).map(p => ({ ...p, date: String(p.date).slice(5) }));
  const txTrend   = (graph.transaction_trend ?? []).map(p => ({ ...p, date: String(p.date).slice(5) }));

  const growthPos = (extra.percent_change_month ?? 0) >= 0;

  return (
    <div style={s.page}>

      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <button style={s.backBtn} onClick={() => navigate(`/${slug}/businesses`)}>← businesses</button>
          <span style={s.navSep}>/</span>
          <span style={s.navBiz}>{biz.business_name}</span>
        </div>
        <span style={s.navLogo}>⬛ POS</span>
      </nav>

      {/* HERO */}
      <div style={{ ...s.hero, backgroundImage: biz.business_banner ? `url(${biz.business_banner})` : "none" }}>
        <div style={s.heroOverlay} />
        <div style={s.heroContent}>
          <div style={s.heroLogo}>
            {biz.business_logo
              ? <img src={biz.business_logo} alt="" style={s.heroLogoImg} />
              : <span style={s.heroLogoFallback}>{biz.business_name?.[0]}</span>}
          </div>
          <div>
            <h1 style={s.heroTitle}>{biz.business_name}</h1>
            {biz.business_desc && <p style={s.heroDesc}>{biz.business_desc}</p>}
          </div>
          <div style={{ ...s.heroBadge, color: growthPos ? "#a8e6a3" : "#e6a8a8" }}>
            {growthPos ? "↑" : "↓"} {Math.abs(extra.percent_change_month ?? 0).toFixed(1)}% MoM
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={s.tabBar}>
        {["overview","products","trends","insights"].map(t => (
          <button key={t} style={{ ...s.tabBtn, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <main style={s.main}>

        {/* ══════════════ OVERVIEW ══════════════ */}
        {tab === "overview" && <>

          <Row4>
            <KPI label="Total Revenue"     value={`$${fmt(rev.total_revenue)}`}   sub="all time"                          accent="#a8e6a3" />
            <KPI label="This Month"        value={`$${fmt(rev.revenue_month)}`}   sub={`${fmtPct(extra.percent_change_month)} vs last month`} accent="#a8d4e6" />
            <KPI label="This Week"         value={`$${fmt(rev.revenue_week)}`}    sub={`${fmtPct(extra.percent_change_week)} vs last week`}  accent="#e6d4a8" />
            <KPI label="Today"             value={`$${fmt(rev.revenue_today)}`}   sub="revenue today"                     accent="#e6a8c8" />
          </Row4>

          <Row4>
            <KPI label="Avg Order Value"   value={`$${fmt(rev.average_revenue)}`} sub="per transaction"                   accent="#c8a8e6" />
            <KPI label="Total Units Sold"  value={fmtInt(sales.total_units_sold)} sub="all time"                          accent="#a8e6d4" />
            <KPI label="Total Products"    value={fmtInt(stats.total_products)}   sub="in catalogue"                      accent="#d4e6a8" />
            <KPI label="Inventory Value"   value={`$${fmt(stats.inventory_value)}`} sub="at current prices"               accent="#e6b8a8" />
          </Row4>

          <Row4>
            <KPI label="Stock Turnover"    value={`${Number(stats.stock_turnover_rate ?? 0).toFixed(2)}x`} sub="annual rate" accent="#a8b8e6" />
            <KPI label="Revenue Growth"    value={`${Number(extra.revenue_growth_rate ?? 0).toFixed(2)}x`} sub="month over month" accent="#e6e6a8" />
            <KPI label="Avg Product Price" value={`$${fmt(stats.average_product_price)}`} sub="across catalogue"          accent="#a8e6e6" />
            <KPI label="Price Range"       value={`$${stats.price_range?.min} – $${stats.price_range?.max}`} sub="min to max" accent="#e6a8e6" />
          </Row4>

          <Section>Timing</Section>
          <Row4>
            <Info label="Busiest Hour"       value={`${rev.busiest_hour}:00 – ${(rev.busiest_hour ?? 0) + 1}:00`} />
            <Info label="Busiest Weekday"    value={DAYS[rev.busiest_weekday] ?? "—"} />
            <Info label="Repeat-Sale Days"   value={`${(graph.repeat_transaction_days ?? []).length} days`} />
            <Info label="Predicted Next Mo." value={`$${fmt(graph.predicted_revenue_next_month)}`} />
          </Row4>

          <Section>Transaction Extremes</Section>
          <Row4>
            <Info label="Largest Sale"    value={`$${fmt(graph.largest_single_transaction?.total_amount)}`}  />
            <Info label="Largest Sale On" value={String(graph.largest_single_transaction?.created_at ?? "—")} />
            <Info label="Smallest Sale"   value={`$${fmt(graph.smallest_single_transaction?.total_amount)}`} />
            <Info label="Smallest On"     value={String(graph.smallest_single_transaction?.created_at ?? "—")} />
          </Row4>

          <Section>Pricing Extremes</Section>
          <Row4>
            <Info label="Most Expensive"  value={`${stats.most_expensive_product?.title ?? "—"} — $${stats.most_expensive_product?.current_price ?? "—"}`} />
            <Info label="Cheapest"        value={`${stats.cheapest_product?.title ?? "—"} — $${stats.cheapest_product?.current_price ?? "—"}`} />
            <Info label="Most Revenue Product" value={sales.most_revenue_product?.title ?? "—"} />
            <Info label="Revenue Generated"    value={`$${fmt(sales.most_revenue_product?.revenue_generated)}`} />
          </Row4>

          {(stats.low_stock_products ?? []).length > 0 && <>
            <Section>⚠ Low Stock</Section>
            <div style={s.alertGrid}>
              {stats.low_stock_products.map(p => (
                <div key={p.title} style={s.alertCard}>
                  <span style={s.alertName}>{p.title}</span>
                  <span style={s.alertStock}>{p.stock} left</span>
                </div>
              ))}
            </div>
          </>}
        </>}

        {/* ══════════════ PRODUCTS ══════════════ */}
        {tab === "products" && <>
          <Section>Top 5 by Units Sold</Section>
          <ProductTable rows={topProductsArr} positive />

          <Section>Bottom 5 by Units Sold</Section>
          <ProductTable rows={bottomProductsArr} />

          <Section>Revenue MoM Breakdown</Section>
          <div style={s.chartBox}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={Object.entries(rev.revenue_mom ?? {}).map(([k,v]) => ({ month: k, revenue: v }))}>
                <CartesianGrid stroke="#1a1a1a" strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: "#444", fontSize: 11 }} />
                <YAxis tick={{ fill: "#444", fontSize: 11 }} />
                <Tooltip contentStyle={s.ttip} labelStyle={{ color: "#888" }} itemStyle={{ color: "#a8e6a3" }} />
                <Bar dataKey="revenue" fill="#a8e6a3" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Section>Top Product Revenue (horizontal)</Section>
          <div style={s.chartBox}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProductsArr} layout="vertical">
                <CartesianGrid stroke="#1a1a1a" strokeDasharray="4 4" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#444", fontSize: 11 }} />
                <YAxis type="category" dataKey="title" tick={{ fill: "#888", fontSize: 12 }} width={120} />
                <Tooltip contentStyle={s.ttip} itemStyle={{ color: "#e6d4a8" }} />
                <Bar dataKey="revenue_generated" fill="#e6d4a8" radius={[0,2,2,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>}

        {/* ══════════════ TRENDS ══════════════ */}
        {tab === "trends" && <>
          <Section>Revenue — Last 30 Days</Section>
          <div style={s.chartBox}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revTrend}>
                <CartesianGrid stroke="#1a1a1a" strokeDasharray="4 4" />
                <XAxis dataKey="date" tick={{ fill: "#444", fontSize: 11 }} interval={4} />
                <YAxis tick={{ fill: "#444", fontSize: 11 }} />
                <Tooltip contentStyle={s.ttip} labelStyle={{ color: "#888" }} itemStyle={{ color: "#a8e6a3" }} />
                <Line type="monotone" dataKey="revenue" stroke="#a8e6a3" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <Section>Transactions — Last 30 Days</Section>
          <div style={s.chartBox}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={txTrend}>
                <CartesianGrid stroke="#1a1a1a" strokeDasharray="4 4" />
                <XAxis dataKey="date" tick={{ fill: "#444", fontSize: 11 }} interval={4} />
                <YAxis tick={{ fill: "#444", fontSize: 11 }} />
                <Tooltip contentStyle={s.ttip} labelStyle={{ color: "#888" }} itemStyle={{ color: "#a8d4e6" }} />
                <Bar dataKey="count" fill="#a8d4e6" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>}

        {/* ══════════════ INSIGHTS ══════════════ */}
        {tab === "insights" && <>
          <Row4>
            <KPI label="MoM Growth %"        value={`${growthPos?"+":""}${fmtPct(extra.percent_change_month)}`}   sub="this vs last month"   accent={growthPos ? "#a8e6a3" : "#e6a8a8"} />
            <KPI label="WoW Growth %"         value={`${(extra.percent_change_week??0)>=0?"+":""}${fmtPct(extra.percent_change_week)}`} sub="this vs last week" accent="#a8d4e6" />
            <KPI label="Revenue Growth Rate"  value={`${Number(extra.revenue_growth_rate??0).toFixed(3)}x`}        sub="month over month"     accent="#e6d4a8" />
            <KPI label="Predicted Next Month" value={`$${fmt(graph.predicted_revenue_next_month)}`}                sub="linear projection"    accent="#c8a8e6" />
          </Row4>

          <Section>Fastest Growing Product</Section>
          <div style={s.comboCard}>
            <span style={s.comboItem}>{extra.fastest_growing_product?.title ?? "—"}</span>
            <span style={s.comboFreq}>{Number(extra.fastest_growing_product?.velocity_per_day ?? 0).toFixed(2)} units/day velocity</span>
          </div>

          {graph.top_product_combo && <>
            <Section>Most Frequently Bought Together</Section>
            <div style={s.comboCard}>
              <span style={s.comboItem}>{graph.top_product_combo.product_a}</span>
              <span style={s.comboCross}>+</span>
              <span style={s.comboItem}>{graph.top_product_combo.product_b}</span>
              <span style={s.comboFreq}>{fmtInt(graph.top_product_combo.frequency)} times together</span>
            </div>
          </>}

          <Section>Repeat Sale Days (last 30)</Section>
          <div style={s.tagCloud}>
            {(graph.repeat_transaction_days ?? []).slice(0, 30).map(d => (
              <span key={String(d)} style={s.dayTag}>{String(d).slice(5)}</span>
            ))}
            {(graph.repeat_transaction_days ?? []).length === 0 && <span style={s.dim}>No repeat days yet</span>}
          </div>
        </>}

      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Row4({ children }) {
  return <div style={s.row4}>{children}</div>;
}

function KPI({ label, value, sub, accent }) {
  return (
    <div style={s.kpiCard}>
      <div style={{ ...s.kpiBar, background: accent }} />
      <p style={s.kpiLabel}>{label}</p>
      <p style={s.kpiValue}>{value}</p>
      {sub && <p style={s.kpiSub}>{sub}</p>}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={s.infoCard}>
      <p style={s.infoLabel}>{label}</p>
      <p style={s.infoValue}>{value}</p>
    </div>
  );
}

function Section({ children }) {
  return <h2 style={s.section}>{children}</h2>;
}

function ProductTable({ rows, positive }) {
  return (
    <div style={s.table}>
      <div style={s.tHead}><span>Product</span><span>Units</span><span>Revenue</span><span>Price</span></div>
      {rows.map((p, i) => (
        <div key={p.title} style={{ ...s.tRow, opacity: positive ? 1 : 0.55 }}>
          <span style={s.tName}>#{i+1} {p.title}</span>
          <span>{fmtInt(p.units_sold)}</span>
          <span style={{ color: positive ? "#a8e6a3" : "#e6a8a8" }}>${fmt(p.revenue_generated)}</span>
          <span style={{ color: "#666" }}>${p.current_price}</span>
        </div>
      ))}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page:    { minHeight: "100vh", background: "#080808", color: "#e8e4df", fontFamily: "'Georgia', serif" },
  splash:  { minHeight: "100vh", background: "#080808", color: "#444", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: "0.9rem" },
  nav:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 2.5rem", borderBottom: "1px solid #141414" },
  navLeft: { display: "flex", alignItems: "center", gap: "0.75rem" },
  backBtn: { background: "transparent", border: "1px solid #222", color: "#555", padding: "0.35rem 0.9rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem" },
  navSep:  { color: "#2a2a2a" },
  navBiz:  { color: "#666", fontSize: "0.9rem", fontFamily: "monospace" },
  navLogo: { fontSize: "1rem", letterSpacing: "0.15em", fontFamily: "monospace", color: "#333" },

  hero:        { position: "relative", height: "170px", background: "#0c0c0c", backgroundSize: "cover", backgroundPosition: "center", borderBottom: "1px solid #141414" },
  heroOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(8,8,8,0.96) 0%, rgba(8,8,8,0.5) 100%)" },
  heroContent: { position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "1.5rem", padding: "0 2.5rem", height: "100%" },
  heroLogo:    { width: "60px", height: "60px", borderRadius: "10px", overflow: "hidden", border: "1px solid #1e1e1e", flexShrink: 0, background: "#141414", display: "flex", alignItems: "center", justifyContent: "center" },
  heroLogoImg: { width: "100%", height: "100%", objectFit: "cover" },
  heroLogoFallback: { fontSize: "1.6rem", color: "#333" },
  heroTitle:   { fontSize: "1.8rem", fontWeight: "normal", margin: "0 0 0.2rem", letterSpacing: "-0.02em" },
  heroDesc:    { color: "#555", margin: 0, fontSize: "0.85rem" },
  heroBadge:   { marginLeft: "auto", background: "#0e0e0e", border: "1px solid #1e1e1e", borderRadius: "4px", padding: "0.4rem 0.9rem", fontFamily: "monospace", fontSize: "0.85rem" },

  tabBar:    { display: "flex", borderBottom: "1px solid #141414", padding: "0 2.5rem" },
  tabBtn:    { background: "transparent", border: "none", borderBottom: "2px solid transparent", color: "#444", padding: "0.85rem 1.25rem", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", transition: "color 0.15s, border-color 0.15s" },
  tabActive: { color: "#e8e4df", borderBottomColor: "#e8e4df" },

  main: { padding: "2rem 2.5rem", maxWidth: "1200px", margin: "0 auto" },

  row4:    { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.85rem", marginBottom: "0.85rem" },
  kpiCard: { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "8px", padding: "1.1rem 1.35rem", position: "relative", overflow: "hidden" },
  kpiBar:  { position: "absolute", top: 0, left: 0, right: 0, height: "2px" },
  kpiLabel:{ fontSize: "0.65rem", fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", color: "#444", margin: "0 0 0.45rem" },
  kpiValue:{ fontSize: "1.5rem", margin: "0 0 0.2rem", letterSpacing: "-0.02em", fontWeight: "normal" },
  kpiSub:  { fontSize: "0.7rem", color: "#444", margin: 0, fontFamily: "monospace" },

  infoCard:  { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "8px", padding: "0.9rem 1.1rem" },
  infoLabel: { fontSize: "0.65rem", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#444", margin: "0 0 0.35rem" },
  infoValue: { fontSize: "0.95rem", margin: 0, color: "#888" },

  section: { fontSize: "0.7rem", fontFamily: "monospace", letterSpacing: "0.2em", textTransform: "uppercase", color: "#333", margin: "2rem 0 0.85rem", borderBottom: "1px solid #141414", paddingBottom: "0.5rem", fontWeight: "normal" },

  alertGrid: { display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.5rem" },
  alertCard: { background: "#110d0d", border: "1px solid #261818", borderRadius: "6px", padding: "0.65rem 1.1rem", display: "flex", gap: "1rem", alignItems: "center" },
  alertName: { fontSize: "0.85rem", color: "#e6a8a8" },
  alertStock:{ fontSize: "0.75rem", fontFamily: "monospace", color: "#e05c5c" },

  table: { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "8px", overflow: "hidden", marginBottom: "2rem" },
  tHead: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "0.65rem 1.25rem", borderBottom: "1px solid #161616", fontSize: "0.65rem", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#383838" },
  tRow:  { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "0.8rem 1.25rem", borderBottom: "1px solid #0f0f0f", fontSize: "0.88rem", color: "#777", alignItems: "center" },
  tName: { color: "#bbb" },

  chartBox: { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "8px", padding: "1.5rem", marginBottom: "2rem" },
  ttip:     { background: "#0e0e0e", border: "1px solid #1e1e1e", borderRadius: "4px" },

  comboCard: { background: "#0c0c0c", border: "1px solid #161616", borderRadius: "8px", padding: "1.75rem 2rem", display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "2rem", flexWrap: "wrap" },
  comboItem: { fontSize: "1.3rem", color: "#e8e4df", letterSpacing: "-0.01em" },
  comboCross:{ fontSize: "1.6rem", color: "#2a2a2a" },
  comboFreq: { marginLeft: "auto", fontFamily: "monospace", fontSize: "0.75rem", color: "#444" },

  tagCloud: { display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "2rem" },
  dayTag:   { background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: "4px", padding: "0.3rem 0.65rem", fontFamily: "monospace", fontSize: "0.75rem", color: "#666" },
  dim:      { color: "#333", fontFamily: "monospace", fontSize: "0.85rem" },
};