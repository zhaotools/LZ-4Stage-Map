import type { Session } from "@supabase/supabase-js";

import { supabase } from "./supabase";

export type MemberView = "crypto7" | "usSelected" | "chinaIndices" | "hkSelected";

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

export async function getMemberSnapshot<TMarket>(viewKey: MemberView): Promise<MemberSnapshot<TMarket>> {
  const { data, error } = await requireClient()
    .from("market_snapshots")
    .select("payload")
    .eq("view_key", viewKey)
    .single();
  if (error) throw error;
  return data.payload as MemberSnapshot<TMarket>;
}

export function onMemberAuthChange(callback: (session: Session | null) => void) {
  const client = requireClient();
  const { data } = client.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}
