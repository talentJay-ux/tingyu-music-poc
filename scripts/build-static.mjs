import {cpSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
rmSync(root+'dist',{recursive:true,force:true});
mkdirSync(root+'dist',{recursive:true});
cpSync(root+'public',root+'dist',{recursive:true});
writeFileSync(root+'dist/.nojekyll','');
const css=readFileSync(root+'public/styles.css','utf8');
const catalog=readFileSync(root+'public/catalog.js','utf8').replace(/^export /gm,'');
const app=readFileSync(root+'public/app.js','utf8').replace(/^import[^\n]+\n/,'');
const standalone=readFileSync(root+'public/index.html','utf8')
  .replace('<link rel="stylesheet" href="./styles.css">',()=>'<style>'+css+'</style>')
  .replace('<script type="module" src="./app.js"></script>',()=>'<script type="module">'+catalog+'\n'+app+'</script>');
writeFileSync(root+'tingyu-poc.html',standalone);
console.log('Built static POC: dist/');
