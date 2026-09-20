import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { STAGE_PRESENTATION } from "../app/lib/stage-presentation.mjs";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const indexSource = await readFile(new URL("../pages-site/index.html", import.meta.url), "utf8");
const frameworkSource = await readFile(new URL("../public/lz-4stage-framework.svg", import.meta.url), "utf8");

test("introduction diagram uses the agreed four-stage names without a fixed route", () => {
  for (const [stage, name, season] of [
    ["S1", "低位整理", "春季"],
    ["S2", "上升趋势", "夏季"],
    ["S3", "高位整理", "秋季"],
    ["S4", "下降趋势", "冬季"],
  ]) {
    assert.match(frameworkSource, new RegExp(stage));
    assert.match(frameworkSource, new RegExp(name));
    assert.match(frameworkSource, new RegExp(season));
  }
  assert.doesNotMatch(frameworkSource, /marker-end|→|↗|↘/);
});

test("sidebar switches between the six stage-map collections", () => {
  assert.match(pageSource, /id="market-map-navigation-title">市场地图<\/h2>/);
  assert.match(pageSource, /id="member-tools-navigation-title">阶段扫描<\/h2>/);
  assert.match(pageSource, /<nav className="side-tools" aria-label="阶段扫描">/);
  assert.match(pageSource, /onClick=\{requestTrendRadar\}[^\n]+全球扫描<\/span>/);
  assert.match(pageSource, /onClick=\{requestStockRadar\}[^\n]+个股扫描<\/span>/);
  assert.ok(pageSource.indexOf("market-map-navigation-title") < pageSource.indexOf("member-tools-navigation-title"));
  assert.match(pageSource, /requestView\("global"\)/);
  assert.match(pageSource, /requestView\("crypto7"\)/);
  assert.match(pageSource, /requestView\("commodity"\)/);
  assert.match(pageSource, /requestView\("usSelected"\)/);
  assert.match(pageSource, /requestView\("chinaIndices"\)/);
  assert.match(pageSource, /requestView\("hkSelected"\)/);
  const desktopMarketMenu = pageSource.slice(pageSource.indexOf('<nav className="side-nav" aria-label="市场地图">'), pageSource.indexOf('</nav>', pageSource.indexOf('<nav className="side-nav" aria-label="市场地图">')));
  const mobileMarketMenu = pageSource.slice(pageSource.indexOf('id="mobile-market-menu"'), pageSource.indexOf('</div>', pageSource.indexOf('id="mobile-market-menu"')));
  const expectedMarketOrder = ["global", "usSelected", "chinaIndices", "hkSelected", "commodity", "crypto7"];
  for (const [view, label] of [
    ["usSelected", "美股市场"],
    ["chinaIndices", "A股市场"],
    ["hkSelected", "港股市场"],
  ]) {
    const navLine = desktopMarketMenu.split("\n").find((line) => line.includes(`requestView("${view}")`));
    assert.ok(navLine?.includes(`${label}</span>`));
  }
  for (const menuSource of [desktopMarketMenu, mobileMarketMenu]) {
    for (let index = 1; index < expectedMarketOrder.length; index += 1) {
      assert.ok(menuSource.indexOf(`requestView("${expectedMarketOrder[index - 1]}")`) < menuSource.indexOf(`requestView("${expectedMarketOrder[index]}")`));
    }
  }
  assert.match(pageSource, /const switchView = \(nextView: View\) => \{[\s\S]*?scrollPageToTop\(\);[\s\S]*?\};/);
  assert.match(pageSource, /const switchToTrendRadar = \(\) => \{[\s\S]*?setRadarActive\(true\);[\s\S]*?scrollPageToTop\(\);[\s\S]*?\};/);
  assert.match(pageSource, /const switchToStockRadar = \(\) => \{[\s\S]*?setStockRadarActive\(true\);[\s\S]*?scrollPageToTop\(\);[\s\S]*?\};/);
  assert.match(pageSource, /className="mobile-navigation-menus" aria-label="手机端导航" ref=\{mobileNavigationRef\}/);
  assert.match(pageSource, /aria-label="手机端市场地图"[\s\S]*aria-haspopup="menu"[\s\S]*aria-expanded=\{mobileMenuOpen === "market"\}/);
  assert.match(pageSource, /id="mobile-market-menu" role="menu" aria-label="市场地图"/);
  assert.match(pageSource, /requestView\("global"\); \}\}><Grid2X2[^\n]+<span>全球<\/span>/);
  assert.match(pageSource, /requestView\("crypto7"\); \}\}><BarChart3[^\n]+<span>加密<\/span>/);
  assert.match(pageSource, /requestView\("commodity"\); \}\}><Gem[^\n]+<span>商品<\/span>/);
  assert.match(pageSource, /requestView\("usSelected"\); \}\}><TrendingUp[^\n]+<span>美股<\/span>/);
  assert.match(pageSource, /requestView\("chinaIndices"\); \}\}><Landmark[^\n]+<span>A股<\/span>/);
  assert.match(pageSource, /requestView\("hkSelected"\); \}\}><Building2[^\n]+<span>港股<\/span>/);
  assert.match(pageSource, /aria-label="手机端阶段扫描"[\s\S]*aria-expanded=\{mobileMenuOpen === "tools"\}/);
  assert.match(pageSource, /<Radar size=\{15\} \/><span>阶段扫描<\/span><ChevronDown size=\{13\}/);
  assert.match(pageSource, /id="mobile-tools-menu" role="menu" aria-label="阶段扫描"/);
  assert.match(pageSource, /requestTrendRadar\(\); \}\}><Radar[^\n]+<span>全球扫描<\/span>/);
  assert.match(pageSource, /requestStockRadar\(\); \}\}><TrendingUp[^\n]+<span>个股扫描<\/span>/);
  assert.doesNotMatch(pageSource, /<select/);
  assert.match(pageSource, /const memberOnlyViews = new Set<MemberView>\(\["crypto7", "commodity", "usSelected", "chinaIndices", "hkSelected"\]\)/);
  assert.match(pageSource, /if \(!isMember && isMemberView\(nextView\)\)/);
  assert.match(pageSource, /LZ会员专享/);
  assert.match(pageSource, /登录会员账号后查看完整市场趋势地图/);
  assert.match(pageSource, /className="member-login-cta"/);
  assert.match(pageSource, /setMemberDialog\("login"\).*会员登录<\/button>/);
  assert.match(pageSource, /id="member-email"/);
  assert.match(pageSource, /id="member-password"/);
  assert.match(pageSource, /await signInMember\(memberEmail, memberPassword, captchaToken \?\? undefined\)/);
  assert.match(pageSource, /<TurnstileWidget siteKey=\{turnstileSiteKey\}/);
  assert.match(pageSource, /Boolean\(turnstileSiteKey\) && !captchaToken/);
  assert.match(pageSource, /profile = await getMemberProfile\(\)/);
  assert.match(pageSource, /if \(!isProfileActive\(profile\)\)/);
  assert.match(pageSource, /getMemberSnapshot<DashboardMarket>\(nextView\)/);
  assert.match(pageSource, /className="member-auth-button login-button"[^\n]+openMemberLogin[^\n]+authReady \? "登录" : "检查登录…"/);
  assert.match(pageSource, /className="member-username"[^\n]+aria-haspopup="menu" aria-expanded=\{accountMenuOpen\}/);
  assert.match(pageSource, /\{memberDisplayName\}<ChevronDown className=\{accountMenuOpen \? "open" : ""\}/);
  assert.match(pageSource, /className="member-submenu" role="menu" aria-label="会员账号菜单"/);
  assert.match(pageSource, /role="menuitem" onClick=\{openPasswordChange\}[^\n]+修改密码<\/button>/);
  assert.match(pageSource, /id="current-member-password"/);
  assert.match(pageSource, /id="new-member-password"/);
  assert.match(pageSource, /id="confirm-member-password"/);
  assert.match(pageSource, /await updateMemberPassword\(currentPassword, newPassword\)/);
  assert.match(pageSource, /新密码至少8位，并同时包含字母和数字/);
  assert.match(pageSource, /密码修改成功/);
  assert.match(pageSource, /当前账号已安全退出，请使用新密码重新登录/);
  assert.match(pageSource, /await signOutMember\(\)/);
  assert.match(pageSource, /handleMemberLogout[\s\S]+switchView\("global"\)/);
  assert.match(pageSource, /className="member-auth-button logout"[^\n]+handleMemberLogout[^\n]+退出<\/button>/);
  assert.match(pageSource, /LZ-4Stage Map｜四阶段分析/);
  assert.match(pageSource, /className=\{`stage-intro-link \$\{introductionActive \? "active" : ""\}`\}[^\n]+四阶段说明<\/button>/);
  assert.match(pageSource, /\{!isMember && <button className="member-auth-button register-member-button"[^\n]+注册会员<\/button>\}/);
  assert.ok(pageSource.indexOf("注册会员</button>") < pageSource.indexOf('className="member-auth-button login-button"'));
  assert.match(pageSource, /阶段数据截至：传统市场 \{globalDates.traditional\}｜加密市场 \{globalDates.crypto\}/);
  assert.match(pageSource, /阶段数据截至：\{commonConfirmationDate\}/);
  assert.match(pageSource, /数据生成于 \{formatDateTime\(activeGeneratedAt\)\}/);
  const footerSource = pageSource.slice(pageSource.indexOf("<footer>"), pageSource.indexOf("</footer>"));
  assert.match(footerSource, /footer-data-times/);
  assert.match(footerSource, /LZ-4Stage Map · 四阶段说明/);
  assert.match(footerSource, /LZ-4Stage Map · 自选阶段扫描/);
  assert.ok(footerSource.indexOf("阶段数据截至：传统市场") < footerSource.indexOf("数据生成于"));
  assert.doesNotMatch(pageSource.slice(pageSource.indexOf('<header className="topbar">'), pageSource.indexOf("</header>")), /确认至|confirmation-date/);
  assert.match(cssSource, /\.footer-data-times \{[^}]*display: flex;[^}]*font-size: 10px;[^}]*white-space: nowrap;/);
  assert.match(cssSource, /@media \(max-width: 780px\) \{\s*\.footer-data-times \{[^}]*display: block;[^}]*overflow-x: visible;[^}]*white-space: normal;[^}]*\}\s*\.footer-data-times span \{[^}]*display: block;[^}]*overflow-wrap: anywhere;/);
  assert.match(pageSource, /counts\[stage\]\} 个资产/);
  assert.doesNotMatch(pageSource, /title=\{chartLinkTitleFor/);
  assert.doesNotMatch(pageSource, /RefreshCw|刷新页面|window\.location\.reload/);
  assert.doesNotMatch(pageSource, />完整周线<\/span>/);
  assert.doesNotMatch(pageSource, /点击获取完整LZ-4Stage/);
  assert.doesNotMatch(pageSource, /点击获取完整版/);
  assert.match(pageSource, /注册成为LZ会员/);
  assert.match(pageSource, /LZ-4Stage全球市场趋势地图，可公开访问。/);
  assert.match(pageSource, /其他市场查询，以及市场扫描工具，需注册会员。/);
  assert.match(pageSource, /const \[introductionActive, setIntroductionActive\] = useState\(false\)/);
  assert.match(pageSource, /const openStageIntroduction = \(\) => \{[\s\S]+setIntroductionActive\(true\)/);
  assert.match(pageSource, /className="stage-introduction" aria-labelledby="stage-introduction-title"/);
  const introductionSource = pageSource.slice(pageSource.indexOf('<article className="stage-introduction"'), pageSource.indexOf("</article>", pageSource.indexOf('<article className="stage-introduction"')));
  const introductionParts = ["stage-introduction-hero", "stage-introduction-overview", "stage-introduction-stages", "stage-introduction-diagram", "stage-introduction-reading", "stage-introduction-faq"];
  for (const part of introductionParts) assert.ok(introductionSource.includes(part));
  for (let index = 1; index < introductionParts.length; index += 1) {
    assert.ok(introductionSource.indexOf(introductionParts[index - 1]) < introductionSource.indexOf(introductionParts[index]));
  }
  assert.match(introductionSource, /先看阶段，再看变化/);
  assert.match(introductionSource, /资产当前处在什么阶段？/);
  assert.match(introductionSource, /春夏秋冬只是帮助记忆的比喻，阶段不会按季节固定轮换/);
  assert.match(introductionSource, /认识四种市场阶段/);
  assert.equal((introductionSource.match(/className="stage-introduction-item /g) ?? []).length, 4);
  for (const [heading, description] of [
    ["低位整理 S1｜春季", "下跌后转为整理，方向尚未明确。留意价格与30周均线的变化，但这不等于已经见底。"],
    ["上升趋势 S2｜夏季", "价格呈上升结构，重点看趋势能否延续；短期仍可能回撤。"],
    ["高位整理 S3｜秋季", "高位反复整理，原有上升结构出现变化；这不等于已经见顶。"],
    ["下降趋势 S4｜冬季", "价格呈下降结构，重点看下行压力是否减弱；不代表接下来一定继续下跌。"],
  ]) {
    assert.ok(introductionSource.includes(`<h3>${heading}</h3><p>${description}</p>`));
  }
  assert.match(introductionSource, /<h2 id="stage-introduction-diagram-title">四阶段示意图<\/h2>/);
  assert.equal((introductionSource.match(/本图展示典型走势中细分阶段的大致位置/g) ?? []).length, 1);
  assert.equal((introductionSource.match(/lz-4stage-substages\.png/g) ?? []).length, 1);
  assert.ok(introductionSource.indexOf("lz-4stage-substages.png") < introductionSource.indexOf("stage-introduction-reading-title"));
  assert.doesNotMatch(introductionSource, /查看完整四阶段示意图|stage-introduction-details|lz-4stage-framework\.svg|<strong>细分阶段示意<\/strong>/);
  assert.match(introductionSource, /不代表阶段必须依次出现；30 周均线也不是唯一判断依据/);
  assert.match(introductionSource, /资产信息面板示例 · 非实时行情/);
  for (const field of ["当前阶段", "主阶段持续", "本阶段起始时间", "本周观察", "30周均线："]) {
    assert.match(introductionSource, new RegExp(`<dt>${field}</dt>`));
  }
  assert.match(introductionSource, /DEMO · 示例资产 A/);
  assert.equal((introductionSource.match(/className="stage-introduction-read-point"/g) ?? []).length, 3);
  assert.equal((introductionSource.match(/<details className="stage-introduction-disclosure"/g) ?? []).length, 3);
  for (const [stage, title] of Object.entries({
    S1: "低位整理",
    S2: "上升趋势",
    S3: "高位整理",
    S4: "下降趋势",
  })) {
    assert.equal(STAGE_PRESENTATION[stage].title, title);
    assert.match(pageSource, /const stageMeta:[^\n]+ = STAGE_PRESENTATION;/);
    assert.match(pageSource, /\{stage\} \{stageMeta\[stage\]\.season\}/);
  }
  assert.match(introductionSource, /阶段不会按季节固定轮换/);
  assert.match(introductionSource, /不等于已经见底/);
  assert.match(introductionSource, /不等于已经见顶/);
  assert.match(introductionSource, /不单独决定阶段/);
  assert.match(introductionSource, /不代表一定依次发生的未来走势/);
  assert.doesNotMatch(introductionSource, /筑底|向下一阶段过渡|→/);
  assert.match(cssSource, /\.stage-intro-link \{[^}]*text-decoration: underline;/);
  assert.match(cssSource, /\.stage-introduction \{ width: min\(820px, 100%\); margin: 0 auto;[^}]*text-align: center;/);
  assert.match(cssSource, /\.stage-introduction-diagram \{ width: 100%; margin: 16px auto;/);
  assert.match(cssSource, /\.stage-introduction-figure \{ width: 100%; margin: 0;/);
  assert.doesNotMatch(cssSource.match(/\.stage-introduction-image \{[^}]*\}/)?.[0] ?? "", /border|background|border-radius/);
  assert.match(cssSource, /\.stage-introduction-stages \{ width: 100%; margin: 0;[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(cssSource, /\.stage-introduction-stages \{ width: 100%; margin: 0;[^}]*gap: 22px 12px;/);
  assert.match(cssSource, /@media \(max-width: 780px\)[\s\S]*\.stage-introduction-stages \{[^}]*gap: 18px 10px;/);
  assert.match(cssSource, /@media \(max-width: 480px\)[\s\S]*\.stage-introduction-stages \{ gap: 16px 8px;/);
  assert.match(pageSource, /const week = isoWeek\(traditionalInterpretationDate \?\? commonStageAsOf\);/);
  assert.match(cssSource, /\.stage-introduction-item h3 \{[^}]*font-size: 17px;/);
  assert.match(cssSource, /\.stage-introduction-example-panel dl > div \{[^}]*grid-template-columns: 82px minmax\(0, 1fr\);/);
  assert.match(cssSource, /\.stage-introduction-read-points \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(cssSource, /@media \(max-width: 780px\)[\s\S]*\.stage-introduction-stages \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(cssSource, /@media \(max-width: 480px\)[\s\S]*\.stage-introduction-read-points \{ grid-template-columns: 1fr;/);
  assert.match(cssSource, /@media \(max-width: 480px\)[\s\S]*\.top-actions \{[^}]*flex-wrap: nowrap;[^}]*gap: 5px;/);
  assert.doesNotMatch(cssSource, /confirmation-label-(?:long|short)/);
  assert.match(cssSource, /footer \{ display: grid; grid-template-columns: 1fr auto 1fr;/);
  assert.doesNotMatch(pageSource, /<p>Power by LZ-4Stage<\/p>/);
  assert.doesNotMatch(pageSource, /"028528"/);
  assert.doesNotMatch(pageSource, /ADMIN_USERNAME_HASH|ADMIN_PASSWORD_HASH|MEMBER_STORAGE_KEY|hashText/);
  assert.doesNotMatch(pageSource, /ACCESS_STORAGE_KEY|ACCESS_PASSWORD_HASH|accessGranted/);
  assert.match(pageSource, /className="brand-mark" src=\{`\$\{import\.meta\.env\.BASE_URL\}lz-logo-v2\.png`\}/);
  assert.match(pageSource, /<strong>市场地图<\/strong><small>LZ-4Stage Map<\/small>/);
  assert.match(cssSource, /\.brand strong \{[^}]*font-size: 14px;[^}]*white-space: nowrap;/);
  assert.match(indexSource, /<title>全球市场趋势地图｜LZ-4Stage Map<\/title>/);
  assert.match(indexSource, /<meta property="og:title" content="全球市场趋势地图｜LZ-4Stage Map" \/>/);
  assert.match(indexSource, /<meta name="description" content="基于 LZ-4Stage 真实完整周线数据的全球市场趋势地图。" \/>/);
  assert.match(indexSource, /<meta property="og:description" content="基于 LZ-4Stage 真实完整周线数据的全球市场趋势地图。" \/>/);
  assert.match(indexSource, /href="\.\/favicon-v2\.png"/);
  assert.match(pageSource, /global: \{ mapKicker: "GLOBAL MARKET", mapTitle: "全球市场"/);
  assert.match(pageSource, /crypto7: \{ mapKicker: "CRYPTO MARKET", mapTitle: "加密市场"/);
  assert.match(pageSource, /commodity: \{ mapKicker: "COMMODITY MARKET", mapTitle: "商品市场"/);
  assert.match(pageSource, /usSelected: \{ mapKicker: "US MARKET", mapTitle: "美股市场"/);
  assert.match(pageSource, /chinaIndices: \{ mapKicker: "CHINA MARKET", mapTitle: "A股市场"/);
  assert.match(pageSource, /hkSelected: \{ mapKicker: "HONG KONG MARKET", mapTitle: "港股市场"/);
  assert.match(pageSource, /\{activeViewMeta\.mapKicker\}<\/span><h2>\{activeViewMeta\.mapTitle\}<\/h2>/);
  assert.match(pageSource, /"日股" \| "欧股"/);
  assert.match(pageSource, /LZ-4Stage Map｜四阶段分析/);
  for (const [view, title] of Object.entries({
    global: "全球市场趋势地图",
    usSelected: "美股市场趋势地图",
    chinaIndices: "A股市场趋势地图",
    hkSelected: "港股市场趋势地图",
    commodity: "商品市场趋势地图",
    crypto7: "加密市场趋势地图",
  })) {
    assert.match(pageSource, new RegExp(`${view}: "${title}"`));
  }
  assert.match(pageSource, /const activePageTitle = introductionActive \? "四阶段说明"[\s\S]*?myScanActive \? "自选阶段扫描"[\s\S]*?stockRadarActive \? "个股阶段扫描"[\s\S]*?radarActive \? "全球阶段扫描"[\s\S]*?: mapPageTitles\[view\]/);
  assert.match(pageSource, /document\.title = `\$\{activePageTitle\}｜LZ-4Stage Map`;/);
  assert.match(pageSource, /<h1>\{activePageTitle\}<\/h1>/);
  assert.doesNotMatch(pageSource, /<h1>全球市场四季图<\/h1>/);
  assert.doesNotMatch(pageSource, /LZ-Map · 全球资产四阶段观察|site-subtitle/);
  assert.match(cssSource, /\.topbar h1 \{[^}]*font-size: clamp\(20px, calc\(2\.2vw - 4px\), 30px\);/);
  assert.match(cssSource, /\.topbar \{[^}]*margin-bottom: 12px;/);
  assert.doesNotMatch(pageSource, /activeViewMeta\.(?:eyebrow|subtitle)/);
  assert.match(pageSource, /return region === "大宗·宏观" \? "宏观" : region/);
  assert.match(pageSource, /global: \["GSPC\.INDEX", "NDQ", "SOXX", "VIX", "000300\.SH", "SZ399006", "HSI", "HSTECH", "N225", "STOXX50E", "DXY", "US10Y", "XAU", "CL", "BTC-USD", "ETH-USD"\]/);
  assert.match(pageSource, /crypto7: \["HOOD", "CRCL", "COIN", "MSTR", "BTC-USD", "ETH-USD", "SOL-USD", "HYPE-USD"\]/);
  assert.match(pageSource, /commodity: \["DJP", "XAU", "XAG", "HG", "ALI", "CL", "NG", "ZC", "ZW", "ZS"\]/);
  assert.match(pageSource, /"SOL-USD": \{ shortCode: "SOL", cols: 3, rows: 2 \}/);
  assert.doesNotMatch(pageSource, /item\.code === "BTC-USD" \? 6/);
  assert.match(pageSource, /usSelected: \["GSPC\.INDEX", "NDQ", "RSP", "IWM", "VIX", "SOXX", "XLF", "XLE", "XLV", "XLI", "XLY", "NVDA", "MSFT", "AAPL", "AMZN", "TSLA", "BRK\.B", "WMT", "DXY", "US10Y"\]/);
  assert.match(pageSource, /label: "市场", className: "map-us-market"/);
  assert.match(pageSource, /label: "行业", className: "map-us-sector"/);
  assert.match(pageSource, /label: "核心资产", className: "map-us-leaders"/);
  assert.match(pageSource, /group="宏观" className="map-us-macro"/);
  assert.doesNotMatch(pageSource, /label: "(?:MARKET｜市场|SECTOR｜行业|LEADERS｜核心资产|INDEX|MEGA CAP|SECTOR)"/);
  assert.match(pageSource, /"BRK\.B": \{ shortCode: "BRK"/);
  assert.match(pageSource, /chinaIndices: \["000510\.SH", "000300\.SH", "000905\.SH", "000852\.SH", "000016\.SH", "SZ399006", "000688\.SH", "000985\.SH", "931865\.CSI", "930651\.CSI", "399975\.SZ", "399986\.SZ", "930708\.CSI", "399933\.SZ", "399997\.SZ", "930997\.CSI"\]/);
  assert.match(pageSource, /label: "市场", className: "map-china-market", codes: \["000510\.SH", "000300\.SH", "000905\.SH", "000852\.SH", "000016\.SH", "SZ399006", "000688\.SH", "000985\.SH"\]/);
  assert.match(pageSource, /label: "行业", className: "map-china-sector", codes: \["931865\.CSI", "930651\.CSI", "399975\.SZ", "399986\.SZ", "930708\.CSI", "399933\.SZ", "399997\.SZ", "930997\.CSI"\]/);
  assert.match(pageSource, /"931865\.CSI": \{ shortCode: "半导体"/);
  assert.match(pageSource, /"930651\.CSI": \{ shortCode: "计算机"/);
  assert.match(pageSource, /"930997\.CSI": \{ shortCode: "新能源车"/);
  assert.match(pageSource, /hkSelected: \["HSI", "HSTECH", "700\.HK", "9988\.HK", "5\.HK", "1299\.HK", "388\.HK", "939\.HK", "1810\.HK", "3690\.HK", "941\.HK", "883\.HK", "1211\.HK", "16\.HK", "2\.HK", "1093\.HK"\]/);
  assert.match(pageSource, /label: "指数", className: "map-hk-index", codes: \["HSI", "HSTECH"\]/);
  assert.match(pageSource, /label: "核心蓝筹", className: "map-hk-mega", codes: \["700\.HK", "9988\.HK", "5\.HK", "1299\.HK", "388\.HK", "939\.HK"\]/);
  assert.match(pageSource, /label: "行业代表", className: "map-hk-sector", codes: \["1810\.HK", "3690\.HK", "941\.HK", "883\.HK", "1211\.HK", "16\.HK", "2\.HK", "1093\.HK"\]/);
  assert.match(pageSource, /"5\.HK": \{ shortCode: "0005"/);
  assert.match(pageSource, /"388\.HK": \{ shortCode: "0388"/);
  assert.match(pageSource, /"16\.HK": \{ shortCode: "0016"/);
  assert.match(pageSource, /"2\.HK": \{ shortCode: "0002"/);
  assert.match(pageSource, /hydrateMarkets\(memberSnapshots\[view\]\?\.markets \?\? \[\]\)/);
  assert.match(cssSource, /\.view-crypto7 \.map-美股/);
  assert.match(pageSource, /label: "商品综合", className: "map-commodity-overall", codes: \["DJP"\]/);
  assert.match(pageSource, /label: "贵金属", className: "map-commodity-precious", codes: \["XAU", "XAG"\]/);
  assert.match(pageSource, /label: "工业金属", className: "map-commodity-industrial", codes: \["HG", "ALI"\]/);
  assert.match(pageSource, /label: "能源", className: "map-commodity-energy", codes: \["CL", "NG"\]/);
  assert.match(pageSource, /label: "农产品", className: "map-commodity-agriculture", codes: \["ZC", "ZW", "ZS"\]/);
  assert.match(cssSource, /\.view-commodity \.map-commodity-overall \{ grid-area: 1 \/ 1 \/ 5 \/ 5; \}/);
  assert.match(cssSource, /\.view-commodity \.map-commodity-agriculture \{ grid-area: 5 \/ 6 \/ 9 \/ 13; \}/);
  assert.match(cssSource, /\.view-crypto7 \{ height: clamp\(380px, 41\.333vh, 480px\); \}/);
  assert.match(cssSource, /@media \(max-width: 1180px\)[\s\S]*?\.view-crypto7 \{ height: 413px; \}/);
  assert.match(cssSource, /@media \(max-width: 780px\)[\s\S]*?\.view-crypto7 \.map-group \{ height: 180px; \}/);
  assert.match(cssSource, /\.map-tile > strong \{ font-size: clamp\(15px, calc\(1\.25vw \+ 2px\), 23px\);/);
  assert.match(cssSource, /\.map-tile > span \{[^}]*font-size: clamp\(10px, calc\(\.67vw \+ 2px\), 12px\); \}/);
  assert.match(cssSource, /\.map-tile b \{[^}]*font-size: 12px; \}\.map-tile em \{[^}]*font-size: 12px;/);
  assert.match(cssSource, /\.single-map \.map-tile > strong \{ font-size: clamp\(20px, calc\(2vw \+ 2px\), 30px\); \}/);
  assert.match(cssSource, /\.crypto-status-badge \{[^}]*font-size: 14px;/);
  assert.match(cssSource, /@media \(max-width: 1180px\)[\s\S]*?\.map-tile > strong \{ font-size: 16px; \}\.map-tile > span \{ font-size: 10px; \}/);
  assert.match(cssSource, /@media \(max-width: 780px\)[\s\S]*?\.map-tile > strong \{ font-size: 16px; \}/);
  assert.match(cssSource, /@media \(max-width: 780px\)/);
  assert.match(cssSource, /\.mobile-navigation-menus \{ display: none; \}/);
  assert.match(cssSource, /@media \(max-width: 780px\)[\s\S]*\.mobile-navigation-menus \{[^}]*display: flex;/);
  assert.match(cssSource, /\.mobile-dropdown-panel \{ position: absolute;/);
  assert.match(cssSource, /\.mobile-menu-trigger\.open \{ color: #fff; background: #2e68df;/);
  assert.match(cssSource, /\.nav-label \{ display: inline-flex;/);
  assert.match(cssSource, /\.member-auth-button \{ height: 36px;/);
  assert.match(cssSource, /\.member-account \{ min-height: 36px;/);
  assert.match(cssSource, /\.topbar \{ display: flex; justify-content: space-between; align-items: flex-start;/);
  assert.doesNotMatch(cssSource, /\.app-shell\.access-locked/);
  assert.match(pageSource, /crypto7: \{[^}]*groups: \["加密", "美股"\]/);
  assert.match(cssSource, /\.view-crypto7 \.map-加密 \{ grid-area: 1 \/ 1 \/ 9 \/ 7; \}/);
  assert.match(cssSource, /\.view-crypto7 \.map-美股 \{ grid-area: 1 \/ 7 \/ 9 \/ 13; \}/);
  assert.match(cssSource, /\.view-usSelected \.map-us-market \{ grid-area: 1 \/ 1 \/ 4 \/ 11; \}/);
  assert.match(cssSource, /\.view-usSelected \.map-us-sector \{ grid-area: 4 \/ 1 \/ 7 \/ 11; \}/);
  assert.match(cssSource, /\.view-usSelected \.map-us-leaders \{ grid-area: 7 \/ 1 \/ 10 \/ 11; \}/);
  assert.match(cssSource, /\.view-usSelected \.map-us-macro \{ grid-area: 1 \/ 11 \/ 10 \/ 13; \}/);
  assert.match(cssSource, /\.view-usSelected \.map-us-market \.map-tiles \{ grid-template-columns: repeat\(5,/);
  assert.match(cssSource, /\.view-usSelected \.map-us-sector \.map-tiles \{ grid-template-columns: repeat\(6,/);
  assert.match(cssSource, /\.view-usSelected \.map-us-leaders \.map-tiles \{ grid-template-columns: repeat\(7,/);
  assert.match(cssSource, /\.view-usSelected\.single-map \.map-大宗-宏观 \.map-tiles \{ grid-template-columns: repeat\(2,/);
  assert.match(cssSource, /\.view-chinaIndices \.map-china-market \{ grid-area: 1 \/ 1 \/ 5 \/ 13; \}/);
  assert.match(cssSource, /\.view-chinaIndices \.map-china-sector \{ grid-area: 5 \/ 1 \/ 9 \/ 13; \}/);
  assert.match(cssSource, /\.view-chinaIndices \.map-china-market \.map-tiles, \.view-chinaIndices \.map-china-sector \.map-tiles \{ grid-template-columns: repeat\(4,/);
  assert.match(cssSource, /\.view-hkSelected \.map-hk-index \{ grid-area: 1 \/ 1 \/ 3 \/ 13; \}/);
  assert.match(cssSource, /\.view-hkSelected \.map-hk-mega \{ grid-area: 3 \/ 1 \/ 6 \/ 13; \}/);
  assert.match(cssSource, /\.view-hkSelected \.map-hk-sector \{ grid-area: 6 \/ 1 \/ 9 \/ 13; \}/);
  assert.match(cssSource, /\.view-hkSelected \.map-hk-index \.map-tiles \{ grid-template-columns: repeat\(2,/);
  assert.match(cssSource, /\.view-hkSelected \.map-hk-mega \.map-tiles \{ grid-template-columns: repeat\(3,/);
  assert.match(cssSource, /\.view-hkSelected \.map-hk-sector \.map-tiles \{ grid-template-columns: repeat\(4,/);
  assert.match(pageSource, /className="distribution-fill"/);
  assert.match(pageSource, /color: percent === 100 \? "#fff" : stageMeta\[stage\]\.color, textShadow: percent === 100 \? "none" : undefined/);
  assert.match(pageSource, /color-mix\(in srgb, \$\{stageMeta\[stage\]\.color\} 14%, var\(--canvas\)\)/);
  assert.match(pageSource, /style=\{\{ width: `\$\{percent\}%`/);
  assert.match(cssSource, /\.distribution-segment \{[^}]*flex: 1 1 0;/);
  assert.match(cssSource, /\.distribution-fill \{[^}]*inset: 0 0 0 auto;/);
  assert.match(cssSource, /\.map-大宗-宏观 \{ grid-area: 5 \/ 1 \/ 9 \/ 5; \}/);
  assert.match(cssSource, /\.map-加密 \{ grid-area: 5 \/ 5 \/ 9 \/ 8; \}/);
  assert.match(cssSource, /\.map-日股 \{ grid-area: 5 \/ 8 \/ 9 \/ 10; \}/);
  assert.match(cssSource, /\.map-欧股 \{ grid-area: 5 \/ 10 \/ 9 \/ 13; \}/);
});

test("map empty state names stage observations without implying a confirmed change", () => {
  assert.match(pageSource, /<span>本周暂无新的阶段观察变化<\/span>/);
  assert.doesNotMatch(pageSource, /本周暂无新的观察变化/);
});
