"use client";

import { type FormEvent, type PointerEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Clock3,
  Globe2,
  Grid2X2,
  Landmark,
  LockKeyhole,
  MousePointerClick,
  RefreshCw,
  TrendingUp,
  X,
} from "lucide-react";

import dashboardData from "@/data/dashboard.json";
type Stage = "S1" | "S2" | "S3" | "S4";
type View = "global" | "crypto7" | "usSelected" | "chinaIndices" | "hkSelected";
type Region = "全球" | "美股" | "A股" | "港股" | "日股" | "欧股" | "大宗·宏观" | "加密";
type MarketRegion = Exclude<Region, "全球">;

type Market = {
  code: string;
  shortCode: string;
  name: string;
  region: MarketRegion;
  stage: Stage;
  subStage: string;
  stageDetail: string;
  weeks: number;
  observationStage: string;
  observation: string;
  momentum: number;
  signal: "增强" | "稳定" | "减速" | "转弱" | "观察";
  collections: View[];
  source: string;
  dataStatus: "live" | "cache";
  marketAsOf: string;
  stageAsOf: string;
  cols: number;
  rows: number;
};

const ACCESS_STORAGE_KEY = "lz-4stage-map-access-v1";
const ACCESS_PASSWORD_HASH = "59301bd9d2f98ebd8ec731e34903d3cd1f4557954257680102b2e1b81ab7bf5d";

