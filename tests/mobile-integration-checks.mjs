// Live, anonymous integration checks for the mobile Gequhai replacement.
// Run: NODE_USE_ENV_PROXY=1 node tests/mobile-integration-checks.mjs https://API_ORIGIN
// This deliberately uses no authentication: the GitHub Pages player must work anonymously.
// Optional --worker runs the identical Worker handler in-process with real upstream fetches.
import assert from 'node:assert/strict';

const base = new URL(process.argv[2] || 'https://tingyu-music-jay.xkcnjsfdny.chatgpt.site');
const origin = 'https://talentjay-ux.github.io';
const worker = process.argv.includes('--worker') ? (await import('../worker/api.mjs')).default : null;
const results = [];
const songs = [];
const summary = { api: base.origin, transport: worker ? 'in-process Worker, real upstream' : 'HTTP', checkedAt: new Date().toISOString() };

async function check(name, fn) {
  try { const details = await fn(); results.push({ name, ok: true, ...details }); console.error('PASS ' + name); }
  catch (error) { results.push({ name, ok: false, error: error.message }); console.error('FAIL ' + name + ': ' + error.message); }
}

async function request(path, options = {}) {
  const optionsForRequest = {
    ...options,
    redirect: 'manual',
    headers: { Origin: origin, ...options.headers },
    signal: AbortSignal.timeout(65000),
  };
  return worker ? worker.fetch(new Request(new URL(path, base), optionsForRequest), {}, { waitUntil() {} }) : fetch(new URL(path, base), optionsForRequest);
}

async function json(path) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}; expected anonymous JSON`);
  assert.equal(response.headers.get('access-control-allow-origin'), origin, `${path}: missing GitHub Pages CORS`);
  assert.match(response.headers.get('content-type') || '', /application\/json/i, `${path}: returned a sign-in/HTML page`);
  const value = await response.json();
  assert.ok(!value.error, `${path}: ${value.error || ''} ${value.message || ''}`);
  return value;
}

function assertSongs(value, label) {
  assert.ok(Array.isArray(value.songs) && value.songs.length > 0, `${label}: empty song list`);
  for (const song of value.songs) {
    assert.match(String(song.id), /^\d{1,12}$/, `${label}: non-Gequhai/demo ID ${song.id}`);
    assert.equal(song.source, 'gequhai', `${label}: unexpected source`);
    assert.ok(typeof song.title === 'string' && song.title.trim(), `${label}: missing title`);
    assert.ok(typeof song.artist === 'string' && song.artist.trim(), `${label}: missing artist`);
    assert.ok(!/soundhelix|测试音频|demo-/i.test(JSON.stringify(song)), `${label}: demo data leaked`);
  }
}

await check('anonymous API and source identity', async () => {
  const value = await json('/api/health');
  assert.equal(value.ok, true);
  assert.equal(value.source, 'gequhai');
  return { version: value.version };
});

await check('Range preflight from GitHub Pages', async () => {
  const response = await request('/api/audio/326', { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'Range' } });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.match(response.headers.get('access-control-allow-headers') || '', /range/i);
});

for (const keyword of ['周杰伦', '林俊杰', '陈奕迅']) {
  await check(`real search: ${keyword}`, async () => {
    const value = await json('/api/search?q=' + encodeURIComponent(keyword) + '&page=1');
    assertSongs(value, keyword);
    const match = value.songs.find(song => song.artist.includes(keyword));
    assert.ok(match, `${keyword}: no matching artist in source search`);
    songs.push(match);
    if (keyword === '周杰伦') summary.jayFirstPage = value;
    return { count: value.songs.length, firstId: match.id, firstTitle: match.title, artist: match.artist, hasMore: value.hasMore };
  });
}

await check('real search pagination advances IDs', async () => {
  const first = summary.jayFirstPage;
  assert.ok(first, 'First search page unavailable');
  assert.equal(first.hasMore, true, '周杰伦 search unexpectedly has no further page');
  const second = await json('/api/search?q=' + encodeURIComponent('周杰伦') + '&page=2');
  assertSongs(second, 'page 2');
  const seen = new Set(first.songs.map(song => song.id));
  assert.ok(second.songs.some(song => !seen.has(song.id)), 'Page 2 repeated page 1');
  return { firstPageCount: first.songs.length, secondPageCount: second.songs.length };
});

for (const kind of ['hot', 'new', 'classic']) {
  await check(`real chart: ${kind}`, async () => {
    const value = await json('/api/chart?kind=' + kind);
    assertSongs(value, kind);
    return { count: value.songs.length, firstTitle: value.songs[0].title };
  });
}

async function assertAudioRange(id, range, expectedBytes) {
  const response = await request('/api/audio/' + id, { headers: { Range: range } });
  if (response.status !== 206) {
    await response.body?.cancel();
    assert.fail(`${range}: expected HTTP 206, got ${response.status}`);
  }
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.match(response.headers.get('content-range') || '', /^bytes \d+-\d+\/\d+$/);
  assert.match(response.headers.get('content-type') || '', /audio\/|application\/octet-stream/i);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(bytes.length, expectedBytes, `${range}: unexpected response length`);
  assert.ok(bytes.some(byte => byte !== 0), 'Audio response is all zero bytes');
  assert.notEqual(new TextDecoder().decode(bytes.slice(0, 1)), '{', 'Audio route returned JSON');
  return { bytes: bytes.length, range: response.headers.get('content-range') };
}

for (const song of songs) {
  await check(`real playback: ${song.title} / ${song.artist}`, async () => {
    const value = await json('/api/play/' + song.id);
    assert.equal(String(value.id), String(song.id));
    assert.ok(value.title && value.artist);
    assert.match(value.url || '', /^https:\/\//);
    assert.equal(value.audio, '/api/audio/' + song.id);
    assert.match(value.sourceUrl || '', /^https:\/\/www\.gequhai\.com\/play\/\d+$/);
    assert.equal(typeof value.lyrics, 'string');
    return { id: value.id, title: value.title, artist: value.artist, lyricChars: value.lyrics.length, ...await assertAudioRange(song.id, 'bytes=0-1023', 1024) };
  });
}

if (songs[0]) {
  await check('mid-file byte range supports seeking', () => assertAudioRange(songs[0].id, 'bytes=100000-101023', 1024));
  await check('suffix byte range supports media probing', () => assertAudioRange(songs[0].id, 'bytes=-1024', 1024));
  await check('invalid byte range returns 416', async () => {
    const response = await request('/api/audio/' + songs[0].id, { headers: { Range: 'bytes=-' } });
    await response.body?.cancel();
    assert.equal(response.status, 416);
  });
}

await check('non-song input does not become an open proxy', async () => {
  const response = await request('/api/audio/not-a-song?url=https://example.com/');
  await response.body?.cancel();
  assert.ok([400, 404].includes(response.status), `Unexpected HTTP ${response.status}`);
});

delete summary.jayFirstPage;
summary.results = results;
summary.passed = results.filter(result => result.ok).length;
summary.failed = results.filter(result => !result.ok).length;
console.log(JSON.stringify(summary, null, 2));
if (summary.failed) process.exitCode = 1;
