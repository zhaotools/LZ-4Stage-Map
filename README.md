# LZ 4Stage Map

LZ 4Stage Map 的公开静态网站，通过 GitHub Pages 发布：

<https://zhaotools.github.io/LZ-4Stage-Map/>

## 安全边界

本仓库只包含：

- 前端页面与静态资源
- 已生成的 `data/dashboard.json` 和 `public/data/dashboard.json`
- 静态构建与数据结构测试
- GitHub Pages 部署工作流

行情抓取、市场配置、历史行情缓存、LZ-4Stage 阶段计算和每周任务均位于私有仓库 `LZ-4Stage-Core`。公开仓库不执行阶段计算，也不保存计算核心。

## 本地预览

```bash
npm ci
npm run data:verify
npm run build:pages
```

开发预览：

```bash
npm run dev
```

私有核心每周生成两份内容一致的 JSON 文件并提交到本仓库；本仓库收到提交后仅校验、构建并发布 Pages。

## 网页自动同步

- 打开网页时检查一次；北京时间周六12:20、周一10:20各检查一次，不使用分钟级轮询；每次进入“我的扫描”也会读取最新结果。
- 页面隐藏、离线时不请求；错过检查点，在返回页面、恢复网络或浏览器恢复页面时补查。
- 全球地图从公开 JSON 获取；已打开的会员市场和两个扫描页通过原有 Supabase 权限获取，未打开的页面仍按需加载。
- 各快照独立比较 `generatedAt`，只有新版本替换显示，保持登录、菜单、筛选和滚动位置。请求失败保留旧数据，下一次返回时重试；30 秒超时取消请求。
- 时间配置位于 `app/lib/weekly-refresh.mjs`。这是固定时间检查，不是发布成功推送；若后端超出检查时间才发布，可能需要重新打开网页才能获取。
- 功能首次发布后，已打开的旧网页需要刷新一次才能加载自动同步代码。
