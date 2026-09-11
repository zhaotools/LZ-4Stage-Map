"use client";

import { type FormEvent, useState } from "react";
import { Clock3, ExternalLink, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

import { tradingViewChartUrlFor } from "@/app/lib/tradingview-link.mjs";
import type { MyScanAsset, MyScanLookupAsset, MyScanRegion } from "@/app/lib/member-api";

const regions: MyScanRegion[] = ["美股", "A股", "港股", "加密"];
const placeholders: Record<MyScanRegion, string> = {
  美股: "例如 AAPL 或 BRK.B",
  A股: "例如 600519 或 000001",
  港股: "例如 0700 或 9988",
  加密: "例如 BTC、ETH、SOL 或 HYPE",
};

type Props = {
  assets: MyScanAsset[];
  loading: boolean;
  loadError: string | null;
  onReload: () => Promise<void>;
  onLookup: (region: MyScanRegion, code: string) => Promise<MyScanLookupAsset>;
  onAdd: (assetKey: string) => Promise<void>;
  onRemove: (assetKey: string) => Promise<void>;
};

function shortDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "—";
}

export function MyScanPage({ assets, loading, loadError, onReload, onLookup, onAdd, onRemove }: Props) {
  const [region, setRegion] = useState<MyScanRegion>("美股");
  const [code, setCode] = useState("");
  const [candidate, setCandidate] = useState<MyScanLookupAsset | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [querying, setQuerying] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const atLimit = assets.length >= 20;

  const submitLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCandidate(null);
    setMessage(null);
    setQuerying(true);
    try {
      const asset = await onLookup(region, code);
      setCandidate(asset);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "资产代码查询失败，请稍后重试");
    } finally {
      setQuerying(false);
    }
  };

  const addCandidate = async () => {
    if (!candidate || atLimit) return;
    setAdding(true);
    setMessage(null);
    try {
      await onAdd(candidate.assetKey);
      setMessage(`已加入 ${candidate.displayCode}。已有阶段结果会立即显示，新代码将在下一次周度计算后显示。`);
      setCandidate(null);
      setCode("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加入失败，请稍后重试");
    } finally {
      setAdding(false);
    }
  };

  const removeAsset = async (asset: MyScanAsset) => {
    setRemoving(asset.assetKey);
    setMessage(null);
    try {
      await onRemove(asset.assetKey);
      setMessage(`已从我的扫描移除 ${asset.displayCode}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "移除失败，请稍后重试");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <section className="my-scan-page" aria-labelledby="my-scan-title">
      <div className="my-scan-head">
        <div>
          <span className="section-kicker">MEMBER · MY SCAN</span>
          <h2 id="my-scan-title">我的扫描</h2>
          <p>跟踪自己关心的资产阶段。支持美股、A股、港股与加密，精确代码查询。</p>
        </div>
        <div className="my-scan-count"><strong>{assets.length}</strong><span>/ 20</span></div>
      </div>

      <div className="my-scan-add-panel">
        <div className="my-scan-region-tabs" role="group" aria-label="选择资产市场">
          {regions.map((item) => (
            <button key={item} type="button" className={region === item ? "active" : ""} onClick={() => { setRegion(item); setCandidate(null); setMessage(null); }} aria-pressed={region === item}>{item}</button>
          ))}
        </div>
        <form className="my-scan-search" onSubmit={submitLookup}>
          <label htmlFor="my-scan-code">资产代码</label>
          <div>
            <input id="my-scan-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder={placeholders[region]} autoComplete="off" maxLength={20} disabled={querying} />
            <button type="submit" disabled={querying || !code.trim()}><Search size={16} />{querying ? "验证中…" : "查询"}</button>
          </div>
        </form>
        <p className="my-scan-search-note">只查询精确代码。系统会确认交易所、资产类型与周线历史，不会把数据源临时故障判定为无效代码。</p>

        {candidate && (
          <div className="my-scan-candidate" aria-live="polite">
            <div><strong>{candidate.displayCode}</strong><span>{candidate.name}</span><small>{candidate.region} · {candidate.exchange} · {candidate.primaryProvider}</small></div>
            <button type="button" onClick={addCandidate} disabled={adding || atLimit}><Plus size={16} />{atLimit ? "已达20个上限" : adding ? "加入中…" : "加入我的扫描"}</button>
          </div>
        )}
        {message && <p className="my-scan-message" role="status">{message}</p>}
      </div>

      <div className="my-scan-list-head">
        <div><h3>自选资产</h3><p>相同代码在全站只计算一次；删除只影响你自己的列表。</p></div>
        <button type="button" onClick={() => void onReload()} disabled={loading}><RefreshCw size={15} />{loading ? "读取中…" : "重新读取"}</button>
      </div>

      {loadError ? (
        <div className="my-scan-empty error"><p>{loadError}</p><button type="button" onClick={() => void onReload()}>重新读取</button></div>
      ) : loading && !assets.length ? (
        <div className="my-scan-empty"><p>正在读取我的扫描…</p></div>
      ) : !assets.length ? (
        <div className="my-scan-empty"><Search size={26} /><h3>还没有添加资产</h3><p>先选择市场，再输入精确资产代码。最多可添加20个。</p></div>
      ) : (
        <div className="my-scan-grid">
          {assets.map((asset) => {
            const result = asset.result;
            const staleAfterFailure = asset.scanStatus === "error" && Boolean(result);
            return (
              <article key={asset.assetKey} className={`my-scan-card ${result ? `stage-${result.stage.toLowerCase()}` : "pending"}`}>
                <div className="my-scan-card-head">
                  <div><span>{asset.region}</span><small>{asset.exchange}</small></div>
                  <button type="button" onClick={() => void removeAsset(asset)} disabled={removing === asset.assetKey} aria-label={`移除 ${asset.displayCode}`}><Trash2 size={15} /></button>
                </div>
                <div className="my-scan-card-title"><strong>{asset.displayCode}</strong><span>{asset.name}</span></div>
                {result ? (
                  <>
                    <button className="my-scan-stage-result" type="button" onClick={() => window.open(tradingViewChartUrlFor(result), "_blank", "noopener,noreferrer")}>
                      <span className="my-scan-stage-code">{result.subStage}</span>
                      <span>{result.stageDetail} · {result.weeks}周</span>
                      <ExternalLink size={15} aria-hidden="true" />
                    </button>
                    <dl className="my-scan-card-meta">
                      <div><dt>本周观察</dt><dd>{result.observation}</dd></div>
                      <div><dt>行情确认至</dt><dd>{shortDate(result.marketAsOf)}</dd></div>
                    </dl>
                    {staleAfterFailure && <p className="my-scan-status warning">本次更新失败，保留上期结果</p>}
                  </>
                ) : asset.scanStatus === "error" ? (
                  <div className="my-scan-pending error"><Clock3 size={18} /><strong>数据暂不可用</strong><span>本次计算失败，将在下次周度任务中重试。</span></div>
                ) : (
                  <div className="my-scan-pending"><Clock3 size={18} /><strong>等待周度首次计算</strong><span>传统资产周六更新，加密资产周一更新。</span></div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
