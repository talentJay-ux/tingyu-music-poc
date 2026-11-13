import {chartSongs, searchSongs, songPlayback, SourceError, ORIGIN} from '../src/gequhai.mjs';
const ASSETS = {}; // @assets
const allowedOrigins = new Set(['https://talentjay-ux.github.io','http://127.0.0.1:4173','http://localhost:4173']);
const cors = request => ({'Access-Control-Allow-Origin':allowedOrigins.has(request.headers.get('Origin'))?request.headers.get('Origin'):'https://talentjay-ux.github.io','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'Range, Content-Type','Access-Control-Expose-Headers':'Content-Length, Content-Range, Accept-Ranges','Vary':'Origin'});
const json=(request,data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...cors(request)}});
function allowedMediaUrl(value) {
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||(!['www.gequhai.com','gequhai.com'].includes(url.hostname)&&!url.hostname.endsWith('.kuwo.cn')))throw new SourceError('这首歌的音源暂不支持在线播放。',502,'MEDIA_HOST_UNSUPPORTED');
 return url;
}
async function mediaResponse(value,request,range) {
 let url=allowedMediaUrl(value);
 for(let redirect=0;redirect<4;redirect++){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  const signal=typeof AbortSignal.any==='function'?AbortSignal.any([request.signal,controller.signal]):controller.signal;
  let response;
  // Kuwo's public media CDN rejects Gequhai's Referer. Fetch its returned URL
  // directly, with no cross-site Referer and no upstream session cookies.
  try{response=await fetch(url.href,{method:request.method,redirect:'manual',headers:{'User-Agent':'Mozilla/5.0',...(range?{'Range':range}:{})},signal});}
  catch{throw new SourceError('音源连接超时，请重试或切换下一首。',502,'MEDIA_CONNECTION_FAILED');}
  finally{clearTimeout(timer);}
  if([301,302,303,307,308].includes(response.status)){
   const next=response.headers.get('Location');await response.body?.cancel();
   if(!next)break;
   url=allowedMediaUrl(new URL(next,url).href);continue;
  }
  return response;
 }
 throw new SourceError('音源重定向过多，请稍后重试。',502,'MEDIA_REDIRECT_FAILED');
}
export default {
 async fetch(request,env,ctx){
  const u=new URL(request.url),path=u.pathname;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(request)});
  if(!['GET','HEAD'].includes(request.method))return json(request,{error:'METHOD_NOT_ALLOWED',message:'仅支持读取。'},405);
  try{
   if(path==='/api/health')return json(request,{ok:true,source:'gequhai',version:'mobile-1'});
   if(path==='/api/search')return json(request,await searchSongs(u.searchParams.get('q'),Math.max(1,Math.min(200,Math.floor(Number(u.searchParams.get('page'))||1)))));
   if(path==='/api/chart')return json(request,await chartSongs(u.searchParams.get('kind')||'hot'));
   const play=path.match(/^\/api\/play\/(\d{1,12})$/);
   if(play){const s=await songPlayback(play[1],u.searchParams.get('refresh')==='1');return json(request,{...s,audio:'/api/audio/'+play[1]});}
   const audio=path.match(/^\/api\/audio\/(\d{1,12})$/);
   if(audio){
    const range=request.headers.get('Range');if(range&&!/^bytes=(?:\d+-\d*|-\d+)$/.test(range))return json(request,{error:'INVALID_RANGE',message:'不支持这个播放范围。'},416);
    let song=await songPlayback(audio[1]);
    let media=await mediaResponse(song.url,request,range);
    if(media.status===410){
      await media.body?.cancel();
      song=await songPlayback(audio[1],true);
      media=await mediaResponse(song.url,request,range);
    }
    if(media.status===416){const headers=new Headers(cors(request));if(media.headers.has('Content-Range'))headers.set('Content-Range',media.headers.get('Content-Range'));await media.body?.cancel();return new Response(null,{status:416,headers});}
    if(!media.ok){await media.body?.cancel();throw new SourceError('音源暂时无法播放，请重试或切换下一首。',502,'MEDIA_'+media.status);}
    const headers=new Headers(cors(request));for(const k of ['Content-Type','Content-Length','Content-Range','Accept-Ranges'])if(media.headers.has(k))headers.set(k,media.headers.get(k));
    headers.set('Content-Type',media.headers.get('Content-Type')||'audio/mpeg');headers.set('Cache-Control','private, max-age=60');
    return new Response(request.method==='HEAD'?null:media.body,{status:media.status,headers});
   }
   const asset=ASSETS[path==='/'?'/index.html':path];
   if(asset)return new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
   return json(request,{error:'NOT_FOUND',message:'页面不存在。'},404);
  }catch(e){return json(request,{error:e instanceof SourceError?e.code:'SOURCE_UNAVAILABLE',message:e instanceof SourceError?e.message:'音乐连接暂时不可用，请稍后重试。'},e instanceof SourceError?e.status:502);}
 }
};
