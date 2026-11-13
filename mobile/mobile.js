const API_ORIGIN=document.querySelector('meta[name="api-origin"]')?.content||'https://tingyu-music-jay.xkcnjsfdny.chatgpt.site';
const pages = location.hostname === 'talentjay-ux.github.io';
const API = pages ? API_ORIGIN : '';
let retryDirectMedia = null;
const directTracks = new Map();
let cataloguePromise;
function mediaUrl(value) {
  try {
    const url = new URL(value);
    const known = url.hostname === 'www.gequhai.com' || url.hostname.endsWith('.kuwo.cn');
    return known && url.protocol === 'https:' && !url.username && !url.password && !url.port ? url.href : '';
  } catch { return ''; }
}

function readCatalogue() {
  if (!cataloguePromise) {
    cataloguePromise = fetch('/tingyu-music-poc/catalog.json', {cache:'no-cache', signal:AbortSignal.timeout(10000)})
      .then(async response => {
        if (!response.ok) throw new Error('直连曲目索引暂时无法加载');
        const catalog = await response.json();
        for (const track of catalog.tracks) {
          if (numeric(track.id)) directTracks.set(String(track.id), {...track, audio:mediaUrl(track.audio)});
        }
        return catalog;
      }).catch(error => { cataloguePromise = null; throw error; });
  }
  return cataloguePromise;
}

