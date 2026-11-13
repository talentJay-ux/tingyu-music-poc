// The only upstream is the public Gequhai website. No account or user cookie is used.
export const ORIGIN = 'https://www.gequhai.com';
const cache = new Map();
const cookies = new Map();
const pending = new Map();
let sessionReady;
let sessionStarted = 0;
const UA = 'Mozilla/5.0';
export class SourceError extends Error {
  constructor(message, status = 502, code = 'SOURCE_UNAVAILABLE') { super(message); this.status = status; this.code = code; }
}
export function decode(text = '') {
  return text.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, x) => { const n = x[0].toLowerCase() === 'x' ? parseInt(x.slice(1), 16) : Number(x); return n <= 0x10ffff ? String.fromCodePoint(n) : ''; })
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}
const plain = s => decode(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const safeImage = s => { if (typeof s !== 'string' || !s.trim()) return ''; try { const u = new URL(decode(s), ORIGIN); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
export function parseSongs(html) {
  const songs = [], seen = new Set();
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = match[1], link = row.match(/<a\b[^>]*href=["'](?:https:\/\/www\.gequhai\.com)?\/play\/(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!link || seen.has(link[1])) continue;
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x => x[1]);
    let titleIndex = cells.findIndex(c => c.includes('/play/' + link[1]));
    const title = plain(link[2]) || plain(cells[titleIndex] || '');
    if (!title) continue;
    const img = row.match(/<img[^>]*(?:data-src|data-original|src)=["']([^"']+)["']/i);
    songs.push({ id: link[1], title, artist: plain(cells[titleIndex + 1] || '') || '未知歌手', cover: img ? safeImage(decode(img[1])) : '', source: 'gequhai' });
    seen.add(link[1]);
  }
  return songs;
}
function variable(html, key) {
  const match = html.match(new RegExp('(?:window\\.)?\\b' + key + '["\']?\\s*[:=]\\s*("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'|[0-9]+)', 'i'));
  if (!match) return '';
  const v = match[1];
  if (v[0] === '"') { try { return JSON.parse(v); } catch { return v.slice(1, -1); } }
  return v[0] === "'" ? v.slice(1, -1).replace(/\\'/g, "'").replace(/\\\//g, '/').replace(/\\n/g, '\n') : v;
}
export function parseDetail(html, id) {
  const lyric = html.match(/<div[^>]*id=["']content-lrc2["'][^>]*>([\s\S]*?)<\/div>/i);
  const title = variable(html, 'mp3_title');
  return { id, title, artist: variable(html, 'mp3_author'), cover: safeImage(variable(html, 'mp3_cover')), playId: variable(html, 'play_id') || variable(html, 'mp3_id') || id, type: variable(html, 'mp3_type') || '0', lyrics: lyric ? decode(lyric[1].replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '')).trim().slice(0, 24000) : '' };
}
function rememberCookie(response) {
  const values = response.headers.getSetCookie?.() || (response.headers.get('set-cookie') || '').split(/,(?=\s*[^;,=]+=[^;,]+)/);
  for (const c of values) {
    const pair = c.split(';')[0], at = pair.indexOf('=');
    if (at <= 0) continue;
    const name = pair.slice(0, at).trim();
    const maxAge = c.match(/;\s*max-age=(-?\d+)/i);
    const expires = c.match(/;\s*expires=([^;]+)/i);
    const expiry = maxAge ? Date.now() + Number(maxAge[1]) * 1000 : expires ? Date.parse(expires[1]) : Date.now() + 3600000;
    if (Number.isFinite(expiry) && expiry <= Date.now()) cookies.delete(name);
    else cookies.set(name, { value: pair.slice(at + 1), expires: Number.isFinite(expiry) ? expiry : Date.now() + 3600000 });
  }
}
function cookieHeader() {
  for (const [name, cookie] of cookies) if (cookie.expires <= Date.now()) cookies.delete(name);
  return [...cookies].map(([k, v]) => k + '=' + v.value).join('; ');
}
async function upstream(path, options = {}) {
  // Complete the site's ordinary HTTP session once when it sets a session cookie.
  // A persistent rejection is surfaced to the user; no challenge solving or evasion.
  for (let attempt = 0; attempt < 2; attempt++) {
    let response;
    try {
      response = await fetch(ORIGIN + path, { ...options, headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9', Referer: ORIGIN + '/', Cookie: cookieHeader(), ...options.headers }, signal: AbortSignal.timeout(18000) });
    } catch { throw new SourceError('暂时连接不上歌曲海，请稍后重试。'); }
    const hadCookie = response.headers.has('set-cookie'); rememberCookie(response);
    if (response.status === 403 && hadCookie && attempt === 0) { await response.body?.cancel(); continue; }
    if (!response.ok) { await response.body?.cancel(); throw new SourceError('歌曲海暂时拒绝了连接（HTTP ' + response.status + '），请稍后重试。', 502, 'UPSTREAM_' + response.status); }
    const text = await response.text();
    if (text.length < 500 && /window\.location/.test(text)) throw new SourceError('歌曲海暂时无法提供这首歌曲，请稍后重试。');
    return text;
  }
}
async function cached(key, ttl, fn) {
  const old = cache.get(key);
  if (old && old.expires > Date.now()) return old.value;
  if (pending.has(key)) return pending.get(key);
  const work = fn(); pending.set(key, work);
  let value;
  try { value = await work; } finally { pending.delete(key); }
  if (cache.size > 150) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expires: Date.now() + ttl });
  return value;
}
async function session() {
  if (!sessionReady || Date.now() - sessionStarted > 1800000) {
    sessionStarted = Date.now();
    sessionReady = upstream('/').catch(() => {}).then(() => true);
  }
  await sessionReady;
}
export async function searchSongs(q, page = 1) {
  const keyword = String(q || '').trim();
  if (!keyword || keyword.length > 50) throw new SourceError('请输入 1–50 个字的歌名或歌手。', 400, 'INVALID_QUERY');
  page = Math.max(1, Math.min(200, Math.floor(Number(page) || 1)));
  return cached('s:' + keyword + ':' + page, 300000, async () => {
    await session();
    const body = new URLSearchParams({ keyword });
    const check = await upstream('/api/s', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' }, body });
    let result; try { result = JSON.parse(check); } catch { throw new SourceError('歌曲海的搜索接口返回了无法识别的数据。'); }
    if (result.code !== 1) throw new SourceError(plain(String(result.msg || '歌曲海暂时无法搜索，请稍后重试。')));
    const html = await upstream('/search?s=' + encodeURIComponent(keyword) + (page > 1 ? '&page=' + page : ''));
    const pages = [...html.matchAll(/[?&](?:amp;)?page=(\d+)/g)].map(m=>Number(m[1]));
    const totalPages = Math.max(page, 1, ...pages), songs = parseSongs(html);
    // Gequhai's heading counts this page's rows rather than the full result set.
    return { songs, page, total: totalPages === 1 ? songs.length : null, totalPages, hasMore: totalPages > page, source: 'gequhai', checkedAt: new Date().toISOString() };
  });
}
export async function chartSongs(kind) {
  const paths = { hot: '/hot-music/', new: '/top/new', surge: '/top/surge', classic: '/top/jingdian', douyin: '/top/douyin', electronic: '/top/dianyin' };
  if (!paths[kind]) throw new SourceError('未知榜单。', 400, 'INVALID_CHART');
  return cached('chart:' + kind, 600000, async () => {
    await session();
    const songs = parseSongs(await upstream(paths[kind]));
    if (!songs.length) throw new SourceError('歌曲海的榜单暂时没有返回歌曲，请尝试搜索。');
    return { songs, source: 'gequhai', checkedAt: new Date().toISOString() };
  });
}
export async function songDetail(id) {
  if (!/^\d{1,12}$/.test(id)) throw new SourceError('无效的歌曲编号。', 400, 'INVALID_ID');
  return cached('detail:' + id, 600000, async () => {
    await session();
    const detail = parseDetail(await upstream('/play/' + id), id);
    if (!detail.title || !detail.artist) throw new SourceError('歌曲海没有返回这首歌的完整信息，请稍后重试。', 502, 'INVALID_SONG_DETAIL');
    return detail;
  });
}
export async function songPlayback(id) {
  return cached('play:' + id, 90000, async () => {
  const detail = await songDetail(id);
  if (detail.type === '1') throw new SourceError('这首歌在歌曲海暂时没有在线音源。', 404, 'NO_ONLINE_SOURCE');
  const response = await upstream('/api/music', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'http', 'X-Custom-Header': 'Key', Origin: ORIGIN, Referer: ORIGIN + '/play/' + id }, body: new URLSearchParams({ id: detail.playId, type: detail.type }) });
  let data; try { data = JSON.parse(response); } catch { throw new SourceError('歌曲海的播放接口返回了无法识别的数据。'); }
  let url = data?.data?.url;
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) throw new SourceError(data.code === 430 ? '这首歌在歌曲海暂时没有在线音源。' : plain(String(data.msg || '这首歌暂时没有可用的播放链接。')), data.code === 430 ? 404 : 502, data.code === 430 ? 'NO_ONLINE_SOURCE' : 'NO_PLAYBACK_URL');
  if (url.startsWith('http://')) url = 'https://' + url.slice(7);
  return { ...detail, url, source: 'gequhai', sourceUrl: ORIGIN + '/play/' + id };
  });
}
