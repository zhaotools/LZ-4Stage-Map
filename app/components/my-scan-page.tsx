"use client";

import { type FormEvent, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Plus, Search, Trash2 } from "lucide-react";

import { stageConfirmationTimeFor } from "@/app/lib/confirmation-time.mjs";
import { STAGE_PRESENTATION } from "@/app/lib/stage-presentation.mjs";
import { matchS2ScanRules } from "@/app/lib/index-scan.mjs";
import { tradingViewChartUrlFor } from "@/app/lib/tradingview-link.mjs";
import type { MyScanAsset, MyScanIndexMarket, MyScanLookupAsset, MyScanRegion, StockRadarRuleId } from "@/app/lib/member-api";

const regions: MyScanRegion[] = ["美股", "A股", "港股", "加密"];
const placeholders: Record<MyScanRegion, string> = {
  美股: "例如 AAPL 或 BRK.B",
  A股: "例如 600519 或 000001",
  港股: "例如 0700 或 9988",
  加密: "例如 BTC、ETH、SOL 或 HYPE",
};

type Props = {
  assets: MyScanAsset[];
  indexMarkets: MyScanIndexMarket[];
  indexLoading: boolean;
  indexError: string | null;
  onLoadIndexes: () => Promise<void>;
  loading: boolean;
  loadError: string | null;
  onReload: () => Promise<void>;
  onLookup: (region: MyScanRegion, code: string) => Promise<MyScanLookupAsset>;
  onAdd: (assetKey: string) => Promise<void>;
  onRemove: (assetKey: string) => Promise<void>;
  onReorder: (assetKeys: string[]) => Promise<void>;
};

const stageColors = {
  S1: STAGE_PRESENTATION.S1.color,
  S2: STAGE_PRESENTATION.S2.color,
  S3: STAGE_PRESENTATION.S3.color,
  S4: STAGE_PRESENTATION.S4.color,
} as const;
const stages = ["S1", "S2", "S3", "S4"] as const;
const stageSeasons = { S1: STAGE_PRESENTATION.S1.season, S2: STAGE_PRESENTATION.S2.season, S3: STAGE_PRESENTATION.S3.season, S4: STAGE_PRESENTATION.S4.season } as const;
const matchRules: Array<{ id: StockRadarRuleId; label: string; description: string }> = [
  { id: "s4Recovery", label: "转向S2观察", description: "当前主阶段 S1 / S3 / S4 · 本周观察转向 S2" },
  { id: "s2aEntry", label: "进入S2A", description: "当前进入S2A阶段" },
  { id: "s2Early", label: "S2早期阶段", description: "S2持续时间不超过4周" },
];
function momentumDirection(momentum: number) {
  return momentum > 0 ? "上升" : momentum < 0 ? "下降" : "持平";
}
function indexKind(market: MyScanIndexMarket) {
  if (market.region !== "美股") return `${market.region}指数`;
  if (["SOXX", "XLF", "XLE", "XLV", "XLI", "XLY"].includes(market.code)) return "美股·行业ETF";
  if (["IWM", "RSP"].includes(market.code)) return "美股·宽基ETF";
  return "美股指数";
}