async function hashText(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const displayMeta: Record<string, { shortCode: string; cols: number; rows: number }> = {
  "GSPC.INDEX": { shortCode: "SPX", cols: 3, rows: 2 },
  NDQ: { shortCode: "NDX", cols: 3, rows: 2 },
  SOXX: { shortCode: "SOXX", cols: 3, rows: 2 },
  VIX: { shortCode: "VIX", cols: 3, rows: 2 },
  SH000001: { shortCode: "000001", cols: 3, rows: 2 },
  "510300.SH": { shortCode: "沪深300", cols: 3, rows: 2 },
  "510500.SH": { shortCode: "中证500", cols: 2, rows: 2 },
  "000300.SH": { shortCode: "000300", cols: 6, rows: 2 },
  SZ399006: { shortCode: "399006", cols: 6, rows: 2 },
  "000688.SH": { shortCode: "科创50", cols: 2, rows: 2 },
  HSI: { shortCode: "HSI", cols: 6, rows: 2 },
  HSTECH: { shortCode: "HSTECH", cols: 6, rows: 2 },
  N225: { shortCode: "N225", cols: 6, rows: 4 },
  STOXX50E: { shortCode: "STOXX50", cols: 6, rows: 4 },
  DXY: { shortCode: "DXY", cols: 3, rows: 2 },
  US10Y: { shortCode: "US10Y", cols: 3, rows: 2 },
  CL: { shortCode: "OIL", cols: 3, rows: 2 },
  XAU: { shortCode: "GOLD", cols: 3, rows: 2 },
  "BTC-USD": { shortCode: "BTC", cols: 6, rows: 4 },
  "ETH-USD": { shortCode: "ETH", cols: 3, rows: 2 },
  "HYPE-USD": { shortCode: "HYPE", cols: 3, rows: 2 },
  HOOD: { shortCode: "HOOD", cols: 3, rows: 2 },
  CRCL: { shortCode: "CRCL", cols: 3, rows: 2 },
  COIN: { shortCode: "COIN", cols: 3, rows: 2 },
  MSTR: { shortCode: "MSTR", cols: 3, rows: 2 },
};

const markets = dashboardData.markets.map((item) => {
  const defaultShortCode = item.code.replace(/^SZ/, "").replace(/\.[A-Z]+$/, "");
  const meta = displayMeta[item.code] ?? { shortCode: defaultShortCode, cols: 2, rows: 1 };
  return {
    ...item,
    stage: item.stage as Stage,
    region: item.region as MarketRegion,
    signal: item.signal as Market["signal"],
    dataStatus: item.dataStatus as Market["dataStatus"],
    collections: item.collections as View[],
    ...meta,
  };
}) satisfies Market[];

const stageMeta: Record<Stage, { title: string; season: string; color: string; dark: string }> = {
  S1: { title: "筑底阶段", season: "春", color: "#397ff6", dark: "#1c5bd0" },
  S2: { title: "上升阶段", season: "夏", color: "#18a567", dark: "#087849" },
  S3: { title: "筑顶阶段", season: "秋", color: "#f09a18", dark: "#c56f00" },
  S4: { title: "下降阶段", season: "冬", color: "#ed4859", dark: "#bd2638" },
};

const regions: Region[] = ["全球", "美股", "A股", "港股", "日股", "欧股", "大宗·宏观", "加密"];
const marketRegions: MarketRegion[] = ["美股", "A股", "港股", "日股", "欧股", "大宗·宏观", "加密"];
const viewMeta: Record<View, { eyebrow: string; subtitle: string; mapTitle: string; regions: Region[]; groups: MarketRegion[] }> = {
  global: { eyebrow: "GLOBAL INDEX STAGES", subtitle: "全球指数趋势看板", mapTitle: "全球市场阶段地图", regions, groups: marketRegions },
  crypto7: { eyebrow: "CRYPTO BLUE CHIP STAGES", subtitle: "加密蓝筹阶段看板", mapTitle: "加密蓝筹阶段地图", regions: ["全球", "美股", "加密"], groups: ["美股", "加密"] },
  usSelected: { eyebrow: "US SELECTED STAGES", subtitle: "美股精选阶段看板", mapTitle: "美股精选阶段地图", regions: ["全球", "美股", "大宗·宏观"], groups: ["美股", "大宗·宏观"] },
  chinaIndices: { eyebrow: "CHINA INDEX STAGES", subtitle: "A股指数阶段看板", mapTitle: "A股指数阶段地图", regions: ["全球", "A股"], groups: ["A股"] },
  hkSelected: { eyebrow: "HONG KONG SELECTED STAGES", subtitle: "港股精选阶段看板", mapTitle: "港股精选阶段地图", regions: ["全球", "港股"], groups: ["港股"] },
};
const collectionOrder: Partial<Record<View, string[]>> = {
  global: ["GSPC.INDEX", "NDQ", "SOXX", "VIX", "000300.SH", "SZ399006", "HSI", "HSTECH", "N225", "STOXX50E", "DXY", "US10Y", "XAU", "CL", "BTC-USD", "ETH-USD"],
  usSelected: ["GSPC.INDEX", "NDQ", "IWM", "SOXX", "VIX"],
  chinaIndices: ["SH000001", "000016.SH", "000300.SH", "000905.SH", "SZ399006", "000688.SH", "931865.CSI", "399967.SZ", "399976.SZ", "931151.CSI", "399986.SZ", "399975.SZ", "930708.CSI", "399998.SZ", "399997.SZ", "399933.SZ"],
  hkSelected: ["HSI", "HSTECH", "HSCEI", "700.HK", "9988.HK", "5.HK", "939.HK", "941.HK", "1299.HK", "388.HK", "1810.HK", "3690.HK", "2318.HK", "1211.HK", "883.HK", "9618.HK"],
};
function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

function isoWeek(dateText: string) {
  const date = new Date(`${dateText}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return { year: date.getUTCFullYear(), week: Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7) };
}

function displayConfirmationDate(market: Market) {
  if (market.region !== "加密") return market.stageAsOf;
  const date = new Date(`${market.stageAsOf}T00:00:00Z`);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (day === 1 ? 7 : (8 - day) % 7));
  return date.toISOString().slice(0, 10);
}

function HoverMarketCard({ market, point, touchMode, onClose }: { market: Market | null; point: { x: number; y: number }; touchMode: boolean; onClose: () => void }) {
  if (!market) return null;
  const maDirection = market.momentum >= 0 ? "上升" : "下降";
  const stageConfirmedAt = new Date(`${market.stageAsOf}T00:00:00Z`);
  stageConfirmedAt.setUTCDate(stageConfirmedAt.getUTCDate() + 1 - (market.weeks - 1) * 7);
  const confirmationDate = stageConfirmedAt.toISOString().slice(0, 10);
  return (
    <div className={`market-hover-card ${touchMode ? "touch-card" : ""}`} role={touchMode ? "dialog" : "tooltip"} aria-label={touchMode ? `${market.shortCode} 资产信息` : undefined} style={{ left: point.x, top: point.y }}>
      <div className="hover-card-title"><span style={{ background: stageMeta[market.stage].color }} />{market.shortCode} · {market.name}{touchMode && <button className="hover-close" type="button" aria-label="关闭资产阶段信息" onClick={onClose}><X size={17} /></button>}</div>
      <dl>
        <div><dt>当前阶段</dt><dd><b style={{ color: stageMeta[market.stage].color }}>{market.subStage}</b> · {market.stageDetail}</dd></div>
        <div><dt>确认时间</dt><dd>{market.weeks}周· {confirmationDate} 4AM UTC+8</dd></div>
        <div><dt>本周观察</dt><dd>{market.observationStage === "UNCONFIRMED" ? market.observation : market.observationStage}</dd></div>
        <div><dt>MA30趋势</dt><dd>{maDirection} · 5周 {market.momentum.toFixed(2)}%</dd></div>
      </dl>
    </div>
  );
}

function MarketMapGroup({ group, items, stageFilter, compact, dense, onMarketMove, onMarketLeave, onMarketFocus, onMarketTap }: { group: MarketRegion; items: Market[]; stageFilter: Stage | "全部"; compact: boolean; dense: boolean; onMarketMove: (item: Market, event: PointerEvent<HTMLButtonElement>) => void; onMarketLeave: () => void; onMarketFocus: (item: Market, element: HTMLButtonElement) => void; onMarketTap: (item: Market, element: HTMLButtonElement) => void }) {
  if (!items.length) return null;
  return (
    <section className={`map-group map-${group.replace("·", "-")} ${compact ? "map-group-full" : ""}`}>
      <header><strong>{group}</strong><span>{items.length} 个资产</span></header>
      <div className="map-tiles">
        {items.map((item) => {
          const faded = stageFilter !== "全部" && item.stage !== stageFilter;
          const multiCryptoLayout = group === "加密" && items.length > 1;
          const tileCols = dense ? 1 : multiCryptoLayout
            ? items.length === 2 ? 3 : item.code === "BTC-USD" ? 6 : 3
            : compact ? Math.max(2, item.cols) : item.cols;
          const tileRows = dense ? 1 : multiCryptoLayout ? (items.length === 2 ? 4 : 2) : item.rows;
          return (
            <button
              key={item.code}
              className={`map-tile tile-${item.stage.toLowerCase()} ${faded ? "tile-faded" : ""}`}
              style={{ gridColumn: `span ${tileCols}`, gridRow: `span ${tileRows}` }}
              aria-label={`${item.shortCode}，${item.name}，${item.subStage}，${item.stageDetail}，已持续${item.weeks}周，MA30${item.momentum >= 0 ? "上升" : "下降"}${item.momentum.toFixed(2)}%`}
              onPointerMove={(event) => { if (event.pointerType !== "touch") onMarketMove(item, event); }}
              onClick={(event) => onMarketTap(item, event.currentTarget)}
              onPointerLeave={(event) => { if (event.pointerType !== "touch") onMarketLeave(); }}
              onFocus={(event) => onMarketFocus(item, event.currentTarget)}
              onBlur={onMarketLeave}
            >
              <strong>{item.shortCode}</strong>
              <span>{item.name}</span>
              <div><b>{item.subStage}</b><em>{item.weeks}周</em></div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function GlobalStageMap({ source, region, stageFilter, view, onMarketMove, onMarketLeave, onMarketFocus, onMarketTap }: { source: Market[]; region: Region; stageFilter: Stage | "全部"; view: View; onMarketMove: (item: Market, event: PointerEvent<HTMLButtonElement>) => void; onMarketLeave: () => void; onMarketFocus: (item: Market, element: HTMLButtonElement) => void; onMarketTap: (item: Market, element: HTMLButtonElement) => void }) {
  const groups = region === "全球" ? viewMeta[view].groups : [region as MarketRegion];
  const dense = view === "usSelected" || view === "chinaIndices" || view === "hkSelected";
  return (
    <div className={`market-map view-${view} ${region !== "全球" ? "single-map" : ""}`}>
      {groups.map((group) => <MarketMapGroup key={group} group={group} items={source.filter((item) => item.region === group)} stageFilter={stageFilter} compact={region !== "全球"} dense={dense} onMarketMove={onMarketMove} onMarketLeave={onMarketLeave} onMarketFocus={onMarketFocus} onMarketTap={onMarketTap} />)}
    </div>
  );
}

export default function Home() {
  const [accessGranted, setAccessGranted] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(ACCESS_STORAGE_KEY) === "granted");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [view, setView] = useState<View>("global");
  const [region, setRegion] = useState<Region>("全球");
  const [stageFilter, setStageFilter] = useState<Stage | "全部">("全部");
  const [hoveredMarket, setHoveredMarket] = useState<Market | null>(null);
  const [hoverPoint, setHoverPoint] = useState({ x: 0, y: 0 });
  const [touchCardOpen, setTouchCardOpen] = useState(false);
  const [showFullVersion, setShowFullVersion] = useState(false);

  useEffect(() => {
    if (!showFullVersion) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowFullVersion(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showFullVersion]);

  useEffect(() => {
    if (accessGranted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [accessGranted]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCheckingPassword(true);
    const valid = await hashText(password) === ACCESS_PASSWORD_HASH;
    setCheckingPassword(false);
    if (!valid) {
      setLoginError(true);
      setPassword("");
      return;
    }
    window.localStorage.setItem(ACCESS_STORAGE_KEY, "granted");
    setLoginError(false);
    setAccessGranted(true);
  };

  const activeUniverse = useMemo(() => {
    const selected = markets.filter((item) => item.collections.includes(view));
    const order = collectionOrder[view];
    if (!order) return selected;
    const positions = new Map(order.map((code, index) => [code, index]));
    return [...selected].sort((a, b) => (positions.get(a.code) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.code) ?? Number.MAX_SAFE_INTEGER));
  }, [view]);
  const regionData = useMemo(() => activeUniverse.filter((item) => region === "全球" || item.region === region), [activeUniverse, region]);
  const counts = useMemo(() => {
    const result: Record<Stage, number> = { S1: 0, S2: 0, S3: 0, S4: 0 };
    regionData.forEach((item) => result[item.stage]++);
    return result;
  }, [regionData]);
  const commonStageAsOf = [...activeUniverse].sort((a, b) => a.stageAsOf.localeCompare(b.stageAsOf))[0]?.stageAsOf ?? dashboardData.commonStageAsOf;
  const commonConfirmationDate = activeUniverse.map(displayConfirmationDate).sort()[0] ?? commonStageAsOf;
  const week = isoWeek(commonStageAsOf);
  const watches = regionData.filter((item) => item.signal !== "稳定").slice(0, 3);
  const placeHoverCard = (clientX: number, clientY: number) => {
    const cardWidth = 350;
    const cardHeight = 250;
    const gap = 16;
    setHoverPoint({
      x: clientX + gap + cardWidth > window.innerWidth ? Math.max(8, clientX - cardWidth - gap) : clientX + gap,
      y: clientY + gap + cardHeight > window.innerHeight ? Math.max(8, clientY - cardHeight - gap) : clientY + gap,
    });
  };
  const handleMarketMove = (item: Market, event: PointerEvent<HTMLButtonElement>) => {
    setTouchCardOpen(false);
    setHoveredMarket(item);
    placeHoverCard(event.clientX, event.clientY);
  };
  const handleMarketFocus = (item: Market, element: HTMLButtonElement) => {
    setTouchCardOpen(false);
    const rect = element.getBoundingClientRect();
    setHoveredMarket(item);
    placeHoverCard(rect.right, rect.top + rect.height / 2);
  };
  const handleMarketTap = (item: Market, element: HTMLButtonElement) => {
    if (touchCardOpen && hoveredMarket?.code === item.code) {
      setHoveredMarket(null);
      setTouchCardOpen(false);
      return;
    }
    const rect = element.getBoundingClientRect();
    setHoveredMarket(item);
    setTouchCardOpen(true);
    placeHoverCard(rect.right, rect.top + rect.height / 2);
  };
  const closeMarketCard = () => {
    setHoveredMarket(null);
    setTouchCardOpen(false);
  };
  const switchView = (nextView: View) => {
    setView(nextView);
    setRegion("全球");
    setStageFilter("全部");
    closeMarketCard();
  };
  const activeViewMeta = viewMeta[view];

  return (
    <>
      <div className={`app-shell ${accessGranted ? "" : "access-locked"}`} aria-hidden={!accessGranted}>
        <aside className="sidebar">
          <div className="brand"><div className="brand-mark">LZ</div><div><strong>LZ-4Stage</strong><small>MARKET TOOLKIT</small></div></div>
          <nav className="side-nav" aria-label="主要导航">
            <button className={`nav-item ${view === "global" ? "active" : ""}`} onClick={() => switchView("global")} aria-pressed={view === "global"}><Grid2X2 size={18} /><span>全球指数</span></button>
            <button className={`nav-item ${view === "crypto7" ? "active" : ""}`} onClick={() => switchView("crypto7")} aria-pressed={view === "crypto7"}><BarChart3 size={18} /><span>加密蓝筹</span></button>
            <button className={`nav-item ${view === "usSelected" ? "active" : ""}`} onClick={() => switchView("usSelected")} aria-pressed={view === "usSelected"}><TrendingUp size={18} /><span>美股精选</span></button>
            <button className={`nav-item ${view === "chinaIndices" ? "active" : ""}`} onClick={() => switchView("chinaIndices")} aria-pressed={view === "chinaIndices"}><Landmark size={18} /><span>A股指数</span></button>
            <button className={`nav-item ${view === "hkSelected" ? "active" : ""}`} onClick={() => switchView("hkSelected")} aria-pressed={view === "hkSelected"}><Building2 size={18} /><span>港股精选</span></button>
          </nav>
          <div className="sidebar-bottom"><span>数据周期</span><strong>{week.year} · W{String(week.week).padStart(2, "0")}</strong><small>仅作为市场观察工具</small></div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div><div className="eyebrow"><Globe2 size={14} /> {activeViewMeta.eyebrow}</div><h1>LZ 4Stage Map</h1><p>{activeViewMeta.subtitle} · Power by LZ-4Stage</p></div>
            <div className="top-actions">
              <button className="full-version-link" type="button" onClick={() => { setHoveredMarket(null); setShowFullVersion(true); }}><MousePointerClick size={16} />点击获取完整LZ-4Stage</button>
              <span className="period-badge">完整周线</span>
              <span className="confirmation-date"><CalendarDays size={16} />共同确认至 {commonConfirmationDate}</span>
              <div className="update-time"><Clock3 size={15} /><span>生成于 <strong>{formatDateTime(dashboardData.generatedAt)}</strong></span></div>
              <button className="icon-button" aria-label="刷新页面" onClick={() => window.location.reload()}><RefreshCw size={18} /></button>
            </div>
          </header>

          <div className="filterbar">
            <div className="region-tabs" role="group" aria-label="市场筛选">{activeViewMeta.regions.map((item) => <button key={item} className={region === item ? "active" : ""} onClick={() => setRegion(item)}>{view !== "global" && item === "全球" ? "全部" : item}</button>)}</div>
            <section className="stage-distribution" aria-label="阶段分布筛选">
              <div className="distribution-bar">
              {(["S1", "S2", "S3", "S4"] as Stage[]).map((stage) => {
                const percent = regionData.length ? Math.round(counts[stage] / regionData.length * 100) : 0;
                const selected = stageFilter === stage;
                const muted = stageFilter !== "全部" && !selected;
                return <button
                  key={stage}
                  className={`distribution-segment ${selected ? "selected" : ""} ${muted ? "muted" : ""}`}
                  style={{ background: `color-mix(in srgb, ${stageMeta[stage].color} 14%, var(--canvas))` }}
                  onClick={() => setStageFilter(selected ? "全部" : stage)}
                  aria-pressed={selected}
                  aria-label={`${stage} ${stageMeta[stage].title}，占比 ${percent}%，${counts[stage]} 个指数`}
                >
                  <span className="distribution-fill" aria-hidden="true" style={{ width: `${percent}%`, background: `linear-gradient(135deg, ${stageMeta[stage].color}, ${stageMeta[stage].dark})` }} />
                  <span className="distribution-label"><b style={{ color: stageMeta[stage].color }}>{stage} {stageMeta[stage].season}季</b></span>
                  <span className="distribution-value"><strong>{percent}%</strong></span>
                </button>;
              })}
              </div>
            </section>
          </div>

          <section className="map-panel" id="stage-map">
            <div className="map-panel-head">
              <div><span className="section-kicker">MARKET MAP</span><h2>{activeViewMeta.mapTitle}</h2><p>方块大小体现资产重要性，颜色代表当前所处阶段</p></div>
            </div>
            <GlobalStageMap source={regionData} region={region} stageFilter={stageFilter} view={view} onMarketMove={handleMarketMove} onMarketLeave={() => { if (!touchCardOpen) setHoveredMarket(null); }} onMarketFocus={handleMarketFocus} onMarketTap={handleMarketTap} />
            <div className="map-foot" id="personal-watch">{watches.length ? watches.map((item) => <span key={item.code}>{item.shortCode}：{item.observation}</span>) : <span>本周暂无新的观察变化</span>}</div>
          </section>

          <footer><span>LZ-4stage 真实完整周线分析 · {activeUniverse.length} 个资产</span><span>阶段分析仅供市场观察，不构成任何投资建议</span></footer>
        </main>
        <HoverMarketCard market={hoveredMarket} point={hoverPoint} touchMode={touchCardOpen} onClose={closeMarketCard} />
        {showFullVersion && (
          <div className="full-version-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowFullVersion(false); }}>
            <section className="full-version-modal" role="dialog" aria-modal="true" aria-labelledby="full-version-title">
              <button className="modal-close" type="button" aria-label="关闭完整版介绍" onClick={() => setShowFullVersion(false)}><X size={19} /></button>
              <div className="modal-icon"><MousePointerClick size={21} /></div>
              <h2 id="full-version-title">了解LZ-4Stage完整版</h2>
              <p>当前公开地图提供全球主要资产阶段观察。</p>
              <p>完整版可用于查询自选的股票、ETF、指数、加密等资产。</p>
              <div className="wechat-contact"><strong>请添加以下微信</strong><span>咨询更多信息</span></div>
              {/* Keep the original QR pixels intact instead of routing through image optimization. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="wechat-qr" src={`${import.meta.env.BASE_URL}wechat-qr.jpg`} alt="LZ-4Stage 微信二维码" width="280" height="282" />
            </section>
          </div>
        )}
      </div>
      {!accessGranted && (
        <div className="access-gate-backdrop">
          <section className="access-gate" role="dialog" aria-modal="true" aria-labelledby="access-gate-title">
            <div className="access-gate-icon"><LockKeyhole size={23} /></div>
            <span className="access-gate-kicker">PRIVATE ACCESS</span>
            <h2 id="access-gate-title">需要登录</h2>
            <p>LZ 4Stage Map 为受限访问的市场观察工具，请输入访问密码后继续。</p>
            <form onSubmit={handleLogin}>
              <label htmlFor="access-password">访问密码</label>
              <input
                id="access-password"
                type="password"
                value={password}
                onChange={(event) => { setPassword(event.target.value); setLoginError(false); }}
                placeholder="请输入密码"
                autoComplete="current-password"
                autoFocus
                aria-invalid={loginError}
                aria-describedby={loginError ? "access-error" : "access-note"}
              />
              {loginError && <span className="access-error" id="access-error" role="alert">密码不正确，请重新输入</span>}
              <button type="submit" disabled={!password || checkingPassword}>{checkingPassword ? "正在验证…" : "进入市场地图"}</button>
            </form>
            <small id="access-note">验证成功后，此浏览器将保持登录状态。</small>
          </section>
        </div>
      )}
    </>
  );
}
