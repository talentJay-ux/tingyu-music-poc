// Static POC: demo tracks are labeled explicitly and are never substituted for Gequhai songs.
export const demos = [
  { id: 'demo-1', title: 'SoundHelix Song 1', artist: 'T. Schürger', album: 'SoundHelix · 测试音频', source: 'soundhelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', image: 'forest', duration: 372 },
  { id: 'demo-2', title: 'SoundHelix Song 2', artist: 'T. Schürger', album: 'SoundHelix · 测试音频', source: 'soundhelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', image: 'coast', duration: 425 },
  { id: 'demo-3', title: 'SoundHelix Song 3', artist: 'T. Schürger', album: 'SoundHelix · 测试音频', source: 'soundhelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', image: 'city', duration: 343 }
];
export const gequhai = [['326','晴天'],['553','青花瓷'],['329','七里香'],['333','稻香'],['556','夜曲'],['558','告白气球'],['562','红尘客栈'],['170','一路向北'],['564','花海'],['554','搁浅'],['555','兰亭序'],['560','反方向的钟'],['925','半岛铁盒'],['567','爱在西元前'],['557','枫']].map(([id,title],i)=>({id,title,artist:'周杰伦',album:'歌曲海 · 原曲目录',source:'gequhai',sourceUrl:'https://www.gequhai.com/play/'+id,image:['coast','forest','sunset','city','mountain'][i%5]}));
export const images = {
  forest: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=500&q=80',
  coast: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&w=500&q=80',
  city: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=500&q=80',
  sunset: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=500&q=80',
  mountain: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=500&q=80'
};
export const collections = [
  {id:'quiet',name:'把生活调成静音',lines:'把生活\n调成静音',en:'A LITTLE PEACE',description:'把世界的喧嚣关小一点，把自己的声音放大一点。',tag:'放松',image:'forest',songIds:['demo-1','demo-2','demo-3'],caption:'纯音乐 · 测试歌单'},
  {id:'coast',name:'去有风的地方',lines:'去有风的\n地方',en:'SOMEWHERE BY THE SEA',description:'海浪、远方，和一个不必赶路的下午。',tag:'放松',image:'coast',songIds:['demo-2','demo-3','demo-1'],caption:'自由呼吸 · 测试歌单'},
  {id:'jay',name:'周杰伦 · 青春的回声',lines:'青春\n有回声',en:'THE SOUND OF YOUTH',description:'那些循环过的旋律，装着回不去的夏天。静态 POC 展示歌曲海目录，原曲可前往来源网站。',tag:'华语',image:'sunset',songIds:gequhai.map(x=>x.id),caption:'华语经典 · 歌曲海目录'},
  {id:'night',name:'晚一点，再说晚安',lines:'晚一点\n再说晚安',en:'WHEN THE CITY SLEEPS',description:'把这一小段时间，留给音乐和自己。',tag:'夜晚',image:'city',songIds:['demo-3','demo-1','demo-2'],caption:'深夜独处 · 测试歌单'},
  {id:'road',name:'出发，下一站自由',lines:'下一站\n自由',en:'TAKE THE LONG WAY HOME',description:'让好音乐陪你出发，沿途总会有新的风景。',tag:'放松',image:'mountain',songIds:['demo-1','demo-3','demo-2'],caption:'沿途风景 · 测试歌单'}
];