export function MyScanPage({ assets, indexMarkets, indexLoading, indexError, onLoadIndexes, loading, loadError, onReload, onLookup, onAdd, onRemove, onReorder }: Props) {
  const [mode, setMode] = useState<"watchlist" | "index">("watchlist");
  const [region, setRegion] = useState<MyScanRegion>("美股");
  const [indexRegion, setIndexRegion] = useState<"全部" | MyScanIndexMarket["region"]>("全部");
  const [matchFilter, setMatchFilter] = useState<StockRadarRuleId | "matched" | null>(null);
  const [stageFilter, setStageFilter] = useState<(typeof stages)[number] | "全部">("全部");
  const [code, setCode] = useState("");
  const [candidate, setCandidate] = useState<MyScanLookupAsset | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [querying, setQuerying] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const atLimit = assets.length >= 20;
  const analyzedTotal = assets.reduce((total, asset) => total + (asset.result ? 1 : 0), 0);
  const stageCounts = assets.reduce<Record<(typeof stages)[number], number>>((counts, asset) => {
    if (asset.result) counts[asset.result.stage] += 1;
    return counts;
  }, { S1: 0, S2: 0, S3: 0, S4: 0 });
  const regionIndexes = indexRegion === "全部" ? indexMarkets : indexMarkets.filter((market) => market.region === indexRegion);
  const scanResults = mode === "watchlist" ? assets.filter((asset) => asset.scanStatus === "fresh").map((asset) => asset.result).filter((result): result is NonNullable<typeof result> => Boolean(result)) : regionIndexes;
  const matchCount = (rule: StockRadarRuleId | "matched") => scanResults.filter((result) => {
    const matched = matchS2ScanRules(result);
    return rule === "matched" ? matched.length > 0 : matched.includes(rule);
  }).length;
  const matchesFilter = (result: NonNullable<MyScanAsset["result"]> | MyScanIndexMarket | null) => {
    if (!matchFilter) return true;
    if (!result) return false;
    const matched = matchS2ScanRules(result);
    return matchFilter === "matched" ? matched.length > 0 : matched.includes(matchFilter);
  };
  const filteredAssets = assets.filter((asset) => (stageFilter === "全部" || asset.result?.stage === stageFilter) && (!matchFilter || asset.scanStatus === "fresh") && matchesFilter(asset.result));
  const filteredIndexes = regionIndexes.filter(matchesFilter);

  const reorderAssets = async (sourceKey: string, targetKey: string) => {
    if (stageFilter !== "全部") {
      setMessage("请先显示全部资产后再调整顺序。");
      return;
    }
    const sourceIndex = assets.findIndex((asset) => asset.assetKey === sourceKey);
    const targetIndex = assets.findIndex((asset) => asset.assetKey === targetKey);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const nextAssets = [...assets];
    const [moved] = nextAssets.splice(sourceIndex, 1);
    nextAssets.splice(targetIndex, 0, moved);
    setReordering(true);
    try {
      await onReorder(nextAssets.map((asset) => asset.assetKey));
      setMessage("显示顺序已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存显示顺序失败，请稍后重试");
    } finally {
      setReordering(false);
    }
  };

  const moveAsset = (assetKey: string, direction: -1 | 1) => {
    if (stageFilter !== "全部") {
      setMessage("请先显示全部资产后再调整顺序。");
      return;
    }
    const index = assets.findIndex((asset) => asset.assetKey === assetKey);
    const target = assets[index + direction];
    if (target) void reorderAssets(assetKey, target.assetKey);
  };

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
      <div className="my-scan-mode-switch" role="group" aria-label="选择扫描分类">
        <button type="button" className={mode === "watchlist" ? "active" : ""} aria-pressed={mode === "watchlist"} onClick={() => { setMode("watchlist"); setMatchFilter(null); setStageFilter("全部"); }}>自选资产</button>
        <button type="button" className={mode === "index" ? "active" : ""} aria-pressed={mode === "index"} onClick={() => { setMode("index"); setMatchFilter(null); }}>指数扫描</button>
      </div>
      {mode === "watchlist" ? (
      <div className="my-scan-head">
        <span className="section-kicker">STAGE SCAN · WATCHLIST</span>
        <div className="my-scan-toolbar">
          <h2 id="my-scan-title">我的自选资产</h2>
          <div className="my-scan-region-tabs" role="group" aria-label="选择资产市场">
            {regions.map((item) => (
              <button key={item} type="button" className={region === item ? "active" : ""} onClick={() => { setRegion(item); setCandidate(null); setMessage(null); }} aria-pressed={region === item}>{item}</button>
            ))}
          </div>
          <form className="my-scan-search" onSubmit={submitLookup}>
            <input aria-label="资产代码" value={code} onChange={(event) => setCode(event.target.value)} placeholder={placeholders[region]} autoComplete="off" maxLength={20} disabled={querying} />
            <button type="submit" disabled={querying || !code.trim()}><Search size={16} />{querying ? "验证中…" : "查询"}</button>
          </form>
          <div className="my-scan-count"><strong>{assets.length}</strong><span>/ 20</span></div>
        </div>
        {candidate && (
          <div className="my-scan-candidate" aria-live="polite">
            <div><strong>{candidate.displayCode}</strong><span>{candidate.name}</span><small>{candidate.region} · {candidate.exchange} · {candidate.primaryProvider}</small></div>
            <button type="button" onClick={addCandidate} disabled={adding || atLimit}><Plus size={16} />{atLimit ? "已达20个上限" : adding ? "加入中…" : "加入我的扫描"}</button>
          </div>
        )}
        {message && <p className="my-scan-message" role="status">{message}</p>}
      </div>
      ) : (
        <div className="my-scan-index-head">
          <div><span className="section-kicker">STAGE SCAN · INDEX</span><h2 id="my-scan-title">指数阶段扫描</h2></div>
          <div className="my-scan-index-regions" role="group" aria-label="指数市场筛选">
            {(["全部", "A股", "港股", "美股"] as const).map((item) => <button key={item} type="button" className={indexRegion === item ? "active" : ""} aria-pressed={indexRegion === item} onClick={() => { setIndexRegion(item); setMatchFilter(null); }}>{item === "全部" ? "全部" : `${item}指数`}</button>)}
          </div>
          <span className="my-scan-index-count">{regionIndexes.length} 个指数及行业 ETF</span>
        </div>
      )}

      <div className="my-scan-match-head"><h3>阶段匹配</h3><button type="button" onClick={() => setMatchFilter(null)} aria-pressed={matchFilter === null}>全部结果</button></div>
      <div className="my-scan-match-summary" aria-label="S2阶段匹配结果">
        <button type="button" className={`radar-rule-card radar-rule-all ${matchFilter === "matched" ? "selected" : ""}`} aria-pressed={matchFilter === "matched"} onClick={() => setMatchFilter(matchFilter === "matched" ? null : "matched")}><span>本周匹配</span><strong>{matchCount("matched")}</strong><small>不重复{mode === "index" ? "指数" : "资产"}</small></button>
        {matchRules.map((rule) => <button key={rule.id} type="button" className={`radar-rule-card radar-rule-${rule.id} ${matchFilter === rule.id ? "selected" : ""}`} aria-pressed={matchFilter === rule.id} onClick={() => setMatchFilter(matchFilter === rule.id ? null : rule.id)}><span>{rule.label}</span><strong>{matchCount(rule.id)}</strong><small>{rule.description}</small></button>)}
      </div>

      {mode === "watchlist" ? (
      <div className="my-scan-list-head">
        <div><h3>资产列表</h3><p>使用卡片右上角的箭头调整显示顺序；相同代码在全站只计算一次。</p></div>
        <section className="stage-distribution my-scan-stage-distribution" aria-label={`我的扫描四阶段占比分布，按 ${analyzedTotal} 个已有结果的资产计算`}>
          <div className="distribution-bar">
            {stages.map((stage) => {
              const percent = analyzedTotal ? Math.round((stageCounts[stage] / analyzedTotal) * 100) : 0;
              const selected = stageFilter === stage;
              const muted = stageFilter !== "全部" && !selected;
              return (
                <button
                  key={stage}
                  type="button"
                  className={`distribution-segment ${selected ? "selected" : ""} ${muted ? "muted" : ""}`}
                  style={{ background: `color-mix(in srgb, ${stageColors[stage]} 14%, var(--canvas))` }}
                  onClick={() => setStageFilter(selected ? "全部" : stage)}
                  aria-pressed={selected}
                  aria-label={`${stage} ${stageSeasons[stage]}，占比 ${percent}%，${stageCounts[stage]} 个资产`}
                >
                  <span className="distribution-fill" aria-hidden="true" style={{ width: `${percent}%`, background: stageColors[stage] }} />
                  <span className="distribution-label"><b style={{ color: percent === 100 ? "#fff" : stageColors[stage], textShadow: percent === 100 ? "none" : undefined }}>{stage} {stageSeasons[stage]}</b></span>
                  <span className="distribution-value"><strong>{percent}%</strong></span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
      ) : <div className="my-scan-index-list-head"><h3>指数列表</h3><span>阶段结果来自各市场会员地图 · 点击卡片查看行情</span></div>}

      {mode === "index" ? (
        indexError && !indexMarkets.length ? <div className="my-scan-empty error"><p>{indexError}</p><button type="button" onClick={() => void onLoadIndexes()}>重新读取</button></div>
        : indexLoading && !indexMarkets.length ? <div className="my-scan-empty"><p>正在读取指数阶段结果…</p></div>
        : !filteredIndexes.length ? <div className="my-scan-empty"><Search size={26} /><h3>当前没有匹配的指数</h3><p>{indexError || "可切换市场或阶段匹配条件。"}</p></div>
        : <>
          {indexError && <p className="my-scan-message" role="status">{indexError} <button type="button" onClick={() => void onLoadIndexes()}>重试</button></p>}
          <div className="my-scan-grid">
            {filteredIndexes.map((market) => {
              const matches = matchS2ScanRules(market);
              const maDirection = momentumDirection(market.momentum);
              const observationColor = stageColors[market.observationStage.match(/^S[1-4]/)?.[0] as keyof typeof stageColors] ?? undefined;
              return <a key={market.code} className={`my-scan-card stage-${market.stage.toLowerCase()} clickable`} href={tradingViewChartUrlFor(market)} target="_blank" rel="noopener noreferrer" aria-label={`${market.name}，在TradingView新标签页打开`}>
                <div className="my-scan-card-head"><div><span>{indexKind(market)}</span><small>{market.exchange}</small></div><small>截至 {market.stageAsOf}</small></div>
                <div className="my-scan-card-title"><strong>{market.code === "GSPC.INDEX" ? "SPX" : market.code === "NDQ" ? "NDX" : market.code.replace(/^SZ/, "").replace(/\.(SH|SZ|CSI)$/, "")}</strong><span>{market.name}</span></div>
                {matches.length > 0 && <div className="my-scan-match-badges">{matchRules.filter((rule) => matches.includes(rule.id)).map((rule) => <span key={rule.id}>{rule.label}</span>)}</div>}
                <dl className="my-scan-card-meta">
                  <div><dt>当前阶段</dt><dd><b style={{ color: stageColors[market.stage] }}>{market.subStage}</b> · {market.stageDetail}</dd></div>
                  <div><dt>主阶段持续</dt><dd>{market.weeks}周</dd></div>
                  <div><dt>本阶段起始时间</dt><dd>{stageConfirmationTimeFor(market)}</dd></div>
                  <div><dt>本周观察</dt><dd style={{ color: observationColor }}>{market.observationStage === "UNCONFIRMED" ? market.observation : market.observationStage}</dd></div>
                  <div><dt>30周均线：</dt><dd style={{ color: maDirection === "上升" ? stageColors.S2 : maDirection === "下降" ? stageColors.S4 : undefined }}>{maDirection} · 近5周 {market.momentum.toFixed(2)}%</dd></div>
                </dl>
                {market.dataStatus === "cache" && <p className="my-scan-status warning">沿用缓存阶段结果</p>}
              </a>;
            })}
          </div>
        </>
      ) : loadError ? (
        <div className="my-scan-empty error"><p>{loadError}</p><button type="button" onClick={() => void onReload()}>重新读取</button></div>
      ) : loading && !assets.length ? (
        <div className="my-scan-empty"><p>正在读取我的扫描…</p></div>
      ) : !assets.length ? (
        <div className="my-scan-empty"><Search size={26} /><h3>还没有添加资产</h3><p>先选择市场，再输入精确资产代码。最多可添加20个。</p></div>
      ) : !filteredAssets.length ? (
        <div className="my-scan-empty"><Search size={26} /><h3>当前没有{stageFilter}资产</h3><p>再次点击已选阶段可恢复显示全部资产。</p></div>
      ) : (
        <div className="my-scan-grid">
          {filteredAssets.map((asset) => {
            const result = asset.result;
            const assetIndex = assets.findIndex((item) => item.assetKey === asset.assetKey);
            const staleAfterFailure = asset.scanStatus === "error" && Boolean(result);
            const observationLabel = result?.observationStage === "UNCONFIRMED"
              ? result.observation.match(/^S[1-4]/)?.[0] ?? result.observation
              : result?.observationStage;
            const observationStage = observationLabel?.match(/^S[1-4]/)?.[0] as keyof typeof stageColors | undefined;
            const maDirection = result ? momentumDirection(result.momentum) : "";
            const maColor = maDirection === "上升" ? stageColors.S2 : maDirection === "下降" ? stageColors.S4 : undefined;
            const openResult = () => {
              if (result) window.open(tradingViewChartUrlFor(result), "_blank", "noopener,noreferrer");
            };
            return (
              <article
                key={asset.assetKey}
                className={`my-scan-card ${result ? `stage-${result.stage.toLowerCase()} clickable` : "pending"}`}
                role={result ? "link" : undefined}
                tabIndex={result ? 0 : undefined}
                aria-label={result ? `${asset.displayCode} ${asset.name}，在TradingView新标签页打开` : undefined}
                onClick={result ? openResult : undefined}
                onKeyDown={result ? (event) => {
                  if (event.currentTarget !== event.target || (event.key !== "Enter" && event.key !== " ")) return;
                  event.preventDefault();
                  openResult();
                } : undefined}
              >
                <div className="my-scan-card-head">
                  <div><span>{asset.region}</span><small>{asset.exchange}</small></div>
                  <div className="my-scan-card-actions">
                    <button type="button" className="my-scan-order-button" onClick={(event) => { event.stopPropagation(); moveAsset(asset.assetKey, -1); }} disabled={reordering || assetIndex <= 0} aria-label={`前移 ${asset.displayCode}`} title="前移"><ChevronLeft size={15} /></button>
                    <small className="my-scan-position">{assetIndex + 1}</small>
                    <button type="button" className="my-scan-order-button" onClick={(event) => { event.stopPropagation(); moveAsset(asset.assetKey, 1); }} disabled={reordering || assetIndex >= assets.length - 1} aria-label={`后移 ${asset.displayCode}`} title="后移"><ChevronRight size={15} /></button>
                    <button type="button" className="my-scan-remove-button" onClick={(event) => { event.stopPropagation(); void removeAsset(asset); }} disabled={removing === asset.assetKey} aria-label={`移除 ${asset.displayCode}`}><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="my-scan-card-title"><strong>{asset.displayCode}</strong><span>{asset.name}</span></div>
                {result && asset.scanStatus === "fresh" && matchS2ScanRules(result).length > 0 && <div className="my-scan-match-badges">{matchRules.filter((rule) => matchS2ScanRules(result).includes(rule.id)).map((rule) => <span key={rule.id}>{rule.label}</span>)}</div>}
                {result ? (
                  <>
                    <dl className="my-scan-card-meta">
                      <div><dt>当前阶段</dt><dd><b style={{ color: stageColors[result.stage] }}>{result.subStage}</b> · {result.stageDetail}</dd></div>
                      <div><dt>主阶段持续</dt><dd>{result.weeks}周</dd></div>
                      <div><dt>本阶段起始时间</dt><dd>{stageConfirmationTimeFor(result)}</dd></div>
                      <div><dt>本周观察</dt><dd style={{ color: observationStage ? stageColors[observationStage] : undefined }}>{observationLabel}</dd></div>
                      <div><dt>30周均线：</dt><dd style={{ color: maColor }}>{maDirection} · 近5周 {result.momentum.toFixed(2)}%</dd></div>
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
