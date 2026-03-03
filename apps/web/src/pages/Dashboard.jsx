import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

// ─── MOCK DATA (replace with real fetch) ─────────────────────────────────────
const MOCK = {
  business_name: "Brew & Co.",
  business_desc: "Specialty coffee and provisions",
  business_logo: null,
  business_banner: null,
  created_at: "2023-06-01",
  total_products: 24,
  active_products: 19,
  out_of_stock_products: 5,
  total_revenue: 48320.5,
  revenue_today: 840.0,
  revenue_this_week: 4210.75,
  revenue_this_month: 12800.0,
  revenue_last_month: 10900.0,
  revenue_growth_pct: 17.4,
  average_order_value: 28.5,
  total_transactions: 1696,
  transactions_today: 29,
  transactions_this_week: 147,
  transactions_this_month: 449,
  busiest_hour: 9,
  busiest_day_of_week: "Saturday",
  average_items_per_transaction: 2.3,
  top_products: [
    { name: "Flat White", units_sold: 812, revenue_generated: 4060, price: 5.0 },
    { name: "Croissant", units_sold: 634, revenue_generated: 2536, price: 4.0 },
    { name: "Cold Brew", units_sold: 501, revenue_generated: 3005, price: 6.0 },
    { name: "Matcha Latte", units_sold: 389, revenue_generated: 2334, price: 6.0 },
    { name: "Banana Bread", units_sold: 310, revenue_generated: 1240, price: 4.0 },
  ],
  worst_products: [
    { name: "Decaf Drip", units_sold: 12, revenue_generated: 42, price: 3.5 },
    { name: "Herbal Tea", units_sold: 18, revenue_generated: 72, price: 4.0 },
  ],
  most_revenue_product: { name: "Flat White", revenue_generated: 4060 },
  average_product_price: 5.2,
  price_range: { min: 2.5, max: 12.0 },
  most_expensive_product: { name: "Specialty Pour Over", price: 12.0 },
  cheapest_product: { name: "Drip Coffee", price: 2.5 },
  revenue_trend: Array.from({ length: 30 }, (_, i) => ({
    date: `D-${30 - i}`,
    revenue: Math.floor(Math.random() * 600 + 300),
  })),
  transaction_trend: Array.from({ length: 30 }, (_, i) => ({
    date: `D-${30 - i}`,
    count: Math.floor(Math.random() * 40 + 10),
  })),
  predicted_revenue_next_month: 14200.0,
  revenue_7day_moving_avg: 1820.0,
  top_product_combo: { product_a: "Flat White", product_b: "Croissant", frequency: 203 },
  low_stock_products: [
    { name: "Oat Milk", stock: 2 },
    { name: "Chai Syrup", stock: 1 },
    { name: "Paper Cups L", stock: 4 },
  ],
  inventory_value: 3840.0,
  stock_turnover_rate: 4.2,
  repeat_transaction_days: 87,
  largest_single_transaction: 142.5,
  smallest_single_transaction: 2.5,
  total_units_sold: 3891,
};
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n) => n?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => n?.toLocaleString("en-US");

