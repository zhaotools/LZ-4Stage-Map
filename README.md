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
