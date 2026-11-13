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

手机页面使用本仓库的 GitHub Pages：`https://talentjay-ux.github.io/tingyu-music-poc/`。原测试入口 `https://talentjay-ux.github.io/zhuadae/tingyu/` 同步保留手机版本。推送 main 后自动检查、构建并部署本仓库页面。

音乐接口运行在 `https://tingyu-music-jay.xkcnjsfdny.chatgpt.site`。跨站部署时，由 HTML 的 `api-origin` 指定；GitHub 前端只发送公开歌曲查询，不携带服务密钥。接口必须允许匿名访问及 GitHub Pages 来源，才能在免登录页面使用。

音频接口只接受歌曲海数字歌曲 ID，并只代理歌曲海返回的允许域名。媒体请求不转发上游会话 Cookie 或跨站 Referer。不可播放的真实曲目返回明确错误，支持重试或切换下一首。

## 检查

```sh
NODE_USE_ENV_PROXY=1 node tests/mobile-integration-checks.mjs https://tingyu-music-jay.xkcnjsfdny.chatgpt.site
NODE_USE_ENV_PROXY=1 node tests/mobile-integration-checks.mjs http://127.0.0.1:4173 --worker
```

第一条检查公开部署，包括匿名访问；第二条直接执行相同 Worker 处理器并请求真实上游。测试覆盖多位歌手搜索、分页、榜单、真实音频、初始 / 中段 / 尾部 Range、跨域和无效输入。

歌单数据保存在 `tingyu:mobile:v2`，不跨设备自动同步。iOS 音量由系统控制，首次播放需要点击触发。上游网站或具体音源发生变化时，接口适配可能需要更新。

## 搜索与播放模式

Pages 首先使用歌曲海实时搜索的返回顺序和分页。实时查询失败时，从本机最近成功的搜索和随站发布的关键词索引中查询，并标记为本地结果。「数据与设置 → 原站搜索与播放」可让榜单、搜索、收藏、歌单和队列直接打开歌曲海首方页面。首方页面的播放器自行取得当前音频，听屿的列表仍按歌曲 ID 保存在原浏览器。

支持用户脚本的手机浏览器还可以打开 `source-mode.html`，安装构建生成的 `tingyu.user.js`。它只在 `https://www.gequhai.com/...#/tingyu/...` 启动，以歌曲海自己的 origin 读取搜索、榜单、歌词及按需播放地址。此模式使用该 origin 的本地存储，歌单可以通过导出和导入转移。

公开 sitemap 提供 URL，没有歌名或歌手。`scripts/inspect-sitemap.py --ids ids.json` 遍历其中列出的页面，`scripts/pack-sitemap.py ids.json` 生成仅按需加载的编号表。`node scripts/enrich-sitemap.mjs 100` 可分批补充可读的歌名、歌手，临时上游错误不会清空既有记录。完整编号表不代表完整标题索引；搜索无匹配时仍可前往同一关键词的原站结果。
