# 听屿 · 歌曲海手机前端

只为手机设计的音乐界面，使用歌曲海真实曲库。搜索、榜单、歌曲详情、播放链接、封面和歌词均来自歌曲海；播放器直接在应用内播放，歌单和收藏保存在当前浏览器。

## 功能

- 真实榜单：热门、新歌、飙升、怀旧、抖音、电音。
- 歌曲 / 歌手搜索与结果分页。
- 播放暂停、上一首 / 下一首、拖动进度、随机 / 单曲循环、播放队列、歌词和系统媒体控制。
- 收藏、最近播放、本地歌单创建 / 改名 / 删除、添加 / 移除 / 调整歌曲顺序。
- JSON 歌单备份及合并导入。旧版数据只迁移歌曲海数字歌曲 ID。
- 手机触控、底部导航、屏幕安全区域、16px 输入框。

## 结构

- `mobile/`：手机前端源文件。
- `src/gequhai.mjs`：歌曲海会话、解析、分页和缓存。
- `worker/api.mjs`：只读接口、CORS 和支持 Range 的音频代理。
- `scripts/dev-mobile.mjs`：本地开发服务器。
- `scripts/build-mobile-static.mjs`：前端静态构建及单文件发布包。
- `tests/backend-contract.mjs`：后端回归检查。
- `tests/mobile-integration-checks.mjs`：使用真实歌曲海数据的端到端接口检查。
- `IMPLEMENTATION_PLAN.md`：并行任务与验收计划。

## 运行

使用 Node.js 24，无需安装依赖。

```sh
npm run check
npm test
npm run dev
```

开发服务器默认 `http://127.0.0.1:4173/`；同源 `/api/*` 使用真实歌曲海接口。

```sh
npm run build
```

输出 `dist/client/` 和可部署到 GitHub Pages 的单文件 `tingyu-poc.html`。

## 部署

手机页面使用 GitHub Pages，当前发布路径为 `https://talentjay-ux.github.io/zhuadae/tingyu/`。源代码保留在本仓库。构建验证工作流不依赖本仓库的 Pages 设置。

音乐接口运行在 `https://tingyu-music-jay.xkcnjsfdny.chatgpt.site`。跨站部署时，由 HTML 的 `api-origin` 指定；GitHub 前端只发送公开歌曲查询，不携带服务密钥。接口必须允许匿名访问及 GitHub Pages 来源，才能在免登录页面使用。

音频接口只接受歌曲海数字歌曲 ID，并只代理歌曲海返回的允许域名。媒体请求不转发上游会话 Cookie 或跨站 Referer。不可播放的真实曲目返回明确错误，支持重试或切换下一首。

## 检查

```sh
NODE_USE_ENV_PROXY=1 node tests/mobile-integration-checks.mjs https://tingyu-music-jay.xkcnjsfdny.chatgpt.site
NODE_USE_ENV_PROXY=1 node tests/mobile-integration-checks.mjs http://127.0.0.1:4173 --worker
```

第一条检查公开部署，包括匿名访问；第二条直接执行相同 Worker 处理器并请求真实上游。测试覆盖多位歌手搜索、分页、榜单、真实音频、初始 / 中段 / 尾部 Range、跨域和无效输入。

歌单数据保存在 `tingyu:mobile:v2`，不跨设备自动同步。iOS 音量由系统控制，首次播放需要点击触发。上游网站或具体音源发生变化时，接口适配可能需要更新。
