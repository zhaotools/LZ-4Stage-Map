import type { Session } from "@supabase/supabase-js";

import { supabase } from "./supabase";

export type MemberView = "crypto7" | "commodity" | "usSelected" | "chinaIndices" | "hkSelected";
export type TrendRadarRuleId = "s4Recovery" | "s2aEntry" | "s2Early" | "s2Breakdown" | "s4aEntry" | "s4Early";
export type StockRadarRuleId = "s4Recovery" | "s2aEntry" | "s2Early";
export type MyScanRegion = "美股" | "A股" | "港股" | "加密";

export type MyScanLookupAsset = {
  assetKey: string;
  region: MyScanRegion;
  code: string;
  displayCode: string;
  providerSymbol: string;
  name: string;
  exchange: string;
  assetType: "equity" | "crypto";
  primaryProvider: string;
  fallbackProviders: string[];
  tradingviewSymbol: string;
  currency: string | null;
};

export type MyScanStageResult = {
  assetKey: string;
  code: string;
  providerSymbol: string;
  shortCode: string;
  name: string;
  region: MyScanRegion;
  exchange: string;
  category: string;
  tradingviewSymbol: string;
  source: string;
  dataStatus: "live";
  stage: "S1" | "S2" | "S3" | "S4";
  subStage: string;
  stageDetail: string;
  weeks: number;
  observationStage: string;
  observation: string;
  signal: "增强" | "稳定" | "减速" | "转弱" | "观察";
  momentum: number;
  close: number;
  marketAsOf: string;
  stageAsOf: string;
  generatedAt: string;
};

export type MyScanAsset = {
  assetKey: string;
  region: MyScanRegion;
  code: string;
  displayCode: string;
  name: string;
  exchange: string;
  assetType: "equity" | "crypto";
  primaryProvider: string;
  tradingviewSymbol: string;
  scanStatus: "pending" | "fresh" | "error";
  lastScanAt: string | null;
  lastScanError: string | null;
  createdAt: string;
  result: MyScanStageResult | null;
};

export type MarketInterpretation = {
  schemaVersion: "lz-market-interpretation-v1";
  viewKey: "global" | MemberView;
  mode: "system";
  generatedAt: string;
  commonStageAsOf: string;
  sourceSnapshotSha256: string;
  universeSize: number;
  analyzedSize: number;
  excludedSize: number;
  stageCounts: Record<"S1" | "S2" | "S3" | "S4", number>;
  headline: string;
  summary: string;
  insights: Array<{ id: "structure" | "maturity" | "observation" | "divergence"; label: string; text: string }>;
  note: string;
};

export type MemberProfile = {
  user_id: string;
  display_name: string;
  role: "member" | "admin";
  status: "pending" | "active" | "suspended";
  expires_at: string | null;
};

export type MemberSnapshot<TMarket = unknown> = {
  schemaVersion: string;
  generatedAt: string;
  updateScope: "all" | "traditional" | "crypto";
  lastUpdatedAt: { traditional: string; crypto: string };
  analysisPeriod: string;
  commonStageAsOf: string;
  viewKey: MemberView;
  markets: TMarket[];
  interpretation?: MarketInterpretation;
};

export type TrendRadarSnapshot<TMarket = unknown> = {
  schemaVersion: "lz-trend-radar-v1" | "lz-trend-radar-v2";
  generatedAt: string;
  updateScope: "all" | "traditional" | "crypto";
  lastUpdatedAt: { traditional: string; crypto: string };
  analysisPeriod: string;
  commonStageAsOf: string;
  viewKey: "trendRadar";
  universeSize: number;
  rules: Array<{ id: TrendRadarRuleId; label: string; description: string }>;
  counts: Record<TrendRadarRuleId, number> & { unique: number };
  matches: Array<TMarket & { matchRules: TrendRadarRuleId[] }>;
};

export type StockRadarSnapshot<TMarket = unknown> = {
  schemaVersion: "lz-stock-radar-v1";
  generatedAt: string;
  analysisPeriod: string;
  scanDirection: "S2";
  runMode: "full" | string;
  viewKey: "stockRadar";
  universeSelectedAt: string;
  universeSize: number;
  configuredUniverseSize: number;
  commonStageAsOf: string | null;
  marketStats: Array<{ region: "美股" | "A股" | "港股"; universe: number; analyzed: number; live: number; cache: number; matches: number; latestMarketAsOf: string | null }>;
  quality: { expected: number; analyzed: number; completionRate: number; live: number; cache: number; failures: Array<{ code: string; region: string; error: string }>; durationSeconds: number };
  rules: Array<{ id: StockRadarRuleId; label: string; description: string }>;
  counts: Record<StockRadarRuleId, number> & { unique: number };
  matches: Array<TMarket & { matchRules: StockRadarRuleId[] }>;
};