const $=s=>document.querySelector(s),audio=$('#audio'),KEY='tingyu:mobile:v2';
const paths={music:'<path d="M9 18V5l12-2v13M9 9l12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',library:'<rect x="4" y="4" width="6" height="16" rx="1"/><path d="m14 4 6-1 2 16-6 1Z"/>',plus:'<path d="M12 5v14M5 12h14"/>',headphones:'<path d="M4 13v-1a8 8 0 0 1 16 0v1M4 12h3v8H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2ZM20 12h-3v8h3a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Z"/>',settings:'<path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 3 3 3-3 3 1 2-3-1-3 2-2-2-3-3-1-1-3Z"/><circle cx="12" cy="11" r="3"/>','chevron-down':'<path d="m5 9 7 7 7-7"/>','chevron-left':'<path d="m14 5-7 7 7 7"/>','chevron-right':'<path d="m9 5 7 7-7 7"/>',play:'<path d="m7 3 15 9-15 9Z"/>',pause:'<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>',repeat:'<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',shuffle:'<path d="M3 6h3l12 12h3M3 18h3L18 6h3m-4-4 4 4-4 4m0 4 4 4-4 4"/>',previous:'<path d="M5 4v16m14-16L6 12l13 8Z"/>',next:'<path d="M19 4v16M5 4l13 8-13 8Z"/>',volume:'<path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',queue:'<path d="M3 5h18M3 10h18M3 15h10m4-1 5 4-5 4Z"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5"/>',upload:'<path d="M12 15V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',edit:'<path d="m15 4 5 5M4 15 16 3a2 2 0 0 1 3 0l2 2a2 2 0 0 1 0 3L9 20H3Z"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',check:'<path d="m5 12 4 4L20 5"/>',up:'<path d="m5 14 7-7 7 7"/>',refresh:'<path d="M20 7V2l-3 3A9 9 0 1 0 21 13M20 2h-5"/>'};
const icon=(name,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.music}</svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numeric=id=>/^\d{1,12}$/.test(String(id));
const safeCover=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
const fresh=()=>({version:2,tracks:{},liked:[],recent:[],playlists:[],queue:[],current:null,mode:'list',volume:75});
function normalizeSong(s){if(!s||!numeric(s.id))return null;return{id:String(s.id),title:String(s.title||s.name||'').slice(0,200),artist:String(s.artist||s.author||'').slice(0,160),cover:safeCover(s.cover),source:'gequhai'};}
function normalizeIds(ids){return Array.isArray(ids)?[...new Set(ids.filter(numeric).map(String))].slice(0,1500):[];}
function readState(){let s=fresh();try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&v.version===2){s={...s,...v,tracks:{}};for(const t of Object.values(v.tracks||{})){const track=normalizeSong(t);if(track)s.tracks[track.id]=track;}s.liked=normalizeIds(v.liked);s.recent=normalizeIds(v.recent);s.queue=normalizeIds(v.queue);s.playlists=Array.isArray(v.playlists)?v.playlists.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string').map(p=>({id:p.id.slice(0,100),name:p.name.slice(0,60),description:String(p.description||'').slice(0,300),songIds:normalizeIds(p.songIds)})).slice(0,250):[];s.current=numeric(v.current)?String(v.current):null;s.mode=['list','repeat','shuffle'].includes(v.mode)?v.mode:'list';s.volume=Number.isFinite(Number(v.volume))?Math.min(100,Math.max(0,Number(v.volume))):75;return s;}const old=JSON.parse(localStorage.getItem('tingyu:poc:v1')||'null');if(old){s.liked=normalizeIds(old.liked);s.recent=normalizeIds(old.recent);s.playlists=(old.playlists||[]).filter(p=>p&&typeof p.name==='string').map(p=>({id:'p-'+crypto.randomUUID(),name:p.name.slice(0,60),description:String(p.description||'').slice(0,300),songIds:normalizeIds(p.songIds)}));}}catch{}return s;}
let state=readState(),saveTimer,toastTimer,storageWarned=false,routeToken=0,playToken=0,currentId=state.current,loading=false,playError='',lyrics=[],lyricIndex=-1,lyricsVisible=false,visibleIds=[],sheetType='',sheetSong='',contextPlaylist='';
let chartKind='hot',chartCache=new Map(),lastSearch='',searchResult={songs:[],page:0,hasMore:false},searchBusy=false;
const chartLabels={hot:'热门榜',new:'新歌榜',surge:'飙升榜',classic:'怀旧榜',douyin:'抖音榜',electronic:'电音榜'};
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3300);}
function save(immediate=false){clearTimeout(saveTimer);const write=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{if(!storageWarned){storageWarned=true;toast('浏览器暂不允许保存，收藏仅在当前页面有效。');}}};if(immediate)write();else saveTimer=setTimeout(write,150);}
const song=id=>state.tracks[String(id)]||{id:String(id),title:'歌曲 '+id,artist:'正在读取歌曲信息',cover:'',source:'gequhai'};
function remember(list){let changed=false;for(const s of list||[]){const n=normalizeSong(s);if(!n)continue;const old=state.tracks[n.id]||{};state.tracks[n.id]={...old,...n,title:n.title||old.title||'歌曲 '+n.id,artist:n.artist||old.artist||'',cover:n.cover||old.cover||''};changed=true;}if(changed)save();}
async function liveApi(path,{signal}={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),pages ? 6500 : 42000);const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});try{const r=await fetch(API+path,{signal:controller.signal,headers:{Accept:'application/json'}});let d;try{d=await r.json();}catch{throw new Error('音乐接口暂时没有响应，请重试。');}if(!r.ok||d.error)throw new Error(d.message||'歌曲海暂时无法提供数据，请重试。');return d;}catch(e){if(e.name==='AbortError')throw new Error('连接用时较长，请重试。');throw e;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}}
async function api(path, options) {
  if (!pages) return liveApi(path, options);
  let catalog;
  try { catalog = await readCatalogue(); } catch { return liveApi(path, options); }
  const url = new URL(path, location.origin);
  if (url.pathname === '/api/chart') {
    const ids = catalog.charts[url.searchParams.get('kind')];
    if (ids) return {songs:ids.map(id => directTracks.get(String(id))).filter(Boolean)};
  }
  if (url.pathname === '/api/search') {
    const term = url.searchParams.get('q').trim().toLocaleLowerCase();
    const rows = [...directTracks.values()].filter(song =>
      (song.title + ' ' + song.artist).toLocaleLowerCase().includes(term));
    const page = Number(url.searchParams.get('page')) || 1;
    if (rows.length) return {songs:rows.slice((page-1)*15,page*15),hasMore:page*15<rows.length,indexed:true};
    try { return await liveApi(path, options); }
    catch { return {songs:[],hasMore:false,indexed:true}; }
  }
  const id = url.pathname.match(/^\/api\/play\/(\d+)$/)?.[1];
  if (id && directTracks.has(id)) return directTracks.get(id);
  return liveApi(path, options);
}
function cover(s,cls=''){return `<span class="cover ${cls}">${s?.cover?`<img src="${esc(s.cover)}" alt="" loading="lazy" onerror="this.style.display='none'">`:icon('music')}</span>`;}
function titleBlock(title,sub,kicker='YOUR OWN LITTLE ISLAND'){return `<div class="page-heading"><div class="kicker">${kicker}</div><h1>${esc(title)}</h1>${sub?`<p class="subtitle">${esc(sub)}</p>`:''}</div>`;}
const loadingMarkup=(n=5)=>`<div class="loading" aria-label="正在加载音乐">${Array.from({length:n},()=>'<div class="skeleton"><span></span></div>').join('')}</div>`;
function empty(title,desc,action='search',label='去找一首喜欢的歌'){return `<div class="empty"><div class="empty-icon">${icon('headphones')}</div><h2>${esc(title)}</h2><p>${esc(desc)}</p><button class="secondary-button" data-action="${action}">${esc(label)}</button></div>`;}
function errorMarkup(message,action='retry-view'){return `<div class="error-card"><h3>音乐连接暂时中断</h3><p>${esc(message)}</p><button class="secondary-button" data-action="${action}">${icon('refresh')}重新连接</button></div>`;}
function trackRows(ids,{rank=false,queue=false,playlist=''}={}){return ids.map((id,i)=>{const s=song(id);return `<div class="track-row ${id===currentId?'current':''}" data-track="${esc(id)}">${rank?`<span class="track-index">${String(i+1).padStart(2,'0')}</span>`:''}<button class="track-main" data-action="${queue?'play-queue':'play'}" data-id="${esc(id)}" aria-label="播放 ${esc(s.title)}">${cover(s)}<span class="track-meta"><strong>${esc(s.title)}</strong><small>${esc(s.artist||'歌曲海')}${state.liked.includes(id)?' · 已喜欢':''}</small></span></button><button class="round-button track-menu" data-action="${queue?'remove-queue':'song-menu'}" data-id="${esc(id)}" ${playlist?`data-playlist="${esc(playlist)}"`:''} aria-label="${queue?'移出队列':'更多操作'} ${esc(s.title)}">${icon(queue?'close':'more')}</button></div>`;}).join('');}
function setMain(html){$('#main').innerHTML=html;updateCurrentRows();}
function setNav(route){document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===(['liked','recent','playlist'].includes(route)?'library':route)));}
function quietFooter(){return '<p class="quiet-footer">歌曲海的音乐，你自己的小岛。</p>';}
async function renderDiscover(token){const kind=chartKind;setMain(titleBlock('发现音乐','听喜欢的旋律，过自己的生活。','A LITTLE MUSIC. A LITTLE YOU.')+`<section class="hero"><div class="kicker">LET THE MUSIC FIND YOU</div><h2>给耳朵一点自由，<br>给生活一点留白。</h2><p>从歌曲海的真实榜单里，<br>遇见今天的下一首心动。</p><button class="hero-play" data-action="play-all">${icon('play')}播放榜单</button><span class="hero-chip">JUST PRESS PLAY</span></section><div class="section-heading"><h2>此刻，大家在听</h2></div><div class="pills">${Object.entries(chartLabels).map(([k,v])=>`<button class="pill ${kind===k?'active':''}" data-action="chart" data-kind="${k}">${v}</button>`).join('')}</div><div id="chart-content">${loadingMarkup()}</div>`);visibleIds=[];try{let data=chartCache.get(kind);if(!data||Date.now()-data.time>300000){const r=await api('/api/chart?kind='+kind);if(!Array.isArray(r.songs))throw new Error('歌曲海暂时没有返回歌曲列表，请重新连接。');data={...r,time:Date.now()};chartCache.set(kind,data);}if(token!==routeToken)return;remember(data.songs);visibleIds=data.songs.map(s=>String(s.id));$('#chart-content').innerHTML=`<p class="source-note">歌曲海 · ${chartLabels[kind]} · ${visibleIds.length} 首</p>${visibleIds.length?trackRows(visibleIds,{rank:true}):empty('这份榜单暂时没有歌曲','可以切换其他榜单，或者搜索喜欢的歌。')}${quietFooter()}`;updateCurrentRows();}catch(e){if(token===routeToken)$('#chart-content').innerHTML=errorMarkup(e.message);}}
function searchForm(q){return `<form id="search-form" class="search-box" role="search">${icon('search')}<input id="search-input" aria-label="搜索歌曲或歌手" placeholder="搜索歌曲、歌手" maxlength="50" value="${esc(q)}" enterkeyhint="search" autocomplete="off"><button type="submit">搜索</button></form>`;}
const suggestedArtists = ['Taylor Swift', '周杰伦', '林俊杰', '陈奕迅', '邓紫棋', '许巍', '孙燕姿'];

