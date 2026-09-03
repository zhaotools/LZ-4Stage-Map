"use client";

import { type CSSProperties, type FormEvent, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  Clock3,
  Globe2,
  Grid2X2,
  KeyRound,
  Landmark,
  LockKeyhole,
  LogOut,
  MousePointerClick,
  Radar,
  RefreshCw,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";

import dashboardData from "@/data/dashboard.json";
import { TurnstileWidget } from "@/app/components/turnstile-widget";
import {
  getMemberProfile,
  getMemberSession,
  getMemberSnapshot,
  getStockRadarSnapshot,
  getTrendRadarSnapshot,
  isProfileActive,
  signInMember,
  signOutMember,
  updateMemberPassword,
  type MemberProfile,
  type MemberSnapshot,
  type MemberView,
  type StockRadarRuleId,
  type StockRadarSnapshot,
  type TrendRadarRuleId,
  type TrendRadarSnapshot,
} from "@/app/lib/member-api";
import { isSupabaseConfigured } from "@/app/lib/supabase";
type Stage = "S1" | "S2" | "S3" | "S4";
type View = "global" | MemberView;
type ProtectedPage = MemberView | "trendRadar" | "stockRadar";
type RadarFilter = "all" | TrendRadarRuleId;
type StockRadarFilter = "all" | StockRadarRuleId;
type RadarScanMode = "s2" | "s4";
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
type RadarMarket = Market & { matchRules: TrendRadarRuleId[] };
type StockRadarMarket = Market & {
  industry: string;
  liquidityRank: number;
  averageTurnover20d: number;
  matchRules: StockRadarRuleId[];
};

const memberOnlyViews = new Set<MemberView>(["crypto7", "usSelected", "chinaIndices", "hkSelected"]);
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";

function isMemberView(view: View): view is MemberView {
  return memberOnlyViews.has(view as MemberView);
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

type DashboardMarket = (typeof dashboardData.markets)[number];

function hydrateMarkets(items: DashboardMarket[]): Market[] {
  return items.map((item) => {
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
  });
}

const publicMarkets = hydrateMarkets(dashboardData.markets.filter((item) => item.collections.includes("global")));

const stageMeta: Record<Stage, { title: string; season: string; color: string; dark: string }> = {
  S1: { title: "筑底阶段", season: "春", color: "#397ff6", dark: "#1c5bd0" },
  S2: { title: "上升阶段", season: "夏", color: "#18a567", dark: "#087849" },
  S3: { title: "筑顶阶段", season: "秋", color: "#f09a18", dark: "#c56f00" },
  S4: { title: "下降阶段", season: "冬", color: "#ed4859", dark: "#bd2638" },
};
const radarRuleMeta: Record<TrendRadarRuleId, { label: string; description: string; color: string }> = {
  s4Recovery: { label: "转向S2观察", description: "当前主阶段 S4 / S3 · 本周观察转向 S2", color: "#18a567" },
  s2aEntry: { label: "进入S2A", description: "当前进入S2A阶段", color: "#18a567" },
  s2Early: { label: "S2早期阶段", description: "S2持续时间不超过4周", color: "#087849" },
  s2Breakdown: { label: "转向S4观察", description: "当前主阶段 S2 / S3 · 本周观察转向 S4", color: "#ed4859" },
  s4aEntry: { label: "进入S4A", description: "当前进入S4A阶段", color: "#ed4859" },
  s4Early: { label: "S4早期阶段", description: "S4持续时间不超过4周", color: "#bd2638" },
};
const radarRuleIds: Record<RadarScanMode, TrendRadarRuleId[]> = {
  s2: ["s4Recovery", "s2aEntry", "s2Early"],
  s4: ["s2Breakdown", "s4aEntry", "s4Early"],
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

function observationStageFor(market: Market) {
  const label = market.observationStage === "UNCONFIRMED" ? market.observation : market.observationStage;
  return label.match(/^S[1-4]/)?.[0] as Stage | undefined;
}

function observationConfirmationFor(market: Market) {
  const progress = market.observation.match(/\b\d+\/\d+\b/)?.[0];
  return progress ? `${progress}周确认` : null;
}

function stageConfirmationDateFor(market: Market) {
  const confirmedAt = new Date(`${market.stageAsOf}T00:00:00Z`);
  confirmedAt.setUTCDate(confirmedAt.getUTCDate() + 1 - (market.weeks - 1) * 7);
  return confirmedAt.toISOString().slice(0, 10);
}

function HoverMarketCard({ market, point, touchMode, onClose }: { market: Market | null; point: { x: number; y: number }; touchMode: boolean; onClose: () => void }) {
  if (!market) return null;
  const maDirection = momentumDirection(market.momentum);
  const maColor = maDirection === "上升" ? stageMeta.S2.color : maDirection === "下降" ? stageMeta.S4.color : undefined;
  const observationLabel = market.observationStage === "UNCONFIRMED" ? market.observation : market.observationStage;
  const observationStage = observationStageFor(market);
  const observationConfirmation = observationConfirmationFor(market);
  const observationColor = observationStage ? stageMeta[observationStage].color : undefined;
  const confirmationDate = stageConfirmationDateFor(market);
  return (
    <div className={`market-hover-card ${touchMode ? "touch-card" : ""}`} role={touchMode ? "dialog" : "tooltip"} aria-label={touchMode ? `${market.shortCode} 资产信息` : undefined} style={{ left: point.x, top: point.y }}>
      <div className="hover-card-title"><span style={{ background: stageMeta[market.stage].color }} />{market.shortCode} · {market.name}{touchMode && <button className="hover-close" type="button" aria-label="关闭资产阶段信息" onClick={onClose}><X size={17} /></button>}</div>
      <dl>
        <div><dt>当前阶段</dt><dd><b style={{ color: stageMeta[market.stage].color }}>{market.subStage}</b> · {market.stageDetail}</dd></div>
        <div><dt>确认时间</dt><dd>{market.weeks}周· {confirmationDate} 4AM UTC+8</dd></div>
        <div><dt>本周观察</dt><dd style={{ color: observationColor }}>{observationLabel}{observationConfirmation && <> · {observationConfirmation}</>}</dd></div>
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
          const observationStage = observationStageFor(item);
          const observationChanged = Boolean(observationStage && observationStage !== item.stage);
          const multiCryptoLayout = group === "加密" && items.length > 1;
          const tileCols = dense ? 1 : multiCryptoLayout
            ? 3
            : compact ? Math.max(2, item.cols) : item.cols;
          const tileRows = dense ? 1 : multiCryptoLayout ? (items.length === 2 ? 4 : 2) : item.rows;
          return (
            <button
              key={item.code}
              className={`map-tile tile-${item.stage.toLowerCase()} ${observationChanged ? "tile-observation-change" : ""} ${faded ? "tile-faded" : ""}`}
              style={{
                gridColumn: `span ${tileCols}`,
                gridRow: `span ${tileRows}`,
                ...(observationChanged && observationStage ? { "--observation-border": stageMeta[observationStage].color } : {}),
              } as CSSProperties}
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

function TrendRadarPage({
  snapshot,
  markets,
  filter,
  region,
  scanMode,
  onFilterChange,
  onRegionChange,
  onScanModeChange,
}: {
  snapshot: TrendRadarSnapshot<DashboardMarket>;
  markets: RadarMarket[];
  filter: RadarFilter;
  region: "全部" | MarketRegion;
  scanMode: RadarScanMode;
  onFilterChange: (filter: RadarFilter) => void;
  onRegionChange: (region: "全部" | MarketRegion) => void;
  onScanModeChange: (mode: RadarScanMode) => void;
}) {
  const ruleIds = radarRuleIds[scanMode];
  const familyMarkets = markets.filter((market) => market.matchRules.some((ruleId) => ruleIds.includes(ruleId)));
  const availableRegions = marketRegions.filter((item) => familyMarkets.some((market) => market.region === item));
  const filtered = familyMarkets.filter((market) => (filter === "all" || market.matchRules.includes(filter)) && (region === "全部" || market.region === region));

  return (
    <section className="radar-panel" aria-labelledby="trend-radar-title">
      <div className="radar-head">
        <div><span className="section-kicker">STAGE SCAN</span><h2 id="trend-radar-title">全球阶段扫描</h2><p>{snapshot.universeSize}个全球核心资产四阶段状态</p></div>
        <div className="radar-scan-switch" role="group" aria-label="趋势方向扫描切换">
          {(["s2", "s4"] as RadarScanMode[]).map((mode) => <button key={mode} type="button" className={`scan-${mode} ${scanMode === mode ? "active" : ""}`} onClick={() => onScanModeChange(mode)} aria-pressed={scanMode === mode}>扫描{mode.toUpperCase()}</button>)}
        </div>
      </div>

      <div className="radar-summary" role="group" aria-label="全球阶段扫描条件筛选">
        <button type="button" className={`radar-rule-card radar-rule-all ${filter === "all" ? "selected" : ""}`} onClick={() => onFilterChange("all")} aria-pressed={filter === "all"}>
          <span>本周发现</span><strong>{familyMarkets.length}</strong><small>个不重复资产</small>
        </button>
        {ruleIds.map((ruleId) => {
          const meta = radarRuleMeta[ruleId];
          return (
            <button key={ruleId} type="button" className={`radar-rule-card radar-rule-${ruleId} ${filter === ruleId ? "selected" : ""}`} style={{ "--radar-rule-color": meta.color } as CSSProperties} onClick={() => onFilterChange(filter === ruleId ? "all" : ruleId)} aria-pressed={filter === ruleId}>
              <span>{meta.label}</span><strong>{familyMarkets.filter((market) => market.matchRules.includes(ruleId)).length}</strong><small>{meta.description}</small>
            </button>
          );
        })}
      </div>

      <div className="radar-toolbar">
        <div className="radar-region-tabs" role="group" aria-label="全球阶段扫描市场筛选">
          {(["全部", ...availableRegions] as Array<"全部" | MarketRegion>).map((item) => <button key={item} type="button" className={region === item ? "active" : ""} onClick={() => onRegionChange(item)}>{item === "全部" ? item : displayRegionName(item)}</button>)}
        </div>
        <span>显示 {filtered.length} / {familyMarkets.length} 个资产</span>
      </div>

      {filtered.length ? (
        <div className="radar-results">
          {filtered.map((market) => {
            const observationStage = observationStageFor(market);
            const observationLabel = market.observationStage === "UNCONFIRMED" ? market.observation : market.observationStage;
            const observationConfirmation = observationConfirmationFor(market);
            const maDirection = momentumDirection(market.momentum);
            const maColor = maDirection === "上升" ? stageMeta.S2.color : maDirection === "下降" ? stageMeta.S4.color : undefined;
            return (
              <article key={market.code} className="radar-result-card" style={{ "--radar-stage-color": stageMeta[market.stage].color } as CSSProperties}>
                <div className="radar-result-title"><div><strong>{market.shortCode}</strong><span>{market.name}</span></div><em>{displayRegionName(market.region)}</em></div>
                <div className="radar-match-tags">{market.matchRules.filter((ruleId) => ruleIds.includes(ruleId)).map((ruleId) => <span key={ruleId} style={{ "--radar-tag-color": radarRuleMeta[ruleId].color } as CSSProperties}>{radarRuleMeta[ruleId].label}</span>)}</div>
                <dl>
                  <div><dt>当前阶段</dt><dd><b style={{ color: stageMeta[market.stage].color }}>{market.subStage}</b> · {market.stageDetail}</dd></div>
                  <div><dt>本周观察</dt><dd style={{ color: observationStage ? stageMeta[observationStage].color : undefined }}>{observationLabel}{observationConfirmation && <> · {observationConfirmation}</>}</dd></div>
                  <div><dt>确认时间</dt><dd>{market.weeks}周 · {stageConfirmationDateFor(market)} 4AM UTC+8</dd></div>
                  <div><dt>MA30趋势</dt><dd style={{ color: maColor }}>{maDirection} · 5周 {market.momentum.toFixed(2)}%</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="radar-empty"><Radar size={30} /><strong>当前筛选下暂无符合条件的资产</strong><span>可切换扫描条件或市场范围查看</span></div>
      )}
    </section>
  );
}

function formatTurnover(value: number, region: StockRadarMarket["region"]) {
  const unit = region === "美股" ? "亿美元" : "亿元";
  return `${(value / 100_000_000).toLocaleString("zh-CN", { maximumFractionDigits: 1 })}${unit}`;
}

function StockRadarPage({
  snapshot,
  markets,
  filter,
  region,
  onFilterChange,
  onRegionChange,
}: {
  snapshot: StockRadarSnapshot<StockRadarMarket>;
  markets: StockRadarMarket[];
  filter: StockRadarFilter;
  region: "全部" | "美股" | "A股" | "港股";
  onFilterChange: (filter: StockRadarFilter) => void;
  onRegionChange: (region: "全部" | "美股" | "A股" | "港股") => void;
}) {
  const filtered = markets.filter((market) => (filter === "all" || market.matchRules.includes(filter)) && (region === "全部" || market.region === region));
  const ruleIds: StockRadarRuleId[] = ["s4Recovery", "s2aEntry", "s2Early"];

  return (
    <section className="radar-panel stock-radar-panel" aria-labelledby="stock-radar-title">
      <div className="radar-head stock-radar-head">
        <div><span className="section-kicker">STAGE SCAN</span><h2 id="stock-radar-title">个股阶段扫描</h2><p>A股·港股·美股高流动性股票四阶段状态</p></div>
        <div className="stock-radar-status" aria-label="个股阶段扫描数据质量">
          <strong>{snapshot.quality.completionRate}% 完整</strong>
          <span>{snapshot.quality.live} 实时 · {snapshot.quality.cache} 缓存</span>
        </div>
      </div>

      <div className="radar-summary" role="group" aria-label="个股阶段扫描条件筛选">
        <button type="button" className={`radar-rule-card radar-rule-all ${filter === "all" ? "selected" : ""}`} onClick={() => onFilterChange("all")} aria-pressed={filter === "all"}>
          <span>本周发现</span><strong>{markets.length}</strong><small>个不重复股票</small>
        </button>
        {ruleIds.map((ruleId) => {
          const meta = radarRuleMeta[ruleId];
          return (
            <button key={ruleId} type="button" className={`radar-rule-card radar-rule-${ruleId} ${filter === ruleId ? "selected" : ""}`} style={{ "--radar-rule-color": meta.color } as CSSProperties} onClick={() => onFilterChange(filter === ruleId ? "all" : ruleId)} aria-pressed={filter === ruleId}>
              <span>{meta.label}</span><strong>{snapshot.counts[ruleId]}</strong><small>{meta.description}</small>
            </button>
          );
        })}
      </div>

      <div className="stock-market-health" aria-label="三个市场扫描状态">
        {snapshot.marketStats.map((stat) => <div key={stat.region}><strong>{stat.region}</strong><span>{stat.analyzed}/{stat.universe} 只</span><em>{stat.matches} 个观察</em></div>)}
      </div>

      <div className="radar-toolbar">
        <div className="radar-region-tabs" role="group" aria-label="个股阶段扫描市场筛选">
          {(["全部", "美股", "A股", "港股"] as const).map((item) => <button key={item} type="button" className={region === item ? "active" : ""} onClick={() => onRegionChange(item)}>{item}</button>)}
        </div>
        <span>显示 {filtered.length} / {markets.length} 个观察</span>
      </div>

      {filtered.length ? (
        <div className="radar-results stock-radar-results">
          {filtered.map((market) => {
            const observationStage = observationStageFor(market);
            const observationLabel = market.observationStage === "UNCONFIRMED" ? market.observation : market.observationStage;
            const observationConfirmation = observationConfirmationFor(market);
            const maDirection = momentumDirection(market.momentum);
            const maColor = maDirection === "上升" ? stageMeta.S2.color : maDirection === "下降" ? stageMeta.S4.color : undefined;
            return (
              <article key={market.code} className="radar-result-card stock-radar-result" style={{ "--radar-stage-color": stageMeta[market.stage].color } as CSSProperties}>
                <div className="radar-result-title"><div><strong>{market.shortCode}</strong><span>{market.name}</span></div><em>{market.region} · #{market.liquidityRank}</em></div>
                <div className="stock-result-meta"><span>{market.industry || "其他"}</span><span>20日均额 {formatTurnover(market.averageTurnover20d, market.region)}</span></div>
                <div className="radar-match-tags">{market.matchRules.map((ruleId) => <span key={ruleId} style={{ "--radar-tag-color": radarRuleMeta[ruleId].color } as CSSProperties}>{radarRuleMeta[ruleId].label}</span>)}</div>
                <dl>
                  <div><dt>当前阶段</dt><dd><b style={{ color: stageMeta[market.stage].color }}>{market.subStage}</b> · {market.stageDetail}</dd></div>
                  <div><dt>本周观察</dt><dd style={{ color: observationStage ? stageMeta[observationStage].color : undefined }}>{observationLabel}{observationConfirmation && <> · {observationConfirmation}</>}</dd></div>
                  <div><dt>确认时间</dt><dd>{market.weeks}周 · {stageConfirmationDateFor(market)} 4AM UTC+8</dd></div>
                  <div><dt>MA30趋势</dt><dd style={{ color: maColor }}>{maDirection} · 5周 {market.momentum.toFixed(2)}%</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="radar-empty"><Radar size={30} /><strong>当前筛选下暂无符合条件的股票</strong><span>可切换扫描条件或市场范围查看</span></div>
      )}
    </section>
  );
}

export default function Home() {
  const [authReady, setAuthReady] = useState(false);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [memberSnapshots, setMemberSnapshots] = useState<Partial<Record<MemberView, MemberSnapshot<DashboardMarket>>>>({});
  const [radarSnapshot, setRadarSnapshot] = useState<TrendRadarSnapshot<DashboardMarket> | null>(null);
  const [stockRadarSnapshot, setStockRadarSnapshot] = useState<StockRadarSnapshot<StockRadarMarket> | null>(null);
  const [memberDialog, setMemberDialog] = useState<"locked" | "login" | "dataError" | "password" | "passwordChanged" | null>(null);
  const [pendingView, setPendingView] = useState<ProtectedPage | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [checkingCredentials, setCheckingCredentials] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [loadingMemberView, setLoadingMemberView] = useState<ProtectedPage | null>(null);
  const [view, setView] = useState<View>("global");
  const [radarActive, setRadarActive] = useState(false);
  const [stockRadarActive, setStockRadarActive] = useState(false);
  const [radarFilter, setRadarFilter] = useState<RadarFilter>("all");
  const [radarRegion, setRadarRegion] = useState<"全部" | MarketRegion>("全部");
  const [radarScanMode, setRadarScanMode] = useState<RadarScanMode>("s2");
  const [stockRadarFilter, setStockRadarFilter] = useState<StockRadarFilter>("all");
  const [stockRadarRegion, setStockRadarRegion] = useState<"全部" | "美股" | "A股" | "港股">("全部");
  const [region, setRegion] = useState<Region>("全球");
  const [stageFilter, setStageFilter] = useState<Stage | "全部">("全部");
  const [hoveredMarket, setHoveredMarket] = useState<Market | null>(null);
  const [hoverPoint, setHoverPoint] = useState({ x: 0, y: 0 });
  const [touchCardOpen, setTouchCardOpen] = useState(false);
  const [showFullVersion, setShowFullVersion] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const isMember = Boolean(memberProfile && isProfileActive(memberProfile));
  const memberDisplayName = memberProfile?.display_name || "会员";
  const handleCaptchaToken = useCallback((token: string | null) => setCaptchaToken(token), []);

  useEffect(() => {
    let cancelled = false;
    const restoreMember = async () => {
      if (!isSupabaseConfigured) {
        setAuthReady(true);
        return;
      }
      try {
        const session = await getMemberSession();
        if (!session) return;
        const profile = await getMemberProfile();
        if (!isProfileActive(profile)) {
          await signOutMember();
          return;
        }
        if (!cancelled) setMemberProfile(profile);
      } catch {
        if (!cancelled) setMemberProfile(null);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    };
    void restoreMember();
    return () => { cancelled = true; };
  }, []);

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
    if (!accountMenuOpen) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!memberDialog) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMemberDialog(null);
        setPendingView(null);
        setLoginError(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [memberDialog]);

  const loadMemberView = async (nextView: MemberView) => {
    if (memberSnapshots[nextView]) return memberSnapshots[nextView];
    setLoadingMemberView(nextView);
    try {
      const snapshot = await getMemberSnapshot<DashboardMarket>(nextView);
      setMemberSnapshots((current) => ({ ...current, [nextView]: snapshot }));
      return snapshot;
    } catch {
      return null;
    } finally {
      setLoadingMemberView(null);
    }
  };

  const loadTrendRadar = async () => {
    if (radarSnapshot) return radarSnapshot;
    setLoadingMemberView("trendRadar");
    try {
      const snapshot = await getTrendRadarSnapshot<DashboardMarket>();
      setRadarSnapshot(snapshot);
      return snapshot;
    } catch {
      return null;
    } finally {
      setLoadingMemberView(null);
    }
  };

  const loadStockRadar = async () => {
    if (stockRadarSnapshot) return stockRadarSnapshot;
    setLoadingMemberView("stockRadar");
    try {
      const snapshot = await getStockRadarSnapshot<StockRadarMarket>();
      setStockRadarSnapshot(snapshot);
      return snapshot;
    } catch {
      return null;
    } finally {
      setLoadingMemberView(null);
    }
  };

  const handleMemberLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCheckingCredentials(true);
    setLoginError(null);
    if (!isSupabaseConfigured) {
      setLoginError("会员服务尚未完成配置，请稍后再试");
      setCheckingCredentials(false);
      return;
    }

    let profile: MemberProfile;
    try {
      await signInMember(memberEmail, memberPassword, captchaToken ?? undefined);
      profile = await getMemberProfile();
      if (!isProfileActive(profile)) {
        await signOutMember();
        setLoginError("会员账号尚未激活、已暂停或已到期，请联系管理员");
        setMemberPassword("");
        setCaptchaToken(null);
        setCaptchaResetKey((current) => current + 1);
        setCheckingCredentials(false);
        return;
      }
    } catch {
      await signOutMember().catch(() => undefined);
      setLoginError("邮箱、密码或安全验证错误，请重新输入");
      setMemberPassword("");
      setCaptchaToken(null);
      setCaptchaResetKey((current) => current + 1);
      setCheckingCredentials(false);
      return;
    }

    setMemberProfile(profile);
    setAuthReady(true);
    if (pendingView) {
      const snapshot = pendingView === "trendRadar"
        ? await loadTrendRadar()
        : pendingView === "stockRadar"
          ? await loadStockRadar()
          : await loadMemberView(pendingView);
      if (!snapshot) {
        setMemberDialog("dataError");
        setCheckingCredentials(false);
        return;
      }
      if (pendingView === "trendRadar") {
        setRadarActive(true);
        setStockRadarActive(false);
        setRadarFilter("all");
        setRadarRegion("全部");
        closeMarketCard();
      } else if (pendingView === "stockRadar") {
        setStockRadarActive(true);
        setRadarActive(false);
        setStockRadarFilter("all");
        setStockRadarRegion("全部");
        closeMarketCard();
      } else {
        switchView(pendingView);
      }
    }
    setMemberDialog(null);
    setMemberEmail("");
    setMemberPassword("");
    setCaptchaToken(null);
    setPendingView(null);
    setCheckingCredentials(false);
  };

  const activeUniverse = useMemo(() => {
    const selected = view === "global"
      ? publicMarkets
      : hydrateMarkets(memberSnapshots[view]?.markets ?? []);
    const order = collectionOrder[view];
    if (!order) return selected;
    const positions = new Map(order.map((code, index) => [code, index]));
    return [...selected].sort((a, b) => (positions.get(a.code) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.code) ?? Number.MAX_SAFE_INTEGER));
  }, [memberSnapshots, view]);
  const radarMarkets = useMemo<RadarMarket[]>(() => (radarSnapshot?.matches ?? []).map((item) => ({
    ...hydrateMarkets([item as DashboardMarket])[0],
    matchRules: item.matchRules,
  })), [radarSnapshot]);
  const regionData = useMemo(() => activeUniverse.filter((item) => region === "全球" || item.region === region), [activeUniverse, region]);
  const counts = useMemo(() => {
    const result: Record<Stage, number> = { S1: 0, S2: 0, S3: 0, S4: 0 };
    regionData.forEach((item) => result[item.stage]++);
    return result;
  }, [regionData]);
  const commonStageAsOf = [...activeUniverse].sort((a, b) => a.stageAsOf.localeCompare(b.stageAsOf))[0]?.stageAsOf ?? dashboardData.commonStageAsOf;
  const commonConfirmationDate = activeUniverse.map(displayConfirmationDate).sort()[0] ?? commonStageAsOf;
  const activeGeneratedAt = stockRadarActive && stockRadarSnapshot
    ? stockRadarSnapshot.generatedAt
    : radarActive && radarSnapshot
      ? radarSnapshot.generatedAt
      : view === "global" ? dashboardData.generatedAt : memberSnapshots[view]?.generatedAt ?? dashboardData.generatedAt;
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
    setRadarActive(false);
    setStockRadarActive(false);
    setView(nextView);
    setRegion("全球");
    setStageFilter("全部");
    closeMarketCard();
  };
  const requestTrendRadar = async () => {
    if (!isMember) {
      setPendingView("trendRadar");
      setMemberDialog("locked");
      setLoginError(null);
      closeMarketCard();
      return;
    }
    const snapshot = await loadTrendRadar();
    if (!snapshot) {
      setPendingView("trendRadar");
      setMemberDialog("dataError");
      closeMarketCard();
      return;
    }
    setRadarActive(true);
    setStockRadarActive(false);
    setRadarFilter("all");
    setRadarRegion("全部");
    closeMarketCard();
  };
  const requestStockRadar = async () => {
    if (!isMember) {
      setPendingView("stockRadar");
      setMemberDialog("locked");
      setLoginError(null);
      closeMarketCard();
      return;
    }
    const snapshot = await loadStockRadar();
    if (!snapshot) {
      setPendingView("stockRadar");
      setMemberDialog("dataError");
      closeMarketCard();
      return;
    }
    setStockRadarActive(true);
    setRadarActive(false);
    setStockRadarFilter("all");
    setStockRadarRegion("全部");
    closeMarketCard();
  };
  const requestView = async (nextView: View) => {
    if (!isMember && isMemberView(nextView)) {
      setPendingView(nextView);
      setMemberDialog("locked");
      setLoginError(null);
      closeMarketCard();
      return;
    }
    if (isMemberView(nextView)) {
      const snapshot = await loadMemberView(nextView);
      if (!snapshot) {
        setPendingView(nextView);
        setMemberDialog("dataError");
        closeMarketCard();
        return;
      }
    }
    switchView(nextView);
  };
  const closeMemberDialog = () => {
    setMemberDialog(null);
    setPendingView(null);
    setLoginError(null);
    setMemberEmail("");
    setMemberPassword("");
    setCaptchaToken(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
  };
  const openMemberLogin = () => {
    setPendingView(null);
    setLoginError(null);
    setMemberEmail("");
    setMemberPassword("");
    setCaptchaToken(null);
    setCaptchaResetKey((current) => current + 1);
    setMemberDialog("login");
    closeMarketCard();
  };
  const handleMemberLogout = async () => {
    setAccountMenuOpen(false);
    await signOutMember().catch(() => undefined);
    setMemberProfile(null);
    setMemberSnapshots({});
    setRadarSnapshot(null);
    setStockRadarSnapshot(null);
    closeMemberDialog();
    switchView("global");
  };
  const openPasswordChange = () => {
    setAccountMenuOpen(false);
    setPendingView(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setMemberDialog("password");
    closeMarketCard();
  };
  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPasswordError("新密码至少8位，并同时包含字母和数字");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("两次输入的新密码不一致");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("新密码不能与当前密码相同");
      return;
    }

    setChangingPassword(true);
    try {
      await updateMemberPassword(currentPassword, newPassword);
    } catch {
      setPasswordError("当前密码不正确，或新密码不符合安全要求");
      setChangingPassword(false);
      return;
    }
    await signOutMember().catch(() => undefined);
    setMemberProfile(null);
    setMemberSnapshots({});
    setRadarSnapshot(null);
    setStockRadarSnapshot(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    switchView("global");
    setMemberDialog("passwordChanged");
    setChangingPassword(false);
  };
  const retryMemberData = async () => {
    if (!pendingView) return;
    const snapshot = pendingView === "trendRadar"
      ? await loadTrendRadar()
      : pendingView === "stockRadar"
        ? await loadStockRadar()
        : await loadMemberView(pendingView);
    if (!snapshot) return;
    const nextView = pendingView;
    closeMemberDialog();
    if (nextView === "trendRadar") {
      setRadarActive(true);
      setStockRadarActive(false);
      setRadarFilter("all");
      setRadarRegion("全部");
      closeMarketCard();
    } else if (nextView === "stockRadar") {
      setStockRadarActive(true);
      setRadarActive(false);
      setStockRadarFilter("all");
      setStockRadarRegion("全部");
      closeMarketCard();
    } else {
      switchView(nextView);
    }
  };
  const activeViewMeta = viewMeta[view];

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand"><img className="brand-mark" src={`${import.meta.env.BASE_URL}lz-logo-v2.png`} alt="LZ" width="38" height="38" /><div><strong>LZ-4Stage</strong><small>MARKET TOOLKIT</small></div></div>
          <div className="sidebar-navigation">
            <section className="side-nav-section" aria-labelledby="market-map-navigation-title">
              <h2 id="market-map-navigation-title">市场地图</h2>
              <nav className="side-nav" aria-label="市场地图">
                <button className={`nav-item ${!radarActive && !stockRadarActive && view === "global" ? "active" : ""}`} onClick={() => requestView("global")} aria-pressed={!radarActive && !stockRadarActive && view === "global"}><Grid2X2 size={18} /><span>全球市场</span></button>
                <button className={`nav-item ${!radarActive && !stockRadarActive && view === "crypto7" ? "active" : ""}`} onClick={() => requestView("crypto7")} aria-pressed={!radarActive && !stockRadarActive && view === "crypto7"}><BarChart3 size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}加密市场</span></button>
                <button className={`nav-item ${!radarActive && !stockRadarActive && view === "usSelected" ? "active" : ""}`} onClick={() => requestView("usSelected")} aria-pressed={!radarActive && !stockRadarActive && view === "usSelected"}><TrendingUp size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}美股指数</span></button>
                <button className={`nav-item ${!radarActive && !stockRadarActive && view === "chinaIndices" ? "active" : ""}`} onClick={() => requestView("chinaIndices")} aria-pressed={!radarActive && !stockRadarActive && view === "chinaIndices"}><Landmark size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}A股指数</span></button>
                <button className={`nav-item ${!radarActive && !stockRadarActive && view === "hkSelected" ? "active" : ""}`} onClick={() => requestView("hkSelected")} aria-pressed={!radarActive && !stockRadarActive && view === "hkSelected"}><Building2 size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}港股指数</span></button>
              </nav>
            </section>
            <section className="side-nav-section" aria-labelledby="member-tools-navigation-title">
              <h2 id="member-tools-navigation-title">会员工具</h2>
              <nav className="side-tools" aria-label="会员工具">
                <button className={`nav-item ${radarActive ? "active" : ""}`} type="button" onClick={requestTrendRadar} aria-pressed={radarActive}><Radar size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}全球阶段扫描</span></button>
                <button className={`nav-item ${stockRadarActive ? "active" : ""}`} type="button" onClick={requestStockRadar} aria-pressed={stockRadarActive}><TrendingUp size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}个股阶段扫描</span></button>
              </nav>
            </section>
          </div>
          <nav className="mobile-view-nav" aria-label="手机端页面导航">
            <button type="button" className={!radarActive && !stockRadarActive && view === "global" ? "active" : ""} onClick={() => requestView("global")}>全球</button>
            <button type="button" className={!radarActive && !stockRadarActive && view === "crypto7" ? "active" : ""} onClick={() => requestView("crypto7")}>{!isMember && <LockKeyhole size={9} aria-hidden="true" />}<span>加密</span></button>
            <button type="button" className={!radarActive && !stockRadarActive && view === "usSelected" ? "active" : ""} onClick={() => requestView("usSelected")}>{!isMember && <LockKeyhole size={9} aria-hidden="true" />}<span>美股</span></button>
            <button type="button" className={!radarActive && !stockRadarActive && view === "chinaIndices" ? "active" : ""} onClick={() => requestView("chinaIndices")}>{!isMember && <LockKeyhole size={9} aria-hidden="true" />}<span>A股</span></button>
            <button type="button" className={!radarActive && !stockRadarActive && view === "hkSelected" ? "active" : ""} onClick={() => requestView("hkSelected")}>{!isMember && <LockKeyhole size={9} aria-hidden="true" />}<span>港股</span></button>
          </nav>
          <div className="sidebar-bottom"><span>数据周期</span><strong>{week.year} · W{String(week.week).padStart(2, "0")}</strong><small>仅作为市场观察工具</small></div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div><div className="eyebrow"><Globe2 size={14} /> GLOBAL STAGE MAP｜Power by LZ-4Stage</div><h1>全球市场阶段地图</h1><p className="site-subtitle">LZ-4Stage · 全球资产四阶段观察</p></div>
            <div className="top-actions">
              <button className="full-version-link" type="button" onClick={() => { setHoveredMarket(null); setShowFullVersion(true); }}><MousePointerClick size={16} />点击获取完整LZ-4Stage</button>
              <span className="period-badge">完整周线</span>
              <span className="confirmation-date"><CalendarDays size={16} />共同确认至 {commonConfirmationDate}</span>
              <div className="update-time"><Clock3 size={15} /><span>生成于 <strong>{formatDateTime(activeGeneratedAt)}</strong></span></div>
              <button className="icon-button" aria-label="刷新页面" onClick={() => window.location.reload()}><RefreshCw size={18} /></button>
              {isMember ? (
                <div className="member-account-menu" ref={accountMenuRef}>
                  <div className="member-account" aria-label="当前会员账号">
                    <button className="member-username" type="button" onClick={() => setAccountMenuOpen((current) => !current)} aria-haspopup="menu" aria-expanded={accountMenuOpen}>
                      <UserRound size={14} />{memberDisplayName}<ChevronDown className={accountMenuOpen ? "open" : ""} size={13} aria-hidden="true" />
                    </button>
                    <button className="member-auth-button logout" type="button" onClick={handleMemberLogout}><LogOut size={14} />退出</button>
                  </div>
                  {accountMenuOpen && (
                    <div className="member-submenu" role="menu" aria-label="会员账号菜单">
                      <button type="button" role="menuitem" onClick={openPasswordChange}><KeyRound size={14} />修改密码</button>
                    </div>
                  )}
                </div>
              ) : (
                <button className="member-auth-button" type="button" onClick={openMemberLogin} disabled={!authReady}><UserRound size={14} />{authReady ? "登录" : "检查登录…"}</button>
              )}
            </div>
          </header>

          <nav className="mobile-tool-nav" aria-label="手机端会员工具">
            <button type="button" className={radarActive ? "active" : ""} onClick={requestTrendRadar}><Radar size={15} />{!isMember && <LockKeyhole size={10} aria-hidden="true" />}<span>全球阶段扫描</span></button>
            <button type="button" className={stockRadarActive ? "active" : ""} onClick={requestStockRadar}><TrendingUp size={15} />{!isMember && <LockKeyhole size={10} aria-hidden="true" />}<span>个股阶段扫描</span></button>
          </nav>

          {stockRadarActive && stockRadarSnapshot ? (
            <StockRadarPage snapshot={stockRadarSnapshot} markets={stockRadarSnapshot.matches} filter={stockRadarFilter} region={stockRadarRegion} onFilterChange={setStockRadarFilter} onRegionChange={setStockRadarRegion} />
          ) : radarActive && radarSnapshot ? (
            <TrendRadarPage snapshot={radarSnapshot} markets={radarMarkets} filter={radarFilter} region={radarRegion} scanMode={radarScanMode} onFilterChange={setRadarFilter} onRegionChange={setRadarRegion} onScanModeChange={(mode) => { setRadarScanMode(mode); setRadarFilter("all"); setRadarRegion("全部"); }} />
          ) : <>
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
              <div><span className="section-kicker">{activeViewMeta.mapKicker}</span><h2>{activeViewMeta.mapTitle}</h2><p>颜色代表当前所处阶段，外框代表本周观察变化</p></div>
            </div>
            <GlobalStageMap source={regionData} region={region} stageFilter={stageFilter} view={view} onMarketMove={handleMarketMove} onMarketLeave={() => { if (!touchCardOpen) setHoveredMarket(null); }} onMarketFocus={handleMarketFocus} onMarketTap={handleMarketTap} />
            <div className="map-foot" id="personal-watch">{watches.length ? watches.map((item) => <span key={item.code}>{item.shortCode}：{item.observation}</span>) : <span>本周暂无新的观察变化</span>}</div>
          </section>
          </>}

          <footer><span>{stockRadarActive && stockRadarSnapshot ? `LZ-4Stage 个股阶段扫描 · ${stockRadarSnapshot.universeSize} 只高流动性股票` : radarActive && radarSnapshot ? `LZ-4Stage 全球阶段扫描 · ${radarSnapshot.universeSize} 个资产` : `LZ-4stage 真实完整周线分析 · ${activeUniverse.length} 个资产`}</span><span>阶段分析仅供市场观察，不构成任何投资建议</span></footer>
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
                <p>{pendingView === "stockRadar" ? "登录会员账号后查看300只高流动性股票扫描结果" : pendingView === "trendRadar" ? "登录会员账号后查看全球阶段扫描结果" : "登录会员账号后查看完整市场趋势地图"}</p>
                <button className="member-login-cta" type="button" onClick={() => setMemberDialog("login")}>会员登录</button>
              </>
            ) : memberDialog === "dataError" ? (
              <>
                <h2 id="access-gate-title">会员数据暂时不可用</h2>
                <p>登录状态有效，但{pendingView === "stockRadar" ? "个股阶段扫描结果" : pendingView === "trendRadar" ? "全球阶段扫描结果" : "市场快照"}未能加载，请稍后重试。</p>
                <button className="member-login-cta" type="button" onClick={retryMemberData} disabled={Boolean(loadingMemberView)}>{loadingMemberView ? "正在重试…" : "重新加载"}</button>
              </>
            ) : memberDialog === "passwordChanged" ? (
              <>
                <h2 id="access-gate-title">密码修改成功</h2>
                <p>当前账号已安全退出，请使用新密码重新登录。</p>
                <button className="member-login-cta" type="button" onClick={openMemberLogin}>重新登录</button>
              </>
            ) : memberDialog === "password" ? (
              <>
                <h2 id="access-gate-title">修改登录密码</h2>
                <p>请输入当前密码，并设置新的会员登录密码。</p>
                <form onSubmit={handlePasswordChange}>
                  <label htmlFor="current-member-password">当前密码</label>
                  <input
                    id="current-member-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => { setCurrentPassword(event.target.value); setPasswordError(null); }}
                    placeholder="请输入当前密码"
                    autoComplete="current-password"
                    autoFocus
                    aria-invalid={Boolean(passwordError)}
                  />
                  <label htmlFor="new-member-password">新密码</label>
                  <input
                    id="new-member-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => { setNewPassword(event.target.value); setPasswordError(null); }}
                    placeholder="至少8位，包含字母和数字"
                    autoComplete="new-password"
                    aria-invalid={Boolean(passwordError)}
                  />
                  <label htmlFor="confirm-member-password">确认新密码</label>
                  <input
                    id="confirm-member-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => { setConfirmPassword(event.target.value); setPasswordError(null); }}
                    placeholder="请再次输入新密码"
                    autoComplete="new-password"
                    aria-invalid={Boolean(passwordError)}
                    aria-describedby={passwordError ? "password-change-error" : "password-change-note"}
                  />
                  {passwordError && <span className="access-error" id="password-change-error" role="alert">{passwordError}</span>}
                  <button type="submit" disabled={!currentPassword || !newPassword || !confirmPassword || changingPassword}>{changingPassword ? "正在修改…" : "确认修改密码"}</button>
                </form>
                <small id="password-change-note">修改成功后将退出当前账号，请使用新密码重新登录。</small>
              </>
            ) : (
              <>
                <h2 id="access-gate-title">会员登录</h2>
                <p>请输入LZ会员邮箱和密码</p>
                <form onSubmit={handleMemberLogin}>
                  <label htmlFor="member-email">会员邮箱</label>
                  <input
                    id="member-email"
                    type="email"
                    value={memberEmail}
                    onChange={(event) => { setMemberEmail(event.target.value); setLoginError(null); }}
                    placeholder="请输入会员邮箱"
                    autoComplete="username"
                    autoFocus
                    aria-invalid={Boolean(loginError)}
                  />
                  <label htmlFor="member-password">密码</label>
                  <input
                    id="member-password"
                    type="password"
                    value={memberPassword}
                    onChange={(event) => { setMemberPassword(event.target.value); setLoginError(null); }}
                    placeholder="请输入密码"
                    autoComplete="current-password"
                    aria-invalid={Boolean(loginError)}
                    aria-describedby={loginError ? "access-error" : "access-note"}
                  />
                  {loginError && <span className="access-error" id="access-error" role="alert">{loginError}</span>}
                  {turnstileSiteKey && <TurnstileWidget siteKey={turnstileSiteKey} resetKey={captchaResetKey} onToken={handleCaptchaToken} />}
                  <button type="submit" disabled={!memberEmail.trim() || !memberPassword || (Boolean(turnstileSiteKey) && !captchaToken) || checkingCredentials}>{checkingCredentials ? (loadingMemberView ? "正在加载会员数据…" : "正在登录…") : "登录并查看"}</button>
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
