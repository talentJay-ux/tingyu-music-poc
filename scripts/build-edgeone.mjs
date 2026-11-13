// Produce an EdgeOne directory with same-origin metadata endpoints and direct CDN media.
import {readFile, writeFile, mkdir, cp, rm} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('dist/edgeone/', root);
const source = path => readFile(new URL(path, root), 'utf8');
await rm(output, {recursive:true,force:true});
await mkdir(output, {recursive:true});
await cp(new URL('mobile/',root),output,{recursive:true});
let upstream = (await source('src/gequhai.mjs')).replace(/^export /gm,'');
// EdgeOne supports fetch without AbortSignal.timeout on older V8 runtimes.
upstream = upstream.replace('signal: AbortSignal.timeout(18000)',
  "...(typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? { signal: AbortSignal.timeout(18000) } : {})");
const api = (await source('worker/api.mjs')).replace(/^import[^\n]+\n/,'').replace('export default {','const handler = {');
const entry = `
export async function onRequest({request}) {
  const result = await handler.fetch(request);
  if (result.status < 500 || !['GET','HEAD'].includes(request.method)) return result;
  // The origin can reject requests from an individual edge location.
  // Retry only this app's own allowlisted public metadata API server-side.
  const url = new URL(request.url);
  if (!/^\\/api\\/(search|chart|play\\/\\d{1,12})$/.test(url.pathname)) return result;
  try {
    const fallback = await fetch('https://tingyu-music-jay.xkcnjsfdny.chatgpt.site' + url.pathname + url.search);
    if (fallback.ok) return new Response(fallback.body, {headers:{'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'}});
  } catch {}
  return result;
}
`;
for (const name of ['health','search','chart','play/[id]','audio/[id]']) {
  const file = new URL('edge-functions/api/'+name+'.js',output);
  await mkdir(new URL('.',file),{recursive:true});
  await writeFile(file,upstream+'\n'+api+'\n'+entry);
}
await writeFile(new URL('package.json',output),'{"private":true,"type":"module"}\n');