export default function Dashboard() {
  const navigate = useNavigate();
  const { slug, bizSlug } = useParams();
  const [data, setData] = useState(null);
  const [error] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }

      try {
        const res = await fetch(`http://localhost:8000/businesses/${bizSlug}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          // fall back to mock during dev
          setData(MOCK);
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setData(MOCK); // use mock if backend not ready
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [bizSlug, navigate]);

  if (loading) return <div style={s.loading}>Loading dashboard...</div>;
  if (error) return <div style={s.loading}>{error}</div>;
  if (!data) return null;

  const growth = data.revenue_growth_pct;
  const tabs = ["overview", "products", "trends", "insights"];

  return (
    <div style={s.page}>
      {/* ── NAV ── */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <button style={s.backBtn} onClick={() => navigate(`/${slug}/businesses`)}>← businesses</button>
          <span style={s.navSep}>/</span>
          <span style={s.navBiz}>{data.business_name}</span>
        </div>
        <span style={s.navLogo}>⬛ POS</span>
      </nav>

      {/* ── HERO BANNER ── */}
      <div style={{
        ...s.hero,
        backgroundImage: data.business_banner ? `url(${data.business_banner})` : "none",
      }}>
        <div style={s.heroOverlay} />
        <div style={s.heroContent}>
          <div style={s.heroLogo}>
            {data.business_logo
              ? <img src={data.business_logo} alt="" style={s.heroLogoImg} />
              : <span style={s.heroLogoFallback}>{data.business_name?.[0]}</span>}
          </div>
          <div>
            <h1 style={s.heroTitle}>{data.business_name}</h1>
            <p style={s.heroDesc}>{data.business_desc}</p>
          </div>
          <div style={s.heroBadge}>
            {growth >= 0 ? "↑" : "↓"} {Math.abs(growth)}% MoM
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={s.tabBar}>
        {tabs.map(t => (
          <button
            key={t}
            style={{ ...s.tab, ...(activeTab === t ? s.tabActive : {}) }}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <main style={s.main}>

        {/* ════════════════ OVERVIEW TAB ════════════════ */}
        {activeTab === "overview" && (
          <div>
            {/* KPI row */}
            <div style={s.kpiGrid}>
              <KPI label="Total Revenue" value={`$${fmt(data.total_revenue)}`} sub="all time" accent="#a8e6a3" />
              <KPI label="This Month" value={`$${fmt(data.revenue_this_month)}`} sub={`vs $${fmt(data.revenue_last_month)} last month`} accent="#a8d4e6" />
              <KPI label="Today" value={`$${fmt(data.revenue_today)}`} sub={`${fmtInt(data.transactions_today)} transactions`} accent="#e6d4a8" />
              <KPI label="Avg Order" value={`$${fmt(data.average_order_value)}`} sub="per transaction" accent="#e6a8c8" />
            </div>

            {/* second row */}
            <div style={s.kpiGrid}>
              <KPI label="Total Transactions" value={fmtInt(data.total_transactions)} sub="all time" accent="#c8a8e6" />
              <KPI label="This Week" value={fmtInt(data.transactions_this_week)} sub="transactions" accent="#a8e6d4" />
              <KPI label="Units Sold" value={fmtInt(data.total_units_sold)} sub="all time" accent="#e6b8a8" />
              <KPI label="Avg Items/Sale" value={data.average_items_per_transaction} sub="per transaction" accent="#a8b8e6" />
            </div>

            {/* inventory row */}
            <div style={s.kpiGrid}>
              <KPI label="Total Products" value={data.total_products} sub={`${data.active_products} active`} accent="#d4e6a8" />
              <KPI label="Out of Stock" value={data.out_of_stock_products} sub="need restocking" accent="#e6a8a8" />
              <KPI label="Inventory Value" value={`$${fmt(data.inventory_value)}`} sub="at current prices" accent="#a8e6e6" />
              <KPI label="Stock Turnover" value={`${data.stock_turnover_rate}x`} sub="annual rate" accent="#e6e6a8" />
            </div>

            {/* timing insights */}
            <SectionTitle>Timing</SectionTitle>
            <div style={s.row2}>
              <InfoCard label="Busiest Hour" value={`${data.busiest_hour}:00 – ${data.busiest_hour + 1}:00`} />
              <InfoCard label="Busiest Day" value={data.busiest_day_of_week} />
              <InfoCard label="Active Days w/ Repeat Sales" value={`${data.repeat_transaction_days} days`} />
              <InfoCard label="7-Day Revenue Avg" value={`$${fmt(data.revenue_7day_moving_avg)}`} />
            </div>

            {/* transaction extremes */}
            <SectionTitle>Transaction Range</SectionTitle>
            <div style={s.row2}>
              <InfoCard label="Largest Sale Ever" value={`$${fmt(data.largest_single_transaction)}`} />
              <InfoCard label="Smallest Sale Ever" value={`$${fmt(data.smallest_single_transaction)}`} />
              <InfoCard label="Most Expensive Product" value={`${data.most_expensive_product?.name} — $${data.most_expensive_product?.price}`} />
              <InfoCard label="Cheapest Product" value={`${data.cheapest_product?.name} — $${data.cheapest_product?.price}`} />
            </div>

            {/* low stock warning */}
            {data.low_stock_products?.length > 0 && (
              <>
                <SectionTitle>⚠ Low Stock Alert</SectionTitle>
                <div style={s.alertGrid}>
                  {data.low_stock_products.map(p => (
                    <div key={p.name} style={s.alertCard}>
                      <span style={s.alertName}>{p.name}</span>
                      <span style={s.alertStock}>{p.stock} left</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════════ PRODUCTS TAB ════════════════ */}
        {activeTab === "products" && (
          <div>
            <SectionTitle>Top 5 Products by Units Sold</SectionTitle>
            <div style={s.table}>
              <div style={s.tableHeader}>
                <span>Product</span><span>Units Sold</span><span>Revenue</span><span>Price</span>
              </div>
              {data.top_products?.map((p, i) => (
                <div key={p.name} style={s.tableRow}>
                  <span style={s.tableRank}>#{i + 1} {p.name}</span>
                  <span>{fmtInt(p.units_sold)}</span>
                  <span style={{ color: "#a8e6a3" }}>${fmt(p.revenue_generated)}</span>
                  <span style={{ color: "#888" }}>${p.price}</span>
                </div>
              ))}
            </div>

            <SectionTitle>Underperforming Products</SectionTitle>
            <div style={s.table}>
              <div style={s.tableHeader}>
                <span>Product</span><span>Units Sold</span><span>Revenue</span><span>Price</span>
              </div>
              {data.worst_products?.map((p) => (
                <div key={p.name} style={{ ...s.tableRow, opacity: 0.6 }}>
                  <span style={s.tableRank}>{p.name}</span>
                  <span>{fmtInt(p.units_sold)}</span>
                  <span style={{ color: "#e6a8a8" }}>${fmt(p.revenue_generated)}</span>
                  <span style={{ color: "#888" }}>${p.price}</span>
                </div>
              ))}
            </div>

            <SectionTitle>Pricing Overview</SectionTitle>
            <div style={s.row2}>
              <InfoCard label="Average Price" value={`$${fmt(data.average_product_price)}`} />
              <InfoCard label="Price Range" value={`$${data.price_range?.min} – $${data.price_range?.max}`} />
              <InfoCard label="Top Revenue Product" value={data.most_revenue_product?.name} />
              <InfoCard label="Top Revenue Generated" value={`$${fmt(data.most_revenue_product?.revenue_generated)}`} />
            </div>
          </div>
        )}

        {/* ════════════════ TRENDS TAB ════════════════ */}
        {activeTab === "trends" && (
          <div>
            <SectionTitle>Revenue — Last 30 Days</SectionTitle>
            <div style={s.chartBox}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.revenue_trend}>
                  <CartesianGrid stroke="#1e1e1e" strokeDasharray="4 4" />
                  <XAxis dataKey="date" tick={{ fill: "#444", fontSize: 11 }} interval={4} />
                  <YAxis tick={{ fill: "#444", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 4 }}
                    labelStyle={{ color: "#888" }}
                    itemStyle={{ color: "#a8e6a3" }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#a8e6a3" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <SectionTitle>Transactions — Last 30 Days</SectionTitle>
            <div style={s.chartBox}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.transaction_trend}>
                  <CartesianGrid stroke="#1e1e1e" strokeDasharray="4 4" />
                  <XAxis dataKey="date" tick={{ fill: "#444", fontSize: 11 }} interval={4} />
                  <YAxis tick={{ fill: "#444", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 4 }}
                    labelStyle={{ color: "#888" }}
                    itemStyle={{ color: "#a8d4e6" }}
                  />
                  <Bar dataKey="count" fill="#a8d4e6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <SectionTitle>Top Product Revenue Breakdown</SectionTitle>
            <div style={s.chartBox}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.top_products} layout="vertical">
                  <CartesianGrid stroke="#1e1e1e" strokeDasharray="4 4" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#444", fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#888", fontSize: 12 }} width={110} />
                  <Tooltip
                    contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 4 }}
                    itemStyle={{ color: "#e6d4a8" }}
                  />
                  <Bar dataKey="revenue_generated" fill="#e6d4a8" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ════════════════ INSIGHTS TAB ════════════════ */}
        {activeTab === "insights" && (
          <div>
            <SectionTitle>ML Predictions</SectionTitle>
            <div style={s.kpiGrid}>
              <KPI label="Predicted Next Month" value={`$${fmt(data.predicted_revenue_next_month)}`} sub="linear projection" accent="#c8a8e6" />
              <KPI label="7-Day Moving Avg" value={`$${fmt(data.revenue_7day_moving_avg)}`} sub="smoothed revenue" accent="#a8e6d4" />
              <KPI label="MoM Growth" value={`${growth >= 0 ? "+" : ""}${growth}%`} sub="vs last month" accent={growth >= 0 ? "#a8e6a3" : "#e6a8a8"} />
              <KPI label="Stock Turnover" value={`${data.stock_turnover_rate}x`} sub="annual rate" accent="#e6e6a8" />
            </div>

            <SectionTitle>Frequently Bought Together</SectionTitle>
            <div style={s.comboCard}>
              <span style={s.comboItem}>{data.top_product_combo?.product_a}</span>
              <span style={s.comboCross}>+</span>
              <span style={s.comboItem}>{data.top_product_combo?.product_b}</span>
              <span style={s.comboFreq}>bought together {fmtInt(data.top_product_combo?.frequency)} times</span>
            </div>

            <SectionTitle>Revenue Health</SectionTitle>
            <div style={s.row2}>
              <InfoCard label="This Month vs Last" value={`${growth >= 0 ? "▲" : "▼"} ${Math.abs(growth)}%`} />
              <InfoCard label="Avg Daily Revenue (month)" value={`$${fmt(data.revenue_this_month / 30)}`} />
              <InfoCard label="Avg Daily Transactions (month)" value={(data.transactions_this_month / 30).toFixed(1)} />
              <InfoCard label="Revenue per Unit Sold" value={`$${fmt(data.total_revenue / data.total_units_sold)}`} />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function KPI({ label, value, sub, accent }) {
  return (
    <div style={s.kpiCard}>
      <div style={{ ...s.kpiAccent, background: accent }} />
      <p style={s.kpiLabel}>{label}</p>
      <p style={s.kpiValue}>{value}</p>
      {sub && <p style={s.kpiSub}>{sub}</p>}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div style={s.infoCard}>
      <p style={s.infoLabel}>{label}</p>
      <p style={s.infoValue}>{value}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 style={s.sectionTitle}>{children}</h2>;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = {
  page: { minHeight: "100vh", background: "#080808", color: "#e8e4df", fontFamily: "'Georgia', serif" },
  loading: { minHeight: "100vh", background: "#080808", color: "#555", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" },

  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 2.5rem", borderBottom: "1px solid #161616" },
  navLeft: { display: "flex", alignItems: "center", gap: "0.75rem" },
  backBtn: { background: "transparent", border: "1px solid #2a2a2a", color: "#666", padding: "0.35rem 0.9rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem" },
  navSep: { color: "#333" },
  navBiz: { color: "#888", fontSize: "0.9rem", fontFamily: "monospace" },
  navLogo: { fontSize: "1rem", letterSpacing: "0.15em", fontFamily: "monospace", color: "#444" },

  hero: { position: "relative", height: "180px", background: "#0f0f0f", backgroundSize: "cover", backgroundPosition: "center", borderBottom: "1px solid #161616" },
  heroOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(8,8,8,0.95) 0%, rgba(8,8,8,0.6) 100%)" },
  heroContent: { position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "1.5rem", padding: "0 2.5rem", height: "100%" },
  heroLogo: { width: "64px", height: "64px", borderRadius: "10px", overflow: "hidden", border: "1px solid #222", flexShrink: 0, background: "#161616", display: "flex", alignItems: "center", justifyContent: "center" },
  heroLogoImg: { width: "100%", height: "100%", objectFit: "cover" },
  heroLogoFallback: { fontSize: "1.8rem", color: "#444" },
  heroTitle: { fontSize: "2rem", fontWeight: "normal", margin: "0 0 0.25rem", letterSpacing: "-0.02em" },
  heroDesc: { color: "#666", margin: 0, fontSize: "0.9rem" },
  heroBadge: { marginLeft: "auto", background: "#111", border: "1px solid #222", borderRadius: "4px", padding: "0.4rem 0.9rem", fontFamily: "monospace", fontSize: "0.85rem", color: "#a8e6a3" },

  tabBar: { display: "flex", gap: 0, borderBottom: "1px solid #161616", padding: "0 2.5rem" },
  tab: { background: "transparent", border: "none", borderBottom: "2px solid transparent", color: "#555", padding: "0.9rem 1.25rem", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", transition: "color 0.2s, border-color 0.2s" },
  tabActive: { color: "#e8e4df", borderBottomColor: "#e8e4df" },

  main: { padding: "2.5rem", maxWidth: "1200px", margin: "0 auto" },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1rem" },
  kpiCard: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "1.25rem 1.5rem", position: "relative", overflow: "hidden" },
  kpiAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "2px" },
  kpiLabel: { fontSize: "0.7rem", fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", color: "#555", margin: "0 0 0.5rem" },
  kpiValue: { fontSize: "1.6rem", margin: "0 0 0.25rem", letterSpacing: "-0.02em", fontWeight: "normal" },
  kpiSub: { fontSize: "0.75rem", color: "#555", margin: 0, fontFamily: "monospace" },

  row2: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" },
  infoCard: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "1rem 1.25rem" },
  infoLabel: { fontSize: "0.7rem", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#555", margin: "0 0 0.4rem" },
  infoValue: { fontSize: "1rem", margin: 0, color: "#aaa" },

  sectionTitle: { fontSize: "0.75rem", fontFamily: "monospace", letterSpacing: "0.2em", textTransform: "uppercase", color: "#444", margin: "2rem 0 1rem", borderBottom: "1px solid #161616", paddingBottom: "0.5rem", fontWeight: "normal" },

  alertGrid: { display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2rem" },
  alertCard: { background: "#130d0d", border: "1px solid #2a1a1a", borderRadius: "6px", padding: "0.75rem 1.25rem", display: "flex", gap: "1rem", alignItems: "center" },
  alertName: { fontSize: "0.9rem", color: "#e6a8a8" },
  alertStock: { fontSize: "0.8rem", fontFamily: "monospace", color: "#e05c5c" },

  table: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "8px", overflow: "hidden", marginBottom: "2rem" },
  tableHeader: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "0.75rem 1.25rem", borderBottom: "1px solid #1a1a1a", fontSize: "0.7rem", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#444" },
  tableRow: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "0.85rem 1.25rem", borderBottom: "1px solid #111", fontSize: "0.9rem", color: "#888", alignItems: "center" },
  tableRank: { color: "#ccc" },

  chartBox: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "1.5rem", marginBottom: "2rem" },

  comboCard: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "2rem", display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem", flexWrap: "wrap" },
  comboItem: { fontSize: "1.4rem", color: "#e8e4df", letterSpacing: "-0.01em" },
  comboCross: { fontSize: "1.8rem", color: "#333" },
  comboFreq: { marginLeft: "auto", fontFamily: "monospace", fontSize: "0.8rem", color: "#555" },
};