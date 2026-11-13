# 听屿 · 静态音乐播放器 POC

在线试用：https://talentjay-ux.github.io/tingyu-music-poc/

网易云风格的免登录前端，用于先验证 UI 和基本播放。没有依赖、没有服务器、没有账号系统，适合 GitHub Pages 的项目子路径。

## 已实现

- 响应式发现页、精选歌单、歌曲列表和底部常驻播放器。
- 真实音频播放、暂停、拖动进度、上一首 / 下一首、音量、随机和单曲循环、播放队列。
- 免登录收藏、最近播放、本地歌单的创建 / 编辑 / 删除 / 添加和移除歌曲。
- JSON 备份导入 / 导出，导入时保留已有歌单。
- 搜索本 POC 曲库；添加自定义 HTTPS 音频直链。
- 手机布局、空格播放、Cmd/Ctrl K 搜索、系统媒体键。

## 音源边界

`public/catalog.js` 中的三首 **SoundHelix 测试音频** 用于验证播放器，名称和作者按测试资源标注，绝不会替代成某一首真实中文歌曲。

歌曲海部分目前是从实际搜索页核实的 15 首周杰伦歌曲目录（来源链接为 `https://www.gequhai.com/play/{id}`），可以收藏、加入歌单和打开原曲来源；**尚未集成歌曲海的跨域搜索与播放解析**。GitHub Pages 本身无法运行服务端代理，且上游动态接口可能拒绝请求。后续完整版本需要一层接口服务或站方提供可跨域的 API。资源来自第三方，可能变更或不可用。

测试音频：[SoundHelix Audio Examples](https://www.soundhelix.com/audio-examples)，作者 T. Schürger。
装饰照片：Unsplash（远程图片）；字体：Google Fonts。所有主要交互不依赖图片或字体加载成功。

## 本地预览

解压后也可以直接用浏览器打开根目录的 **tingyu-poc.html**，它将页面、样式和脚本合并成了一个文件。测试音频、装饰照片和字体仍从网络加载。

```sh
npm run check
npm run build
python3 -m http.server 8080 --directory dist
```

打开 `http://localhost:8080`，点击首页“听听此刻的心情”即可播放。首播必须由用户点击触发，符合 iOS / Safari 自动播放限制。iOS 音量由系统控制；Safari 私密浏览等环境可能不持久化收藏。

## GitHub Pages

1. 创建一个名为 `tingyu-music-poc` 的空仓库，把本项目源文件推送到 `main`。
2. 仓库 `Settings → Pages → Build and deployment → Source` 选择 **GitHub Actions**。
3. 在 `Actions` 中运行 `Deploy Tingyu POC to GitHub Pages` 工作流（或再次推送 main）。
4. 工作流部署成功后，使用部署步骤 / Pages 设置里返回的站点链接访问。

也可以在不使用 Actions 的情况下直接把 `dist/` 的内容上传到 Pages 所用的分支根目录。

## 文件

- `public/index.html`：页面骨架。
- `public/styles.css`：响应式 UI。
- `public/app.js`：播放器与本地歌单交互。
- `public/catalog.js`：测试曲库、原曲目录和歌单。
- `scripts/build-static.mjs`：零依赖构建。
- `.github/workflows/pages.yml`：Pages 自动部署。

本地数据 key 为 `tingyu:poc:v1`。收藏仅存在当前浏览器，不跨设备同步。导出的备份包括你自己添加的音频 URL；分享备份前请确认其中没有私密链接。
