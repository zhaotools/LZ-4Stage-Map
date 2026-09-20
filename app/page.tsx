"use client";

import { type CSSProperties, type FormEvent, type MouseEvent as ReactMouseEvent, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createHoverResumeGuard } from "@/app/lib/hover-resume.mjs";
import {
  BarChart3,
  BookOpenText,
  Building2,
  ChevronDown,
  Globe2,
  Grid2X2,
  Gem,
  ImageDown,
  KeyRound,
  Landmark,
  LockKeyhole,
  LogOut,
  MousePointerClick,
  Radar,
  TrendingUp,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";

import dashboardData from "@/data/dashboard.json";
import { newerSnapshot, startWeeklyRefresh, validateSnapshot } from "@/app/lib/weekly-refresh.mjs";
import { TurnstileWidget } from "@/app/components/turnstile-widget";
import { MyScanPage } from "@/app/components/my-scan-page";
import { globalConfirmationDates, latestConfirmationDate, stageConfirmationTimeFor, confirmationTimeForTradingDate } from "@/app/lib/confirmation-time.mjs";
import { tradingViewChartUrlFor, chartLinkTitleFor } from "@/app/lib/tradingview-link.mjs";
import { buildInterpretationImageModel, downloadMarketInterpretationImage } from "@/app/lib/market-interpretation-image.mjs";
import { scrollPageToTop } from "@/app/lib/page-scroll.mjs";
import { STAGE_PRESENTATION } from "@/app/lib/stage-presentation.mjs";
import {
  getMemberProfile,
  getMemberSession,
  getMemberSnapshot,
  getMyScanAssets,
  getStockRadarSnapshot,
  getTrendRadarSnapshot,
  addMyScanAsset,
  isProfileActive,
  lookupMyScanAsset,
  removeMyScanAsset,
  reorderMyScanAssets,
  signInMember,
  signOutMember,
  updateMemberPassword,
  type MarketInterpretation,
  type MemberProfile,
  type MemberSnapshot,
  type MemberView,
  type MyScanAsset,
  type MyScanLookupAsset,
  type MyScanRegion,
  type StockRadarRuleId,
  type StockRadarSnapshot,
  type TrendRadarRuleId,
  type TrendRadarSnapshot,
} from "@/app/lib/member-api";
import { isSupabaseConfigured } from "@/app/lib/supabase";
type Stage = "S1" | "S2" | "S3" | "S4";
type View = "global" | MemberView;
type ProtectedPage = MemberView | "trendRadar" | "stockRadar" | "myScan";
type RadarFilter = "all" | TrendRadarRuleId;
type StockRadarFilter = "all" | StockRadarRuleId;

const myScanOrderStorageKey = (userId: string) => `lz4stage-my-scan-order:${userId}`;

function applyLocalMyScanOrder(assets: MyScanAsset[], userId?: string) {
  if (!userId || typeof window === "undefined") return assets;
  try {
    const saved = JSON.parse(window.localStorage.getItem(myScanOrderStorageKey(userId)) ?? "[]") as string[];
    if (!Array.isArray(saved) || !saved.length) return assets;
    const rank = new Map(saved.map((key, index) => [key, index]));
    return [...assets].sort((left, right) => (rank.get(left.assetKey) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right.assetKey) ?? Number.MAX_SAFE_INTEGER));
  } catch {
    return assets;
  }
}
type RadarScanMode = "s2" | "s4";
type Region = "全球" | "美股" | "A股" | "港股" | "日股" | "欧股" | "大宗·宏观" | "加密";
type MarketRegion = Exclude<Region, "全球">;

type Market = {
  code: string;
  providerSymbol: string;
  shortCode: string;
  name: string;
  region: MarketRegion;
  exchange: string;
  category?: string | null;
  stage: Stage;
  subStage: string;
  previousStage?: Stage;
  previousSubStage?: string;
  stageDetail: string;
  weeks: number;
  observationStage: string;
  previousObservationStage?: string;
  observation: string;
  momentum: number;
  signal: "增强" | "稳定" | "减速" | "转弱" | "观察";
  collections: View[];
  radarEligible?: boolean;
  source: string;
  dataStatus: "live" | "cache";
  cryptoFreshness?: "fresh" | "pending" | "unavailable";
  cryptoQuality?: { verified: boolean; completedThrough: string; historyStart: string; quoteCurrency: string };
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

const memberOnlyViews = new Set<MemberView>(["crypto7", "commodity", "usSelected", "chinaIndices", "hkSelected"]);
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
  DJP: { shortCode: "BCOM", cols: 2, rows: 1 },
  XAG: { shortCode: "SILVER", cols: 2, rows: 1 },
  HG: { shortCode: "COPPER", cols: 2, rows: 1 },
  ALI: { shortCode: "ALUMINUM", cols: 2, rows: 1 },
  NG: { shortCode: "NATGAS", cols: 2, rows: 1 },
  ZC: { shortCode: "CORN", cols: 2, rows: 1 },
  ZW: { shortCode: "WHEAT", cols: 2, rows: 1 },
  ZS: { shortCode: "SOYBEAN", cols: 2, rows: 1 },
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
      previousStage: item.previousStage as Stage | undefined,
      region: item.region as MarketRegion,
      signal: item.signal as Market["signal"],
      dataStatus: item.dataStatus as Market["dataStatus"],
      cryptoFreshness: item.cryptoFreshness as Market["cryptoFreshness"],
      collections: item.collections as View[],
      ...meta,
    };
  });
}


