"use client";

export type StageDurationHistory = {
  schemaVersion: "lz-stage-duration-v1";
  asOf: string;
  observedFrom: string;
  completeRunsAvailable: number;
  segments: Array<{ stage: string; start: string; end: string; weeks: number; ongoing: boolean; startIncomplete: boolean; missingWeeks: boolean }>;
};
type Asset = { code: string; shortCode: string; name: string; region: string; stage: string; subStage: string; weeks: number; stageAsOf: string; cryptoFreshness?: string; dataStatus: string; stageDurations?: StageDurationHistory | null };
const colors: Record<string, string> = { S1: "#397ff6", S2: "#10a36d", S3: "#e58a00", S4: "#ee4055" };
function usable(asset: Asset) {
  const history = asset.stageDurations;
  const current = history?.segments.at(-1);
  return asset.cryptoFreshness !== "unavailable" && history?.schemaVersion === "lz-stage-duration-v1"
    && history.asOf === asset.stageAsOf && current?.ongoing && current.stage === asset.stage && current.weeks === asset.weeks;
}
export function StageDurationChart({ assets }: { assets: Asset[] }) {
  const maxWeeks = Math.max(10, ...assets.filter(usable).map(asset => asset.stageDurations!.segments.reduce((sum, segment) => sum + segment.weeks, 0)));
  const scale = Math.ceil(maxWeeks / 10) * 10;
  return <section className="stage-duration-panel" aria-labelledby="stage-duration-title">
    <div className="map-panel-head"><div><span className="section-kicker">STAGE HISTORY</span><h2 id="stage-duration-title">阶段历程与持续时间</h2><p>最近3段已结束主阶段＋当前主阶段 · 按真实发生顺序排列</p></div></div>
    <p className="duration-explanation">横轴为累计周数，各资产起始日期不同；虚线框表示当前进行中阶段。已持续时间不代表阶段完成比例，也不预测剩余时间。</p>
    <div className="duration-scroll" tabIndex={0} aria-label="阶段历史对比，可横向滚动">
      <div className="duration-table">
        <div className="duration-row duration-header"><span>资产</span><span>主阶段持续时间（周）</span><span>当前阶段</span></div>
        <div className="duration-row duration-axis"><span /><svg viewBox="0 0 600 24" aria-hidden="true">{[0,1,2,3,4].map(i => <text key={i} x={i * 148 + 3} y="16" textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}>{scale * i / 4}</text>)}</svg><span /></div>
        {[{ name: "加密资产", crypto: true }, { name: "加密相关股票", crypto: false }].map(group => <div key={group.name}>
          <h3 className="duration-group">{group.name}</h3>
          {assets.filter(asset => (asset.region === "加密") === group.crypto).map(asset => {
            const history = usable(asset) ? asset.stageDurations : null;
            let offset = 0;
            return <div className="duration-asset" key={asset.code}>
              <div className="duration-row">
                <div className="duration-name"><strong>{asset.shortCode}</strong><span>{asset.name}</span></div>
                {history ? <svg className="duration-bars" viewBox="0 0 600 48" role="img" aria-label={history.segments.map(s => `${s.stage} ${s.weeks}周${s.ongoing ? "，进行中" : "，已结束"}${s.startIncomplete ? "，起点不完整" : ""}${s.missingWeeks ? "，历史有缺周" : ""}`).join("；")}>
                  {[0,1,2,3,4].map(i => <line key={i} x1={i * 148 + 3} y1="0" x2={i * 148 + 3} y2="48" stroke="#e5ebf3" />)}
                  {history.segments.map((segment, index) => {
                    const x = 3 + offset / scale * 592;
                    const width = segment.weeks / scale * 592;
                    offset += segment.weeks;
                    return <g key={`${segment.start}-${index}`}><rect x={x} y="5" width={width} height="38" fill={colors[segment.stage]} fillOpacity={segment.ongoing ? .7 : 1} stroke={segment.ongoing ? "#233c60" : "none"} strokeWidth="1.5" strokeDasharray={segment.ongoing ? "4 3" : undefined} />{width >= 48 && <text x={x + width / 2} y="29" textAnchor="middle" fill="white">{segment.stage} · {segment.weeks}周</text>}</g>;
                  })}
                </svg> : <div className="duration-empty">{asset.cryptoFreshness === "unavailable" ? "数据暂不可用" : "历史待同步"}</div>}
                <div className="duration-current">{asset.cryptoFreshness === "unavailable" ? <span>—</span> : <><strong style={{ color: colors[asset.stage] }}>{asset.subStage}</strong><span>{history?.segments.at(-1)?.startIncomplete ? "已观察" : "已持续"} {asset.weeks} 周 · 进行中</span></>}</div>
              </div>
              {history && <div className="duration-notes">
                <span>{history.segments.map(s => `${s.stage} ${s.weeks}周${s.ongoing ? "（进行中）" : ""}`).join(" → ")}</span>
                {history.segments.length < 4 && <span>可用完整历史不足3段，按实际显示。</span>}
                {history.segments.at(-1)?.startIncomplete && <span>当前阶段起点不完整，周数仅为已观察长度。</span>}
                {history.segments.at(-1)?.missingWeeks && <span>当前阶段历史存在缺周。</span>}
                {(asset.cryptoFreshness === "pending" || asset.dataStatus === "cache") && <span>保留缓存历史，确认数据截至 {history.asOf}。</span>}
                <details><summary>查看阶段日期</summary><ul>{history.segments.map(s => <li key={s.start}>{s.stage}：{s.start} 至 {s.end} · {s.weeks}周 · {s.ongoing ? "进行中" : "已结束"}{s.startIncomplete ? " · 起点不完整" : ""}</li>)}</ul><p>日期为数据源周线标签（加密为周一、美股通常为周五），不是北京时间收盘时刻。</p></details>
              </div>}
            </div>;
          })}
        </div>)}
      </div>
    </div>
    <div className="duration-legend">{Object.entries(colors).map(([stage,color],i) => <span key={stage}><i style={{ background:color }} />{stage} · {["春季","夏季","秋季","冬季"][i]}</span>)}<span>不拼接缺失阶段，不计入尚未确认的本周观察。</span></div>
  </section>;
}