function requireClient() {
  if (!supabase) throw new Error("会员服务尚未完成配置");
  return supabase;
}

export async function signInMember(email: string, password: string, captchaToken?: string) {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
    options: captchaToken ? { captchaToken } : undefined,
  });
  if (error) throw error;
  return data.session;
}

export async function signOutMember() {
  const { error } = await requireClient().auth.signOut();
  if (error) throw error;
}

export async function updateMemberPassword(currentPassword: string, newPassword: string) {
  const { data, error } = await requireClient().auth.updateUser({
    password: newPassword,
    current_password: currentPassword,
  });
  if (error) throw error;
  return data.user;
}

export async function getMemberSession(): Promise<Session | null> {
  const { data, error } = await requireClient().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getMemberProfile(): Promise<MemberProfile> {
  const { data, error } = await requireClient()
    .from("member_profiles")
    .select("user_id,display_name,role,status,expires_at")
    .single();
  if (error) throw error;
  return data as MemberProfile;
}

export function isProfileActive(profile: MemberProfile, now = new Date()) {
  if (profile.status !== "active") return false;
  if (profile.role === "admin") return true;
  return Boolean(profile.expires_at && new Date(profile.expires_at).getTime() > now.getTime());
}

export async function getMemberSnapshot<TMarket>(viewKey: MemberView, signal?: AbortSignal): Promise<MemberSnapshot<TMarket>> {
  const query = requireClient()
    .from("market_snapshots")
    .select("payload")
    .eq("view_key", viewKey);
  const { data, error } = await (signal ? query.abortSignal(signal) : query).single();
  if (error) throw error;
  return data.payload as MemberSnapshot<TMarket>;
}

export async function getTrendRadarSnapshot<TMarket>(signal?: AbortSignal): Promise<TrendRadarSnapshot<TMarket>> {
  const query = requireClient()
    .from("market_snapshots")
    .select("payload")
    .eq("view_key", "trendRadar");
  const { data, error } = await (signal ? query.abortSignal(signal) : query).single();
  if (error) throw error;
  return data.payload as TrendRadarSnapshot<TMarket>;
}

export async function getStockRadarSnapshot<TMarket>(signal?: AbortSignal): Promise<StockRadarSnapshot<TMarket>> {
  const query = requireClient()
    .from("market_snapshots")
    .select("payload")
    .eq("view_key", "stockRadar");
  const { data, error } = await (signal ? query.abortSignal(signal) : query).single();
  if (error) throw error;
  return data.payload as StockRadarSnapshot<TMarket>;
}

export async function getMyScanAssets(): Promise<MyScanAsset[]> {
  const { data, error } = await requireClient().rpc("get_my_scan_assets");
  if (error) throw error;
  return Array.isArray(data) ? data as MyScanAsset[] : [];
}

async function functionErrorMessage(error: unknown, data: unknown) {
  const payloadMessage = (data as { error?: { message?: string } } | null)?.error?.message;
  if (payloadMessage) return payloadMessage;
  const context = (error as { context?: Response } | null)?.context;
  if (context) {
    try {
      const payload = await context.clone().json() as { error?: { message?: string } };
      if (payload.error?.message) return payload.error.message;
    } catch {
      // Use the SDK error below when the response is not JSON.
    }
  }
  return error instanceof Error ? error.message : "资产代码查询失败，请稍后重试";
}

export async function lookupMyScanAsset(region: MyScanRegion, code: string): Promise<MyScanLookupAsset> {
  const { data, error } = await requireClient().functions.invoke("lookup-watchlist-asset", {
    body: { region, code },
  });
  if (error || data?.error) throw new Error(await functionErrorMessage(error, data));
  if (!data?.asset) throw new Error("资产代码查询没有返回结果");
  return data.asset as MyScanLookupAsset;
}

export async function addMyScanAsset(assetKey: string) {
  const { data, error } = await requireClient().rpc("add_my_scan_asset", { p_asset_key: assetKey });
  if (error) {
    const message = error.message.includes("WATCHLIST_LIMIT_REACHED") ? "我的扫描最多添加20个资产"
      : error.message.includes("ASSET_NOT_VALIDATED") ? "该资产尚未通过代码验证，请重新查询"
        : error.message;
    throw new Error(message);
  }
  return data as { ok: boolean; created: boolean; count: number; limit: number };
}

export async function removeMyScanAsset(assetKey: string) {
  const { data, error } = await requireClient().rpc("remove_my_scan_asset", { p_asset_key: assetKey });
  if (error) throw error;
  return data as { ok: boolean; removed: boolean; count: number; limit: number };
}

export function onMemberAuthChange(callback: (session: Session | null) => void) {
  const client = requireClient();
  const { data } = client.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}