const stageMeta: Record<Stage, { title: string; season: string; color: string; dark: string }> = STAGE_PRESENTATION;
const radarRuleMeta: Record<TrendRadarRuleId, { label: string; description: string; color: string }> = {
  s4Recovery: { label: "转向S2观察", description: "当前主阶段 S1 / S3 / S4 · 本周观察转向 S2", color: "#18a567" },
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
  commodity: { mapKicker: "COMMODITY MARKET", mapTitle: "商品市场", regions: ["全球"], groups: ["大宗·宏观"] },
  usSelected: { mapKicker: "US MARKET", mapTitle: "美股市场", regions: ["全球", "美股", "大宗·宏观"], groups: ["美股", "大宗·宏观"] },
  chinaIndices: { mapKicker: "CHINA MARKET", mapTitle: "A股市场", regions: ["全球", "A股"], groups: ["A股"] },
  hkSelected: { mapKicker: "HONG KONG MARKET", mapTitle: "港股市场", regions: ["全球", "港股"], groups: ["港股"] },
};
const mapPageTitles: Record<View, string> = {
  global: "全球市场趋势地图",
  usSelected: "美股市场趋势地图",
  chinaIndices: "A股市场趋势地图",
  hkSelected: "港股市场趋势地图",
  commodity: "商品市场趋势地图",
  crypto7: "加密市场趋势地图",
};
const collectionOrder: Partial<Record<View, string[]>> = {
  global: ["GSPC.INDEX", "NDQ", "SOXX", "VIX", "000300.SH", "SZ399006", "HSI", "HSTECH", "N225", "STOXX50E", "DXY", "US10Y", "XAU", "CL", "BTC-USD", "ETH-USD"],
  crypto7: ["HOOD", "CRCL", "COIN", "MSTR", "BTC-USD", "ETH-USD", "SOL-USD", "HYPE-USD"],
  commodity: ["DJP", "XAU", "XAG", "HG", "ALI", "CL", "NG", "ZC", "ZW", "ZS"],
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
const commodityMapGroups = [
  { label: "商品综合", className: "map-commodity-overall", codes: ["DJP"] },
  { label: "贵金属", className: "map-commodity-precious", codes: ["XAU", "XAG"] },
  { label: "工业金属", className: "map-commodity-industrial", codes: ["HG", "ALI"] },
  { label: "能源", className: "map-commodity-energy", codes: ["CL", "NG"] },
  { label: "农产品", className: "map-commodity-agriculture", codes: ["ZC", "ZW", "ZS"] },
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

function HoverMarketCard({ market, point, touchMode, onClose }: { market: Market | null; point: { x: number; y: number }; touchMode: boolean; onClose: () => void }) {
  if (!market) return null;
  if (market.cryptoFreshness === "unavailable") return <div className={`market-hover-card ${touchMode ? "touch-card" : ""}`} role={touchMode ? "dialog" : "tooltip"} aria-label={touchMode ? `${market.shortCode} 资产信息` : undefined} style={{ left: point.x, top: point.y }}><div className="hover-card-title">{market.shortCode} · {market.name}{touchMode && <button className="hover-close" type="button" aria-label="关闭资产阶段信息" onClick={onClose}><X size={17} /></button>}</div><p className="crypto-data-note">数据暂不可用，等待完整周线。未使用未验证行情生成阶段判断。</p></div>;
  const maDirection = momentumDirection(market.momentum);
  const maColor = maDirection === "上升" ? stageMeta.S2.color : maDirection === "下降" ? stageMeta.S4.color : undefined;
  const observationLabel = market.observationStage === "UNCONFIRMED" ? market.observation : market.observationStage;
  const observationStage = observationStageFor(market);
  const observationConfirmation = observationConfirmationFor(market);
  const observationColor = observationStage ? stageMeta[observationStage].color : undefined;
  const confirmationTime = stageConfirmationTimeFor(market);
  return (
    <div className={`market-hover-card ${touchMode ? "touch-card" : ""}`} role={touchMode ? "dialog" : "tooltip"} aria-label={touchMode ? `${market.shortCode} 资产信息` : undefined} style={{ left: point.x, top: point.y }}>
      <div className="hover-card-title"><span style={{ background: stageMeta[market.stage].color }} />{market.shortCode} · {market.name}{touchMode && <button className="hover-close" type="button" aria-label="关闭资产阶段信息" onClick={onClose}><X size={17} /></button>}</div>
      <dl>
        <div><dt>当前阶段</dt><dd><b style={{ color: stageMeta[market.stage].color }}>{market.subStage}</b> · {market.stageDetail}</dd></div>
        <div><dt>主阶段持续</dt><dd>{market.weeks}周</dd></div>
        <div><dt>本阶段起始时间</dt><dd>{confirmationTime}</dd></div>
        <div><dt>{market.cryptoFreshness === "pending" ? "历史观察" : "本周观察"}</dt><dd style={{ color: observationColor }}>{observationLabel}{observationConfirmation && <> · {observationConfirmation}</>}</dd></div>
        <div><dt>30周均线：</dt><dd style={{ color: maColor }}>{maDirection} · 近5周 {market.momentum.toFixed(2)}%</dd></div>
        {market.cryptoFreshness === "pending" && <div><dt>数据待更新</dt><dd>保留上次完整结果；阶段数据截至：{confirmationTimeForTradingDate(market)}</dd></div>}
      </dl>
    </div>
  );
}

function MarketMapGroup({ group, className, items, stageFilter, compact, dense, onMarketMove, onMarketLeave, onMarketFocus, onMarketPointerDown, onMarketTap }: { group: string; className?: string; items: Market[]; stageFilter: Stage | "全部"; compact: boolean; dense: boolean; onMarketMove: (item: Market, event: PointerEvent<HTMLButtonElement>) => void; onMarketLeave: () => void; onMarketFocus: (item: Market, element: HTMLButtonElement) => void; onMarketPointerDown: (pointerType: string) => void; onMarketTap: (item: Market, event: ReactMouseEvent<HTMLButtonElement>) => void }) {
  if (!items.length) return null;
  return (
    <section className={`map-group ${className ?? `map-${group.replace("·", "-")}`} ${compact ? "map-group-full" : ""}`}>
      <header><strong>{group}</strong><span>{items.length} 个资产</span></header>
      <div className="map-tiles">
        {items.map((item) => {
          const faded = stageFilter !== "全部" && item.stage !== stageFilter;
          const observationStage = observationStageFor(item);
          const observationChanged = Boolean(observationStage && observationStage !== item.stage && (!item.cryptoFreshness || item.cryptoFreshness === "fresh"));
          const multiCryptoLayout = group === "加密" && items.length > 1;
          const tileCols = dense ? 1 : multiCryptoLayout
            ? 3
            : compact ? Math.max(2, item.cols) : item.cols;
          const tileRows = dense ? 1 : multiCryptoLayout ? (items.length === 2 ? 4 : 2) : item.rows;
          return (
            <button
              key={item.code}
              className={`map-tile tile-${item.stage.toLowerCase()} ${item.cryptoFreshness === "unavailable" ? "tile-unavailable" : ""} ${observationChanged ? "tile-observation-change" : ""} ${faded ? "tile-faded" : ""}`}
              style={{
                gridColumn: `span ${tileCols}`,
                gridRow: `span ${tileRows}`,
                ...(observationChanged && observationStage ? { "--observation-border": stageMeta[observationStage].color } : {}),
              } as CSSProperties}
              aria-label={item.code === "HYPE-USD" ? `${chartLinkTitleFor(item)}，新标签页打开${item.cryptoFreshness === "unavailable" ? "，数据暂不可用" : item.cryptoFreshness === "pending" ? "，数据待更新" : ""}` : item.cryptoFreshness === "unavailable" ? `${item.shortCode}，数据暂不可用，点击在TradingView新标签页打开K线` : `${item.shortCode}，${item.name}，${item.cryptoFreshness === "pending" ? "数据待更新，以下为历史结果，" : ""}${item.subStage}，${item.stageDetail}，已持续${item.weeks}周，30周均线：${momentumDirection(item.momentum)} · 近5周 ${item.momentum.toFixed(2)}%，点击在TradingView新标签页打开K线`}
              onPointerMove={(event) => { if (event.pointerType !== "touch") onMarketMove(item, event); }}
              onPointerDown={(event) => { onMarketPointerDown(event.pointerType); onMarketLeave(); }}
              onPointerCancel={() => onMarketPointerDown("")}
              onClick={(event) => onMarketTap(item, event)}
              onPointerLeave={(event) => { if (event.pointerType !== "touch") onMarketLeave(); }}
              onFocus={(event) => onMarketFocus(item, event.currentTarget)}
              onBlur={onMarketLeave}
            >
              <strong>{item.shortCode}</strong>
              <span>{item.name}</span>
              {item.cryptoFreshness === "unavailable" ? <small className="crypto-status-badge">数据暂不可用</small> : <div><b>{item.subStage}</b><em>{item.weeks}周</em></div>}
              {item.cryptoFreshness === "pending" && <small className="crypto-status-badge">数据待更新 · 保留历史结果</small>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function GlobalStageMap({ source, region, stageFilter, view, onMarketMove, onMarketLeave, onMarketFocus, onMarketPointerDown, onMarketTap }: { source: Market[]; region: Region; stageFilter: Stage | "全部"; view: View; onMarketMove: (item: Market, event: PointerEvent<HTMLButtonElement>) => void; onMarketLeave: () => void; onMarketFocus: (item: Market, element: HTMLButtonElement) => void; onMarketPointerDown: (pointerType: string) => void; onMarketTap: (item: Market, event: ReactMouseEvent<HTMLButtonElement>) => void }) {
  const groups = region === "全球" ? viewMeta[view].groups : [region as MarketRegion];
  const dense = view === "commodity" || view === "usSelected" || view === "chinaIndices" || view === "hkSelected";
  if (view === "commodity") {
    return (
      <div className="market-map view-commodity">
        {commodityMapGroups.map((group) => <MarketMapGroup key={group.className} group={group.label} className={group.className} items={source.filter((item) => group.codes.some((code) => code === item.code))} stageFilter={stageFilter} compact={false} dense onMarketMove={onMarketMove} onMarketLeave={onMarketLeave} onMarketFocus={onMarketFocus} onMarketPointerDown={onMarketPointerDown} onMarketTap={onMarketTap} />)}
      </div>
    );
  }
  if (view === "usSelected" && region === "全球") {
    return (
      <div className="market-map view-usSelected">
        {usMapGroups.map((group) => <MarketMapGroup key={group.className} group={group.label} className={group.className} items={source.filter((item) => group.codes.some((code) => code === item.code))} stageFilter={stageFilter} compact={false} dense onMarketMove={onMarketMove} onMarketLeave={onMarketLeave} onMarketFocus={onMarketFocus} onMarketPointerDown={onMarketPointerDown} onMarketTap={onMarketTap} />)}
        <MarketMapGroup group="宏观" className="map-us-macro" items={source.filter((item) => usMacroCodes.includes(item.code))} stageFilter={stageFilter} compact={false} dense onMarketMove={onMarketMove} onMarketLeave={onMarketLeave} onMarketFocus={onMarketFocus} onMarketPointerDown={onMarketPointerDown} onMarketTap={onMarketTap} />
      </div>
    );
  }
  if (view === "chinaIndices") {
    return (
      <div className="market-map view-chinaIndices">
        {chinaMapGroups.map((group) => <MarketMapGroup key={group.className} group={group.label} className={group.className} items={source.filter((item) => group.codes.some((code) => code === item.code))} stageFilter={stageFilter} compact={false} dense onMarketMove={onMarketMove} onMarketLeave={onMarketLeave} onMarketFocus={onMarketFocus} onMarketPointerDown={onMarketPointerDown} onMarketTap={onMarketTap} />)}
      </div>
    );
  }
  if (view === "hkSelected") {
    return (
      <div className="market-map view-hkSelected">
        {hkMapGroups.map((group) => <MarketMapGroup key={group.className} group={group.label} className={group.className} items={source.filter((item) => group.codes.some((code) => code === item.code))} stageFilter={stageFilter} compact={false} dense onMarketMove={onMarketMove} onMarketLeave={onMarketLeave} onMarketFocus={onMarketFocus} onMarketPointerDown={onMarketPointerDown} onMarketTap={onMarketTap} />)}
      </div>
    );
  }
  return (
    <div className={`market-map view-${view} ${region !== "全球" ? "single-map" : ""}`}>
      {groups.map((group) => <MarketMapGroup key={group} group={displayRegionName(group)} className={`map-${group.replace("·", "-")}`} items={source.filter((item) => item.region === group)} stageFilter={stageFilter} compact={region !== "全球"} dense={dense} onMarketMove={onMarketMove} onMarketLeave={onMarketLeave} onMarketFocus={onMarketFocus} onMarketPointerDown={onMarketPointerDown} onMarketTap={onMarketTap} />)}
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
          <span>本周匹配</span><strong>{familyMarkets.length}</strong><small>个不重复资产</small>
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
              <a
                key={market.code}
                className="radar-result-card"
                href={tradingViewChartUrlFor(market)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${market.shortCode} ${market.name}，${chartLinkTitleFor(market)}，新标签页打开`}
                style={{ "--radar-stage-color": stageMeta[market.stage].color } as CSSProperties}
              >
                <div className="radar-result-title"><div><strong>{market.shortCode}</strong><span>{market.name}</span></div><em>{displayRegionName(market.region)}</em></div>
                <div className="radar-match-tags">{market.matchRules.filter((ruleId) => ruleIds.includes(ruleId)).map((ruleId) => <span key={ruleId} style={{ "--radar-tag-color": radarRuleMeta[ruleId].color } as CSSProperties}>{radarRuleMeta[ruleId].label}</span>)}</div>
                <dl>
                  <div><dt>当前阶段</dt><dd><b style={{ color: stageMeta[market.stage].color }}>{market.subStage}</b> · {market.stageDetail}</dd></div>
                  <div><dt>主阶段持续</dt><dd>{market.weeks}周</dd></div>
                  <div><dt>本阶段起始时间</dt><dd>{stageConfirmationTimeFor(market)}</dd></div>
                  <div><dt>本周观察</dt><dd style={{ color: observationStage ? stageMeta[observationStage].color : undefined }}>{observationLabel}{observationConfirmation && <> · {observationConfirmation}</>}</dd></div>
                  <div><dt>30周均线：</dt><dd style={{ color: maColor }}>{maDirection} · 近5周 {market.momentum.toFixed(2)}%</dd></div>
                </dl>
              </a>
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
          <strong>扫描完成率 {snapshot.quality.completionRate}%</strong>
          <span>本次获取 {snapshot.quality.live} 只 · 使用缓存 {snapshot.quality.cache} 只</span>
        </div>
      </div>

      <div className="radar-summary" role="group" aria-label="个股阶段扫描条件筛选">
        <button type="button" className={`radar-rule-card radar-rule-all ${filter === "all" ? "selected" : ""}`} onClick={() => onFilterChange("all")} aria-pressed={filter === "all"}>
          <span>本周匹配</span><strong>{markets.length}</strong><small>只不重复股票</small>
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
        {snapshot.marketStats.map((stat) => <div key={stat.region}><strong>{stat.region}</strong><span>{stat.analyzed}/{stat.universe} 只</span><em>{stat.matches} 只匹配股票</em></div>)}
      </div>

      <div className="radar-toolbar">
        <div className="radar-region-tabs" role="group" aria-label="个股阶段扫描市场筛选">
          {(["全部", "美股", "A股", "港股"] as const).map((item) => <button key={item} type="button" className={region === item ? "active" : ""} onClick={() => onRegionChange(item)}>{item}</button>)}
        </div>
        <span>显示 {filtered.length} / {markets.length} 只匹配股票</span>
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
              <a
                key={market.code}
                className="radar-result-card stock-radar-result"
                href={tradingViewChartUrlFor(market)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${market.shortCode} ${market.name}，${chartLinkTitleFor(market)}，新标签页打开`}
                style={{ "--radar-stage-color": stageMeta[market.stage].color } as CSSProperties}
              >
                <div className="radar-result-title"><div><strong>{market.shortCode}</strong><span>{market.name}</span></div><em>{market.region} · #{market.liquidityRank}</em></div>
                <div className="stock-result-meta"><span>{market.industry || "其他"}</span><span>20日均额 {formatTurnover(market.averageTurnover20d, market.region)}</span></div>
                <div className="radar-match-tags">{market.matchRules.map((ruleId) => <span key={ruleId} style={{ "--radar-tag-color": radarRuleMeta[ruleId].color } as CSSProperties}>{radarRuleMeta[ruleId].label}</span>)}</div>
                <dl>
                  <div><dt>当前阶段</dt><dd><b style={{ color: stageMeta[market.stage].color }}>{market.subStage}</b> · {market.stageDetail}</dd></div>
                  <div><dt>主阶段持续</dt><dd>{market.weeks}周</dd></div>
                  <div><dt>本阶段起始时间</dt><dd>{stageConfirmationTimeFor(market)}</dd></div>
                  <div><dt>本周观察</dt><dd style={{ color: observationStage ? stageMeta[observationStage].color : undefined }}>{observationLabel}{observationConfirmation && <> · {observationConfirmation}</>}</dd></div>
                  <div><dt>30周均线：</dt><dd style={{ color: maColor }}>{maDirection} · 近5周 {market.momentum.toFixed(2)}%</dd></div>
                </dl>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="radar-empty"><Radar size={30} /><strong>当前筛选下暂无符合条件的股票</strong><span>可切换扫描条件或市场范围查看</span></div>
      )}
    </section>
  );
}

function MarketInterpretationPanel({ interpretation, marketTitle, confirmationLabel }: { interpretation: MarketInterpretation; marketTitle: string; confirmationLabel: string }) {
  const [imageStatus, setImageStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const presentation = buildInterpretationImageModel(interpretation, marketTitle, confirmationLabel);
  const handleGenerateImage = async () => {
    setImageStatus("generating");
    try {
      await downloadMarketInterpretationImage(interpretation, marketTitle, confirmationLabel);
      setImageStatus("done");
      window.setTimeout(() => setImageStatus("idle"), 1800);
    } catch {
      setImageStatus("error");
    }
  };
  return (
    <section className="market-interpretation" aria-labelledby="market-interpretation-title">
      <div className="market-interpretation-head">
        <div>
          <span className="section-kicker">MARKET INTERPRETATION</span>
          <h2 id="market-interpretation-title">{marketTitle}阶段解读</h2>
        </div>
        <div className="market-interpretation-actions">
          <span className="market-interpretation-date">{presentation.confirmationLabel}</span>
          <button className="market-interpretation-image-button" type="button" onClick={handleGenerateImage} disabled={imageStatus === "generating"}>
            <ImageDown size={15} />{imageStatus === "generating" ? "生成中" : imageStatus === "done" ? "已生成" : imageStatus === "error" ? "重试生成" : "生成图片"}
          </button>
        </div>
      </div>
      <div className="market-interpretation-stages">
        {presentation.stageCounts.map((item) => (
          <div key={item.stage} style={{ "--interpretation-stage-color": item.color, "--interpretation-stage-bg": item.background } as CSSProperties}>
            <strong>{item.label}</strong><span>{item.percent}%</span>
          </div>
        ))}
      </div>
      <div className="market-interpretation-distribution" aria-label="四阶段资产占比分布">
        {presentation.stageCounts.map((item) => <span key={item.stage} style={{ width: `${item.count / Math.max(1, interpretation.analyzedSize) * 100}%`, background: item.color }} />)}
      </div>
      <div className="market-interpretation-overview">
        <strong>{presentation.headline}</strong>
        <p>{presentation.summary}</p>
      </div>
      <div className="market-interpretation-grid market-interpretation-v2">
        <article className="market-interpretation-item">
          <h3>市场结构</h3>
          {presentation.marketStructure.length ? (
            <dl className="market-structure-list">{presentation.marketStructure.map((row: { label: string; summary: string }) => <div key={row.label}><dt>{row.label}</dt><dd>{row.summary}</dd></div>)}</dl>
          ) : <p>{presentation.marketStructureFallback}</p>}
        </article>
        <article className="market-interpretation-item">
          <h3>关键位置</h3>
          {presentation.keyPositions.length ? (
            <div className="market-position-list">{presentation.keyPositions.map((group: { id: string; label: string; stage: Stage; assets: Array<{ code: string; name: string }> }) => <div key={group.id}><b style={{ "--position-stage-color": stageMeta[group.stage].color } as CSSProperties}>{group.label}</b><span>{group.assets.map((asset: { code: string; name: string }) => asset.name || asset.code).join("、")}</span></div>)}</div>
          ) : <p>{presentation.keyPositionsFallback}</p>}
        </article>
        <article className="market-interpretation-item interpretation-changes">
          <h3>本期变化</h3>
          <div className="market-change-list">{presentation.changeLines.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}</div>
        </article>
      </div>
      {interpretation.excludedSize > 0 && <p className="market-interpretation-quality">本期有{interpretation.excludedSize}个资产的数据尚未完成确认，未计入解读。</p>}
      <p className="market-interpretation-note">{interpretation.note}</p>
    </section>
  );
}

export default function Home() {
  const [authReady, setAuthReady] = useState(false);
  const [publicSnapshot, setPublicSnapshot] = useState(dashboardData);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [memberSnapshots, setMemberSnapshots] = useState<Partial<Record<MemberView, MemberSnapshot<DashboardMarket>>>>({});
  const [radarSnapshot, setRadarSnapshot] = useState<TrendRadarSnapshot<DashboardMarket> | null>(null);
  const [stockRadarSnapshot, setStockRadarSnapshot] = useState<StockRadarSnapshot<StockRadarMarket> | null>(null);
  const [myScanAssets, setMyScanAssets] = useState<MyScanAsset[]>([]);
  const [myScanLoaded, setMyScanLoaded] = useState(false);
  const [myScanLoadError, setMyScanLoadError] = useState<string | null>(null);
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState<"market" | "tools" | null>(null);
  const [loadingMemberView, setLoadingMemberView] = useState<ProtectedPage | null>(null);
  const [view, setView] = useState<View>("global");
  const [radarActive, setRadarActive] = useState(false);
  const [stockRadarActive, setStockRadarActive] = useState(false);
  const [myScanActive, setMyScanActive] = useState(false);
  const [introductionActive, setIntroductionActive] = useState(false);
  const [radarFilter, setRadarFilter] = useState<RadarFilter>("all");
  const [radarRegion, setRadarRegion] = useState<"全部" | MarketRegion>("全部");
  const [radarScanMode, setRadarScanMode] = useState<RadarScanMode>("s2");
  const [stockRadarFilter, setStockRadarFilter] = useState<StockRadarFilter>("all");
  const [stockRadarRegion, setStockRadarRegion] = useState<"全部" | "美股" | "A股" | "港股">("全部");
  const [region, setRegion] = useState<Region>("全球");
  const [stageFilter, setStageFilter] = useState<Stage | "全部">("全部");
  const [hoveredMarket, setHoveredMarket] = useState<Market | null>(null);
  const hoverResumeGuard = useRef(createHoverResumeGuard());
  const lastMarketPointerType = useRef("");
  const [hoverPoint, setHoverPoint] = useState({ x: 0, y: 0 });
  const [touchCardOpen, setTouchCardOpen] = useState(false);
  const [showFullVersion, setShowFullVersion] = useState(false);
  useEffect(() => {
    if (!touchCardOpen) return;
    const closeOnOutsidePointer = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest(".market-hover-card, .map-tile")) return;
      setHoveredMarket(null);
      setTouchCardOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [touchCardOpen]);
  useEffect(() => {
    const dismiss = () => {
      hoverResumeGuard.current.dismiss();
      setHoveredMarket(null);
      setTouchCardOpen(false);
    };
    const resumeKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Tab") hoverResumeGuard.current.keyboardNavigation();
    };
    window.addEventListener("blur", dismiss);
    window.addEventListener("focus", dismiss);
    window.addEventListener("pageshow", dismiss);
    document.addEventListener("visibilitychange", dismiss);
    document.addEventListener("keydown", resumeKeyboard, true);
    return () => {
      window.removeEventListener("blur", dismiss);
      window.removeEventListener("focus", dismiss);
      window.removeEventListener("pageshow", dismiss);
      document.removeEventListener("visibilitychange", dismiss);
      document.removeEventListener("keydown", resumeKeyboard, true);
    };
  }, []);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileNavigationRef = useRef<HTMLElement | null>(null);
  const isMember = Boolean(memberProfile && isProfileActive(memberProfile));
  const memberDisplayName = memberProfile?.display_name || "会员";
  const handleCaptchaToken = useCallback((token: string | null) => setCaptchaToken(token), []);
  const snapshotsRef = useRef({ memberSnapshots, radarSnapshot, stockRadarSnapshot, myScanLoaded });
  useEffect(() => {
    snapshotsRef.current = { memberSnapshots, radarSnapshot, stockRadarSnapshot, myScanLoaded };
  }, [memberSnapshots, radarSnapshot, stockRadarSnapshot, myScanLoaded]);

  useEffect(() => {
    let cancelled = false;
    let abort: AbortController | null = null;
    const refresh = async () => {
      const request = new AbortController();
      abort = request;
      const timeout = setTimeout(() => request.abort(), 30000);
      try {
        const jobs: Promise<unknown>[] = [(async () => {
          const response = await fetch(`${import.meta.env.BASE_URL}data/dashboard.json`, { cache: "no-store", signal: request.signal });
          if (!response.ok) throw new Error("Public data unavailable");
          const snapshot = validateSnapshot(await response.json(), "markets") as typeof dashboardData;
          if (!cancelled) setPublicSnapshot((current) => newerSnapshot(current, snapshot));
        })()];
        if (isMember) {
          // Refresh previously opened protected pages; unopened pages fetch normally on entry.
          for (const key of Object.keys(snapshotsRef.current.memberSnapshots) as MemberView[]) {
            jobs.push(getMemberSnapshot<DashboardMarket>(key, request.signal).then((snapshot) => {
              validateSnapshot(snapshot, "markets");
              if (!cancelled) setMemberSnapshots((current) => ({ ...current, [key]: newerSnapshot(current[key], snapshot) }));
            }));
          }
          if (snapshotsRef.current.radarSnapshot) jobs.push(getTrendRadarSnapshot<DashboardMarket>(request.signal).then((snapshot) => {
            validateSnapshot(snapshot, "matches");
            if (!cancelled) setRadarSnapshot((current) => newerSnapshot(current, snapshot));
          }));
          if (snapshotsRef.current.stockRadarSnapshot) jobs.push(getStockRadarSnapshot<StockRadarMarket>(request.signal).then((snapshot) => {
            validateSnapshot(snapshot, "matches");
            if (!cancelled) setStockRadarSnapshot((current) => newerSnapshot(current, snapshot));
          }));
          if (snapshotsRef.current.myScanLoaded) jobs.push(getMyScanAssets().then((assets) => {
            if (!cancelled) {
              setMyScanAssets(assets);
              setMyScanLoadError(null);
            }
          }));
        }
        const results = await Promise.allSettled(jobs);
        return results.every((result) => result.status === "fulfilled");
      } finally {
        clearTimeout(timeout);
      }
    };
    const controller = startWeeklyRefresh(refresh);
    const check = () => { void controller.check(); };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check);
    window.addEventListener("online", check);
    return () => {
      cancelled = true;
      abort?.abort();
      controller.stop();
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", check);
      window.removeEventListener("online", check);
    };
  }, [isMember, memberProfile?.user_id]);

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
    if (!mobileMenuOpen) return;
    const closeOnOutside = (event: globalThis.PointerEvent) => {
      if (!mobileNavigationRef.current?.contains(event.target as Node)) setMobileMenuOpen(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(null);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

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
      setMemberSnapshots((current) => ({ ...current, [nextView]: newerSnapshot(current[nextView], snapshot) }));
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
      setRadarSnapshot((current) => newerSnapshot(current, snapshot));
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
      setStockRadarSnapshot((current) => newerSnapshot(current, snapshot));
      return snapshot;
    } catch {
      return null;
    } finally {
      setLoadingMemberView(null);
    }
  };

  const loadMyScan = async (force = false) => {
    if (myScanLoaded && !force) return myScanAssets;
    setLoadingMemberView("myScan");
    setMyScanLoadError(null);
    try {
      const assets = applyLocalMyScanOrder(await getMyScanAssets(), memberProfile?.user_id);
      setMyScanAssets(assets);
      setMyScanLoaded(true);
      return assets;
    } catch {
      setMyScanLoadError("我的扫描暂时无法读取，请稍后重试。");
      return null;
    } finally {
      setLoadingMemberView(null);
    }
  };

  const handleMyScanLookup = (region: MyScanRegion, code: string): Promise<MyScanLookupAsset> => lookupMyScanAsset(region, code);
  const handleMyScanAdd = async (assetKey: string) => {
    await addMyScanAsset(assetKey);
    const refreshed = await loadMyScan(true);
    if (!refreshed) throw new Error("资产已加入，但列表刷新失败，请重新读取");
  };
  const handleMyScanRemove = async (assetKey: string) => {
    await removeMyScanAsset(assetKey);
    setMyScanAssets((current) => current.filter((asset) => asset.assetKey !== assetKey));
  };
  const handleMyScanReorder = async (assetKeys: string[]) => {
    const previous = myScanAssets;
    const byKey = new Map(previous.map((asset) => [asset.assetKey, asset]));
    setMyScanAssets(assetKeys.map((key) => byKey.get(key)).filter((asset): asset is MyScanAsset => Boolean(asset)));
    const storageKey = memberProfile?.user_id ? myScanOrderStorageKey(memberProfile.user_id) : null;
    if (storageKey) window.localStorage.setItem(storageKey, JSON.stringify(assetKeys));
    try {
      await reorderMyScanAssets(assetKeys);
      if (storageKey) window.localStorage.removeItem(storageKey);
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      const detail = typeof error === "object" && error && "message" in error ? String(error.message) : "";
      if (code === "PGRST202" || detail.includes("reorder_my_scan_assets")) return;
      setMyScanAssets(previous);
      if (storageKey) window.localStorage.setItem(storageKey, JSON.stringify(previous.map((asset) => asset.assetKey)));
      throw error;
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
          : pendingView === "myScan"
            ? await loadMyScan()
          : await loadMemberView(pendingView);
      if (!snapshot) {
        setMemberDialog("dataError");
        setCheckingCredentials(false);
        return;
      }
      if (pendingView === "trendRadar") {
        switchToTrendRadar();
      } else if (pendingView === "stockRadar") {
        switchToStockRadar();
      } else if (pendingView === "myScan") {
        switchToMyScan();
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
      ? hydrateMarkets(publicSnapshot.markets.filter((item) => item.collections.includes("global")))
      : hydrateMarkets(memberSnapshots[view]?.markets ?? []);
    const order = collectionOrder[view];
    if (!order) return selected;
    const positions = new Map(order.map((code, index) => [code, index]));
    return [...selected].sort((a, b) => (positions.get(a.code) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.code) ?? Number.MAX_SAFE_INTEGER));
  }, [memberSnapshots, publicSnapshot, view]);
  const radarMarkets = useMemo<RadarMarket[]>(() => (radarSnapshot?.matches ?? []).map((item) => ({
    ...hydrateMarkets([item as DashboardMarket])[0],
    matchRules: item.matchRules,
  })), [radarSnapshot]);
  const regionData = useMemo(() => activeUniverse.filter((item) => region === "全球" || item.region === region), [activeUniverse, region]);
  const counts = useMemo(() => {
    const result: Record<Stage, number> = { S1: 0, S2: 0, S3: 0, S4: 0 };
    regionData.filter(item => item.cryptoFreshness !== "unavailable").forEach((item) => result[item.stage]++);
    return result;
  }, [regionData]);
  const commonStageAsOf = [...activeUniverse].sort((a, b) => a.stageAsOf.localeCompare(b.stageAsOf))[0]?.stageAsOf ?? publicSnapshot.commonStageAsOf;
  const commonConfirmationDate = latestConfirmationDate(activeUniverse.filter(item => item.cryptoFreshness !== "unavailable"), { excludeCrypto: view === "global" }) ?? commonStageAsOf;
  const globalDates = globalConfirmationDates(activeUniverse);
  const traditionalInterpretationDate = latestConfirmationDate(activeUniverse.filter(item => item.cryptoFreshness !== "unavailable"), { excludeCrypto: true });
  const cryptoInterpretationDate = latestConfirmationDate(activeUniverse.filter(item => item.region === "加密" && item.cryptoFreshness !== "unavailable"));
  const interpretationConfirmationLabel = view === "global"
    ? `阶段数据截至：传统市场 ${traditionalInterpretationDate ?? "—"}｜加密市场 ${cryptoInterpretationDate ?? "—"}`
    : `阶段数据截至：${commonConfirmationDate}`;
  const myScanLatestGeneratedAt = [...myScanAssets]
    .map((asset) => asset.result?.generatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? publicSnapshot.generatedAt;
  const activeGeneratedAt = myScanActive
    ? myScanLatestGeneratedAt
    : stockRadarActive && stockRadarSnapshot
    ? stockRadarSnapshot.generatedAt
    : radarActive && radarSnapshot
      ? radarSnapshot.generatedAt
      : view === "global" ? publicSnapshot.generatedAt : memberSnapshots[view]?.generatedAt ?? publicSnapshot.generatedAt;
  const activeInterpretation = view === "global"
    ? (publicSnapshot as typeof dashboardData & { interpretation?: MarketInterpretation }).interpretation
    : memberSnapshots[view]?.interpretation;
  const week = isoWeek(traditionalInterpretationDate ?? commonStageAsOf);
  const watches = regionData.filter((item) => item.signal !== "稳定" && (!item.cryptoFreshness || item.cryptoFreshness === "fresh")).slice(0, 3);
  const placeHoverCard = (clientX: number, clientY: number) => {
    const cardWidth = 350;
    const cardHeight = 330;
    const gap = 16;
    setHoverPoint({
      x: clientX + gap + cardWidth > window.innerWidth ? Math.max(8, clientX - cardWidth - gap) : clientX + gap,
      y: clientY + gap + cardHeight > window.innerHeight ? Math.max(8, clientY - cardHeight - gap) : clientY + gap,
    });
  };
  const handleMarketMove = (item: Market, event: PointerEvent<HTMLButtonElement>) => {
    if (document.hidden || !document.hasFocus() || !hoverResumeGuard.current.allowPointer(event.clientX, event.clientY)) return;
    setTouchCardOpen(false);
    setHoveredMarket(item);
    placeHoverCard(event.clientX, event.clientY);
  };
  const handleMarketFocus = (item: Market, element: HTMLButtonElement) => {
    if (document.hidden || !document.hasFocus() || !hoverResumeGuard.current.allowFocus() || !element.matches(":focus-visible")) return;
    setTouchCardOpen(false);
    const rect = element.getBoundingClientRect();
    setHoveredMarket(item);
    placeHoverCard(rect.right, rect.top + rect.height / 2);
  };
  const handleMarketPointerDown = (pointerType: string) => {
    lastMarketPointerType.current = pointerType;
  };
  const handleMarketTap = (item: Market, event: ReactMouseEvent<HTMLButtonElement>) => {
    const clickPointerType = (event.nativeEvent as globalThis.PointerEvent).pointerType;
    const pointerType = lastMarketPointerType.current || clickPointerType;
    const touchInteraction = pointerType === "touch" || window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    lastMarketPointerType.current = "";
    hoverResumeGuard.current.dismiss();
    if (touchInteraction) {
      setHoveredMarket(item);
      setTouchCardOpen(true);
      return;
    }
    // Commit removal before opening the new tab can suspend the original page.
    flushSync(() => closeMarketCard());
    window.open(tradingViewChartUrlFor(item), "_blank", "noopener,noreferrer");
  };
  const closeMarketCard = () => {
    setHoveredMarket(null);
    setTouchCardOpen(false);
  };
  const switchView = (nextView: View) => {
    setRadarActive(false);
    setStockRadarActive(false);
    setMyScanActive(false);
    setIntroductionActive(false);
    setView(nextView);
    setRegion("全球");
    setStageFilter("全部");
    closeMarketCard();
    scrollPageToTop();
  };
  const switchToTrendRadar = () => {
    setRadarActive(true);
    setStockRadarActive(false);
    setMyScanActive(false);
    setIntroductionActive(false);
    setRadarFilter("all");
    setRadarRegion("全部");
    closeMarketCard();
    scrollPageToTop();
  };
  const switchToStockRadar = () => {
    setStockRadarActive(true);
    setRadarActive(false);
    setMyScanActive(false);
    setIntroductionActive(false);
    setStockRadarFilter("all");
    setStockRadarRegion("全部");
    closeMarketCard();
    scrollPageToTop();
  };
  const switchToMyScan = () => {
    setMyScanActive(true);
    setStockRadarActive(false);
    setRadarActive(false);
    setIntroductionActive(false);
    closeMarketCard();
    scrollPageToTop();
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
    switchToTrendRadar();
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
    switchToStockRadar();
  };
  const requestMyScan = async () => {
    if (!isMember) {
      setPendingView("myScan");
      setMemberDialog("locked");
      setLoginError(null);
      closeMarketCard();
      return;
    }
    // My Scan is a small deduplicated member list; always reread it on entry so
    // a completed weekly server update is visible without a browser reload.
    const assets = await loadMyScan(true);
    if (!assets) {
      setPendingView("myScan");
      setMemberDialog("dataError");
      closeMarketCard();
      return;
    }
    switchToMyScan();
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
  const openStageIntroduction = () => {
    setIntroductionActive(true);
    setRadarActive(false);
    setStockRadarActive(false);
    setMyScanActive(false);
    setMobileMenuOpen(null);
    closeMarketCard();
  };
  const handleMemberLogout = async () => {
    setAccountMenuOpen(false);
    await signOutMember().catch(() => undefined);
    setMemberProfile(null);
    setMemberSnapshots({});
    setRadarSnapshot(null);
    setStockRadarSnapshot(null);
    setMyScanAssets([]);
    setMyScanLoaded(false);
    setMyScanLoadError(null);
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
    setMyScanAssets([]);
    setMyScanLoaded(false);
    setMyScanLoadError(null);
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
        : pendingView === "myScan"
          ? await loadMyScan(true)
        : await loadMemberView(pendingView);
    if (!snapshot) return;
    const nextView = pendingView;
    closeMemberDialog();
    if (nextView === "trendRadar") {
      switchToTrendRadar();
    } else if (nextView === "stockRadar") {
      switchToStockRadar();
    } else if (nextView === "myScan") {
      switchToMyScan();
    } else {
      switchView(nextView);
    }
  };
  const activeViewMeta = viewMeta[view];
  const activePageTitle = introductionActive ? "四阶段说明"
    : myScanActive ? "自选阶段扫描"
      : stockRadarActive ? "个股阶段扫描"
        : radarActive ? "全球阶段扫描"
          : mapPageTitles[view];

  useEffect(() => {
    document.title = `${activePageTitle}｜LZ-4Stage Map`;
  }, [activePageTitle]);

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand"><img className="brand-mark" src={`${import.meta.env.BASE_URL}lz-logo-v2.png`} alt="LZ" width="38" height="38" /><div><strong>市场地图</strong><small>LZ-4Stage Map</small></div></div>
          <div className="sidebar-navigation">
            <section className="side-nav-section" aria-labelledby="market-map-navigation-title">
              <h2 id="market-map-navigation-title">市场地图</h2>
              <nav className="side-nav" aria-label="市场地图">
                <button className={`nav-item ${!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "global" ? "active" : ""}`} onClick={() => requestView("global")} aria-pressed={!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "global"}><Grid2X2 size={18} /><span>全球市场</span></button>
                <button className={`nav-item ${!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "usSelected" ? "active" : ""}`} onClick={() => requestView("usSelected")} aria-pressed={!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "usSelected"}><TrendingUp size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}美股市场</span></button>
                <button className={`nav-item ${!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "chinaIndices" ? "active" : ""}`} onClick={() => requestView("chinaIndices")} aria-pressed={!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "chinaIndices"}><Landmark size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}A股市场</span></button>
                <button className={`nav-item ${!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "hkSelected" ? "active" : ""}`} onClick={() => requestView("hkSelected")} aria-pressed={!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "hkSelected"}><Building2 size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}港股市场</span></button>
                <button className={`nav-item ${!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "commodity" ? "active" : ""}`} onClick={() => requestView("commodity")} aria-pressed={!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "commodity"}><Gem size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}商品市场</span></button>
                <button className={`nav-item ${!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "crypto7" ? "active" : ""}`} onClick={() => requestView("crypto7")} aria-pressed={!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "crypto7"}><BarChart3 size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}加密市场</span></button>
              </nav>
            </section>
            <section className="side-nav-section" aria-labelledby="member-tools-navigation-title">
              <h2 id="member-tools-navigation-title">阶段扫描</h2>
              <nav className="side-tools" aria-label="阶段扫描">
                <button className={`nav-item ${radarActive ? "active" : ""}`} type="button" onClick={requestTrendRadar} aria-pressed={radarActive}><Radar size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}全球扫描</span></button>
                <button className={`nav-item ${stockRadarActive ? "active" : ""}`} type="button" onClick={requestStockRadar} aria-pressed={stockRadarActive}><TrendingUp size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}个股扫描</span></button>
                <button className={`nav-item ${myScanActive ? "active" : ""}`} type="button" onClick={requestMyScan} aria-pressed={myScanActive}><MousePointerClick size={18} /><span className="nav-label">{!isMember && <LockKeyhole className="nav-lock" size={11} aria-hidden="true" />}自选扫描</span></button>
              </nav>
            </section>
          </div>
          <nav className="mobile-navigation-menus" aria-label="手机端导航" ref={mobileNavigationRef}>
            <div className="mobile-nav-menu">
              <button
                type="button"
                className={`mobile-menu-trigger ${!introductionActive && !radarActive && !stockRadarActive && !myScanActive ? "active" : ""} ${mobileMenuOpen === "market" ? "open" : ""}`}
                onClick={() => setMobileMenuOpen((current) => current === "market" ? null : "market")}
                aria-label="手机端市场地图"
                aria-haspopup="menu"
                aria-expanded={mobileMenuOpen === "market"}
                aria-controls="mobile-market-menu"
              >
                <Grid2X2 size={15} /><span>市场地图</span><ChevronDown size={13} aria-hidden="true" />
              </button>
              {mobileMenuOpen === "market" && (
                <div className="mobile-dropdown-panel" id="mobile-market-menu" role="menu" aria-label="市场地图">
                  <button type="button" role="menuitem" className={!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "global" ? "active" : ""} onClick={() => { setMobileMenuOpen(null); void requestView("global"); }}><Grid2X2 size={15} /><span>全球</span></button>
                  <button type="button" role="menuitem" className={!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "usSelected" ? "active" : ""} onClick={() => { setMobileMenuOpen(null); void requestView("usSelected"); }}><TrendingUp size={15} /><span>美股</span>{!isMember && <LockKeyhole className="mobile-menu-lock" size={11} aria-hidden="true" />}</button>
                  <button type="button" role="menuitem" className={!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "chinaIndices" ? "active" : ""} onClick={() => { setMobileMenuOpen(null); void requestView("chinaIndices"); }}><Landmark size={15} /><span>A股</span>{!isMember && <LockKeyhole className="mobile-menu-lock" size={11} aria-hidden="true" />}</button>
                  <button type="button" role="menuitem" className={!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "hkSelected" ? "active" : ""} onClick={() => { setMobileMenuOpen(null); void requestView("hkSelected"); }}><Building2 size={15} /><span>港股</span>{!isMember && <LockKeyhole className="mobile-menu-lock" size={11} aria-hidden="true" />}</button>
                  <button type="button" role="menuitem" className={!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "commodity" ? "active" : ""} onClick={() => { setMobileMenuOpen(null); void requestView("commodity"); }}><Gem size={15} /><span>商品</span>{!isMember && <LockKeyhole className="mobile-menu-lock" size={11} aria-hidden="true" />}</button>
                  <button type="button" role="menuitem" className={!introductionActive && !radarActive && !stockRadarActive && !myScanActive && view === "crypto7" ? "active" : ""} onClick={() => { setMobileMenuOpen(null); void requestView("crypto7"); }}><BarChart3 size={15} /><span>加密</span>{!isMember && <LockKeyhole className="mobile-menu-lock" size={11} aria-hidden="true" />}</button>
                </div>
              )}
            </div>
            <div className="mobile-nav-menu mobile-tools-menu">
              <button
                type="button"
                className={`mobile-menu-trigger ${radarActive || stockRadarActive || myScanActive ? "active" : ""} ${mobileMenuOpen === "tools" ? "open" : ""}`}
                onClick={() => setMobileMenuOpen((current) => current === "tools" ? null : "tools")}
                aria-label="手机端阶段扫描"
                aria-haspopup="menu"
                aria-expanded={mobileMenuOpen === "tools"}
                aria-controls="mobile-tools-menu"
              >
                <Radar size={15} /><span>阶段扫描</span><ChevronDown size={13} aria-hidden="true" />
              </button>
              {mobileMenuOpen === "tools" && (
                <div className="mobile-dropdown-panel" id="mobile-tools-menu" role="menu" aria-label="阶段扫描">
                  <button type="button" role="menuitem" className={radarActive ? "active" : ""} onClick={() => { setMobileMenuOpen(null); void requestTrendRadar(); }}><Radar size={15} /><span>全球扫描</span>{!isMember && <LockKeyhole className="mobile-menu-lock" size={11} aria-hidden="true" />}</button>
                  <button type="button" role="menuitem" className={stockRadarActive ? "active" : ""} onClick={() => { setMobileMenuOpen(null); void requestStockRadar(); }}><TrendingUp size={15} /><span>个股扫描</span>{!isMember && <LockKeyhole className="mobile-menu-lock" size={11} aria-hidden="true" />}</button>
                  <button type="button" role="menuitem" className={myScanActive ? "active" : ""} onClick={() => { setMobileMenuOpen(null); void requestMyScan(); }}><MousePointerClick size={15} /><span>自选扫描</span>{!isMember && <LockKeyhole className="mobile-menu-lock" size={11} aria-hidden="true" />}</button>
                </div>
              )}
            </div>
          </nav>
          <div className="sidebar-bottom"><span>数据周期</span><strong>{week.year} · W{String(week.week).padStart(2, "0")}</strong><small>仅作为市场观察工具</small></div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div><div className="eyebrow"><Globe2 size={14} /> LZ-4Stage Map｜四阶段分析</div><h1>{activePageTitle}</h1></div>
            <div className="top-actions">
              <button className={`stage-intro-link ${introductionActive ? "active" : ""}`} type="button" onClick={openStageIntroduction} aria-pressed={introductionActive}><BookOpenText size={16} />四阶段说明</button>
              {!isMember && <button className="member-auth-button register-member-button" type="button" onClick={() => { setHoveredMarket(null); setShowFullVersion(true); }}><UserPlus size={14} />注册会员</button>}
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
                <button className="member-auth-button login-button" type="button" onClick={openMemberLogin} disabled={!authReady}><UserRound size={14} />{authReady ? "登录" : "检查登录…"}</button>
              )}
            </div>
          </header>

          {introductionActive ? (
            <article className="stage-introduction" aria-labelledby="stage-introduction-title">
              <header className="stage-introduction-hero stage-introduction-panel">
                <div>
                  <p className="stage-introduction-kicker">先看阶段，再看变化</p>
                  <h2 id="stage-introduction-title">资产当前处在什么阶段？</h2>
                  <p>四阶段分析把市场走势分为低位整理、上升趋势、高位整理和下降趋势。</p>
                  <p>春夏秋冬只是帮助记忆的比喻，阶段不会按季节固定轮换。</p>
                </div>
                <div className="stage-introduction-hero-note">
                  <strong>用周线看大方向</strong>
                  <span>确认当前阶段</span><span>跟踪观察变化</span><span>按需查看阶段细分</span>
                </div>
              </header>
              <section className="stage-introduction-overview" aria-labelledby="stage-introduction-stages-title">
                <div className="stage-introduction-section-heading">
                  <h2 id="stage-introduction-stages-title">认识四种市场阶段</h2>
                  <p>春夏秋冬是帮助记忆的比喻。</p>
                </div>
                <div className="stage-introduction-stages">
                  <section className="stage-introduction-item stage-introduction-s1"><h3>低位整理 S1｜春季</h3><p>下跌后转为整理，方向尚未明确。留意价格与30周均线的变化，但这不等于已经见底。</p></section>
                  <section className="stage-introduction-item stage-introduction-s2"><h3>上升趋势 S2｜夏季</h3><p>价格呈上升结构，重点看趋势能否延续；短期仍可能回撤。</p></section>
                  <section className="stage-introduction-item stage-introduction-s3"><h3>高位整理 S3｜秋季</h3><p>高位反复整理，原有上升结构出现变化；这不等于已经见顶。</p></section>
                  <section className="stage-introduction-item stage-introduction-s4"><h3>下降趋势 S4｜冬季</h3><p>价格呈下降结构，重点看下行压力是否减弱；不代表接下来一定继续下跌。</p></section>
                </div>
              </section>
              <section className="stage-introduction-diagram" aria-labelledby="stage-introduction-diagram-title">
                <h2 id="stage-introduction-diagram-title">四阶段示意图</h2>
                <p>本图展示典型走势中细分阶段的大致位置，不代表阶段必须依次出现；30 周均线也不是唯一判断依据。</p>
                <figure className="stage-introduction-figure">
                  <img className="stage-introduction-image" src={`${import.meta.env.BASE_URL}lz-4stage-substages.png`} alt="典型走势中的四阶段细分代码示意：包含 S2A、S2B、S4A、S4B 等位置及 30 周移动平均线" width="1536" height="1024" />
                </figure>
              </section>
              <section className="stage-introduction-reading stage-introduction-panel" aria-labelledby="stage-introduction-reading-title">
                <div className="stage-introduction-section-top"><h2 id="stage-introduction-reading-title">怎样读地图？</h2><span>先读当前结果，再看观察变化</span></div>
                <div className="stage-introduction-read-grid">
                  <div className="stage-introduction-example-wrap">
                    <div className="stage-introduction-example-caption">资产信息面板示例 · 非实时行情</div>
                    <div className="stage-introduction-example-panel">
                      <div className="stage-introduction-example-title"><span />DEMO · 示例资产 A</div>
                      <dl>
                        <div><dt>当前阶段</dt><dd><b className="stage-introduction-example-current">S2</b> · 上升趋势</dd></div>
                        <div><dt>主阶段持续</dt><dd>6周</dd></div>
                        <div><dt>本阶段起始时间</dt><dd>2026-08-14</dd></div>
                        <div><dt>本周观察</dt><dd className="stage-introduction-example-observation">转向下降观察 · 1/2周确认</dd></div>
                        <div><dt>30周均线：</dt><dd className="stage-introduction-example-ma">上升 · 近5周 +0.80%</dd></div>
                      </dl>
                    </div>
                  </div>
                  <div className="stage-introduction-read-points">
                    <div className="stage-introduction-read-point"><span>1</span><div><h3>先看当前阶段</h3><p>示例当前仍为 S2；阶段名称和代码是已确认结果。</p></div></div>
                    <div className="stage-introduction-read-point"><span>2</span><div><h3>再看本周观察</h3><p>“转向下降观察 · 1/2周确认”是待确认提示，不等于已进入 S4。</p></div></div>
                    <div className="stage-introduction-read-point"><span>3</span><div><h3>补充看时间与均线</h3><p>持续周数、起始时间和30周均线帮助理解趋势，不单独决定阶段。</p></div></div>
                  </div>
                </div>
                <p className="stage-introduction-note">示例只说明读图顺序，并非真实行情。实际资产的阶段、观察和数据时间，以页面显示为准。</p>
              </section>
              <section className="stage-introduction-faq" aria-label="四阶段常见问题">
                <details className="stage-introduction-disclosure"><summary>30周均线怎样看？</summary><div><p>页面把30周均线的方向与近5周变化放在同一行，帮助观察周线趋势及其变化幅度。它们是参考信息，不是阶段判定的全部条件。</p></div></details>
                <details className="stage-introduction-disclosure"><summary>S2A、S2B等细分代码怎样看？</summary><div><p>这些代码描述主阶段内部的差异。先看“上升趋势 S2”等主阶段名称，需要更多细节时再查看资产详情。A、B和减号是识别码，不代表一定依次发生的未来走势。</p><div className="stage-introduction-code-row"><span>S2A</span><span>S2</span><span>S2-</span><span>S2B</span><span>S2B-</span></div><div className="stage-introduction-code-row"><span>S4A</span><span>S4</span><span>S4-</span><span>S4B</span><span>S4B-</span></div><p>“上升阶段 ≤4周”是持续时间筛选条件，不等同于S2A；两者独立显示。</p></div></details>
                <details className="stage-introduction-disclosure"><summary>使用这套方法，需要注意什么？</summary><div><p>四阶段分析描述当前结构，不保证未来涨跌。季节不是现实月份，阶段持续时间并不固定，也可能反复切换。阶段颜色不直接等于买卖动作。</p><p>“低位整理”不代表已找到最低点，“高位整理”也不代表已确认最高点。细分说明与确认条件以系统规则为准。</p></div></details>
              </section>
            </article>
          ) : myScanActive ? (
            <MyScanPage
              assets={myScanAssets}
              loading={loadingMemberView === "myScan"}
              loadError={myScanLoadError}
              onReload={async () => { await loadMyScan(true); }}
              onLookup={handleMyScanLookup}
              onAdd={handleMyScanAdd}
              onRemove={handleMyScanRemove}
              onReorder={handleMyScanReorder}
            />
          ) : stockRadarActive && stockRadarSnapshot ? (
            <StockRadarPage snapshot={stockRadarSnapshot} markets={stockRadarSnapshot.matches} filter={stockRadarFilter} region={stockRadarRegion} onFilterChange={setStockRadarFilter} onRegionChange={setStockRadarRegion} />
          ) : radarActive && radarSnapshot ? (
            <TrendRadarPage snapshot={radarSnapshot} markets={radarMarkets} filter={radarFilter} region={radarRegion} scanMode={radarScanMode} onFilterChange={setRadarFilter} onRegionChange={setRadarRegion} onScanModeChange={(mode) => { setRadarScanMode(mode); setRadarFilter("all"); setRadarRegion("全部"); }} />
          ) : <>
          <div className="filterbar">
            <div className="region-tabs" role="group" aria-label="市场筛选">{activeViewMeta.regions.map((item) => <button key={item} className={region === item ? "active" : ""} onClick={() => setRegion(item)}>{view !== "global" && item === "全球" ? "全部" : displayRegionName(item)}</button>)}</div>
            <section className="stage-distribution" aria-label="阶段分布筛选">
              <div className="distribution-bar">
              {(["S1", "S2", "S3", "S4"] as Stage[]).map((stage) => {
                const availableCount = regionData.filter(item => item.cryptoFreshness !== "unavailable").length;
                const percent = availableCount ? Math.round(counts[stage] / availableCount * 100) : 0;
                const selected = stageFilter === stage;
                const muted = stageFilter !== "全部" && !selected;
                return <button
                  key={stage}
                  className={`distribution-segment ${selected ? "selected" : ""} ${muted ? "muted" : ""}`}
                  style={{ background: `color-mix(in srgb, ${stageMeta[stage].color} 14%, var(--canvas))` }}
                  onClick={() => setStageFilter(selected ? "全部" : stage)}
                  aria-pressed={selected}
                  aria-label={`${stage} ${stageMeta[stage].title}，占比 ${percent}%，${counts[stage]} 个资产`}
                >
                  <span className="distribution-fill" aria-hidden="true" style={{ width: `${percent}%`, background: `linear-gradient(135deg, ${stageMeta[stage].color}, ${stageMeta[stage].dark})` }} />
                  <span className="distribution-label"><b style={{ color: stageMeta[stage].color }}>{stage} {stageMeta[stage].season}</b></span>
                  <span className="distribution-value"><strong>{percent}%</strong></span>
                </button>;
              })}
              </div>
            </section>
          </div>

          <section className="map-panel" id="stage-map">
            <div className="map-panel-head">
              <div><span className="section-kicker">{activeViewMeta.mapKicker}</span><h2>{activeViewMeta.mapTitle}</h2><p>底色显示已确认阶段；外框提示待确认变化，不代表阶段已切换</p></div>
            </div>
            <GlobalStageMap source={regionData} region={region} stageFilter={stageFilter} view={view} onMarketMove={handleMarketMove} onMarketLeave={() => { if (!touchCardOpen) setHoveredMarket(null); }} onMarketFocus={handleMarketFocus} onMarketPointerDown={handleMarketPointerDown} onMarketTap={handleMarketTap} />
            <div className="map-foot" id="personal-watch">{watches.length ? watches.map((item) => <span key={item.code}>{item.shortCode}：{item.observation}</span>) : <span>本周暂无新的阶段观察变化</span>}</div>
          </section>
          {activeInterpretation && <MarketInterpretationPanel interpretation={activeInterpretation} marketTitle={activeViewMeta.mapTitle} confirmationLabel={interpretationConfirmationLabel} />}
          </>}

          <footer>
            <span>{introductionActive ? "LZ-4Stage Map · 四阶段说明" : myScanActive ? `LZ-4Stage Map · 自选阶段扫描 · ${myScanAssets.length}/20 个资产` : stockRadarActive && stockRadarSnapshot ? `LZ-4Stage Map · 个股阶段扫描 · ${stockRadarSnapshot.universeSize} 只高流动性股票` : radarActive && radarSnapshot ? `LZ-4Stage Map · 全球阶段扫描 · ${radarSnapshot.universeSize} 个资产` : `LZ-4Stage Map · 四阶段分析 · ${activeUniverse.length} 个资产`}</span>
            <div className="footer-data-times">
              <span>{myScanActive
                ? <>传统资产周六更新｜加密资产周一更新</>
                : view === "global"
                ? <>阶段数据截至：传统市场 {globalDates.traditional}｜加密市场 {globalDates.crypto}</>
                : <>阶段数据截至：{commonConfirmationDate}</>}</span>
              <span>数据生成于 {formatDateTime(activeGeneratedAt)}</span>
            </div>
            <span>阶段分析仅供市场观察，不构成任何投资建议</span>
          </footer>
        </main>
        <HoverMarketCard market={hoveredMarket} point={hoverPoint} touchMode={touchCardOpen} onClose={closeMarketCard} />
        {showFullVersion && (
          <div className="full-version-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowFullVersion(false); }}>
            <section className="full-version-modal" role="dialog" aria-modal="true" aria-labelledby="full-version-title">
              <button className="modal-close" type="button" aria-label="关闭完整版介绍" onClick={() => setShowFullVersion(false)}><X size={19} /></button>
              <div className="modal-icon"><MousePointerClick size={21} /></div>
              <h2 id="full-version-title">注册成为LZ会员</h2>
              <p>LZ-4Stage全球市场趋势地图，可公开访问。</p>
              <p>其他市场查询，以及市场扫描工具，需注册会员。</p>
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
                <p>{pendingView === "myScan" ? "登录会员账号后建立自己的阶段扫描列表" : pendingView === "stockRadar" ? "登录会员账号后查看300只高流动性股票扫描结果" : pendingView === "trendRadar" ? "登录会员账号后查看全球阶段扫描结果" : "登录会员账号后查看完整市场趋势地图"}</p>
                <button className="member-login-cta" type="button" onClick={() => setMemberDialog("login")}>会员登录</button>
              </>
            ) : memberDialog === "dataError" ? (
              <>
                <h2 id="access-gate-title">会员数据暂时不可用</h2>
                <p>登录状态有效，但{pendingView === "myScan" ? "我的扫描数据" : pendingView === "stockRadar" ? "个股阶段扫描结果" : pendingView === "trendRadar" ? "全球阶段扫描结果" : "市场快照"}未能加载，请稍后重试。</p>
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