function renderSearch(token,q){setMain(titleBlock('找到你的那一首','歌曲、歌手，都可以从这里开始。','FIND YOUR NEXT FAVORITE')+searchForm(q)+'<div id="search-content"></div>');$('#search-form').onsubmit=e=>{e.preventDefault();const value=$('#search-input').value.trim();if(!value){toast('输入歌名或歌手，就能开始搜索。');return;}location.hash='/search/'+encodeURIComponent(value);if(value===q)runSearch(value,1,token);};if(q){if(q===lastSearch&&searchResult.page){drawSearch();}else runSearch(q,1,token);}else{$('#search-content').innerHTML='<div class="section-heading"><h2>想听谁的声音？</h2></div><div class="search-tags">'+suggestedArtists.map(q=>`<button class="search-tag" data-action="search-for" data-query="${q}">${q}</button>`).join('')+'</div><p class="source-note">搜索歌曲海曲目</p>';visibleIds=[];}}
async function runSearch(q,page,token=routeToken){if(searchBusy)return;searchBusy=true;if(page===1){lastSearch=q;searchResult={songs:[],page:0,hasMore:false};$('#search-content').innerHTML=loadingMarkup();visibleIds=[];}else{const b=$('[data-action="more-search"]');if(b){b.disabled=true;b.innerHTML='<span class="spinner"></span> 正在加载';}}try{const data=await api('/api/search?q='+encodeURIComponent(q)+'&page='+page);if(!Array.isArray(data.songs))throw new Error('歌曲海暂时没有返回搜索结果，请重试。');if(token!==routeToken||q!==lastSearch)return;remember(data.songs);const map=new Map((page===1?[]:searchResult.songs).map(s=>[String(s.id),s]));for(const s of data.songs||[])if(numeric(s.id))map.set(String(s.id),s);searchResult={songs:[...map.values()],page,hasMore:!!data.hasMore,indexed:!!data.indexed};drawSearch();}catch(e){if(token!==routeToken)return;if(page===1)$('#search-content').innerHTML=errorMarkup(e.message,'retry-search');else{toast(e.message);const b=$('[data-action="more-search"]');if(b){b.disabled=false;b.textContent='加载更多';}}}finally{searchBusy=false;}}
function drawSearch(){visibleIds=searchResult.songs.map(s=>String(s.id));$('#search-content').innerHTML=`<p class="search-state">${esc(lastSearch)} · ${searchResult.indexed?'直连索引':'实时搜索'} · 已找到 ${visibleIds.length} 首歌曲</p>${visibleIds.length?`<div class="toolbar"><button class="play-all" data-action="play-all">${icon('play')}播放全部</button></div>${trackRows(visibleIds)}`:empty(searchResult.indexed?'直连索引暂无匹配':'暂时没有找到这首歌',searchResult.indexed?'可以继续在歌曲海全库搜索。':'试试更短的歌名，或只输入歌手的名字。','focus-search','换个关键词')}${searchResult.hasMore?'<button class="load-more" data-action="more-search">加载更多</button>':visibleIds.length?'<p class="list-end">当前结果已显示完毕。</p>':''}${searchResult.indexed?`<p class="source-note"><a href="https://www.gequhai.com/search?s=${encodeURIComponent(lastSearch)}" target="_blank" rel="noopener noreferrer">在歌曲海搜索全部结果 ↗</a></p>`:''}`;}
function playlistArt(p){const first=p.songIds.map(song).find(s=>s.cover);return `<span class="playlist-art">${first?`<img src="${esc(first.cover)}" alt="" loading="lazy">`:icon('music')}<span class="playlist-count">${p.songIds.length} 首音乐</span></span>`;}
function renderLibrary(){visibleIds=[];setMain(titleBlock('我的音乐','喜欢的声音，都有一个自己的位置。')+`<div class="library-quick"><a href="#/liked">${icon('heart')}<strong>我喜欢的音乐</strong><small>${state.liked.length} 首心动，值得反复听</small></a><a href="#/recent">${icon('clock')}<strong>最近播放</strong><small>${state.recent.length} 首刚刚陪伴过你的歌</small></a></div><div class="section-heading"><h2>我创建的歌单</h2><small>${state.playlists.length} 张</small><button class="text-button red" data-action="create-list">${icon('plus')}新建</button></div><div class="playlist-grid">${state.playlists.map(p=>`<a href="#/playlist/${encodeURIComponent(p.id)}" class="playlist-card">${playlistArt(p)}<strong>${esc(p.name)}</strong><p>${p.songIds.length} 首 · 保存在此设备</p></a>`).join('')}<button class="playlist-card" data-action="create-list"><span class="playlist-art new-playlist-art">${icon('plus')}</span><strong>一张新的歌单</strong><p>从喜欢的第一首歌开始</p></button></div><div class="library-summary" style="margin-top:28px">${icon('headphones')}<p><strong>听歌，不必登录。</strong><br>歌单与收藏保存在当前浏览器，可在设置里备份。</p></div>`);}
function renderLocal(kind,id){const p=kind==='playlist'?state.playlists.find(p=>p.id===id):null;if(kind==='playlist'&&!p){setMain(empty('这张歌单不见了','可以回到音乐库，再选一张。','library','回到我的音乐'));return;}const title=kind==='liked'?'我喜欢的音乐':kind==='recent'?'最近播放':p.name;visibleIds=kind==='liked'?[...state.liked]:kind==='recent'?[...state.recent]:[...p.songIds];contextPlaylist=p?.id||'';const sub=kind==='liked'?'每一次心动，都值得被留下。':kind==='recent'?'音乐走过的地方，留下了你的心情。':p.description;setMain(`<div class="back-heading"><a class="round-button" href="#/library" aria-label="返回我的音乐">${icon('chevron-left')}</a><span>我的音乐</span></div>${p?`<div class="playlist-head">${playlistArt(p)}<div class="playlist-head-info"><div class="kicker">MY OWN COLLECTION</div><h1>${esc(title)}</h1><p>${visibleIds.length} 首音乐 · 本地歌单</p></div></div>${sub?`<p class="playlist-description">${esc(sub)}</p>`:''}`:titleBlock(title,sub)}${visibleIds.length||p?`<div class="toolbar">${visibleIds.length?`<button class="play-all" data-action="play-all">${icon('play')}播放全部</button>`:''}${p?`<button class="text-button" data-action="edit-list" data-id="${esc(p.id)}">${icon('edit')}编辑歌单</button>`:''}</div>`:''}${visibleIds.length?`<div id="local-tracks">${trackRows(visibleIds,{playlist:p?.id})}</div>`:empty('这里，还留着第一首的位置','在歌曲右侧点 ···，把喜欢的旋律加入歌单。')}`);hydrateMissing(visibleIds,routeToken);}
async function hydrateMissing(ids,token){const missing=ids.filter(id=>!state.tracks[id]?.title).slice(0,20);for(let i=0;i<missing.length;i+=3){await Promise.all(missing.slice(i,i+3).map(async id=>{try{const d=await api('/api/play/'+id);remember([d]);}catch{}}));if(token!==routeToken)return;const el=$('#local-tracks');if(el)el.innerHTML=trackRows(visibleIds,{playlist:contextPlaylist});}}
function currentRoute(){const parts=location.hash.replace(/^#\/?/,'').split('/');let id='';try{id=decodeURIComponent(parts.slice(1).join('/'));}catch{}return {name:parts[0]||'discover',id};}
function render(){const token=++routeToken,{name,id}=currentRoute();contextPlaylist='';setNav(name);if(name==='search')renderSearch(token,id);else if(name==='library')renderLibrary();else if(['playlist','liked','recent'].includes(name))renderLocal(name,id);else renderDiscover(token);updatePlayer();}
function updateCurrentRows(){document.querySelectorAll('[data-track]').forEach(el=>el.classList.toggle('current',el.dataset.track===currentId));}
function durationText(value){return Number.isFinite(value)&&value>0?`${Math.floor(value/60).toString().padStart(2,'0')}:${Math.floor(value%60).toString().padStart(2,'0')}`:'00:00';}
function updatePlayer(){const source=$('#source-play');source.hidden=!currentId||!playError;if(currentId)source.href='https://www.gequhai.com/play/'+currentId;const s=currentId?song(currentId):null,playing=!!s&&!audio.paused&&!audio.ended;$('#mini-player').hidden=!s;document.body.classList.toggle('has-player',!!s);$('#mini-player').classList.toggle('is-loading',loading);$('#mini-player').classList.toggle('is-playing',playing);$('#mini-toggle').innerHTML=icon(playing?'pause':'play');$('#mini-toggle').setAttribute('aria-label',playing?'暂停当前歌曲':'播放当前歌曲');$('#full-toggle').innerHTML=icon(playing?'pause':'play');$('#full-toggle').setAttribute('aria-label',playing?'暂停':'播放');$('#full-toggle').classList.toggle('loading',loading);$('#mode-button').innerHTML=icon(state.mode==='shuffle'?'shuffle':'repeat');$('#mode-button').classList.toggle('active',state.mode!=='list');$('#mode-button').setAttribute('aria-label','播放模式：'+({list:'顺序播放',repeat:'单曲循环',shuffle:'随机播放'}[state.mode]));$('#player-like').innerHTML=icon('heart');$('#player-like').classList.toggle('liked',!!s&&state.liked.includes(s.id));$('#player-like').setAttribute('aria-label',s&&state.liked.includes(s.id)?'取消喜欢当前歌曲':'喜欢当前歌曲');$('#player-error').hidden=!playError;$('#player-error').textContent=playError?playError+' 点击重试。':'';if(s){$('#mini-title').textContent=s.title;$('#mini-artist').textContent=loading?'正在连接歌曲海…':playError?'暂时无法播放 · 点击重试':s.artist||'歌曲海';$('#mini-cover').innerHTML=s.cover?`<img src="${esc(s.cover)}" alt="">`:icon('music');$('#player-title').textContent=s.title;$('#player-artist').textContent=s.artist||'歌曲海';const artKey=s.id+'|'+s.cover;if($('#player-art').dataset.key!==artKey){$('#player-art').dataset.key=artKey;$('#player-art').innerHTML=s.cover?`<img src="${esc(s.cover)}" alt="${esc(s.title)} 封面">`:`<span class="art-record">${icon('music')}</span>`;}}updateCurrentRows();}
function mediaMetadata(){if(!currentId||!('mediaSession'in navigator))return;const s=song(currentId);try{navigator.mediaSession.metadata=new MediaMetadata({title:s.title,artist:s.artist,album:'听屿 · 歌曲海',artwork:s.cover?[{src:s.cover}]:[]});}catch{}}
function parseLyrics(text){const out=[];for(const line of String(text||'').split(/\r?\n/)){const times=[...line.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];const value=line.replace(/\[[^\]]*\]/g,'').trim();if(!value)continue;if(times.length){for(const m of times)out.push({time:Number(m[1])*60+Number(m[2])+Number('0.'+(m[3]||'0')),text:value});}else if(!/^\[(?:ar|ti|al|by|offset):/i.test(line))out.push({time:null,text:value});}return out.sort((a,b)=>(a.time??0)-(b.time??0));}
function drawLyrics(){lyricIndex=-1;$('#lyrics-pane').innerHTML=lyrics.length?lyrics.map((l,i)=>`<p data-lyric="${i}">${esc(l.text)}</p>`).join(''):'<div class="lyrics-empty">暂时没有这首歌的歌词。<br>让旋律自己说话。</div>';updateLyric();}
function updateLyric(){if(!lyricsVisible||!lyrics.length)return;let idx=-1;for(let i=0;i<lyrics.length;i++)if(lyrics[i].time!==null&&lyrics[i].time<=audio.currentTime+.15)idx=i;if(idx===lyricIndex)return;lyricIndex=idx;$('#lyrics-pane').querySelectorAll('[data-lyric]').forEach(el=>el.classList.toggle('active',Number(el.dataset.lyric)===idx));const el=$(`#lyrics-pane [data-lyric="${idx}"]`);if(el)el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});}
function playTrack(id, ids=null) {
  if (!numeric(id)) return;
  id=String(id);
  if (ids) state.queue=normalizeIds(ids);
  if (!state.queue.includes(id)) state.queue.push(id);
  currentId=id; state.current=id; playError=''; loading=true; lyrics=[];
  drawLyrics();
  const token=++playToken;
  retryDirectMedia=null;
  audio.pause();
  save();
  updatePlayer();
  const direct = pages && directTracks.get(id);
  const active = () => token === playToken;
  function start(src) {
    if (!active()) return;
    audio.src=src;
    audio.load();
    audio.play().then(() => {
      if (!active()) return;
      loading=false;
      state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,100);
      save(); updatePlayer(); mediaMetadata();
    }).catch(error => {
      if (!active() || error.name==='AbortError') return;
      loading=false;
      playError=error.name==='NotAllowedError'?'请点播放继续。':'当前音源未能播放，可重试或使用歌曲海原页。';
      updatePlayer(); toast(playError);
    });
  }
  function details(track) {
    if (!active()) return;
    remember([track]);
    lyrics=parseLyrics(track.lyrics);
    drawLyrics(); mediaMetadata(); updatePlayer();
  }
  if (direct?.audio) {
    details(direct);
    retryDirectMedia = async () => {
      retryDirectMedia = null;
      const refreshed = await liveApi('/api/play/'+id);
      if (!active()) return;
      const url = mediaUrl(refreshed.url);
      if (url && url !== direct.audio) {
        direct.audio = url;
        details(refreshed);
        start(url);
      } else {
        start(API+'/api/audio/'+id);
      }
    };
    start(direct.audio);
  } else if (pages) {
    // Covers restored playlists on first load as well as tracks outside the index.
    readCatalogue().catch(()=>null).then(async () => {
      if (!active()) return;
      const indexed=directTracks.get(id);
      if (indexed?.audio) { details(indexed); start(indexed.audio); return; }
      const track=await liveApi('/api/play/'+id);
      const url=mediaUrl(track.url);
      if (!url) throw new Error('歌曲海没有返回可用的音频地址。');
      details(track); start(url);
    }).catch(() => {
      if (!active()) return;
      loading=false; playError='当前网络无法取得播放地址，可在歌曲海原页播放。'; updatePlayer(); showPlayer();
    });
  } else {
    start(API+'/api/audio/'+id);
    liveApi('/api/play/'+id).then(details).catch(()=>{});
  }
}
function togglePlayback(){if(pages&&currentId&&audio.paused&&audio.getAttribute('src')&&playError==='请点播放继续。'){playError='';audio.play().catch(()=>{playError='当前音源未能播放。';updatePlayer();});return;}if(!currentId){const id=visibleIds[0]||state.queue[0];if(id)playTrack(id,visibleIds.length?visibleIds:state.queue);else toast('先搜索一首喜欢的歌吧');return;}if(playError||!audio.getAttribute('src')){playTrack(currentId);return;}if(audio.paused){audio.play().catch(()=>{playError='暂时无法继续播放，请点击重试。';updatePlayer();});}else audio.pause();}
function next(direction=1,ended=false){const ids=state.queue;if(!ids.length)return;let i=ids.indexOf(currentId);if(direction===-1&&audio.currentTime>3){audio.currentTime=0;return;}if(ended&&state.mode==='repeat'){audio.currentTime=0;audio.play().catch(()=>{});return;}if(state.mode==='shuffle'&&ids.length>1){let j;do{j=Math.floor(Math.random()*ids.length);}while(j===i);i=j;}else{const j=i+direction;if(ended&&j>=ids.length){loading=false;updatePlayer();return;}i=(j+ids.length)%ids.length;}playTrack(ids[i]);}
function like(id){if(!numeric(id))return;const index=state.liked.indexOf(id);if(index<0)state.liked.unshift(id);else state.liked.splice(index,1);save();updatePlayer();const r=currentRoute();if(['liked','library'].includes(r.name))render();else{document.querySelectorAll(`[data-track="${id}"] .track-meta small`).forEach(el=>el.textContent=(song(id).artist||'歌曲海')+(state.liked.includes(id)?' · 已喜欢':''));}toast(index<0?'已加入我喜欢的音乐':'已取消喜欢');}
function showSheet(type,title,body){sheetType=type;$('#sheet-content').innerHTML=`<div class="sheet-heading"><h2>${title}</h2><button class="round-button" data-action="close-sheet" aria-label="关闭弹窗">${icon('close')}</button></div>${body}`;if(!$('#sheet').open)$('#sheet').showModal();}
function closeSheet(){$('#sheet').close();sheetType='';}
function songMenu(id,playlist=''){const s=song(id);sheetSong=id;showSheet('song','',`<div class="sheet-track-title">${cover(s)}<span class="track-meta"><strong>${esc(s.title)}</strong><small>${esc(s.artist||'歌曲海')}</small></span></div><div class="sheet-actions"><button class="sheet-action" data-action="like" data-id="${id}">${icon('heart')} ${state.liked.includes(id)?'取消喜欢':'加入我喜欢的音乐'}</button><button class="sheet-action" data-action="add-to-list" data-id="${id}">${icon('plus')}加入歌单</button><button class="sheet-action" data-action="play-next" data-id="${id}">${icon('next')}下一首播放</button><button class="sheet-action" data-action="enqueue" data-id="${id}">${icon('queue')}加入播放队列</button>${playlist?`<button class="sheet-action" data-action="move-song" data-id="${id}" data-list="${esc(playlist)}" data-direction="-1">${icon('up')}在歌单中上移</button><button class="sheet-action danger" data-action="remove-from-list" data-id="${id}" data-list="${esc(playlist)}">${icon('trash')}从这张歌单移除</button>`:''}</div>`);}
function addToList(id){const s=song(id);showSheet('choose-list','加入歌单',`<p class="sheet-subtitle">${esc(s.title)} · ${esc(s.artist)}</p><button class="sheet-action" data-action="new-list-with-song" data-id="${id}">${icon('plus')}创建新歌单</button>${state.playlists.length?state.playlists.map(p=>`<button class="collection-line" data-action="choose-list" data-id="${id}" data-list="${esc(p.id)}">${cover(p.songIds.map(song).find(s=>s.cover))}<span><strong>${esc(p.name)}</strong><small>${p.songIds.length} 首音乐</small></span></button>`).join(''):'<p class="sheet-note">还没有歌单？从这首喜欢的歌开始创建一张。</p>'}`);}
function editList(id=null,addId=null){const p=state.playlists.find(p=>p.id===id);showSheet('edit-list',p?'编辑歌单':'创建一张新歌单',`<p class="sheet-subtitle">把喜欢的旋律放在一起。歌单保存在这台设备，无需登录。</p><form id="list-form"><label class="form-field"><span>歌单名称</span><input name="name" aria-label="歌单名称" maxlength="60" required placeholder="例如：下班后的自由时间" value="${esc(p?.name||'')}"></label><label class="form-field"><span>想对这张歌单说的话</span><textarea name="description" aria-label="歌单描述" rows="3" maxlength="300" placeholder="留下一点属于这张歌单的心情……">${esc(p?.description||'')}</textarea></label>${p?`<button type="button" class="sheet-action danger" data-action="delete-list" data-id="${esc(p.id)}">${icon('trash')}删除歌单</button>`:''}<div class="form-actions"><button type="button" class="secondary-button" data-action="close-sheet">取消</button><button class="primary-button" type="submit">${p?'保存修改':'创建歌单'}</button></div></form>`);$('#list-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),name=f.get('name').trim();if(!name){toast('给这张歌单起个名字吧');return;}let target;if(p){p.name=name;p.description=f.get('description').trim();target=p.id;}else{target='p-'+crypto.randomUUID();state.playlists.unshift({id:target,name,description:f.get('description').trim(),songIds:addId?[addId]:[]});}save(true);closeSheet();location.hash='/playlist/'+encodeURIComponent(target);render();toast(p?'歌单已更新':'歌单创建成功');};}
function showQueue(){showSheet('queue',`播放队列 <span class="inline-count">${state.queue.length} 首</span>`,state.queue.length?`<div class="queue-list">${trackRows(state.queue,{queue:true})}</div>`:empty('队列还是空的','在歌曲旁的更多操作里，可以加入播放队列。','search','去找音乐'));}
function showPlayer(){if(!currentId){toast('先选择一首音乐吧');return;}updatePlayer();if(!$('#player-screen').open)$('#player-screen').showModal();}
function settings(){showSheet('settings','音乐留在这里',`<p class="sheet-subtitle">所有音乐来自歌曲海。收藏、歌单和播放记录保存在当前浏览器，不需要注册。清除浏览器数据前，可以先导出备份。</p><div class="sheet-actions"><button class="sheet-action" data-action="export">${icon('download')}导出歌单与收藏</button><button class="sheet-action" data-action="import">${icon('upload')}导入备份</button></div><p class="sheet-note">音乐由歌曲海实时提供。歌单只存在这台设备，不会自动同步到其他设备。</p>`);}
function exportData(){const file=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='tingyu-music-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('备份已导出');}
function importData(v){if(!v||![1,2].includes(v.version)||!Array.isArray(v.playlists)||!Array.isArray(v.liked))throw new Error('无效的备份文件');if(v.playlists.length>250)throw new Error('歌单数量过多');const tracks=Object.values(v.tracks||{}).map(normalizeSong).filter(Boolean);if(tracks.length>5000)throw new Error('歌曲数量过多');for(const t of tracks)state.tracks[t.id]=t;const lists=v.playlists.filter(p=>p&&typeof p.name==='string'&&Array.isArray(p.songIds)).map(p=>({id:'p-'+crypto.randomUUID(),name:p.name.slice(0,60),description:String(p.description||'').slice(0,300),songIds:normalizeIds(p.songIds)}));state.playlists.push(...lists);state.liked=normalizeIds([...state.liked,...v.liked]);save(true);closeSheet();render();toast(`已导入 ${lists.length} 张歌单，保留了原有收藏`);}
function enqueue(id,nextSong=false){state.queue=state.queue.filter(x=>x!==id);if(nextSong&&currentId){const i=state.queue.indexOf(currentId);state.queue.splice(i<0?0:i+1,0,id);}else state.queue.push(id);save();closeSheet();toast(nextSong?'已设为下一首播放':'已加入播放队列');}
document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el)return;const {action,id,list}=el.dataset;switch(action){case'chart':chartKind=el.dataset.kind;render();break;case'retry-view':chartCache.delete(chartKind);render();break;case'play':playTrack(id,visibleIds);break;case'play-queue':playTrack(id);showQueue();break;case'play-all':if(visibleIds.length)playTrack(visibleIds[0],visibleIds);else toast('先加载一份歌曲列表，再开始播放。');break;case'toggle':togglePlayback();break;case'next':next();break;case'previous':next(-1);break;case'now-playing':showPlayer();break;case'close-player':$('#player-screen').close();break;case'queue':showQueue();break;case'close-sheet':closeSheet();break;case'song-menu':songMenu(id,el.dataset.playlist);break;case'current-menu':if(currentId)songMenu(currentId);break;case'like':like(id);closeSheet();break;case'like-current':if(currentId)like(currentId);break;case'add-current':if(currentId)addToList(currentId);break;case'add-to-list':addToList(id);break;case'create-list':editList();break;case'new-list-with-song':editList(null,id);break;case'edit-list':editList(id);break;case'choose-list':{const p=state.playlists.find(p=>p.id===list);if(p){if(p.songIds.includes(id))toast('这首歌已经在歌单里了');else{p.songIds.push(id);save();toast('已加入「'+p.name+'」');if(currentRoute().name==='playlist')render();}closeSheet();}break;}case'remove-from-list':{const p=state.playlists.find(p=>p.id===list);if(p){p.songIds=p.songIds.filter(x=>x!==id);save();closeSheet();render();toast('已从歌单移除');}break;}case'move-song':{const p=state.playlists.find(p=>p.id===list);if(p){const i=p.songIds.indexOf(id);if(i>0){[p.songIds[i-1],p.songIds[i]]=[p.songIds[i],p.songIds[i-1]];save();closeSheet();render();toast('已上移一首');}else toast('已经是歌单的第一首');}break;}case'delete-list':{const p=state.playlists.find(p=>p.id===id);showSheet('delete-list','删除这张歌单？',`<p class="sheet-subtitle">「${esc(p?.name)}」将从当前设备移除。歌曲收藏和其他歌单不受影响。</p><div class="form-actions"><button class="secondary-button" data-action="close-sheet">保留歌单</button><button class="primary-button" data-action="confirm-delete" data-id="${esc(id)}">删除歌单</button></div>`);break;}case'confirm-delete':state.playlists=state.playlists.filter(p=>p.id!==id);save();closeSheet();location.hash='/library';render();toast('歌单已删除');break;case'play-next':enqueue(id,true);break;case'enqueue':enqueue(id);break;case'remove-queue':state.queue=state.queue.filter(x=>x!==id);save();showQueue();break;case'mode':state.mode={list:'repeat',repeat:'shuffle',shuffle:'list'}[state.mode];save();updatePlayer();toast({list:'顺序播放',repeat:'单曲循环',shuffle:'随机播放'}[state.mode]);break;case'lyrics':if(currentId&&!lyrics.length&&pages){const id=currentId;liveApi('/api/play/'+id).then(track=>{if(currentId===id){lyrics=parseLyrics(track.lyrics);drawLyrics();updateLyric();}}).catch(()=>{if(currentId===id)toast('当前网络未能加载歌词');});}lyricsVisible=!lyricsVisible;$('#player-art').hidden=lyricsVisible;$('#lyrics-pane').hidden=!lyricsVisible;$('#lyrics-button').classList.toggle('active',lyricsVisible);$('#lyrics-button').textContent=lyricsVisible?'封面':'歌词';updateLyric();break;case'settings':settings();break;case'export':exportData();break;case'import':$('#backup-file').click();break;case'search':closeSheet();$('#player-screen').close();location.hash='/search';break;case'library':location.hash='/library';break;case'focus-search':$('#search-input')?.focus();break;case'search-for':location.hash='/search/'+encodeURIComponent(el.dataset.query);break;case'retry-search':runSearch(lastSearch,1);break;case'more-search':runSearch(lastSearch,searchResult.page+1);break;}});
$('#player-error').onclick=()=>currentId&&playTrack(currentId);
$('#seek').addEventListener('input',e=>{if(Number.isFinite(audio.duration)&&audio.duration>0){audio.currentTime=Number(e.target.value)/1000*audio.duration;$('#elapsed').textContent=durationText(audio.currentTime);}});
audio.volume=state.volume/100;$('#volume').value=state.volume;$('#volume').style.setProperty('--fill',state.volume+'%');$('#volume').addEventListener('input',e=>{state.volume=Number(e.target.value);audio.volume=state.volume/100;e.target.style.setProperty('--fill',state.volume+'%');save();});
audio.addEventListener('timeupdate',()=>{const percentage=Number.isFinite(audio.duration)&&audio.duration>0?audio.currentTime/audio.duration:0;$('#seek').value=Math.round(percentage*1000);$('#seek').style.setProperty('--fill',percentage*100+'%');$('#mini-progress-fill').style.width=percentage*100+'%';$('#elapsed').textContent=durationText(audio.currentTime);$('#duration').textContent=durationText(audio.duration);updateLyric();if('mediaSession'in navigator&&navigator.mediaSession.setPositionState&&Number.isFinite(audio.duration)&&audio.duration>0){try{navigator.mediaSession.setPositionState({duration:audio.duration,position:Math.min(audio.currentTime,audio.duration),playbackRate:audio.playbackRate});}catch{}}});
audio.addEventListener('waiting',()=>{loading=true;updatePlayer();});audio.addEventListener('playing',()=>{loading=false;playError='';updatePlayer();});['pause','play','loadedmetadata'].forEach(name=>audio.addEventListener(name,updatePlayer));audio.addEventListener('ended',()=>next(1,true));audio.addEventListener('error',()=>{if(!currentId)return;
const retry=retryDirectMedia;
if(retry) {
  const token=playToken;
  retry().catch(()=>{if(token===playToken){loading=false;playError='播放地址已失效或网络未能连接，可在歌曲海原页重试。';updatePlayer();showPlayer();}});
  return;
}
loading=false;playError=playError||'音源暂时无法播放，请重试或切换下一首。';updatePlayer();});
$('#backup-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>5*1024*1024)throw new Error('too large');importData(JSON.parse(await f.text()));}catch{toast('请使用听屿导出的 JSON 备份文件。');}e.target.value='';};
$('#sheet').addEventListener('click',e=>{if(e.target!==$('#sheet'))return;const r=$('#sheet').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeSheet();});
window.addEventListener('hashchange',()=>{searchBusy=false;render();window.scrollTo(0,0);});window.addEventListener('pagehide',()=>save(true));
if('mediaSession'in navigator){const actions={play:()=>{if(audio.paused)togglePlayback();},pause:()=>audio.pause(),nexttrack:()=>next(),previoustrack:()=>next(-1),seekto:d=>{if(Number.isFinite(d.seekTime))audio.currentTime=d.seekTime;},seekbackward:d=>{audio.currentTime=Math.max(0,audio.currentTime-(d.seekOffset||10));},seekforward:d=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,audio.currentTime+(d.seekOffset||10));}};for(const[k,v]of Object.entries(actions)){try{navigator.mediaSession.setActionHandler(k,v);}catch{}}}
if(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))$('.volume-row').hidden=true;
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
render();save();
