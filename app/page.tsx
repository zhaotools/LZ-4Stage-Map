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

const MEMBER_STORAGE_KEY = "lz-4stage-map-member-v1";
const ADMIN_USERNAME_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
const ADMIN_PASSWORD_HASH = "59301bd9d2f98ebd8ec731e34903d3cd1f4557954257680102b2e1b81ab7bf5d";
const memberOnlyViews = new Set<View>(["crypto7", "usSelected", "chinaIndices", "hkSelected"]);

async function hashText(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const displayMeta: Record<string, { shortCode: string; cols: number; rows: number }> = {
  "GSPC.INDEX": { shortCode: "SPX", cols: 3, rows: 2 },
  NDQ: { shortCode: "NDX", cols: 3, rows: 2 },
  RSP: { shortCode: "RSP", cols: 2, rows: 1 },
  IWM: { shortCode: "IWM", cols: 2, rows: 1 },
  SOXX: { shortCode: "SOXX", cols: 3, rows: 2 },
  VIX: { shortCode: "VIX", cols: 3, rows: 2 },
  XLF: { shortCode: "XLF", cols: 2, rows: 1 },
  XLE: { shortCode: "XLE", cols: 2, rows: 1 },
  XLV: { shortCode: "XLV", cols: 2, rows: 1 },
  XLI: { shortCode: "XLI", cols: 2, rows: 1 },
  XLY: { shortCode: "XLY", cols: 2, rows: 1 },
  "BRK.B": { shortCode: "BRK", cols: 2, rows: 1 },
  "000510.SH": { shortCode: "000510", cols: 2, rows: 1 },
  "000300.SH": { shortCode: "000300", cols: 6, rows: 2 },
  "000905.SH": { shortCode: "000905", cols: 2, rows: 1 },
  "000852.SH": { shortCode: "000852", cols: 2, rows: 1 },
  "000016.SH": { shortCode: "000016", cols: 2, rows: 1 },
  SZ399006: { shortCode: "399006", cols: 6, rows: 2 },
  "000688.SH": { shortCode: "000688", cols: 2, rows: 1 },
  "000985.SH": { shortCode: "000985", cols: 2, rows: 1 },
  "931865.CSI": { shortCode: "半导体", cols: 2, rows: 1 },
  "930651.CSI": { shortCode: "计算机", cols: 2, rows: 1 },
  "399975.SZ": { shortCode: "证券", cols: 2, rows: 1 },
  "399986.SZ": { shortCode: "银行", cols: 2, rows: 1 },
  "930708.CSI": { shortCode: "有色", cols: 2, rows: 1 },
  "399933.SZ": { shortCode: "医药", cols: 2, rows: 1 },
  "399997.SZ": { shortCode: "白酒", cols: 2, rows: 1 },
  "930997.CSI": { shortCode: "新能源车", cols: 2, rows: 1 },
  HSI: { shortCode: "HSI", cols: 6, rows: 2 },
  HSTECH: { shortCode: "HSTECH", cols: 6, rows: 2 },
  "700.HK": { shortCode: "0700", cols: 2, rows: 1 },
  "9988.HK": { shortCode: "9988", cols: 2, rows: 1 },
  "1810.HK": { shortCode: "1810", cols: 2, rows: 1 },
  "3690.HK": { shortCode: "3690", cols: 2, rows: 1 },
  "5.HK": { shortCode: "0005", cols: 2, rows: 1 },
  "1299.HK": { shortCode: "1299", cols: 2, rows: 1 },
  "388.HK": { shortCode: "0388", cols: 2, rows: 1 },
  "939.HK": { shortCode: "0939", cols: 2, rows: 1 },
  "941.HK": { shortCode: "0941", cols: 2, rows: 1 },
  "883.HK": { shortCode: "0883", cols: 2, rows: 1 },
  "1211.HK": { shortCode: "1211", cols: 2, rows: 1 },
  "16.HK": { shortCode: "0016", cols: 2, rows: 1 },
  "2.HK": { shortCode: "0002", cols: 2, rows: 1 },
  "1093.HK": { shortCode: "1093", cols: 2, rows: 1 },
  N225: { shortCode: "N225", cols: 6, rows: 4 },
  STOXX50E: { shortCode: "STOXX50", cols: 6, rows: 4 },
  DXY: { shortCode: "DXY", cols: 3, rows: 2 },
  US10Y: { shortCode: "US10Y", cols: 3, rows: 2 },
  CL: { shortCode: "OIL", cols: 3, rows: 2 },
  XAU: { shortCode: "GOLD", cols: 3, rows: 2 },
  "BTC-USD": { shortCode: "BTC", cols: 6, rows: 4 },
  "ETH-USD": { shortCode: "ETH", cols: 3, rows: 2 },
  "SOL-USD": { shortCode: "SOL", cols: 3, rows: 2 },
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
const viewMeta: Record<View, { mapKicker: string; mapTitle: string; regions: Region[]; groups: MarketRegion[] }> = {
  global: { mapKicker: "GLOBAL MARKET", mapTitle: "全球市场", regions, groups: marketRegions },
  crypto7: { mapKicker: "CRYPTO MARKET", mapTitle: "加密市场", regions: ["全球", "美股", "加密"], groups: ["加密", "美股"] },
  usSelected: { mapKicker: "US INDEX", mapTitle: "美股指数", regions: ["全球", "美股", "大宗·宏观"], groups: ["美股", "大宗·宏观"] },
  chinaIndices: { mapKicker: "CHINA INDEX", mapTitle: "A股指数", regions: ["全球", "A股"], groups: ["A股"] },
  hkSelected: { mapKicker: "HONG KONG INDEX", mapTitle: "港股指数", regions: ["全球", "港股"], groups: ["港股"] },
};
const collectionOrder: Partial<Record<View, string[]>> = {
  global: ["GSPC.INDEX", "NDQ", "SOXX", "VIX", "000300.SH", "SZ399006", "HSI", "HSTECH", "N225", "STOXX50E", "DXY", "US10Y", "XAU", "CL", "BTC-USD", "ETH-USD"],
  crypto7: ["HOOD", "CRCL", "COIN", "MSTR", "BTC-USD", "ETH-USD", "SOL-USD", "HYPE-USD"],
  usSelected: ["GSPC.INDEX", "NDQ", "RSP", "IWM", "VIX", "SOXX", "XLF", "XLE", "XLV", "XLI", "XLY", "NVDA", "MSFT", "AAPL", "AMZN", "TSLA", "BRK.B", "WMT", "DXY", "US10Y"],
  chinaIndices: ["000510.SH", "000300.SH", "000905.SH", "000852.SH", "000016.SH", "SZ399006", "000688.SH", "000985.SH", "931865.CSI", "930651.CSI", "399975.SZ", "399986.SZ", "930708.CSI", "399933.SZ", "399997.SZ", "930997.CSI"],
  hkSelected: ["HSI", "HSTECH", "700.HK", "9988.HK", "5.HK", "1299.HK", "388.HK", "939.HK", "1810.HK", "3690.HK", "941.HK", "883.HK", "1211.HK", "16.HK", "2.HK", "1093.HK"],
};
const usMapGroups = [
  { label: "市场", className: "map-us-market", codes: ["GSPC.INDEX", "NDQ", "RSP", "IWM", "VIX"] },
  { label: "行业", className: "map-us-sector", codes: ["SOXX", "XLF", "XLE", "XLV", "XLI", "XLY"] },
  { label: "核心资产", className: "map-us-leaders", codes: ["NVDA", "MSFT", "AAPL", "AMZN", "TSLA", "BRK.B", "WMT"] },
] as const;
const usMacroCodes = ["DXY", "US10Y"];
const chinaMapGroups = [
  { label: "市场", className: "map-china-market", codes: ["000510.SH", "000300.SH", "000905.SH", "000852.SH", "000016.SH", "SZ399006", "000688.SH", "000985.SH"] },
  { label: "行业", className: "map-china-sector", codes: ["931865.CSI", "930651.CSI", "399975.SZ", "399986.SZ", "930708.CSI", "399933.SZ", "399997.SZ", "930997.CSI"] },
] as const;
const hkMapGroups = [
  { label: "指数", className: "map-hk-index", codes: ["HSI", "HSTECH"] },
  { label: "核心蓝筹", className: "map-hk-mega", codes: ["700.HK", "9988.HK", "5.HK", "1299.HK", "388.HK", "939.HK"] },
  { label: "行业代表", className: "map-hk-sector", codes: ["1810.HK", "3690.HK", "941.HK", "883.HK", "1211.HK", "16.HK", "2.HK", "1093.HK"] },
] as const;
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

function momentumDirection(momentum: number) {
  return momentum > 0 ? "上升" : momentum < 0 ? "下降" : "持平";
}

function displayRegionName(region: Region | MarketRegion) {
  return region === "大宗·宏观" ? "宏观" : region;
}

function HoverMarketCard({ market, point, touchMode, onClose }: { market: Market | null; point: { x: number; y: number }; touchMode: boolean; onClose: () => void }) {
  if (!market) return null;
  const maDirection = momentumDirection(market.momentum);
  const maColor = maDirection === "上升" ? stageMeta.S2.color : maDirection === "下降" ? stageMeta.S4.color : undefined;
  const observationLabel = market.observationStage === "UNCONFIRMED" ? market.observation : market.observationStage;
  const observationStage = observationLabel.match(/^S[1-4]/)?.[0] as Stage | undefined;
  const observationColor = observationStage ? stageMeta[observationStage].color : undefined;
  const stageConfirmedAt = new Date(`${market.stageAsOf}T00:00:00Z`);
  stageConfirmedAt.setUTCDate(stageConfirmedAt.getUTCDate() + 1 - (market.weeks - 1) * 7);
  const confirmationDate = stageConfirmedAt.toISOString().slice(0, 10);
  return (
    <div className={`market-hover-card ${touchMode ? "touch-card" : ""}`} role={touchMode ? "dialog" : "tooltip"} aria-label={touchMode ? `${market.shortCode} 资产信息` : undefined} style={{ left: point.x, top: point.y }}>
      <div className="hover-card-title"><span style={{ background: stageMeta[market.stage].color }} />{market.shortCode} · {market.name}{touchMode && <button className="hover-close" type="button" aria-label="关闭资产阶段信息" onClick={onClose}><X size={17} /></button>}</div>
      <dl>
        <div><dt>当前阶段</dt><dd><b style={{ color: stageMeta[market.stage].color }}>{market.subStage}</b> · {market.stageDetail}</dd></div>
        <div><dt>确认时间</dt><dd>{market.weeks}周· {confirmationDate} 4AM UTC+8</dd></div>
        <div><dt>本周观察</dt><dd style={{ color: observationColor }}>{observationLabel}</dd></div>
        <div><dt>MA30趋势</dt><dd style={{ color: maColor }}>{maDirection} · 5周 {market.momentum.toFixed(2)}%</dd></div>
      </dl>
    </div>
  );
}

function MarketMapGroup({ group, className, items, stageFilter, compact, dense, onMarketMove, onMarketLeave, onMarketFocus, onMarketTap }: { group: string; className?: string; items: Market[]; stageFilter: Stage | "全部"; compact: boolean; dense: boolean; onMarketMove: (item: Market, event: PointerEvent<HTMLButtonElement>) => void; onMarketLeave: () => void; onMarketFocus: (item: Market, element: HTMLButtonElement) => void; onMarketTap: (item: Market, element: HTMLButtonElement) => void }) {
  if (!items.length) return null;
  return (
    <section className={`map-group ${className ?? `map-${group.replace("·", "-")}`} ${compact ? "map-group-full" : ""}`}>
      <header><strong>{group}</strong><span>{items.length} 个资产</span></header>
      <div className="map-tiles">
        {items.map((item) => {
          const faded = stageFilter !== "全部" && item.stage !== stageFilter;
          const multiCryptoLayout = group === "加密" && items.length > 1;
          const tileCols = dense ? 1 : multiCryptoLayout
            ? 3
            : compact ? Math.max(2, item.cols) : item.cols;
          const tileRows = dense ? 1 : multiCryptoLayout ? (items.length === 2 ? 4 : 2) : item.rows;
          return (
            <button
              key={item.code}
              className={`map-tile tile-${item.stage.toLowerCase()} ${faded ? "tile-faded" : ""}`}
              style={{ gridColumn: `span ${tileCols}`, gridRow: `span ${tileRows}` }}
              aria-label={`${item.shortCode}，${item.name}，${item.subStage}，${item.stageDetail}，已持续${item.weeks}周，MA30${momentumDirection(item.momentum)}${item.momentum.toFixed(2)}%`}
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
  if (view === "usSelected" && region === "全球") {
    return (
      <div className="market-map view-usSelected">
        {usMapGroups.map((group) => <MarketMapGroup key={group.className} group={group.label} className={group.className} items={source.filter((item) => group.codes.some((code) => code === item.code))} stageFilter={stageFilter} compact={false} dense onMarketMove={onMarketMove} onMarketLeave={onMarketLeave} onMarketFocus={onMarketFocus} onMarketTap={onMarketTap} />)}
        <MarketMapGroup group="宏观" className="map-us-macro" items={source.filter((item) => usMacroCodes.includes(item.code))} stageFilter={stageFilter} compact={false} dense onMarketMove={onMarketMove} onMarketLeave={onMarketLeave} onMarketFocus={onMarketFocus} onMarketTap={onMarketTap} />
      </div>
    );
  }
  if (view === "chinaIndices") {
    return (
      <div className="market-map view-chinaIndices">
        {chinaMapGroups.map((group) => <MarketMapGroup key={group.className} group={group.label} className={group.className} items={source.filter((item) => group.codes.some((code) => code === item.code))} stageFilter={stageFilter} compact={false} dense onMarketMove={onMarketMove} onMarketLeave={onMarketLeave} onMarketFocus={onMarketFocus} onMarketTap={onMarketTap} />)}
      </div>
    );
  }
  if (view === "hkSelected") {
    return (
      <div className="market-map view-hkSelected">
        {hkMapGroups.map((group) => <MarketMapGroup key={group.className} group={group.label} className={group.className} items={source.filter((item) => group.codes.some((code) => code === item.code))} stageFilter={stageFilter} compact={false} dense onMarketMove={onMarketMove} onMarketLeave={onMarketLeave} onMarketFocus={onMarketFocus} onMarketTap={onMarketTap} />)}
      </div>
    );
  }
  return (
    <div className={`market-map view-${view} ${region !== "全球" ? "single-map" : ""}`}>
      {groups.map((group) => <MarketMapGroup key={group} group={displayRegionName(group)} className={`map-${group.replace("·", "-")}`} items={source.filter((item) => item.region === group)} stageFilter={stageFilter} compact={region !== "全球"} dense={dense} onMarketMove={onMarketMove} onMarketLeave={onMarketLeave} onMarketFocus={onMarketFocus} onMarketTap={onMarketTap} />)}
    </div>
  );
}

export default function Home() {
  const [isMember, setIsMember] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(MEMBER_STORAGE_KEY) === "granted");
  const [memberDialog, setMemberDialog] = useState<"locked" | "login" | null>(null);
  const [pendingView, setPendingView] = useState<View | null>(null);
  const [username, setUsername] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [checkingCredentials, setCheckingCredentials] = useState(false);
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
    if (!memberDialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [memberDialog]);

  useEffect(() => {
    if (!memberDialog) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMemberDialog(null);
        setPendingView(null);
        setLoginError(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [memberDialog]);

  const handleMemberLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCheckingCredentials(true);
    const [usernameHash, passwordHash] = await Promise.all([hashText(username.trim()), hashText(memberPassword)]);
    const valid = usernameHash === ADMIN_USERNAME_HASH && passwordHash === ADMIN_PASSWORD_HASH;
    setCheckingCredentials(false);
    if (!valid) {
      setLoginError(true);
      setMemberPassword("");
      return;
    }
    window.localStorage.setItem(MEMBER_STORAGE_KEY, "granted");
    setLoginError(false);
    setIsMember(true);
    setMemberDialog(null);
    setUsername("");
    setMemberPassword("");
    if (pendingView) switchView(pendingView);
    setPendingView(null);
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
  const requestView = (nextView: View) => {
    if (!isMember && memberOnlyViews.has(nextView)) {
      setPendingView(nextView);
      setMemberDialog("locked");
      setLoginError(false);
      closeMarketCard();
      return;
    }
    switchView(nextView);
  };
  const closeMemberDialog = () => {
    setMemberDialog(null);
    setPendingView(null);
    setLoginError(false);
    setUsername("");
    setMemberPassword("");
  };
  const activeViewMeta = viewMeta[view];

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand"><img className="brand-mark" src={`${import.meta.env.BASE_URL}lz-logo-v2.png`} alt="LZ" width="38" height="38" /><div><strong>LZ-4Stage</strong><small>MARKET TOOLKIT</small></div></div>
          <nav className="side-nav" aria-label="主要导航">
            <button className={`nav-item ${view === "global" ? "active" : ""}`} onClick={() => requestView("global")} aria-pressed={view === "global"}><Grid2X2 size={18} /><span>全球市场</span></button>
            <button className={`nav-item ${view === "crypto7" ? "active" : ""}`} onClick={() => requestView("crypto7")} aria-pressed={view === "crypto7"}><BarChart3 size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}加密市场</span></button>
            <button className={`nav-item ${view === "usSelected" ? "active" : ""}`} onClick={() => requestView("usSelected")} aria-pressed={view === "usSelected"}><TrendingUp size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}美股指数</span></button>
            <button className={`nav-item ${view === "chinaIndices" ? "active" : ""}`} onClick={() => requestView("chinaIndices")} aria-pressed={view === "chinaIndices"}><Landmark size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}A股指数</span></button>
            <button className={`nav-item ${view === "hkSelected" ? "active" : ""}`} onClick={() => requestView("hkSelected")} aria-pressed={view === "hkSelected"}><Building2 size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}港股指数</span></button>
          </nav>
          <nav className="mobile-view-nav" aria-label="手机端页面导航">
            <button type="button" className={view === "global" ? "active" : ""} onClick={() => requestView("global")}>全球</button>
            <button type="button" className={view === "crypto7" ? "active" : ""} onClick={() => requestView("crypto7")}>{!isMember && <LockKeyhole size={9} aria-hidden="true" />}<span>加密</span></button>
            <button type="button" className={view === "usSelected" ? "active" : ""} onClick={() => requestView("usSelected")}>{!isMember && <LockKeyhole size={9} aria-hidden="true" />}<span>美股</span></button>
            <button type="button" className={view === "chinaIndices" ? "active" : ""} onClick={() => requestView("chinaIndices")}>{!isMember && <LockKeyhole size={9} aria-hidden="true" />}<span>A股</span></button>
            <button type="button" className={view === "hkSelected" ? "active" : ""} onClick={() => requestView("hkSelected")}>{!isMember && <LockKeyhole size={9} aria-hidden="true" />}<span>港股</span></button>
          </nav>
          <div className="sidebar-bottom"><span>数据周期</span><strong>{week.year} · W{String(week.week).padStart(2, "0")}</strong><small>仅作为市场观察工具</small></div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div><div className="eyebrow"><Globe2 size={14} /> GLOBAL TREND MAP</div><h1>全球市场趋势地图</h1><p>Power by LZ-4Stage</p></div>
            <div className="top-actions">
              <button className="full-version-link" type="button" onClick={() => { setHoveredMarket(null); setShowFullVersion(true); }}><MousePointerClick size={16} />点击获取完整LZ-4Stage</button>
              <span className="period-badge">完整周线</span>
              <span className="confirmation-date"><CalendarDays size={16} />共同确认至 {commonConfirmationDate}</span>
              <div className="update-time"><Clock3 size={15} /><span>生成于 <strong>{formatDateTime(dashboardData.generatedAt)}</strong></span></div>
              <button className="icon-button" aria-label="刷新页面" onClick={() => window.location.reload()}><RefreshCw size={18} /></button>
            </div>
          </header>

          <div className="filterbar">
            <div className="region-tabs" role="group" aria-label="市场筛选">{activeViewMeta.regions.map((item) => <button key={item} className={region === item ? "active" : ""} onClick={() => setRegion(item)}>{view !== "global" && item === "全球" ? "全部" : displayRegionName(item)}</button>)}</div>
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
              <div><span className="section-kicker">{activeViewMeta.mapKicker}</span><h2>{activeViewMeta.mapTitle}</h2><p>方块大小体现资产重要性，颜色代表当前所处阶段</p></div>
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
      {memberDialog && (
        <div className="access-gate-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeMemberDialog(); }}>
          <section className="access-gate" role="dialog" aria-modal="true" aria-labelledby="access-gate-title">
            <button className="modal-close" type="button" aria-label="关闭会员窗口" onClick={closeMemberDialog}><X size={19} /></button>
            <div className="access-gate-icon"><LockKeyhole size={23} /></div>
            <span className="access-gate-kicker">LZ MEMBER</span>
            {memberDialog === "locked" ? (
              <>
                <h2 id="access-gate-title">LZ会员专享</h2>
                <p>登录会员账号后查看完整市场趋势地图</p>
                <button className="member-login-cta" type="button" onClick={() => setMemberDialog("login")}>会员登录</button>
              </>
            ) : (
              <>
                <h2 id="access-gate-title">会员登录</h2>
                <p>请输入LZ会员账号和密码</p>
                <form onSubmit={handleMemberLogin}>
                  <label htmlFor="member-username">登录名</label>
                  <input
                    id="member-username"
                    type="text"
                    value={username}
                    onChange={(event) => { setUsername(event.target.value); setLoginError(false); }}
                    placeholder="请输入登录名"
                    autoComplete="username"
                    autoFocus
                    aria-invalid={loginError}
                  />
                  <label htmlFor="member-password">密码</label>
                  <input
                    id="member-password"
                    type="password"
                    value={memberPassword}
                    onChange={(event) => { setMemberPassword(event.target.value); setLoginError(false); }}
                    placeholder="请输入密码"
                    autoComplete="current-password"
                    aria-invalid={loginError}
                    aria-describedby={loginError ? "access-error" : "access-note"}
                  />
                  {loginError && <span className="access-error" id="access-error" role="alert">用户名或密码不正确，请重新输入</span>}
                  <button type="submit" disabled={!username.trim() || !memberPassword || checkingCredentials}>{checkingCredentials ? "正在登录…" : "登录并查看"}</button>
                </form>
                <small id="access-note">登录成功后，此浏览器将保持会员状态。</small>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
